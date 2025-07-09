/**
 * Workflow Executor - Manages active workflow executions
 *
 * SOLID: Single responsibility - workflow lifecycle management
 * DRY: Reuses WorkflowOrchestrator
 * KISS: Simple singleton pattern for active workflows
 */

import { WorkflowOrchestrator } from './WorkflowOrchestrator'
import type { Server } from 'socket.io'
import type { InvokeRequest, InvokeResponse } from '../schemas/invoke'
import { EventEmitter } from 'events'

export class WorkflowExecutor {
  private static instance: WorkflowExecutor
  private activeWorkflows = new Map<string, Promise<InvokeResponse>>()
  private io?: Server
  private workflowEvents?: EventEmitter

  private constructor() {}

  static getInstance(): WorkflowExecutor {
    if (!WorkflowExecutor.instance) {
      WorkflowExecutor.instance = new WorkflowExecutor()
    }
    return WorkflowExecutor.instance
  }

  setSocketIO(io: Server): void {
    this.io = io
  }

  setWorkflowEvents(events: EventEmitter): void {
    this.workflowEvents = events
  }

  /**
   * Execute workflow asynchronously and track it
   */
  async executeAsync(request: InvokeRequest & { threadId: string }): Promise<void> {
    if (!this.io) {
      throw new Error('Socket.io not initialized')
    }

    const orchestrator = new WorkflowOrchestrator(this.io, this.workflowEvents)

    // Store the promise to keep it alive
    const executionPromise = orchestrator.execute(request).finally(() => {
      // Clean up when done
      this.activeWorkflows.delete(request.threadId)
    })

    this.activeWorkflows.set(request.threadId, executionPromise)
  }

  /**
   * Check if a workflow is active
   */
  isActive(threadId: string): boolean {
    return this.activeWorkflows.has(threadId)
  }

  /**
   * Get active workflow count
   */
  getActiveCount(): number {
    return this.activeWorkflows.size
  }
}
