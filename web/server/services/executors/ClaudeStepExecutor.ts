/**
 * Claude Step Executor
 * Wraps existing Claude execution logic for the executor pattern
 *
 * SOLID: Single responsibility - Claude AI execution only
 * DRY: Reuses ClaudeService and SimpleOperator
 * KISS: Delegates to existing proven services
 * Library-First: Uses established ClaudeService infrastructure
 */

import type { StepExecutor, WorkflowContext } from './StepExecutor'
import type { StepResult, WorkflowStep } from '../../schemas/invoke'
import { ClaudeService } from '../ClaudeService'
import { UnifiedAgentConfigService, type AgentConfig } from '../UnifiedAgentConfigService'
import { StudioProjectService } from '../StudioProjectService'
import { detectAbortError, AbortError } from '../../utils/errorUtils'
import { updateWorkflowStatus } from '../../api/invoke-status'
import { WorkflowMonitor } from '../WorkflowMonitor'
import { FlowLogger } from '../../utils/FlowLogger'

export class ClaudeStepExecutor implements StepExecutor {
  constructor(
    private claudeService: ClaudeService,
    private agentConfigService: UnifiedAgentConfigService,
    private projectService: StudioProjectService
  ) {}

  canHandle(step: WorkflowStep): boolean {
    // Handle 'task' type with role/agentId (default from schema)
    if (step.type === 'task' && Boolean(step.role || step.agentId)) return true

    // Handle undefined type with role/agentId (backward compatibility)
    if (!step.type && Boolean(step.role || step.agentId)) return true

    // Check if step has an extended type property for 'claude' (ExecutorWorkflowStep)
    // Use type guard to safely check for extended types
    if ('type' in step && (step as Record<string, unknown>).type === 'claude') return true

    return false
  }

