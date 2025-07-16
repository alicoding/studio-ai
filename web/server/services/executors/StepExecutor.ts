/**
 * Step Executor Interface
 * Base interface for all workflow step executors
 *
 * SOLID: Interface segregation - minimal required methods
 * DRY: Shared interface for all executors
 * KISS: Simple two-method interface
 * Library-First: Designed for easy extension
 */

import type { WorkflowStep, StepResult } from '../../schemas/invoke'
import type { Server } from 'socket.io'

export interface WorkflowContext {
  stepOutputs: Record<string, string>
  stepResults?: Record<string, StepResult> // Added for human input context
  projectId?: string
  threadId: string
  io?: Server
  sessionIds: Record<string, string>
  startNewConversation?: boolean
  resolvedTask?: string // Optional for backward compatibility
}

export interface StepExecutor {
  /**
   * Check if this executor can handle the given step
   */
  canHandle(step: WorkflowStep): boolean

  /**
   * Execute the step and return result
   */
  execute(step: WorkflowStep, context: WorkflowContext): Promise<StepResult>
}

/**
 * Extended WorkflowStep with executor type
 * Backward compatible with existing WorkflowStep
 */
export interface ExecutorWorkflowStep extends WorkflowStep {
  type?: 'claude' | 'mock' | 'operator' | 'javascript' | 'webhook'
  config?: {
    // AI-specific
    model?: string
    temperature?: number

    // Mock-specific
    mockResponse?: string
    mockDelay?: number

    // Operator-specific
    operator?: 'summary' | 'extraction' | 'validation' | 'routing'

    // JavaScript-specific
    code?: string

    // Webhook-specific
    url?: string
    method?: string
    headers?: Record<string, string>
  }
}
