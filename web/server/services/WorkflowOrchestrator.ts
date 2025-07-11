/**
 * Workflow Orchestrator - LangGraph-based agent workflow management
 *
 * SOLID: Single responsibility - workflow orchestration
 * DRY: Reuses ClaudeService for agents, SimpleOperator for routing
 * KISS: Simple node-based workflow with dependency handling
 * Library-First: LangGraph for state, string-template for variables
 */

import { StateGraph, Annotation, BaseCheckpointSaver, type RetryPolicy } from '@langchain/langgraph'
import { v4 as uuidv4 } from 'uuid'
import { ClaudeService } from './ClaudeService'
import { SimpleOperator } from './SimpleOperator'
import { UnifiedAgentConfigService, type AgentConfig } from './UnifiedAgentConfigService'
import { StudioProjectService } from './StudioProjectService'
import { detectAbortError, AbortError } from '../utils/errorUtils'
import { updateWorkflowStatus } from '../api/invoke-status'
import type { InvokeRequest, InvokeResponse, WorkflowStep, StepResult } from '../schemas/invoke'
import type {
  WorkflowGraph,
  WorkflowNode,
  WorkflowEdge,
  WorkflowLoop,
} from '../schemas/workflow-graph'
import type { Server } from 'socket.io'
import { EventEmitter } from 'events'
import { WorkflowMonitor } from './WorkflowMonitor'
import { FlowLogger } from '../utils/FlowLogger'
import {
  StepExecutorRegistry,
  MockStepExecutor,
  ClaudeStepExecutor,
  type WorkflowContext,
} from './executors'

// LangGraph state type
interface WorkflowState {
  stepResults: Record<string, StepResult>
  stepOutputs: Record<string, string>
  sessionIds: Record<string, string>
  currentStepIndex: number
  status: 'running' | 'completed' | 'partial' | 'failed' | 'aborted'
  [key: string]: unknown
}

// Workflow state schema
const WorkflowStateSchema = Annotation.Root({
  steps: Annotation<WorkflowStep[]>({
    reducer: (x, y) => y,
    default: () => [],
  }),
  currentStepIndex: Annotation<number>({
    reducer: (x, y) => y,
    default: () => 0,
  }),
  stepResults: Annotation<Record<string, StepResult>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  stepOutputs: Annotation<Record<string, string>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  sessionIds: Annotation<Record<string, string>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  threadId: Annotation<string>({
    reducer: (x, y) => y,
    default: () => '',
  }),
  projectId: Annotation<string>({
    reducer: (x, y) => y,
    default: () => '',
  }),
  status: Annotation<'running' | 'completed' | 'partial' | 'failed'>({
    reducer: (x, y) => y,
    default: () => 'running',
  }),
  startNewConversation: Annotation<boolean>({
    reducer: (x, y) => y,
    default: () => false,
  }),
})

export class WorkflowOrchestrator {
  private claudeService = new ClaudeService()
  private operator = new SimpleOperator()
  private agentConfigService = UnifiedAgentConfigService.getInstance()
  private projectService = new StudioProjectService()
  private checkpointer: BaseCheckpointSaver | null = null
  private io?: Server
  private workflowEvents?: EventEmitter
  private executorRegistry = new StepExecutorRegistry()

  constructor(io?: Server, workflowEvents?: EventEmitter) {
    this.io = io
    this.workflowEvents = workflowEvents
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
   * Emit workflow event to both Socket.io and EventEmitter
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
    if (this.io) {
      this.io.emit('workflow:update', event)
    }
    if (this.workflowEvents) {
      this.workflowEvents.emit('workflow:update', event)
    }
  }

