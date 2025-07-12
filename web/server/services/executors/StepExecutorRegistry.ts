/**
 * Step Executor Registry
 * Manages and routes workflow steps to appropriate executors
 *
 * SOLID: Single responsibility - executor management and routing
 * DRY: Centralized executor logic
 * KISS: Simple registry pattern
 * Library-First: No external dependencies
 */

import type { StepExecutor, ExecutorWorkflowStep } from './StepExecutor'
import type { WorkflowStep } from '../../schemas/invoke'

export class StepExecutorRegistry {
  private executors: StepExecutor[] = []

  /**
   * Register a new executor
   */
  register(executor: StepExecutor): void {
    this.executors.push(executor)
  }

  /**
   * Get the appropriate executor for a workflow step
   * Supports backward compatibility by defaulting to 'claude' type
   */
  getExecutor(step: WorkflowStep): StepExecutor {
    // Create a copy to avoid mutating the original step
    const execStep = { ...step } as ExecutorWorkflowStep

    // Default to 'claude' for backward compatibility
    if (!execStep.type) {
      if (process.env.USE_MOCK_AI === 'true') {
        // Use mock when environment variable is set
        execStep.type = 'mock'
      } else if (step.role || step.agentId) {
        // This is an AI step, set type to 'claude'
        execStep.type = 'claude'
      } else {
        // Default to claude for any untyped step
        execStep.type = 'claude'
      }
    }

    // Find matching executor
    const executor = this.executors.find((e) => e.canHandle(execStep))

    if (!executor) {
      const availableTypes = this.getAvailableExecutorTypes()
      throw new Error(
        `No executor found for step type: ${execStep.type}. Available executors: ${availableTypes.join(', ')}`
      )
    }

    return executor
  }

  /**
   * Get list of registered executor types (for debugging)
   */
  getAvailableExecutorTypes(): string[] {
    const types: string[] = []

    // Test each type to see what executors can handle
    // Check in the order MockStep (mock), ClaudeStep (claude), then others
    const testTypes = ['mock', 'claude', 'operator', 'javascript', 'webhook']

    testTypes.forEach((type) => {
      const testStep: ExecutorWorkflowStep = {
        id: 'test',
        task: 'test',
        type: type as ExecutorWorkflowStep['type'],
      }

      if (this.executors.some((e) => e.canHandle(testStep))) {
        types.push(type)
      }
    })

    return types
  }

  /**
   * Get number of registered executors
   */
  getExecutorCount(): number {
    return this.executors.length
  }

  /**
   * Clear all registered executors (for testing)
   */
  clear(): void {
    this.executors = []
  }
}
