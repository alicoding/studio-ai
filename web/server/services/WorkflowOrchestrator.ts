/**
 * Workflow Orchestrator - LangGraph-based agent workflow management
 *
 * SOLID: Single responsibility - workflow orchestration
 * DRY: Reuses ClaudeService for agents, SimpleOperator for routing
 * KISS: Simple node-based workflow with dependency handling
 * Library-First: LangGraph for state, string-template for variables
 */

import { StateGraph, Annotation, MemorySaver } from '@langchain/langgraph'
import format from 'string-template'
import { v4 as uuidv4 } from 'uuid'
import { ClaudeService } from './ClaudeService'
import { SimpleOperator } from './SimpleOperator'
import { ServerAgentConfigService } from './ServerAgentConfigService'
import { ProjectService } from './ProjectService'
import { detectAbortError, AbortError } from '../utils/errorUtils'
import { updateWorkflowStatus } from '../api/invoke-status'
import type { InvokeRequest, InvokeResponse, WorkflowStep, StepResult } from '../schemas/invoke'
import type { Server } from 'socket.io'

// Project agent type from workspace
interface ProjectAgent {
  id: string
  configId?: string
  name: string
  role: string
  status: 'online' | 'offline'
  sessionId: string | null
  messageCount: number
  totalTokens: number
  lastMessage: string
  hasSession: boolean
}

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
  private agentConfigService = ServerAgentConfigService.getInstance()
  private projectService = new ProjectService()
  private memory = new MemorySaver()
  private io?: Server

  constructor(io?: Server) {
    this.io = io
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

    // Generate or use threadId as the workflow session identifier
    const threadId = request.threadId || uuidv4()

    // Build and execute workflow
    const workflow = this.buildWorkflow(normalizedSteps)

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
      updateWorkflowStatus(threadId, {
        status: 'running',
        sessionIds: {},
        currentStep: normalizedSteps[0]?.id,
      })

      // Execute workflow
      const finalState = await workflow.invoke(initialState, {
        configurable: { thread_id: threadId },
      })

      // Update final status
      const finalStatus = this.determineOverallStatus(finalState.stepResults)
      updateWorkflowStatus(threadId, {
        status: finalStatus === 'completed' ? 'completed' : 'failed',
        sessionIds: finalState.sessionIds,
      })

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
      updateWorkflowStatus(threadId, {
        status: abortInfo.isAbort ? 'aborted' : 'failed',
      })

      throw error
    }
  }

  /**
   * Build LangGraph workflow from steps
   */
  private buildWorkflow(steps: WorkflowStep[]) {
    const workflow = new StateGraph(WorkflowStateSchema)

    // Add a node for each step
    steps.forEach((step) => {
      workflow.addNode(step.id!, this.createStepNode(step))
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

    return workflow.compile({ checkpointer: this.memory })
  }

  /**
   * Create a LangGraph node for a workflow step
   */
  private createStepNode(step: WorkflowStep) {
    return async (state: typeof WorkflowStateSchema.State) => {
      const startTime = Date.now()

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
        let agent: ProjectAgent | null = null
        let globalAgentConfig: { id: string; role?: string; systemPrompt?: string } | null = null
        let agentInstanceId: string | null = null

        if (state.projectId) {
          try {
            const projectAgents = (await this.projectService.getProjectAgents(
              state.projectId
            )) as ProjectAgent[]

            // If agentId is provided, use it directly (short ID like dev_01)
            if (step.agentId) {
              const projectAgent = projectAgents.find((a) => a.id === step.agentId)

              if (projectAgent) {
                agent = projectAgent
                agentInstanceId = projectAgent.id
                console.log(`[WorkflowOrchestrator] Using project agent by ID: ${agentInstanceId}`)
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
                agent = projectAgent
                agentInstanceId = projectAgent.id
                console.log(
                  `[WorkflowOrchestrator] Using project agent ${agentInstanceId} for role ${step.role}`
                )
              }
            }
          } catch (error) {
            console.log(`[WorkflowOrchestrator] Could not get project agents: ${error}`)
          }
        }

        // Fall back to global agent config if no project agent found (only for role-based)
        if (!agent && step.role) {
          const agents = await this.agentConfigService.getAllAgents()
          globalAgentConfig =
            agents.find((a) => a.role?.toLowerCase() === step.role!.toLowerCase()) || null

          if (!globalAgentConfig) {
            throw new Error(`No agent found for role: ${step.role}`)
          }

          agentInstanceId = globalAgentConfig.id
          console.log(
            `[WorkflowOrchestrator] Using global agent config ${agentInstanceId} for role ${step.role}`
          )
        }

        if (!agentInstanceId) {
          throw new Error(
            `No agent found for step: ${JSON.stringify({ role: step.role, agentId: step.agentId })}`
          )
        }

        // Send message via ClaudeService using the appropriate agent ID
        const result = await this.claudeService.sendMessage(
          resolvedTask,
          state.projectId,
          agentInstanceId!, // Use instance ID for project agents, config ID for global
          undefined, // projectPath
          undefined, // role - let it default
          undefined, // onStream
          this.io,
          step.sessionId ? false : state.startNewConversation // Don't force new if resuming
        )

        // Check status with operator - pass context for accurate evaluation
        const analysis = await this.operator.checkStatus(result.response, {
          role: step.role || agent?.role || 'agent',
          task: resolvedTask,
          roleSystemPrompt: globalAgentConfig?.systemPrompt || undefined,
        })

        // Build step result
        const stepResult: StepResult = {
          id: step.id!,
          status: analysis.status,
          response: result.response,
          sessionId: result.sessionId || '',
          duration: Date.now() - startTime,
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
      const workflow = this.buildWorkflow(steps)

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
}