  /**
   * Validate agent configurations before starting workflow
   * Prevents stuck workflows by failing fast on invalid agents
   */
  private async validateAgentConfigs(steps: WorkflowStep[], projectId?: string): Promise<void> {
    for (const step of steps) {
      // Must specify either agentId or role
      if (!step.agentId && !step.role) {
        throw new Error(
          'Agent configuration validation failed: Must specify either agentId or role for each step'
        )
      }

      // Validate agent exists
      if (step.agentId) {
        // Check project agents first if projectId provided
        if (projectId) {
          try {
            const projectAgents = await this.projectService.getProjectAgentsWithShortIds(projectId)
            const projectAgent = projectAgents.find((a) => a.shortId === step.agentId)

            if (!projectAgent) {
              throw new Error(
                `Agent configuration validation failed: Agent with ID "${step.agentId}" not found in project`
              )
            }

            // Verify the agent config exists
            const agentConfig = await this.agentConfigService.getConfig(projectAgent.agentConfigId)
            if (!agentConfig) {
              throw new Error(
                `Agent configuration validation failed: Agent config "${projectAgent.agentConfigId}" not found for agent "${step.agentId}"`
              )
            }
          } catch (error) {
            if (
              error instanceof Error &&
              error.message.includes('Agent configuration validation failed')
            ) {
              throw error
            }
            throw new Error(
              `Agent configuration validation failed: Could not validate agent "${step.agentId}" in project - ${error}`
            )
          }
        } else {
          // No project ID - agentId should be a global config ID
          const agentConfig = await this.agentConfigService.getConfig(step.agentId)
          if (!agentConfig) {
            throw new Error(
              `Agent configuration validation failed: Agent config "${step.agentId}" not found`
            )
          }
        }
      } else if (step.role) {
        // Validate role-based agent
        let found = false

        // Check project agents first if projectId provided
        if (projectId) {
          try {
            const projectAgents = await this.projectService.getProjectAgentsWithShortIds(projectId)
            const projectAgent = projectAgents.find(
              (a) => a.role?.toLowerCase() === step.role!.toLowerCase()
            )
            if (projectAgent) {
              found = true
            }
          } catch (_error) {
            // Project not found or no agents - continue to check global
          }
        }

        // Check global agents if not found in project
        if (!found) {
          const agents = await this.agentConfigService.getAllConfigs()
          const globalAgent = agents.find(
            (a: AgentConfig) => a.role?.toLowerCase() === step.role!.toLowerCase()
          )
          if (!globalAgent) {
            throw new Error(
              `Agent configuration validation failed: No agent found for role "${step.role}"`
            )
          }
        }
      }
    }
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

    // Update status when workflow starts
    await updateWorkflowStatus(threadId, {
      status: 'running',
      currentStep: normalizedSteps[0]?.id,
      startedBy: 'Claude Code CLI', // Default since MCP tools don't send this
      invocation: this.generateInvocationSummary(normalizedSteps),
      projectId: request.projectId,
      projectName: 'Current Project', // Default until we fetch project name
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
    const workflow = await this.buildWorkflow(normalizedSteps)

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
      const finalStatus = this.determineOverallStatus(finalState.stepResults)

      // Build updated steps array with final statuses
      const updatedSteps = normalizedSteps.map((step) => {
        const stepResult = finalState.stepResults[step.id!]

        // Map step result status to allowed step status types
        let stepStatus: 'pending' | 'running' | 'completed' | 'failed' = 'pending'
        if (stepResult) {
          switch (stepResult.status) {
            case 'success':
              stepStatus = 'completed'
              break
            case 'failed':
            case 'blocked':
              stepStatus = 'failed'
              break
            default:
              stepStatus = 'pending'
          }
        }

        return {
          id: step.id!,
          role: step.role,
          agentId: step.agentId,
          task: step.task,
          status: stepStatus,
          dependencies: step.deps || [],
          startTime: stepResult?.duration
            ? new Date(Date.now() - stepResult.duration).toISOString()
            : undefined,
          endTime: stepResult?.duration ? new Date().toISOString() : undefined,
          error: stepResult?.status !== 'success' ? stepResult?.response : undefined,
        }
      })

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
        summary: this.buildSummary(finalState.stepResults, Date.now() - startTime),
      }

      // Format if requested
      if (request.format === 'text') {
        return this.formatTextResponse(response)
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
   * Build LangGraph workflow from steps
   */
  private async buildWorkflow(steps: WorkflowStep[]) {
    const workflow = new StateGraph(WorkflowStateSchema)

    // Define retry policy for all nodes
    const retryPolicy: RetryPolicy = {
      maxAttempts: 3,
      initialInterval: 1000, // 1 second
      backoffFactor: 2,
      maxInterval: 30000, // 30 seconds
      jitter: true,
      retryOn: (error) => {
        // Retry on network errors, timeouts, and other transient failures
        // Don't retry on validation errors or explicit failures
        const message = error?.message || ''
        const nonRetryableErrors = [
          'validation failed',
          'invalid configuration',
          'unauthorized',
          'forbidden',
        ]
        return !nonRetryableErrors.some((err) => message.toLowerCase().includes(err))
      },
    }

    // Add a node for each step with retry policy
    steps.forEach((step) => {
      workflow.addNode(step.id!, this.createStepNode(step), { retryPolicy })
    })

    // Add edges based on dependencies
    steps.forEach((step) => {
      if (step.deps && step.deps.length > 0) {
        // This step depends on others - add edges from dependencies
        step.deps.forEach((depId) => {
          workflow.addEdge(depId as '__start__', step.id! as '__start__')
        })
      } else {
        // No dependencies - connect from start (allows parallel execution)
        workflow.addEdge('__start__', step.id! as '__start__')
      }
    })

    // Connect final steps to end
    const finalSteps = this.findFinalSteps(steps)
    finalSteps.forEach((stepId) => {
      workflow.addEdge(stepId as '__start__', '__end__')
    })

    const checkpointer = await this.getCheckpointer()
    return workflow.compile({ checkpointer })
  }

  /**
   * Create a LangGraph node for a workflow step
   * Refactored to use executor pattern for AI-agnostic workflow orchestration
   */
  private createStepNode(step: WorkflowStep) {
    return async (state: typeof WorkflowStateSchema.State) => {
      const startTime = Date.now()

      // Emit step start event for recovery tracking
      this.emitWorkflowEvent({
        type: 'step_start',
        threadId: state.threadId,
        stepId: step.id,
      })

      // Update monitor with step start event
      const monitor = WorkflowMonitor.getInstance()
      monitor.updateHeartbeat(state.threadId, step.id)

      // Emit graph update showing current step
      this.emitGraphUpdate(
        state.threadId,
        state.steps,
        state.stepResults,
        state.sessionIds,
        step.id // Current step being executed
      )

      // Log flow for documentation
      FlowLogger.log('step-execution', `Step ${step.id} START`)
      FlowLogger.log('step-execution', `-> WorkflowMonitor.updateHeartbeat(${step.id})`)

      try {
        // Check if dependencies are satisfied
        if (step.deps) {
          for (const depId of step.deps) {
            const depResult = state.stepResults[depId]
            if (!depResult || depResult.status !== 'success') {
              // Dependency failed - skip this step
              return {
                stepResults: {
                  [step.id!]: {
                    id: step.id!,
                    status: 'blocked' as const,
                    response: `Blocked: dependency ${depId} did not complete successfully`,
                    sessionId: '',
                    duration: Date.now() - startTime,
                  },
                },
              }
            }
          }
        }

        // EXECUTOR PATTERN: Get appropriate executor for this step
        const executor = this.executorRegistry.getExecutor(step)
        console.log(
          `[WorkflowOrchestrator] Step ${step.id} using executor: ${executor.constructor.name}`
        )

        // Build executor context from workflow state
        const context: WorkflowContext = {
          stepOutputs: state.stepOutputs,
          projectId: state.projectId,
          threadId: state.threadId,
          io: this.io,
          sessionIds: state.sessionIds,
          startNewConversation: state.startNewConversation,
        }

        // DELEGATE EXECUTION: Let the executor handle the step
        FlowLogger.log('step-execution', `-> ${executor.constructor.name}.execute()`)
        const stepResult = await executor.execute(step, context)
        FlowLogger.log(
          'step-execution',
          `<- ${executor.constructor.name} completed with status: ${stepResult.status}`
        )

        // Emit step events based on result
        if (stepResult.status === 'success') {
          FlowLogger.log('step-execution', `Step ${step.id} SUCCESS - emitting step_complete`)
          this.emitWorkflowEvent({
            type: 'step_complete',
            threadId: state.threadId,
            stepId: step.id,
            sessionId: stepResult.sessionId || undefined,
          })
          // Update monitor on step completion
          monitor.updateHeartbeat(state.threadId, step.id)
          FlowLogger.log('step-execution', `-> WorkflowMonitor.updateHeartbeat(${step.id})`)
        } else {
          FlowLogger.log('step-execution', `Step ${step.id} FAILED - status: ${stepResult.status}`)
        }

        // Emit graph update after step completion
        this.emitGraphUpdate(
          state.threadId,
          state.steps,
          { ...state.stepResults, [step.id!]: stepResult },
          { ...state.sessionIds, [step.id!]: stepResult.sessionId || '' }
        )

        // Update workflow status with sessionId
        if (stepResult.sessionId) {
          const sessionIds: Record<string, string> = {}
          sessionIds[step.id!] = stepResult.sessionId
          await updateWorkflowStatus(state.threadId, {
            sessionIds,
            currentStep: step.id,
          })
        }

        // Update state - merge with existing state
        return {
          stepResults: { ...state.stepResults, [step.id!]: stepResult },
          stepOutputs: { ...state.stepOutputs, [step.id!]: stepResult.response },
          sessionIds: { ...state.sessionIds, [step.id!]: stepResult.sessionId },
          currentStepIndex: state.currentStepIndex + 1,
        }
      } catch (error) {
        console.error(`Step ${step.id} error:`, error)

        // Check if this is an abort error using centralized detection
        const abortInfo = detectAbortError(error)

        // Preserve the last known sessionId for the step if it exists
        // If the error is an AbortError, it might have a sessionId attached
        let lastSessionId = state.sessionIds[step.id!] || step.sessionId || ''
        if (error instanceof AbortError && error.sessionId) {
          lastSessionId = error.sessionId
          console.log(`[WorkflowOrchestrator] Using sessionId from AbortError: ${lastSessionId}`)
        }

        // Emit step failed event for recovery
        this.emitWorkflowEvent({
          type: 'step_failed',
          threadId: state.threadId,
          stepId: step.id,
          retry: 0, // Retry count tracked by LangGraph's RetryPolicy
        })

        return {
          stepResults: {
            ...state.stepResults,
            [step.id!]: {
              id: step.id!,
              status: abortInfo.isAbort ? ('aborted' as const) : ('failed' as const),
              response: abortInfo.message,
              sessionId: lastSessionId, // Preserve sessionId for resume
              duration: Date.now() - startTime,
              abortedAt: abortInfo.isAbort ? new Date().toISOString() : undefined,
            },
          },
          status: abortInfo.isAbort ? ('aborted' as const) : ('failed' as const),
          // Preserve all sessionIds for potential resume
          sessionIds: state.sessionIds,
        }
      }
    }
  }

  /**
   * Find steps with no dependents (final steps)
   */
  private findFinalSteps(steps: WorkflowStep[]): string[] {
    const stepIds = new Set(steps.map((s) => s.id!))
    const dependedOn = new Set<string>()

    steps.forEach((step) => {
      if (step.deps) {
        step.deps.forEach((depId) => dependedOn.add(depId))
      }
    })

    return Array.from(stepIds).filter((id) => !dependedOn.has(id))
  }

  /**
   * Determine overall workflow status
   */
  private determineOverallStatus(
    stepResults: Record<string, StepResult>
  ): 'completed' | 'partial' | 'failed' {
    const results = Object.values(stepResults)

    if (results.length === 0) return 'failed'

    const hasFailures = results.some((r) => r.status === 'failed')
    const hasBlocked = results.some((r) => r.status === 'blocked')
    const allSuccess = results.every((r) => r.status === 'success')

    if (allSuccess) return 'completed'
    if (hasFailures) return 'failed'
    if (hasBlocked) return 'partial'

    return 'partial'
  }

  /**
   * Build summary statistics
   */
  private buildSummary(stepResults: Record<string, StepResult>, totalDuration: number) {
    const results = Object.values(stepResults)

    return {
      total: results.length,
      successful: results.filter((r) => r.status === 'success').length,
      failed: results.filter((r) => r.status === 'failed').length,
      blocked: results.filter((r) => r.status === 'blocked').length,
      duration: totalDuration,
    }
  }

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
      const workflow = await this.buildWorkflow(steps)

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
   * Generate a readable summary of the workflow invocation
   */
  private generateInvocationSummary(steps: WorkflowStep[]): string {
    if (steps.length === 1) {
      return steps[0].task
    }

    const taskCount = steps.length
    const roles = [...new Set(steps.map((step) => step.role || step.agentId).filter(Boolean))]

    if (roles.length === 1) {
      return `${taskCount} tasks for ${roles[0]}`
    }

    return `${taskCount} tasks across ${roles.length} agents`
  }

  /**
   * Format response as text for MCP
   */
  private formatTextResponse(response: InvokeResponse): InvokeResponse {
    const textResults = Object.entries(response.results)
      .map(([stepId, output]) => {
        const sessionId = response.sessionIds[stepId]
        return `Step ${stepId} (session: ${sessionId}):\n${output}`
      })
      .join('\n\n---\n\n')

    return {
      ...response,
      results: { text: textResults },
    }
  }

  /**
   * Generate workflow graph structure for visualization
   * KISS: Simple node/edge generation based on workflow steps
   * DRY: Reuses step information already available
   */
  generateWorkflowGraph(
    steps: WorkflowStep[],
    stepResults: Record<string, StepResult>,
    sessionIds: Record<string, string>
  ): WorkflowGraph {
    // Generate nodes with auto-layout positions
    const nodes: WorkflowNode[] = steps.map((step, index) => {
      const result = stepResults[step.id!]
      const x = this.calculateNodeX(step, steps)
      const y = this.calculateNodeY(step, steps, index)

      return {
        id: step.id!,
        type: 'step',
        data: {
          agentId: step.agentId,
          role: step.role,
          task: step.task,
          status: this.mapResultStatusToNodeStatus(result?.status),
          startTime: result ? Date.now() - result.duration : undefined,
          endTime: result ? Date.now() : undefined,
          output: result?.response,
          error: result?.status === 'failed' ? result?.response : undefined,
          sessionId: sessionIds[step.id!],
        },
        position: { x, y },
      }
    })

    // Generate edges based on dependencies
    const edges: WorkflowEdge[] = []
    steps.forEach((step) => {
      if (step.deps && step.deps.length > 0) {
        step.deps.forEach((depId) => {
          edges.push({
            id: `${depId}-${step.id}`,
            source: depId,
            target: step.id!,
            type: 'dependency',
            animated: false, // StepResult doesn't have 'running' status
          })
        })
      }
    })

    // Detect loops in execution
    const loops = this.detectLoops(steps, stepResults)

    // Build execution path
    const executionPath = this.buildExecutionPath(steps, stepResults)

    return {
      nodes,
      edges,
      execution: {
        path: executionPath,
        loops,
        currentNode: this.findCurrentNode(stepResults),
        resumePoints: this.findResumePoints(stepResults),
        startTime: Math.min(...Object.values(stepResults).map((r) => Date.now() - r.duration)),
        endTime: this.isWorkflowComplete(stepResults) ? Date.now() : undefined,
      },
    }
  }

  /**
   * Calculate X position for node based on dependencies
   */
  private calculateNodeX(step: WorkflowStep, allSteps: WorkflowStep[]): number {
    const baseX = 100
    const spacing = 300

    // Calculate depth (distance from start)
    const depth = this.calculateDepth(step.id!, allSteps)
    return baseX + depth * spacing
  }

  /**
   * Calculate Y position for node to avoid overlaps
   */
  private calculateNodeY(step: WorkflowStep, allSteps: WorkflowStep[], _index: number): number {
    const baseY = 100
    const spacing = 150

    // Group by depth level
    const depth = this.calculateDepth(step.id!, allSteps)
    const sameDepthSteps = allSteps.filter((s) => this.calculateDepth(s.id!, allSteps) === depth)

    const positionInLevel = sameDepthSteps.findIndex((s) => s.id === step.id)
    return baseY + positionInLevel * spacing
  }

  /**
   * Calculate depth of a step in the dependency graph
   */
  private calculateDepth(stepId: string, allSteps: WorkflowStep[]): number {
    const step = allSteps.find((s) => s.id === stepId)
    if (!step || !step.deps || step.deps.length === 0) {
      return 0
    }

    const depDepths = step.deps.map((depId) => this.calculateDepth(depId, allSteps))
    return Math.max(...depDepths) + 1
  }

  /**
   * Map step result status to node visualization status
   */
  private mapResultStatusToNodeStatus(
    status?: 'success' | 'failed' | 'blocked' | 'running'
  ): 'pending' | 'running' | 'completed' | 'failed' | 'blocked' {
    if (!status) return 'pending'

    switch (status) {
      case 'success':
        return 'completed'
      case 'failed':
        return 'failed'
      case 'blocked':
        return 'blocked'
      case 'running':
        return 'running'
      default:
        return 'pending'
    }
  }

  /**
   * Detect loops in workflow execution
   */
  private detectLoops(
    steps: WorkflowStep[],
    _stepResults: Record<string, StepResult>
  ): WorkflowLoop[] {
    const loops: WorkflowLoop[] = []

    // Simple loop detection: check if outputs reference previous steps multiple times
    steps.forEach((step) => {
      if (step.task.includes('.output}')) {
        // Extract referenced step IDs
        const references = step.task.match(/\{(\w+)\.output\}/g) || []
        const referencedIds = references
          .map((ref) => ref.match(/\{(\w+)\.output\}/)?.[1])
          .filter(Boolean)

        // Check if this forms a cycle
        referencedIds.forEach((refId) => {
          const referencedStep = steps.find((s) => s.id === refId)
          if (referencedStep?.deps?.includes(step.id!)) {
            // Found a loop!
            loops.push({
              nodes: [refId!, step.id!],
              iterations: 1, // TODO: Track actual iterations
              active: false, // StepResult doesn't have 'running' status
            })
          }
        })
      }
    })

    return loops
  }

  /**
   * Build execution path from step results
   */
  private buildExecutionPath(
    _steps: WorkflowStep[],
    stepResults: Record<string, StepResult>
  ): string[] {
    // Since we don't have startTime, we'll use the order in stepResults
    // Steps that completed will have results
    return Object.entries(stepResults)
      .filter(([_, result]) => result.status === 'success' || result.status === 'failed')
      .map(([stepId]) => stepId)
  }

  /**
   * Find currently executing node
   */
  private findCurrentNode(_stepResults: Record<string, StepResult>): string | undefined {
    // StepResult doesn't have 'running' status, so we can't detect currently running nodes
    // This would need to be tracked separately during execution
    return undefined
  }

  /**
   * Find resume points in workflow
   */
  private findResumePoints(stepResults: Record<string, StepResult>): string[] {
    return Object.entries(stepResults)
      .filter(([_, result]) => result.status === 'blocked' || result.status === 'failed')
      .map(([stepId]) => stepId)
  }

  /**
   * Check if workflow is complete
   */
  private isWorkflowComplete(stepResults: Record<string, StepResult>): boolean {
    return Object.values(stepResults).every(
      (result) => result.status === 'success' || result.status === 'failed'
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
}
