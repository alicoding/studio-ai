/**
 * Workflow Orchestrator - LangGraph-based agent workflow management
 *
 * SOLID: Single responsibility - workflow orchestration
 * DRY: Reuses extracted services for validation, events, state, and graph generation
 * KISS: Simple node-based workflow with dependency handling
 * Library-First: LangGraph for state, string-template for variables
 */

import { StateGraph, Annotation, BaseCheckpointSaver, type RetryPolicy } from '@langchain/langgraph'
import { v4 as uuidv4 } from 'uuid'
import { ClaudeService } from './ClaudeService'
import { SimpleOperator } from './SimpleOperator'
import { UnifiedAgentConfigService } from './UnifiedAgentConfigService'
import { StudioProjectService } from './StudioProjectService'
import { detectAbortError, AbortError } from '../utils/errorUtils'
import { updateWorkflowStatus } from '../api/invoke-status'
import type { InvokeRequest, InvokeResponse, WorkflowStep, StepResult } from '../schemas/invoke'
import type { WorkflowGraph } from '../schemas/workflow-graph'
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
import { WorkflowValidator } from './WorkflowValidator'
import { WorkflowEventEmitter } from './WorkflowEventEmitter'
import { WorkflowStateManager } from './WorkflowStateManager'
import { WorkflowGraphGenerator } from './WorkflowGraphGenerator'
import { ConditionEvaluator } from './ConditionEvaluator'
import type { ConditionContext } from '../schemas/workflow-builder'

// Extended WorkflowStep type that includes conditional fields and new node types
interface ExtendedWorkflowStep extends WorkflowStep {
  type?: 'task' | 'parallel' | 'conditional' | 'loop' | 'human'
  condition?: string
  trueBranch?: string
  falseBranch?: string
  // Loop-specific fields
  items?: string[] // Array of items to loop over
  loopVar?: string // Variable name for current item
  maxIterations?: number // Maximum number of iterations
  // Human input fields
  prompt?: string // Prompt for human input
  approvalRequired?: boolean // Whether approval is required
  timeoutSeconds?: number // Timeout for human input
  // Parallel fields
  parallelSteps?: string[] // IDs of steps to run in parallel
}

// Type guard to check if step is conditional
function isConditionalStep(step: WorkflowStep): step is ExtendedWorkflowStep {
  return 'type' in step && (step as ExtendedWorkflowStep).type === 'conditional'
}

// Type guard to check if step is loop
function isLoopStep(step: WorkflowStep): step is ExtendedWorkflowStep {
  return 'type' in step && (step as ExtendedWorkflowStep).type === 'loop'
}

// Type guard to check if step is parallel
function isParallelStep(step: WorkflowStep): step is ExtendedWorkflowStep {
  return 'type' in step && (step as ExtendedWorkflowStep).type === 'parallel'
}

