/**
 * Workflow Orchestrator - LangGraph-based agent workflow management
 *
 * SOLID: Single responsibility - workflow orchestration
 * DRY: Reuses extracted services for validation, events, state, and graph generation
 * KISS: Simple node-based workflow with dependency handling
 * Library-First: LangGraph for state, string-template for variables
 */

import { BaseCheckpointSaver } from '@langchain/langgraph'
import { v4 as uuidv4 } from 'uuid'
import { ClaudeService } from './ClaudeService'
import { SimpleOperator } from './SimpleOperator'
import { UnifiedAgentConfigService } from './UnifiedAgentConfigService'
import { StudioProjectService } from './StudioProjectService'
import { detectAbortError } from '../utils/errorUtils'
import { updateWorkflowStatus } from '../api/invoke-status'
import type { InvokeRequest, InvokeResponse, WorkflowStep, StepResult } from '../schemas/invoke'
import type { WorkflowGraph } from '../schemas/workflow-graph'
import type { Server } from 'socket.io'
import { EventEmitter } from 'events'
import { WorkflowMonitor } from './WorkflowMonitor'
import { StepExecutorRegistry, MockStepExecutor, ClaudeStepExecutor } from './executors'
import { WorkflowValidator } from './WorkflowValidator'
import { WorkflowEventEmitter } from './WorkflowEventEmitter'
import { WorkflowStateManager } from './WorkflowStateManager'
import { WorkflowGraphGenerator } from './WorkflowGraphGenerator'
import { ConditionEvaluator } from './ConditionEvaluator'
import { WorkflowNodeFactory } from './WorkflowNodeFactory'
import { WorkflowBuilder } from './WorkflowBuilder'
import type { ConditionContext } from '../schemas/workflow-builder'

export class WorkflowOrchestrator {
  private claudeService = new ClaudeService()
  private operator = new SimpleOperator()
  private agentConfigService = UnifiedAgentConfigService.getInstance()
  private projectService = new StudioProjectService()
  private checkpointer: BaseCheckpointSaver | null = null
  private io?: Server
  private workflowEvents?: EventEmitter
  private executorRegistry = new StepExecutorRegistry()
  private validator = new WorkflowValidator()
  private eventEmitter: WorkflowEventEmitter
  private stateManager = new WorkflowStateManager()
  private graphGenerator = new WorkflowGraphGenerator()
  private conditionEvaluator = ConditionEvaluator.getInstance()
  private nodeFactory: WorkflowNodeFactory
  private workflowBuilder: WorkflowBuilder

  constructor(io?: Server, workflowEvents?: EventEmitter) {
    this.io = io
    this.workflowEvents = workflowEvents
    this.eventEmitter = new WorkflowEventEmitter(io, workflowEvents)
    this.nodeFactory = new WorkflowNodeFactory(this.executorRegistry, this.eventEmitter)
    this.workflowBuilder = new WorkflowBuilder(
      this.nodeFactory,
      this.conditionEvaluator,
      this.stateManager
    )
    this.initializeExecutors()
  }

  /**
   * Initialize and register all step executors
   */
  private initializeExecutors(): void {
    // Register Claude executor (wraps existing Claude logic)
    const claudeExecutor = new ClaudeStepExecutor(
      this.claudeService,
      this.operator,
      this.agentConfigService,
      this.projectService
    )
    this.executorRegistry.register(claudeExecutor)

    // Register Mock executor (for testing without AI costs)
    const mockExecutor = new MockStepExecutor()
    this.executorRegistry.register(mockExecutor)

    console.log(
      `[WorkflowOrchestrator] Initialized ${this.executorRegistry.getExecutorCount()} executors: ${this.executorRegistry.getAvailableExecutorTypes().join(', ')}`
    )
  }

  /**
   * Get or initialize the checkpointer
   * Lazy initialization to support async checkpointer creation
   */
  private async getCheckpointer(): Promise<BaseCheckpointSaver> {
    if (!this.checkpointer) {
      // Import dynamically to avoid circular dependencies
      const { getCheckpointer } = await import('./database/checkpointer')
      this.checkpointer = await getCheckpointer()
    }
    return this.checkpointer
  }

  /**
   * Emit workflow event - delegates to WorkflowEventEmitter for SOLID compliance
   */
  private emitWorkflowEvent(event: {
    type:
      | 'step_start'
      | 'step_complete'
      | 'step_failed'
      | 'workflow_complete'
      | 'workflow_failed'
      | 'graph_update'
    threadId: string
    stepId?: string
    sessionId?: string
    retry?: number
    status?: string
    lastStep?: string
    projectId?: string
    error?: string
    graph?: WorkflowGraph
  }): void {
    this.eventEmitter.emit(event)
  }

