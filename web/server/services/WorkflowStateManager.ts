/**
 * Workflow State Manager - Manages workflow state and status determination
 *
 * SOLID: Single responsibility - only manages workflow state
 * DRY: Centralized status logic and state operations
 * KISS: Simple state transitions and status mapping
 * Library-First: Uses existing types and LangGraph patterns
 */

import type { WorkflowStep, StepResult, InvokeResponse } from '../schemas/invoke'

export interface WorkflowState {
  stepResults: Record<string, StepResult>
  stepOutputs: Record<string, string>
  sessionIds: Record<string, string>
  currentStepIndex: number
  status: 'running' | 'completed' | 'partial' | 'failed' | 'aborted'
  [key: string]: unknown
}

export class WorkflowStateManager {
  /**
   * Determine overall workflow status from step results
   */
  determineOverallStatus(
    stepResults: Record<string, StepResult>
  ): 'completed' | 'partial' | 'failed' | 'aborted' {
    const results = Object.values(stepResults)

    if (results.length === 0) return 'failed'

    const hasAborted = results.some((r) => r.status === 'aborted')
    const hasFailures = results.some((r) => r.status === 'failed')
    const hasBlocked = results.some((r) => r.status === 'blocked')
    const allSuccess = results.every((r) => r.status === 'success')

    // CRITICAL: Check for aborted steps first - if ANY step was aborted, entire workflow is aborted
    if (hasAborted) return 'aborted'
    if (allSuccess) return 'completed'
    if (hasFailures) return 'failed'
    if (hasBlocked) return 'partial'

    return 'partial'
  }

  /**
   * Build summary statistics from step results
   */
  buildSummary(stepResults: Record<string, StepResult>, totalDuration: number) {
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
   * Map step result status to workflow step status
   */
  mapStepResultToStepStatus(
    stepResult?: StepResult
  ):
    | 'pending'
    | 'running'
    | 'completed'
    | 'failed'
    | 'blocked'
    | 'not_executed'
    | 'skipped'
    | 'aborted' {
    if (!stepResult) return 'pending'

    // Detect if step never actually executed (has failed status but empty response)
    if (
      stepResult.status === 'failed' &&
      (!stepResult.response || stepResult.response.trim() === '')
    ) {
      return 'not_executed'
    }

    switch (stepResult.status) {
      case 'success':
        return 'completed'
      case 'failed':
        return 'failed'
      case 'blocked':
        return 'blocked'
      case 'not_executed':
        return 'not_executed'
      case 'skipped':
        return 'skipped'
      case 'aborted':
        return 'aborted'
      default:
        return 'pending'
    }
  }

  /**
   * Build updated steps array with final statuses
   */
  buildUpdatedSteps(steps: WorkflowStep[], stepResults: Record<string, StepResult>) {
    return steps.map((step) => {
      const stepResult = stepResults[step.id!]
      const stepStatus = this.mapStepResultToStepStatus(stepResult)

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
        output: stepResult?.status === 'success' ? stepResult?.response : undefined, // Store actual step output for audit and UI
      }
    })
  }

  /**
   * Generate a readable summary of workflow invocation
   */
  generateInvocationSummary(steps: WorkflowStep[]): string {
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
  formatTextResponse(response: InvokeResponse): InvokeResponse {
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
   * Find steps with no dependents (final steps)
   * Excludes conditional steps as they are not execution nodes
   */
  findFinalSteps(steps: WorkflowStep[]): string[] {
    // Type guard for conditional steps
    const isConditionalStep = (step: WorkflowStep): boolean => {
      return 'type' in step && (step as WorkflowStep & { type: string }).type === 'conditional'
    }

    // Only consider non-conditional steps as potential final steps
    const executableSteps = steps.filter((step) => {
      return !isConditionalStep(step)
    })

    const stepIds = new Set(executableSteps.map((s) => s.id!))
    const dependedOn = new Set<string>()

    steps.forEach((step) => {
      if (step.deps) {
        step.deps.forEach((depId) => dependedOn.add(depId))
      }
    })

    return Array.from(stepIds).filter((id) => !dependedOn.has(id))
  }

  /**
   * Check if dependencies are satisfied for a step
   * Handles conditional steps specially since they don't execute as nodes
   */
  areDependenciesSatisfied(
    step: WorkflowStep,
    stepResults: Record<string, StepResult>,
    allSteps?: WorkflowStep[]
  ): { satisfied: boolean; failedDependency?: string } {
    if (!step.deps || step.deps.length === 0) {
      return { satisfied: true }
    }

    for (const depId of step.deps) {
      // Check if dependency is a conditional step
      const isConditionalDep = allSteps?.some(
        (s) =>
          s.id === depId &&
          'type' in s &&
          (s as WorkflowStep & { type: string }).type === 'conditional'
      )

      if (isConditionalDep) {
        // Conditional dependencies are handled by LangGraph routing, treat as satisfied
        continue
      }

      const depResult = stepResults[depId]
      if (!depResult || depResult.status !== 'success') {
        return { satisfied: false, failedDependency: depId }
      }
    }

    return { satisfied: true }
  }
}
