/**
 * Workflow Node Factory - Creates LangGraph nodes for different step types
 *
 * SOLID: Single responsibility - node creation logic
 * DRY: Centralized node creation patterns
 * KISS: Simple factory pattern for node types
 * Library-First: Uses LangGraph node patterns
 */

import { StepExecutorRegistry, type WorkflowContext } from './executors'
import { WorkflowEventEmitter } from './WorkflowEventEmitter'
import { FlowLogger } from '../utils/FlowLogger'
import type { WorkflowStep, StepResult } from '../schemas/invoke'
import { ApprovalOrchestrator } from './ApprovalOrchestrator'
import type { RiskLevel } from '../schemas/approval-types'

// Extended WorkflowStep type with new node fields
interface ExtendedWorkflowStep extends WorkflowStep {
  type?: 'task' | 'parallel' | 'conditional' | 'loop' | 'human'
  // Loop-specific fields
  items?: string[]
  loopVar?: string
  maxIterations?: number
  // Human input fields
  prompt?: string
  approvalRequired?: boolean
  timeoutSeconds?: number
  riskLevel?: RiskLevel
  // Parallel fields
  parallelSteps?: string[]
}

// LangGraph state schema type
type WorkflowStateSchema = {
  State: {
    stepResults: Record<string, StepResult>
    stepOutputs: Record<string, string>
    sessionIds: Record<string, string>
    threadId: string
    [key: string]: unknown
  }
}

export class WorkflowNodeFactory {
  constructor(
    private executorRegistry: StepExecutorRegistry,
    private eventEmitter: WorkflowEventEmitter
  ) {}

