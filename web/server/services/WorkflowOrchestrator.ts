/**
 * Workflow Orchestrator - LangGraph-based agent workflow management
 *
 * SOLID: Single responsibility - workflow orchestration
 * DRY: Reuses ClaudeService for agents, SimpleOperator for routing
 * KISS: Simple node-based workflow with dependency handling
 * Library-First: LangGraph for state, string-template for variables
 */

import { StateGraph, Annotation, BaseCheckpointSaver, type RetryPolicy } from '@langchain/langgraph'
import format from 'string-template'
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

// Template context type
interface TemplateContext {
  [key: string]: { output: string } | string | undefined
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

  constructor(io?: Server, workflowEvents?: EventEmitter) {
    this.io = io
    this.workflowEvents = workflowEvents
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
    type: 'step_start' | 'step_complete' | 'step_failed' | 'workflow_complete' | 'workflow_failed'
    threadId: string
    stepId?: string
    sessionId?: string
    retry?: number
    status?: string
    lastStep?: string
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

        // Resolve template variables in task
        const resolvedTask = this.resolveTemplateVariables(step.task, state)
        console.log(`[WorkflowOrchestrator] Step ${step.id} - Original task: ${step.task}`)
        console.log(`[WorkflowOrchestrator] Step ${step.id} - Resolved task: ${resolvedTask}`)
        console.log(
          `[WorkflowOrchestrator] Step ${step.id} - Available outputs:`,
          Object.keys(state.stepOutputs)
        )

        // Try to get project agents first
        let agentInstanceId: string | null = null
        let agentShortId: string | null = null
        let agentRole: string | null = null
        let globalAgentConfig: { id: string; role?: string; systemPrompt?: string } | null = null

        if (state.projectId) {
          try {
            const projectAgents = await this.projectService.getProjectAgentsWithShortIds(
              state.projectId
            )

            // If agentId is provided, use it directly (short ID like dev_01)
            if (step.agentId) {
              const projectAgent = projectAgents.find((a) => a.shortId === step.agentId)

              if (projectAgent) {
                agentInstanceId = projectAgent.agentConfigId
                agentShortId = projectAgent.shortId
                agentRole = projectAgent.role
                console.log(
                  `[WorkflowOrchestrator] Using project agent by ID: ${projectAgent.shortId} (config: ${agentInstanceId})`
                )
              } else {
                throw new Error(`Agent with ID ${step.agentId} not found in project`)
              }
            }
            // Legacy: If role is provided, find by role
            else if (step.role) {
              const projectAgent = projectAgents.find(
                (a) => a.role?.toLowerCase() === step.role!.toLowerCase()
              )

              if (projectAgent) {
                agentInstanceId = projectAgent.agentConfigId
                agentShortId = projectAgent.shortId
                agentRole = projectAgent.role
                console.log(
                  `[WorkflowOrchestrator] Using project agent ${projectAgent.shortId} (config: ${agentInstanceId}) for role ${step.role}`
                )
              }
            }
          } catch (error) {
            console.log(`[WorkflowOrchestrator] Could not get project agents: ${error}`)
          }
        }

        // Fall back to global agent config if no project agent found (only for role-based)
        if (!agentInstanceId && step.role) {
          const agents = await this.agentConfigService.getAllConfigs()
          globalAgentConfig =
            agents.find((a: AgentConfig) => a.role?.toLowerCase() === step.role!.toLowerCase()) ||
            null

          if (!globalAgentConfig) {
            throw new Error(`No agent found for role: ${step.role}`)
          }

          agentInstanceId = globalAgentConfig.id
          agentRole = globalAgentConfig.role || step.role
          console.log(
            `[WorkflowOrchestrator] Using global agent config ${agentInstanceId} for role ${step.role}`
          )
        }

        if (!agentInstanceId) {
          throw new Error(
            `No agent found for step: ${JSON.stringify({ role: step.role, agentId: step.agentId })}`
          )
        }

        // Get project workspace path for Studio projects
        let projectPath: string | undefined
        if (state.projectId) {
          try {
            const project = await this.projectService.getProjectWithAgents(state.projectId)
            projectPath = project.workspacePath
            console.log(`[WorkflowOrchestrator] Using project workspace: ${projectPath}`)
          } catch (error) {
            console.log(`[WorkflowOrchestrator] Could not get project workspace: ${error}`)
          }
        }

        // Send message via ClaudeService using the appropriate agent ID
        // For UI compatibility, use shortId for session creation but pass agentConfigId for agent loading
        const sessionAgentId = agentShortId || agentInstanceId! // Use short ID for sessions, config ID as fallback

        // Get agent config to pass system prompt and other settings
        let agentConfig: AgentConfig | undefined
        if (agentInstanceId) {
          const config = await this.agentConfigService.getConfig(agentInstanceId)
          agentConfig = config || undefined
          console.log(
            `[WorkflowOrchestrator] Loaded agent config for ${agentInstanceId}:`,
            JSON.stringify(agentConfig, null, 2)
          )
        }

        // Emit user message through WebSocket for real-time UI updates
        if (this.io && sessionAgentId) {
          console.log(`[WorkflowOrchestrator] Emitting user message for session: ${sessionAgentId}`)
          this.io.emit('message:new', {
            sessionId: sessionAgentId,
            message: {
              role: 'user',
              content: resolvedTask,
              timestamp: new Date().toISOString(),
            },
          })
        }

        FlowLogger.log('step-execution', `-> ClaudeService.sendMessage()`)

        // Simple timeout using Promise.race - Library-First approach
        const STEP_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes
        const timeoutPromise: Promise<never> = new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error(`Step timed out after ${STEP_TIMEOUT_MS / 1000} seconds`)),
            STEP_TIMEOUT_MS
          )
        })

        const messagePromise = this.claudeService.sendMessage(
          resolvedTask,
          state.projectId,
          sessionAgentId, // Use short ID for session creation to match UI expectations
          projectPath, // Pass workspace path for proper session isolation
          undefined, // role - let it default
          undefined, // onStream
          this.io,
          step.sessionId ? false : state.startNewConversation, // Don't force new if resuming
          agentConfig // Pass agent config explicitly since we're using short ID for session
        )

        const result = await Promise.race([messagePromise, timeoutPromise])
        FlowLogger.log('step-execution', `<- ClaudeService response received`)

        // Check status with operator - pass context for accurate evaluation
        FlowLogger.log('step-execution', `-> SimpleOperator.checkStatus()`)
        const analysis = await this.operator.checkStatus(result.response, {
          role: agentRole || step.role || 'agent', // Use the agent's role for context
          task: resolvedTask,
          roleSystemPrompt: globalAgentConfig?.systemPrompt || undefined,
        })
        FlowLogger.log('step-execution', `<- Operator analysis: ${analysis.status}`)

        // Build step result
        const stepResult: StepResult = {
          id: step.id!,
          status: analysis.status,
          response: result.response,
          sessionId: result.sessionId || '',
          duration: Date.now() - startTime,
        }

        // Emit step complete event with sessionId for recovery
        if (analysis.status === 'success') {
          FlowLogger.log('step-execution', `Step ${step.id} SUCCESS - emitting step_complete`)
          this.emitWorkflowEvent({
            type: 'step_complete',
            threadId: state.threadId,
            stepId: step.id,
            sessionId: result.sessionId || undefined,
          })
          // Update monitor on step completion
          monitor.updateHeartbeat(state.threadId, step.id)
          FlowLogger.log('step-execution', `-> WorkflowMonitor.updateHeartbeat(${step.id})`)
        } else {
          FlowLogger.log('step-execution', `Step ${step.id} FAILED - status: ${analysis.status}`)
        }

        // Update workflow status with sessionId
        if (result.sessionId) {
          const sessionIds: Record<string, string> = {}
          sessionIds[step.id!] = result.sessionId
          await updateWorkflowStatus(state.threadId, {
            sessionIds,
            currentStep: step.id,
          })
        }

        // Update state - merge with existing state
        return {
          stepResults: { ...state.stepResults, [step.id!]: stepResult },
          stepOutputs: { ...state.stepOutputs, [step.id!]: result.response },
          sessionIds: { ...state.sessionIds, [step.id!]: result.sessionId },
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
   * Resolve template variables in task
   */
  private resolveTemplateVariables(task: string, state: typeof WorkflowStateSchema.State): string {
    // Build context for template resolution
    const context: TemplateContext = {}

    // Add step outputs - string-template doesn't support nested properties
    // So we need to flatten {step.output} to {step_output}
    console.log(`[WorkflowOrchestrator] Available step outputs:`, state.stepOutputs)
    state.steps.forEach((step) => {
      if (step.id && state.stepOutputs[step.id]) {
        // Support both {stepId.output} and {stepId} syntax
        context[`${step.id}.output`] = state.stepOutputs[step.id]
        context[step.id] = state.stepOutputs[step.id]
        console.log(
          `[WorkflowOrchestrator] Added to context: ${step.id}.output = "${state.stepOutputs[step.id].substring(0, 50)}..."`
        )
      }
    })

    // Add special variables
    if (state.steps.length > 0 && state.currentStepIndex > 0) {
      const prevStepId = state.steps[state.currentStepIndex - 1].id
      if (prevStepId && state.stepOutputs[prevStepId]) {
        context.previousOutput = state.stepOutputs[prevStepId]
      }
    }

    // string-template doesn't support nested properties like {step.output}
    // So we need to manually replace them first
    let processedTask = task

    // Replace {stepId.output} with the actual value
    Object.keys(state.stepOutputs).forEach((stepId) => {
      const regex = new RegExp(`\\{${stepId}\\.output\\}`, 'g')
      processedTask = processedTask.replace(regex, state.stepOutputs[stepId])
    })

    // Now use string-template for any remaining simple variables
    console.log(`[WorkflowOrchestrator] Template context:`, JSON.stringify(context, null, 2))
    console.log(`[WorkflowOrchestrator] Pre-processed task: "${task}" -> "${processedTask}"`)
    const resolved = format(processedTask, context)
    console.log(`[WorkflowOrchestrator] Final resolution: "${resolved}"`)
    return resolved
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
}