  /**
   * Validate agent configurations before starting workflow
   * Delegates to WorkflowValidator for SOLID compliance
   */
  private async validateAgentConfigs(steps: WorkflowStep[], projectId?: string): Promise<void> {
    return this.validator.validateAgentConfigs(steps, projectId)
  }

  /**
   * Execute invoke request - handles single agent or workflow
   */
  async execute(request: InvokeRequest): Promise<InvokeResponse> {
    const startTime = Date.now()

    // Normalize to array
    const steps = Array.isArray(request.workflow) ? request.workflow : [request.workflow]

    // Generate IDs for steps without them
    const normalizedSteps = steps.map((step, index) => ({
      ...step,
      id: step.id || `step-${index}`,
    }))

    // Validate all agent configurations before starting workflow
    await this.validateAgentConfigs(normalizedSteps, request.projectId)

    // Generate or use threadId as the workflow session identifier
    const threadId = request.threadId || uuidv4()

    // Register workflow for monitoring
    const monitor = WorkflowMonitor.getInstance()
    monitor.registerWorkflow(threadId, request)

    // Fetch actual project name
    let projectName = 'Unknown Project'
    if (request.projectId) {
      try {
        const project = await this.projectService.getProjectWithAgents(request.projectId)
        projectName = project.name
      } catch (error) {
        console.error('Failed to fetch project name:', error)
      }
    }

    // Update status when workflow starts
    await updateWorkflowStatus(threadId, {
      status: 'running',
      currentStep: normalizedSteps[0]?.id,
      startedBy: 'Claude Code CLI', // Default since MCP tools don't send this
      invocation: this.stateManager.generateInvocationSummary(normalizedSteps),
      projectId: request.projectId,
      projectName,
      savedWorkflowId: request.savedWorkflowId,
      steps: normalizedSteps.map((step) => ({
        id: step.id!,
        role: step.role,
        agentId: step.agentId,
        task: step.task,
        status: 'pending' as const,
        dependencies: step.deps || [],
      })),
    })

    // Emit initial graph state
    this.emitGraphUpdate(threadId, normalizedSteps, {}, {})

    // Build and execute workflow
    const checkpointer = await this.getCheckpointer()
    const workflow = await this.workflowBuilder.buildWorkflow(normalizedSteps, checkpointer)

    const initialState = {
      steps: normalizedSteps,
      currentStepIndex: 0,
      stepResults: {},
      stepOutputs: {},
      sessionIds: {},
      threadId,
      projectId: request.projectId,
      status: 'running' as const,
      startNewConversation: request.startNewConversation || false,
    }

    try {
      // Initialize status tracking
      await updateWorkflowStatus(threadId, {
        status: 'running',
        sessionIds: {},
        currentStep: normalizedSteps[0]?.id,
      })

      // Execute workflow
      const finalState = await workflow.invoke(initialState, {
        configurable: { thread_id: threadId },
      })

      // Update final status with completed step information
      const finalStatus = this.stateManager.determineOverallStatus(finalState.stepResults)

      // Build updated steps array with final statuses
      const updatedSteps = this.stateManager.buildUpdatedSteps(
        normalizedSteps,
        finalState.stepResults
      )

      await updateWorkflowStatus(threadId, {
        status: finalStatus === 'completed' ? 'completed' : 'failed',
        sessionIds: finalState.sessionIds,
        steps: updatedSteps,
      })

      // Emit workflow complete event
      this.emitWorkflowEvent({
        type: 'workflow_complete',
        threadId,
        status: finalStatus,
      })

      // Remove from monitoring
      monitor.removeWorkflow(threadId)

      // Update project last activity if projectId is provided
      if (request.projectId) {
        try {
          console.log(
            `[WorkflowOrchestrator] Updating last activity for project: ${request.projectId}`
          )
          await this.projectService.updateLastActivity(request.projectId)
          console.log(
            `[WorkflowOrchestrator] Successfully updated last activity for project: ${request.projectId}`
          )
        } catch (error) {
          console.error('Failed to update project last activity:', error)
          // Don't fail the workflow for this
        }
      }

      // Build response
      const response: InvokeResponse = {
        threadId,
        sessionIds: finalState.sessionIds,
        results: finalState.stepOutputs,
        status: finalStatus,
        summary: this.stateManager.buildSummary(finalState.stepResults, Date.now() - startTime),
      }

      // Format if requested
      if (request.format === 'text') {
        return this.stateManager.formatTextResponse(response)
      }

      return response
    } catch (error) {
      console.error('Workflow execution error:', error)

      // Update status on error/abort
      const abortInfo = detectAbortError(error)
      await updateWorkflowStatus(threadId, {
        status: abortInfo.isAbort ? 'aborted' : 'failed',
      })

      // Emit workflow failed event with last step info for recovery
      // Find the last step that was attempted
      const lastStep = normalizedSteps[normalizedSteps.length - 1]?.id || 'unknown'

      this.emitWorkflowEvent({
        type: 'workflow_failed',
        threadId,
        lastStep,
      })

      // Remove from monitoring on failure
      monitor.removeWorkflow(threadId)

      throw error
    }
  }