  /**
   * Create a LangGraph node for regular task execution
   */
  createTaskNode(step: ExtendedWorkflowStep) {
    return async (state: WorkflowStateSchema['State']) => {
      const startTime = Date.now()

      // Emit step start event
      this.eventEmitter.emit({
        type: 'step_start',
        threadId: state.threadId,
        stepId: step.id,
      })

      try {
        // Create workflow context
        const context: WorkflowContext = {
          stepResults: state.stepResults || {},
          stepOutputs: state.stepOutputs || {},
          sessionIds: state.sessionIds || {},
          threadId: state.threadId,
        }

        // Get appropriate executor and execute step
        const executor = this.executorRegistry.getExecutor(step, context)
        FlowLogger.log('step-execution', `-> ${executor.constructor.name}.execute(${step.id})`)

        const stepResult = await executor.execute(step, context)

        FlowLogger.log(
          'step-execution',
          `<- ${executor.constructor.name} completed with status: ${stepResult.status}`
        )

        // Emit step events based on result
        if (stepResult.status === 'success') {
          this.eventEmitter.emit({
            type: 'step_complete',
            threadId: state.threadId,
            stepId: step.id,
            sessionId: stepResult.sessionId || undefined,
          })
        }

        // Update state
        return {
          stepResults: { ...state.stepResults, [step.id!]: stepResult },
          stepOutputs: { ...state.stepOutputs, [step.id!]: stepResult.response },
          sessionIds: { ...state.sessionIds, [step.id!]: stepResult.sessionId },
        }
      } catch (error) {
        console.error(`Step ${step.id} error:`, error)

        const errorResult: StepResult = {
          id: step.id!,
          status: 'failed',
          response: `Step failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          sessionId: state.sessionIds[step.id!] || '',
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
   * Create a LangGraph node for loop execution
   */
  createLoopNode(step: ExtendedWorkflowStep) {
    return async (state: WorkflowStateSchema['State']) => {
      const startTime = Date.now()

      this.eventEmitter.emit({
        type: 'step_start',
        threadId: state.threadId,
        stepId: step.id,
      })

      try {
        const items = step.items || []
        const loopVar = step.loopVar || 'item'
        const maxIterations = step.maxIterations || items.length

        const results: string[] = []
        const actualIterations = Math.min(maxIterations, items.length)

        for (let i = 0; i < actualIterations; i++) {
          const item = items[i]
          FlowLogger.log(
            'loop-execution',
            `Loop ${step.id} iteration ${i + 1}/${actualIterations}: ${loopVar}=${item}`
          )

          // Create iteration result
          results.push(`Processed ${loopVar}=${item}`)
        }

        const loopResult: StepResult = {
          id: step.id!,
          status: 'success',
          response: `Loop completed: ${results.join(', ')}`,
          sessionId: '',
          duration: Date.now() - startTime,
        }

        this.eventEmitter.emit({
          type: 'step_complete',
          threadId: state.threadId,
          stepId: step.id,
        })

        return {
          stepResults: { ...state.stepResults, [step.id!]: loopResult },
          stepOutputs: { ...state.stepOutputs, [step.id!]: loopResult.response },
        }
      } catch (error) {
        console.error(`Loop ${step.id} error:`, error)
        const errorResult: StepResult = {
          id: step.id!,
          status: 'failed',
          response: `Loop execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          sessionId: '',
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
   */
  createParallelNode(step: ExtendedWorkflowStep) {
    return async (state: WorkflowStateSchema['State']) => {
      const startTime = Date.now()

      this.eventEmitter.emit({
        type: 'step_start',
        threadId: state.threadId,
        stepId: step.id,
      })

      try {
        const parallelSteps = step.parallelSteps || []
        FlowLogger.log(
          'parallel-execution',
          `Parallel ${step.id} executing ${parallelSteps.length} steps`
        )

        // Simulate parallel execution results
        const results = await Promise.allSettled(
          parallelSteps.map(async (stepId) => {
            return `Parallel step ${stepId} completed`
          })
        )

        const successfulResults = results
          .filter(
            (result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled'
          )
          .map((result) => result.value)

        const parallelResult: StepResult = {
          id: step.id!,
          status: 'success',
          response: `Parallel execution completed: ${successfulResults.join(', ')}`,
          sessionId: '',
          duration: Date.now() - startTime,
        }

        this.eventEmitter.emit({
          type: 'step_complete',
          threadId: state.threadId,
          stepId: step.id,
        })

        return {
          stepResults: { ...state.stepResults, [step.id!]: parallelResult },
          stepOutputs: { ...state.stepOutputs, [step.id!]: parallelResult.response },
        }
      } catch (error) {
        console.error(`Parallel ${step.id} error:`, error)
        const errorResult: StepResult = {
          id: step.id!,
          status: 'failed',
          response: `Parallel execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          sessionId: '',
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
   */
  createHumanNode(step: ExtendedWorkflowStep) {
    return async (state: WorkflowStateSchema['State']) => {
      const startTime = Date.now()

      this.eventEmitter.emit({
        type: 'human_input_required',
        threadId: state.threadId,
        stepId: step.id,
        prompt: step.prompt || 'Human approval required',
      })

      try {
        console.log(`Human input requested for step ${step.id}: ${step.prompt}`)

        // Mock mode for testing
        if (process.env.USE_MOCK_AI === 'true') {
          await new Promise((resolve) => setTimeout(resolve, 2000))

          const approvalResult: StepResult = {
            id: step.id!,
            status: 'success',
            response: 'Human approval granted (simulated)',
            sessionId: '',
            duration: Date.now() - startTime,
          }

          this.eventEmitter.emit({
            type: 'human_input_received',
            threadId: state.threadId,
            stepId: step.id,
            approved: true,
          })

          this.eventEmitter.emit({
            type: 'step_complete',
            threadId: state.threadId,
            stepId: step.id,
          })

          return {
            stepResults: { ...state.stepResults, [step.id!]: approvalResult },
            stepOutputs: { ...state.stepOutputs, [step.id!]: approvalResult.response },
          }
        }

        // Production mode - real human approval using new ApprovalOrchestrator
        const approvalOrchestrator = new ApprovalOrchestrator()

        // Create approval request
        const approval = await approvalOrchestrator.createApproval({
          threadId: state.threadId,
          stepId: step.id!,
          projectId: state.projectId,
          workflowName: state.workflowName,
          prompt: step.prompt || 'Human approval required to continue',
          contextData: {
            workflowSteps: Object.entries(state.stepResults || {}).map(([id, result]) => ({
              id,
              task: result.id,
              status: result.status,
              output: result.response,
              executedAt: new Date().toISOString(),
            })),
            previousStepOutputs: state.stepOutputs || {},
            currentStepIndex: Object.keys(state.stepResults || {}).length,
          },
          riskLevel: this.determineRiskLevel(step),
          timeoutSeconds: step.timeoutSeconds || 3600,
          approvalRequired: step.approvalRequired ?? true,
          autoApproveAfterTimeout: false,
        })

        // Emit approval request event for UI notification
        this.eventEmitter.emit({
          type: 'approval_requested',
          threadId: state.threadId,
          stepId: step.id,
          approvalId: approval.id,
          prompt: approval.prompt,
          timeoutSeconds: approval.timeoutSeconds,
        })

        // Wait for approval decision with polling
        const approved = await this.waitForApprovalDecision(approval.id, approval.timeoutSeconds)

        const approvalResult: StepResult = {
          id: step.id!,
          status: approved ? 'success' : 'failed',
          response: approved ? 'Human approval granted' : 'Human approval rejected',
          sessionId: '',
          duration: Date.now() - startTime,
        }

        this.eventEmitter.emit({
          type: 'human_input_received',
          threadId: state.threadId,
          stepId: step.id,
          approved,
        })

        this.eventEmitter.emit({
          type: 'step_complete',
          threadId: state.threadId,
          stepId: step.id,
        })

        return {
          stepResults: { ...state.stepResults, [step.id!]: approvalResult },
          stepOutputs: { ...state.stepOutputs, [step.id!]: approvalResult.response },
        }
      } catch (error) {
        console.error(`Human input ${step.id} error:`, error)
        const errorResult: StepResult = {
          id: step.id!,
          status: 'failed',
          response: `Human input failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          sessionId: '',
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
   * Determine risk level based on step configuration
   * SOLID: Single responsibility - risk assessment logic
   */
  private determineRiskLevel(step: ExtendedWorkflowStep): RiskLevel {
    // Check for explicit risk level configuration
    if (step.riskLevel) return step.riskLevel

    // Analyze step task content for risk indicators
    const task = step.task?.toLowerCase() || ''
    const prompt = step.prompt?.toLowerCase() || ''
    const content = `${task} ${prompt}`

    // High risk keywords
    if (
      content.includes('delete') ||
      content.includes('remove') ||
      content.includes('production') ||
      content.includes('deploy') ||
      content.includes('publish') ||
      content.includes('release')
    ) {
      return 'high'
    }

    // Critical risk keywords
    if (
      content.includes('database') ||
      content.includes('payment') ||
      content.includes('billing') ||
      content.includes('security') ||
      content.includes('admin') ||
      content.includes('root')
    ) {
      return 'critical'
    }

    // Low risk for simple operations
    if (
      content.includes('read') ||
      content.includes('view') ||
      content.includes('list') ||
      content.includes('get')
    ) {
      return 'low'
    }

    // Default to medium risk
    return 'medium'
  }

  /**
   * Wait for approval decision with polling
   * SOLID: Single responsibility - approval polling logic
   */
  private async waitForApprovalDecision(
    approvalId: string,
    timeoutSeconds: number
  ): Promise<boolean> {
    const approvalOrchestrator = new ApprovalOrchestrator()
    const pollInterval = 2000 // 2 seconds
    const maxPolls = Math.ceil((timeoutSeconds * 1000) / pollInterval)
    let polls = 0

    while (polls < maxPolls) {
      try {
        const approval = await approvalOrchestrator.getApproval(approvalId)

        if (!approval) {
          throw new Error(`Approval ${approvalId} not found`)
        }

        if (approval.status === 'approved') {
          return true
        }

        if (approval.status === 'rejected') {
          return false
        }

        if (approval.status === 'expired' || approval.status === 'cancelled') {
          throw new Error(`Approval ${approvalId} was ${approval.status}`)
        }

        // Still pending, continue polling
        await new Promise((resolve) => setTimeout(resolve, pollInterval))
        polls++
      } catch (error) {
        console.error(`Error polling approval ${approvalId}:`, error)
        throw error
      }
    }

    // Timeout reached
    throw new Error(`Approval ${approvalId} timed out after ${timeoutSeconds} seconds`)
  }
}
