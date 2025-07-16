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

// WorkflowStep from schemas now includes all needed fields, no need to extend
// Type alias for clarity
type ExtendedWorkflowStep = WorkflowStep

// LangGraph state schema type
type WorkflowStateSchema = {
  State: {
    steps: WorkflowStep[]
    stepResults: Record<string, StepResult>
    stepOutputs: Record<string, string>
    sessionIds: Record<string, string>
    threadId: string
    projectId?: string
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
        const executor = this.executorRegistry.getExecutor(step)
        FlowLogger.log(
          'step-execution',
          `-> ${executor.constructor.name}.execute(${step.id || 'unknown'})`
        )

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
        const loopStepIds = step.loopSteps || []

        FlowLogger.log(
          'loop-execution',
          `Loop ${step.id} starting with ${items.length} items, executing ${loopStepIds.length} steps per iteration`
        )

        // Find the actual workflow steps to execute for each iteration
        const stepsToExecute = loopStepIds
          .map((stepId: string) => state.steps.find((s) => s.id === stepId))
          .filter((s): s is ExtendedWorkflowStep => !!s)

        if (stepsToExecute.length === 0 && loopStepIds.length > 0) {
          throw new Error(`No valid steps found for loop execution: ${loopStepIds.join(', ')}`)
        }

        const actualIterations = Math.min(maxIterations, items.length)
        const allIterationResults: Array<{
          item: string
          index: number
          results: Record<string, StepResult>
        }> = []

        // Execute loop iterations
        for (let i = 0; i < actualIterations; i++) {
          const item = items[i]
          FlowLogger.log(
            'loop-execution',
            `Loop ${step.id} iteration ${i + 1}/${actualIterations}: ${loopVar}=${item}`
          )

          // Emit iteration start event
          this.eventEmitter.emit({
            type: 'step_start',
            threadId: state.threadId,
            stepId: `${step.id}_iteration_${i + 1}`,
          })

          const currentIterationResults: Record<string, StepResult> = {}

          // Execute each step in the loop with variable substitution
          for (const loopStep of stepsToExecute) {
            // Create a copy of the step with variable substitution
            const substitutedStep = this.substituteLoopVariable(loopStep, loopVar, item)

            // Create workflow context for this iteration
            const context: WorkflowContext = {
              stepResults: { ...state.stepResults, ...currentIterationResults },
              stepOutputs: state.stepOutputs || {},
              sessionIds: state.sessionIds || {},
              threadId: state.threadId,
            }

            // Get appropriate executor and execute step
            const executor = this.executorRegistry.getExecutor(substitutedStep)
            FlowLogger.log(
              'loop-execution',
              `-> ${executor.constructor.name}.execute(${substitutedStep.id || 'unknown'}) with ${loopVar}=${item}`
            )

            try {
              const stepResult = await executor.execute(substitutedStep, context)
              currentIterationResults[loopStep.id!] = stepResult

              FlowLogger.log(
                'loop-execution',
                `<- ${executor.constructor.name} completed with status: ${stepResult.status}`
              )
            } catch (stepError) {
              FlowLogger.log(
                'loop-execution',
                `Step ${loopStep.id} failed in iteration ${i + 1}: ${stepError}`
              )

              currentIterationResults[loopStep.id!] = {
                id: loopStep.id!,
                status: 'failed',
                response: `Step failed: ${stepError instanceof Error ? stepError.message : 'Unknown error'}`,
                sessionId: '',
                duration: Date.now() - startTime,
              }
            }
          }

          // Store iteration results
          allIterationResults.push({
            item,
            index: i,
            results: currentIterationResults,
          })

          // Emit iteration complete event
          this.eventEmitter.emit({
            type: 'step_complete',
            threadId: state.threadId,
            stepId: `${step.id}_iteration_${i + 1}`,
          })
        }

        // Aggregate results
        const allSuccessful = allIterationResults.every((iteration) =>
          Object.values(iteration.results).every((result) => result.status === 'success')
        )

        const summary = allIterationResults
          .map((iteration, idx) => {
            const stepStatuses = Object.entries(iteration.results)
              .map(([stepId, result]) => `${stepId}: ${result.status}`)
              .join(', ')
            return `Iteration ${idx + 1} (${loopVar}=${iteration.item}): ${stepStatuses}`
          })
          .join('; ')

        const loopResult: StepResult = {
          id: step.id!,
          status: allSuccessful ? 'success' : 'failed',
          response: `Loop completed ${actualIterations} iterations: ${summary}`,
          sessionId: '',
          duration: Date.now() - startTime,
        }

        // Update state with all iteration results
        const newStepResults = { ...state.stepResults }
        const newStepOutputs = { ...state.stepOutputs }

        // Store individual iteration results
        allIterationResults.forEach((iteration, _idx) => {
          Object.entries(iteration.results).forEach(([stepId, result]) => {
            const iterationStepId = `${stepId}_${loopVar}_${iteration.item}`
            newStepResults[iterationStepId] = result
            newStepOutputs[iterationStepId] = result.response
          })
        })

        // Store overall loop result
        newStepResults[step.id!] = loopResult
        newStepOutputs[step.id!] = loopResult.response

        this.eventEmitter.emit({
          type: 'step_complete',
          threadId: state.threadId,
          stepId: step.id,
        })

        return {
          stepResults: newStepResults,
          stepOutputs: newStepOutputs,
          ...(loopResult.status === 'failed' ? { status: 'failed' as const } : {}),
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
   * Substitute loop variable in step configuration
   */
  private substituteLoopVariable(
    step: ExtendedWorkflowStep,
    loopVar: string,
    value: string
  ): ExtendedWorkflowStep {
    // Create a deep copy of the step
    const substituted = JSON.parse(JSON.stringify(step))

    // Replace {loopVar} with actual value in relevant fields
    const varPattern = new RegExp(`\\{${loopVar}\\}`, 'g')

    if (substituted.task) {
      substituted.task = substituted.task.replace(varPattern, value)
    }

    if (substituted.prompt) {
      substituted.prompt = substituted.prompt.replace(varPattern, value)
    }

    if (substituted.description) {
      substituted.description = substituted.description.replace(varPattern, value)
    }

    // Update the step ID to make it unique per iteration
    substituted.id = `${step.id}_${loopVar}_${value}`

    return substituted
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
        const parallelStepIds = step.parallelSteps || []
        FlowLogger.log(
          'parallel-execution',
          `Parallel ${step.id} executing ${parallelStepIds.length} steps`
        )

        // Find the actual workflow steps from state
        const stepsToExecute = parallelStepIds
          .map((stepId) => state.steps.find((s) => s.id === stepId))
          .filter((s): s is ExtendedWorkflowStep => !!s)

        if (stepsToExecute.length === 0) {
          throw new Error(
            `No valid steps found for parallel execution: ${parallelStepIds.join(', ')}`
          )
        }

        // Create workflow context for each parallel step
        const context: WorkflowContext = {
          stepResults: state.stepResults || {},
          stepOutputs: state.stepOutputs || {},
          sessionIds: state.sessionIds || {},
          threadId: state.threadId,
        }

        // Execute all steps in parallel
        const results = await Promise.allSettled(
          stepsToExecute.map(async (parallelStep) => {
            // Emit start event for each parallel step
            this.eventEmitter.emit({
              type: 'step_start',
              threadId: state.threadId,
              stepId: parallelStep.id,
            })

            // Get appropriate executor and execute step
            const executor = this.executorRegistry.getExecutor(parallelStep)
            FlowLogger.log(
              'parallel-execution',
              `-> ${executor.constructor.name}.execute(${parallelStep.id || 'unknown'})`
            )

            const stepResult = await executor.execute(parallelStep, context)

            FlowLogger.log(
              'parallel-execution',
              `<- ${executor.constructor.name} completed with status: ${stepResult.status}`
            )

            // Emit completion event for each parallel step
            if (stepResult.status === 'success') {
              this.eventEmitter.emit({
                type: 'step_complete',
                threadId: state.threadId,
                stepId: parallelStep.id,
                sessionId: stepResult.sessionId || undefined,
              })
            }

            return { step: parallelStep, result: stepResult }
          })
        )

        // Collect results and update state
        const newStepResults = { ...state.stepResults }
        const newStepOutputs = { ...state.stepOutputs }
        const newSessionIds = { ...state.sessionIds }
        const successfulSteps: string[] = []
        const failedSteps: string[] = []

        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            const { step: parallelStep, result: stepResult } = result.value
            newStepResults[parallelStep.id!] = stepResult
            newStepOutputs[parallelStep.id!] = stepResult.response
            if (stepResult.sessionId) {
              newSessionIds[parallelStep.id!] = stepResult.sessionId
            }
            if (stepResult.status === 'success') {
              successfulSteps.push(parallelStep.id!)
            } else {
              failedSteps.push(parallelStep.id!)
            }
          } else {
            // Handle rejected promises
            const stepId = stepsToExecute[results.indexOf(result)]?.id
            if (stepId) {
              failedSteps.push(stepId)
              newStepResults[stepId] = {
                id: stepId,
                status: 'failed',
                response: `Parallel step failed: ${result.reason}`,
                sessionId: '',
                duration: Date.now() - startTime,
              }
            }
          }
        })

        // Determine overall status - if any step failed, the parallel node is considered failed
        const overallStatus: StepResult['status'] = failedSteps.length === 0 ? 'success' : 'failed'

        // Create parallel node result
        const parallelResult: StepResult = {
          id: step.id!,
          status: overallStatus,
          response: `Parallel execution completed: ${successfulSteps.length} succeeded, ${failedSteps.length} failed`,
          sessionId: '',
          duration: Date.now() - startTime,
        }

        this.eventEmitter.emit({
          type: 'step_complete',
          threadId: state.threadId,
          stepId: step.id,
        })

        return {
          stepResults: { ...newStepResults, [step.id!]: parallelResult },
          stepOutputs: { ...newStepOutputs, [step.id!]: parallelResult.response },
          sessionIds: newSessionIds,
          ...(overallStatus === 'failed' ? { status: 'failed' as const } : {}),
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
        type: 'step_start',
        threadId: state.threadId,
        stepId: step.id,
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
            type: 'step_complete',
            threadId: state.threadId,
            stepId: step.id,
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

        // Determine timeout behavior and settings
        const timeoutBehavior = step.timeoutBehavior || 'fail'
        const timeoutSeconds = this.getTimeoutSeconds(step)
        const interactionType = step.interactionType || 'approval'

        // Create approval request
        const approval = await approvalOrchestrator.createApproval({
          threadId: state.threadId,
          stepId: step.id!,
          projectId: state.projectId as string,
          workflowName: 'Human Input Workflow',
          prompt: step.prompt || this.getDefaultPrompt(interactionType),
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
          timeoutSeconds,
          approvalRequired: interactionType === 'approval',
          autoApproveAfterTimeout: timeoutBehavior === 'auto-approve',
          interactionType: interactionType,
        })

        // Emit approval request event for UI notification
        this.eventEmitter.emit({
          type: 'step_start',
          threadId: state.threadId,
          stepId: step.id,
        })

        // Handle different interaction types and timeout behaviors
        let approved: boolean
        if (timeoutBehavior === 'infinite') {
          // Infinite wait - no timeout
          approved = await this.waitForApprovalDecisionInfinite(approval.id)
        } else {
          // Finite timeout with specific behavior
          approved = await this.waitForApprovalDecision(
            approval.id,
            approval.timeoutSeconds,
            timeoutBehavior
          )
        }

        const approvalResult: StepResult = {
          id: step.id!,
          status: approved ? 'success' : 'failed',
          response: approved ? 'Human approval granted' : 'Human approval rejected',
          sessionId: '',
          duration: Date.now() - startTime,
        }

        this.eventEmitter.emit({
          type: 'step_complete',
          threadId: state.threadId,
          stepId: step.id,
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
   * Get timeout seconds based on step configuration and behavior
   * SOLID: Single responsibility - timeout calculation logic
   */
  private getTimeoutSeconds(step: ExtendedWorkflowStep): number {
    // For infinite behavior, return 0 (handled separately)
    if (step.timeoutBehavior === 'infinite') {
      return 0
    }

    // Use configured timeout or default
    return step.timeoutSeconds || 3600 // 1 hour default
  }

  /**
   * Get default prompt based on interaction type
   * SOLID: Single responsibility - prompt generation logic
   */
  private getDefaultPrompt(interactionType: 'approval' | 'notification' | 'input'): string {
    switch (interactionType) {
      case 'approval':
        return 'Human approval required to continue'
      case 'notification':
        return 'Please review and acknowledge this step'
      case 'input':
        return 'Human input required to continue'
      default:
        return 'Human interaction required'
    }
  }

  /**
   * Wait for approval decision with infinite timeout
   * SOLID: Single responsibility - infinite polling logic
   */
  private async waitForApprovalDecisionInfinite(approvalId: string): Promise<boolean> {
    const approvalOrchestrator = new ApprovalOrchestrator()
    const pollInterval = 5000 // 5 seconds for infinite wait

    while (true) {
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

        if (approval.status === 'cancelled') {
          throw new Error(`Approval ${approvalId} was cancelled`)
        }

        // Still pending, continue polling
        await new Promise((resolve) => setTimeout(resolve, pollInterval))
      } catch (error) {
        console.error(`Error polling approval ${approvalId}:`, error)
        throw error
      }
    }
  }

  /**
   * Wait for approval decision with timeout behavior support
   * SOLID: Single responsibility - finite polling with behavior logic
   */
  private async waitForApprovalDecision(
    approvalId: string,
    timeoutSeconds: number,
    timeoutBehavior: 'fail' | 'auto-approve' = 'fail'
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

    // Timeout reached - apply timeout behavior
    if (timeoutBehavior === 'auto-approve') {
      console.log(`Approval ${approvalId} timed out, auto-approving`)
      return true
    } else {
      // Default to fail behavior
      throw new Error(`Approval ${approvalId} timed out after ${timeoutSeconds} seconds`)
    }
  }
}