// Type guard to check if step is human input
function isHumanStep(step: WorkflowStep): step is ExtendedWorkflowStep {
  return 'type' in step && (step as ExtendedWorkflowStep).type === 'human'
}

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
  status: Annotation<'running' | 'completed' | 'partial' | 'failed' | 'aborted'>({
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
  private validator = new WorkflowValidator()
  private eventEmitter: WorkflowEventEmitter
  private stateManager = new WorkflowStateManager()
  private graphGenerator = new WorkflowGraphGenerator()
  private conditionEvaluator = ConditionEvaluator.getInstance()

  constructor(io?: Server, workflowEvents?: EventEmitter) {
    this.io = io
    this.workflowEvents = workflowEvents
    this.eventEmitter = new WorkflowEventEmitter(io, workflowEvents)
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
    // IMPORTANT: Skip conditional steps - they are not execution nodes
    steps.forEach((step) => {
      if (isConditionalStep(step)) {
        // Conditional steps are handled with conditional edges, not as nodes
        return
      }

      if (isLoopStep(step)) {
        // Loop nodes need special handling for iteration
        workflow.addNode(step.id!, this.createLoopNode(step), { retryPolicy })
      } else if (isParallelStep(step)) {
        // Parallel nodes coordinate parallel execution
        workflow.addNode(step.id!, this.createParallelNode(step), { retryPolicy })
      } else if (isHumanStep(step)) {
        // Human input nodes pause for approval
        workflow.addNode(step.id!, this.createHumanNode(step), { retryPolicy })
      } else {
        // Regular task nodes
        workflow.addNode(step.id!, this.createStepNode(step), { retryPolicy })
      }
    })

    // Add edges based on dependencies and conditional logic
    steps.forEach((step) => {
      // Handle conditional steps with LangGraph conditional edges
      if (isConditionalStep(step) && step.condition) {
        // For conditional steps, add conditional edges from each dependency
        if (step.deps && step.deps.length > 0) {
          step.deps.forEach((depId) => {
            // Add conditional edges from the dependency to the branches
            workflow.addConditionalEdges(
              depId as '__start__',
              (state: typeof WorkflowStateSchema.State) => {
                return this.evaluateStepCondition(step, state)
              },
              {
                true: step.trueBranch || '__end__',
                false: step.falseBranch || '__end__',
              }
            )
          })
        }
      } else {
        // Standard dependency-based edges for non-conditional steps
        if (step.deps && step.deps.length > 0) {
          // Filter out conditional dependencies and only add edges for non-conditional deps
          const nonConditionalDeps = step.deps.filter((depId) => {
            const depStep = steps.find((s) => s.id === depId)
            return !(depStep && isConditionalStep(depStep))
          })

          // Add edges for non-conditional dependencies
          nonConditionalDeps.forEach((depId) => {
            workflow.addEdge(depId as '__start__', step.id! as '__start__')
          })

          // If this step only has conditional dependencies, it will be routed by conditional edges
          // so we don't need to add any edges here
        } else {
          // No dependencies - connect from start (allows parallel execution)
          workflow.addEdge('__start__', step.id! as '__start__')
        }
      }
    })

    // Connect final steps to end
    const finalSteps = this.stateManager.findFinalSteps(steps)
    finalSteps.forEach((stepId) => {
      workflow.addEdge(stepId as '__start__', '__end__')
    })

    const checkpointer = await this.getCheckpointer()
    return workflow.compile({ checkpointer })
  }

  /**
   * Evaluate condition for conditional workflow step
   * SOLID: Single responsibility for condition evaluation
   * DRY: Reuses existing ConditionEvaluator service
   */
  private evaluateStepCondition(
    step: ConditionalWorkflowStep,
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
        // Check if dependencies are satisfied using state manager
        const depCheck = this.stateManager.areDependenciesSatisfied(
          step,
          state.stepResults,
          state.steps
        )
        if (!depCheck.satisfied) {
          return {
            stepResults: {
              [step.id!]: {
                id: step.id!,
                status: 'blocked' as const,
                response: `Blocked: dependency ${depCheck.failedDependency} did not complete successfully`,
                sessionId: '',
                duration: Date.now() - startTime,
              },
            },
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
   * Create a LangGraph node for loop execution
   * Uses native LangGraph patterns for iteration
   */
  private createLoopNode(step: ExtendedWorkflowStep) {
    return async (state: typeof WorkflowStateSchema.State) => {
      const startTime = Date.now()

      // Emit loop start event
      this.emitWorkflowEvent({
        type: 'step_start',
        threadId: state.threadId,
        stepId: step.id,
      })

      try {
        // Get items to loop over
        const items = step.items || []
        const loopVar = step.loopVar || 'item'
        const maxIterations = step.maxIterations || items.length

        const loopResults: StepResult[] = []
        const loopOutputs: string[] = []

        // Execute loop iterations
        for (let i = 0; i < Math.min(items.length, maxIterations); i++) {
          const item = items[i]

          // Create a loop context with the current item
          const loopContext = {
            ...state,
            [`${loopVar}`]: item,
            [`${loopVar}_index`]: i,
          }

          // Execute the loop body (task with template variables)
          const taskWithLoopVars = step.task?.replace(new RegExp(`\\{${loopVar}\\}`, 'g'), item)

          const loopStep = {
            ...step,
            id: `${step.id}_iteration_${i}`,
            task: taskWithLoopVars || step.task,
          }

          // Execute using the appropriate executor
          const context: WorkflowContext = {
            step: loopStep,
            state: loopContext as typeof WorkflowStateSchema.State,
            templateVariables: this.stateManager.resolveTemplateVariables(
              loopStep.task || '',
              loopContext.stepOutputs
            ),
          }

          const executor = this.executorRegistry.getExecutor()
          const result = await executor.execute(context)

          loopResults.push(result)
          loopOutputs.push(result.response)
        }

        // Combine loop results
        const combinedResult: StepResult = {
          stepId: step.id!,
          status: loopResults.every((r) => r.status === 'success') ? 'success' : 'failed',
          response: loopOutputs.join('\n---\n'),
          sessionId: loopResults[0]?.sessionId,
          duration: Date.now() - startTime,
        }

        this.emitWorkflowEvent({
          type: 'step_complete',
          threadId: state.threadId,
          stepId: step.id,
        })

        return {
          stepResults: { ...state.stepResults, [step.id!]: combinedResult },
          stepOutputs: { ...state.stepOutputs, [step.id!]: combinedResult.response },
          sessionIds: { ...state.sessionIds, [step.id!]: combinedResult.sessionId },
        }
      } catch (error) {
        console.error(`Loop ${step.id} error:`, error)
        const errorResult: StepResult = {
          stepId: step.id!,
          status: 'failed',
          response: `Loop execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: Date.now() - startTime,
        }

        return {
          stepResults: { ...state.stepResults, [step.id!]: errorResult },
          stepOutputs: { ...state.stepOutputs, [step.id!]: errorResult.response },
          status: 'failed' as const,
        }
      }
    }
  }

  /**
   * Create a LangGraph node for parallel execution
   * Uses native LangGraph branching for parallel flows
   */
  private createParallelNode(step: ExtendedWorkflowStep) {
    return async (state: typeof WorkflowStateSchema.State) => {
      const startTime = Date.now()

      // Emit parallel start event
      this.emitWorkflowEvent({
        type: 'step_start',
        threadId: state.threadId,
        stepId: step.id,
      })

      try {
        // Get parallel step IDs
        const parallelStepIds = step.parallelSteps || []

        // Execute all parallel steps concurrently
        const parallelPromises = parallelStepIds.map(async (stepId) => {
          const parallelStep = state.steps.find((s) => s.id === stepId)
          if (!parallelStep) {
            throw new Error(`Parallel step ${stepId} not found`)
          }

          const context: WorkflowContext = {
            step: parallelStep,
            state,
            templateVariables: this.stateManager.resolveTemplateVariables(
              parallelStep.task || '',
              state.stepOutputs
            ),
          }

          const executor = this.executorRegistry.getExecutor()
          return executor.execute(context)
        })

        // Wait for all parallel executions
        const parallelResults = await Promise.allSettled(parallelPromises)

        // Process results
        const successResults = parallelResults
          .filter((r): r is PromiseFulfilledResult<StepResult> => r.status === 'fulfilled')
          .map((r) => r.value)

        const failedResults = parallelResults.filter(
          (r): r is PromiseRejectedResult => r.status === 'rejected'
        )

        // Combine parallel results
        const combinedResult: StepResult = {
          stepId: step.id!,
          status: failedResults.length === 0 ? 'success' : 'failed',
          response: successResults.map((r) => r.response).join('\n---\n'),
          sessionId: successResults[0]?.sessionId,
          duration: Date.now() - startTime,
        }

        this.emitWorkflowEvent({
          type: 'step_complete',
          threadId: state.threadId,
          stepId: step.id,
        })

        // Update state with results from all parallel steps
        const newStepResults = { ...state.stepResults }
        const newStepOutputs = { ...state.stepOutputs }
        const newSessionIds = { ...state.sessionIds }

        successResults.forEach((result) => {
          newStepResults[result.stepId] = result
          newStepOutputs[result.stepId] = result.response
          if (result.sessionId) {
            newSessionIds[result.stepId] = result.sessionId
          }
        })

        // Also add the parallel node result
        newStepResults[step.id!] = combinedResult
        newStepOutputs[step.id!] = combinedResult.response
        if (combinedResult.sessionId) {
          newSessionIds[step.id!] = combinedResult.sessionId
        }

        return {
          stepResults: newStepResults,
          stepOutputs: newStepOutputs,
          sessionIds: newSessionIds,
        }
      } catch (error) {
        console.error(`Parallel ${step.id} error:`, error)
        const errorResult: StepResult = {
          stepId: step.id!,
          status: 'failed',
          response: `Parallel execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: Date.now() - startTime,
        }

        return {
          stepResults: { ...state.stepResults, [step.id!]: errorResult },
          stepOutputs: { ...state.stepOutputs, [step.id!]: errorResult.response },
          status: 'failed' as const,
        }
      }
    }
  }

  /**
   * Create a LangGraph node for human input/approval
   * Implements human-in-the-loop pattern
   */
  private createHumanNode(step: ExtendedWorkflowStep) {
    return async (state: typeof WorkflowStateSchema.State) => {
      const startTime = Date.now()

      // Emit human input request event
      this.emitWorkflowEvent({
        type: 'human_input_required',
        threadId: state.threadId,
        stepId: step.id,
        prompt: step.prompt || 'Human approval required',
      })

      try {
        // For now, we'll simulate human approval
        // In a real implementation, this would pause and wait for actual human input
        // This could be implemented via:
        // 1. WebSocket event to frontend
        // 2. Polling endpoint for approval status
        // 3. Callback URL for approval webhook

        console.log(`Human input requested for step ${step.id}: ${step.prompt}`)

        // Simulate approval after a delay (in real implementation, this would wait for actual input)
        if (process.env.USE_MOCK_AI === 'true') {
          await new Promise((resolve) => setTimeout(resolve, 2000))

          const approvalResult: StepResult = {
            stepId: step.id!,
            status: 'success',
            response: 'Human approval granted (simulated)',
            duration: Date.now() - startTime,
          }

          this.emitWorkflowEvent({
            type: 'human_input_received',
            threadId: state.threadId,
            stepId: step.id,
            approved: true,
          })

          this.emitWorkflowEvent({
            type: 'step_complete',
            threadId: state.threadId,
            stepId: step.id,
          })

          return {
            stepResults: { ...state.stepResults, [step.id!]: approvalResult },
            stepOutputs: { ...state.stepOutputs, [step.id!]: approvalResult.response },
          }
        }

        // In production, this would integrate with a real approval system
        throw new Error('Human input workflow not fully implemented for production use')
      } catch (error) {
        console.error(`Human input ${step.id} error:`, error)
        const errorResult: StepResult = {
          stepId: step.id!,
          status: 'failed',
          response: `Human input failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: Date.now() - startTime,
        }

        return {
          stepResults: { ...state.stepResults, [step.id!]: errorResult },
          stepOutputs: { ...state.stepOutputs, [step.id!]: errorResult.response },
          status: 'failed' as const,
        }
      }
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
}