  /**
   * Evaluate condition for conditional workflow step
   * SOLID: Single responsibility for condition evaluation
   * DRY: Reuses existing ConditionEvaluator service
   */
  private evaluateStepCondition(
    step: WorkflowStep & { condition?: string },
    state: typeof WorkflowStateSchema.State
  ): 'true' | 'false' {
    if (!step.condition) {
      console.warn(`Conditional step ${step.id} has no condition, defaulting to false`)
      return 'false'
    }

    try {
      // Build condition context from workflow state
      const context: ConditionContext = {
        stepOutputs: state.stepOutputs || {},
        stepResults: state.stepResults || {},
        metadata: {
          threadId: state.threadId,
          projectId: state.projectId,
          currentStepIndex: state.currentStepIndex,
        },
      }

      // Evaluate condition using ConditionEvaluator service
      const result = this.conditionEvaluator.evaluateCondition(step.condition, context)

      if (result.error) {
        console.error(`Condition evaluation error for step ${step.id}: ${result.error}`)
        return 'false' // Default to false on error
      }

      return result.result ? 'true' : 'false'
    } catch (error) {
      console.error(`Unexpected error evaluating condition for step ${step.id}:`, error)
      return 'false' // Default to false on unexpected error
    }
  }

  // Node creation methods moved to WorkflowNodeFactory for SOLID compliance
  /**
   * Get current workflow state by threadId
   * Shows which steps completed, which are in progress, and available sessionIds
   */
  async getWorkflowState(
    threadId: string,
    steps: WorkflowStep[]
  ): Promise<{
    threadId: string
    currentState: WorkflowState | null
    completedSteps: string[]
    pendingSteps: string[]
    sessionIds: Record<string, string>
    canResume: boolean
  }> {
    try {
      // Build workflow to get the compiled graph
      const checkpointer = await this.getCheckpointer()
      const workflow = await this.workflowBuilder.buildWorkflow(steps, checkpointer)

      // Get current state from LangGraph checkpointer
      const state = await workflow.getState({
        configurable: { thread_id: threadId },
      })

      const completedSteps: string[] = []
      const pendingSteps: string[] = []
      const sessionIds: Record<string, string> = {}

      // Analyze state to determine step status
      if (state && state.values) {
        const stepResults = state.values.stepResults || {}
        const currentSessionIds = state.values.sessionIds || {}

        steps.forEach((step) => {
          const stepId = step.id!
          if (stepResults[stepId]) {
            completedSteps.push(stepId)
            if (currentSessionIds[stepId]) {
              sessionIds[stepId] = currentSessionIds[stepId]
            }
          } else {
            pendingSteps.push(stepId)
          }
        })
      } else {
        // No state found - all steps are pending
        steps.forEach((step) => pendingSteps.push(step.id!))
      }

      return {
        threadId,
        currentState: (state?.values as WorkflowState) || null,
        completedSteps,
        pendingSteps,
        sessionIds,
        canResume: completedSteps.length > 0 || (state?.next && state.next.length > 0),
      }
    } catch (error) {
      console.error('Error getting workflow state:', error)
      return {
        threadId,
        currentState: null,
        completedSteps: [],
        pendingSteps: steps.map((s) => s.id!),
        sessionIds: {},
        canResume: false,
      }
    }
  }

  /**
   * Generate workflow graph structure for visualization
   * Delegates to WorkflowGraphGenerator for SOLID compliance
   */
  generateWorkflowGraph(
    steps: WorkflowStep[],
    stepResults: Record<string, StepResult>,
    sessionIds: Record<string, string>,
    consolidateLoops = false
  ): WorkflowGraph {
    return this.graphGenerator.generateWorkflowGraph(
      steps,
      stepResults,
      sessionIds,
      consolidateLoops
    )
  }

  /**
   * Emit graph update event with current workflow state
   */
  private emitGraphUpdate(
    threadId: string,
    steps: WorkflowStep[],
    stepResults: Record<string, StepResult>,
    sessionIds: Record<string, string>,
    currentStepId?: string
  ) {
    const graph = this.generateWorkflowGraph(steps, stepResults, sessionIds)

    // Mark current node if executing
    if (currentStepId && graph.execution) {
      graph.execution.currentNode = currentStepId
    }

    this.emitWorkflowEvent({
      type: 'graph_update',
      threadId,
      graph,
    })
  }

  // Human approval methods removed - use HumanApprovalService directly
}