  async execute(step: WorkflowStep, context: WorkflowContext): Promise<StepResult> {
    const startTime = Date.now()

    // Update monitor with step start event
    const monitor = WorkflowMonitor.getInstance()
    monitor.updateHeartbeat(context.threadId, step.id!)

    // Log flow for documentation
    FlowLogger.log('step-execution', `Step ${step.id} START (Claude)`)
    FlowLogger.log('step-execution', `-> WorkflowMonitor.updateHeartbeat(${step.id})`)

    // CRITICAL FIX: Mark step as 'running' when execution starts
    // This updates the database to show the step status as 'running' instead of 'pending'
    try {
      // Get current workflow to preserve other steps' statuses
      const { WorkflowRegistry } = await import('../WorkflowRegistry')
      const registry = WorkflowRegistry.getInstance()
      const workflow = await registry.getWorkflow(context.threadId)

      if (workflow?.steps) {
        // Update the current step status to 'running', keep others unchanged
        const updatedSteps = workflow.steps.map((s) =>
          s.id === step.id
            ? { ...s, status: 'running' as const, startTime: new Date().toISOString() }
            : s
        )

        await updateWorkflowStatus(context.threadId, {
          steps: updatedSteps,
          currentStep: step.id,
        })

        console.log(`[ClaudeStepExecutor] Updated step ${step.id} status to 'running'`)
      }
    } catch (error) {
      console.warn(`[ClaudeStepExecutor] Failed to update step status to running: ${error}`)
      // Don't fail the execution if we can't update status
    }

    try {
      // Resolve template variables in task
      let resolvedTask = this.resolveTemplateVariables(step.task, context)
      console.log(`[ClaudeStepExecutor] Step ${step.id} - Original task: ${step.task}`)
      console.log(`[ClaudeStepExecutor] Step ${step.id} - Resolved task: ${resolvedTask}`)

      // Check if this is a resume from a paused workflow and inject system message
      const isPausedResume = await this.checkIfPausedWorkflowResume(context.threadId)
      if (isPausedResume) {
        const systemMessage = `<system-message>Resume work: You were paused and are now resuming execution. Continue from where you left off with the current task. The workflow was paused manually and you should proceed with the next steps as planned.</system-message>\n\n`
        resolvedTask = systemMessage + resolvedTask
        console.log(`[ClaudeStepExecutor] Injected system message for paused workflow resume`)
      }

      // Try to get project agents first
      let agentInstanceId: string | null = null
      let agentShortId: string | null = null

      if (context.projectId) {
        try {
          const projectAgents = await this.projectService.getProjectAgentsWithShortIds(
            context.projectId
          )

          // If agentId is provided, use it directly (short ID like dev_01)
          if (step.agentId) {
            const projectAgent = projectAgents.find((a) => a.shortId === step.agentId)

            if (projectAgent) {
              agentInstanceId = projectAgent.agentConfigId
              agentShortId = projectAgent.shortId
              console.log(
                `[ClaudeStepExecutor] Using project agent by ID: ${projectAgent.shortId} (config: ${agentInstanceId})`
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
              console.log(
                `[ClaudeStepExecutor] Using project agent by role: ${step.role} -> ${projectAgent.shortId} (config: ${agentInstanceId})`
              )
            } else {
              console.log(`[ClaudeStepExecutor] No project agent found for role: ${step.role}`)
            }
          }
        } catch (error) {
          console.log(`[ClaudeStepExecutor] Error getting project agents: ${error}`)
        }
      }

      // Fall back to global agent config if no project agent found
      if (!agentInstanceId) {
        const configs = await this.agentConfigService.getAllConfigs()

        if (step.agentId) {
          // Try to find by exact ID match
          const config = configs.find((c) => c.id === step.agentId)
          if (config) {
            agentInstanceId = config.id
          }
        } else if (step.role) {
          // Find by role
          const config = configs.find((c) => c.role?.toLowerCase() === step.role!.toLowerCase())
          if (config) {
            agentInstanceId = config.id
          }
        }

        if (agentInstanceId) {
          console.log(`[ClaudeStepExecutor] Using global agent config: ${agentInstanceId}`)
        }
      }

      // Validate agent found
      if (!agentInstanceId) {
        throw new Error(
          `No agent found for step: ${JSON.stringify({ role: step.role, agentId: step.agentId })}`
        )
      }

      // Get project workspace path for Studio projects
      let projectPath: string | undefined
      if (context.projectId) {
        try {
          const project = await this.projectService.getProjectWithAgents(context.projectId)
          projectPath = project.workspacePath
          console.log(`[ClaudeStepExecutor] Using project workspace: ${projectPath}`)
        } catch (error) {
          console.log(`[ClaudeStepExecutor] Could not get project workspace: ${error}`)
        }
      }

      // Debug log the context
      console.log(`[ClaudeStepExecutor] Context projectId: ${context.projectId}`)
      console.log(`[ClaudeStepExecutor] Project path: ${projectPath}`)

      // Send message via ClaudeService using the appropriate agent ID
      // For UI compatibility, use shortId for session creation but pass agentConfigId for agent loading
      const sessionAgentId = agentShortId || agentInstanceId! // Use short ID for sessions, config ID as fallback

      // Get agent config to pass system prompt and other settings
      let agentConfig: AgentConfig | undefined
      if (agentInstanceId) {
        const config = await this.agentConfigService.getConfig(agentInstanceId)
        agentConfig = config || undefined
        console.log(
          `[ClaudeStepExecutor] Loaded agent config for ${agentInstanceId}:`,
          JSON.stringify(agentConfig, null, 2)
        )
      }

      // Emit user message through WebSocket for real-time UI updates
      if (context.io && sessionAgentId) {
        console.log(`[ClaudeStepExecutor] Emitting user message for session: ${sessionAgentId}`)
        context.io.emit('message:new', {
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
        context.projectId || '',
        sessionAgentId, // Use short ID for session creation to match UI expectations
        projectPath, // Pass workspace path for proper session isolation
        undefined, // role - let it default
        undefined, // onStream
        context.io,
        step.sessionId ? false : context.startNewConversation, // Don't force new if resuming
        agentConfig, // Pass agent config explicitly since we're using short ID for session
        context.threadId // CRITICAL FIX: Pass threadId to get correct AbortController
      )

      const result = await Promise.race([messagePromise, timeoutPromise])
      FlowLogger.log('step-execution', `<- ClaudeService response received`)

      // Simple success status - evaluation now handled by explicit AI evaluation steps
      FlowLogger.log(
        'step-execution',
        `<- ClaudeStepExecutor: returning success (evaluation extracted to optional AI evaluation steps)`
      )

      // Build step result - always success (evaluation now optional via AI evaluation steps)
      const stepResult: StepResult = {
        id: step.id!,
        status: 'success',
        response: result.response,
        sessionId: result.sessionId || '',
        duration: Date.now() - startTime,
      }

      // Update workflow status with sessionId
      if (result.sessionId) {
        const sessionIds: Record<string, string> = {}
        sessionIds[step.id!] = result.sessionId
        await updateWorkflowStatus(context.threadId, {
          sessionIds,
          currentStep: step.id,
        })
      }

      // Always success - evaluation moved to optional AI evaluation steps
      FlowLogger.log('step-execution', `Step ${step.id} SUCCESS`)
      // Update monitor on step completion
      monitor.updateHeartbeat(context.threadId, step.id!)
      FlowLogger.log('step-execution', `-> WorkflowMonitor.updateHeartbeat(${step.id})`)

      return stepResult
    } catch (error) {
      console.error(`Step ${step.id} error:`, error)

      // Check if this is an abort error using centralized detection
      const abortInfo = detectAbortError(error)

      // Preserve the last known sessionId for the step if it exists
      // If the error is an AbortError, it might have a sessionId attached
      let lastSessionId = context.sessionIds[step.id!] || step.sessionId || ''
      if (error instanceof AbortError && error.sessionId) {
        lastSessionId = error.sessionId
        console.log(`[ClaudeStepExecutor] Using sessionId from AbortError: ${lastSessionId}`)
      }

      // CRITICAL FIX: Check if workflow is paused to set correct step status
      let stepStatus: 'aborted' | 'failed' | 'paused' = 'failed'

      if (abortInfo.isAbort) {
        // Check if the workflow is currently paused (abort was due to pause)
        try {
          const { WorkflowRegistry } = await import('../WorkflowRegistry')
          const registry = WorkflowRegistry.getInstance()
          const workflow = await registry.getWorkflow(context.threadId)

          if (workflow?.status === 'paused') {
            stepStatus = 'paused'
            console.log(
              `[ClaudeStepExecutor] Step ${step.id} marked as 'paused' (workflow was paused)`
            )
          } else {
            stepStatus = 'aborted'
            console.log(
              `[ClaudeStepExecutor] Step ${step.id} marked as 'aborted' (workflow was aborted)`
            )
          }
        } catch (checkError) {
          console.warn(
            `[ClaudeStepExecutor] Could not check workflow status, defaulting to 'aborted': ${checkError}`
          )
          stepStatus = 'aborted'
        }
      }

      // Return error result with correct status
      return {
        id: step.id!,
        status: stepStatus,
        response: abortInfo.message,
        sessionId: lastSessionId, // Preserve sessionId for resume
        duration: Date.now() - startTime,
        abortedAt: abortInfo.isAbort ? new Date().toISOString() : undefined,
      }
    }
  }

  /**
   * Check if this is a resume from a paused workflow
   */
  private async checkIfPausedWorkflowResume(threadId: string): Promise<boolean> {
    try {
      // Import WorkflowRegistry to check current workflow status
      const { WorkflowRegistry } = await import('../WorkflowRegistry')
      const registry = WorkflowRegistry.getInstance()
      const workflow = await registry.getWorkflow(threadId)

      // Return true if the workflow status is 'paused' - indicating we're resuming a paused workflow
      return workflow?.status === 'paused'
    } catch (error) {
      console.error(
        `[ClaudeStepExecutor] Error checking paused resume status for ${threadId}:`,
        error
      )
      return false
    }
  }

  /**
   * Resolve template variables in task (extracted from WorkflowOrchestrator)
   */
  private resolveTemplateVariables(task: string, context: WorkflowContext): string {
    console.log(`[ClaudeStepExecutor] Available step outputs:`, context.stepOutputs)

    // string-template doesn't support nested properties like {step.output}
    // So we need to manually replace them first
    let processedTask = task

    // Replace {stepId.output} with the actual value
    Object.keys(context.stepOutputs).forEach((stepId) => {
      const regex = new RegExp(`\\{${stepId}\\.output\\}`, 'g')
      processedTask = processedTask.replace(regex, context.stepOutputs[stepId])
    })

    // Also support {stepId} syntax for backward compatibility
    Object.keys(context.stepOutputs).forEach((stepId) => {
      const regex = new RegExp(`\\{${stepId}\\}`, 'g')
      processedTask = processedTask.replace(regex, context.stepOutputs[stepId])
    })

    console.log(`[ClaudeStepExecutor] Template resolution: "${task}" -> "${processedTask}"`)
    return processedTask
  }
}
