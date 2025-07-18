/**
 * Workflow Event Emitter - Handles workflow event broadcasting
 *
 * SOLID: Single responsibility - only emits workflow events
 * DRY: Centralized event emission logic
 * KISS: Simple event patterns with consistent structure
 * Library-First: Uses existing Socket.io and EventEmitter
 */

import type { Server } from 'socket.io'
import { EventEmitter } from 'events'
import type { WorkflowGraph } from '../schemas/workflow-graph'

export interface WorkflowEvent {
  type:
    | 'step_start'
    | 'step_complete'
    | 'step_failed'
    | 'workflow_complete'
    | 'workflow_failed'
    | 'workflow_paused'
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
}

export class WorkflowEventEmitter {
  constructor(
    private io?: Server,
    private workflowEvents?: EventEmitter
  ) {}

  /**
   * Emit workflow event to both Socket.io and EventEmitter
   */
  emit(event: WorkflowEvent): void {
    if (this.io) {
      this.io.emit('workflow:update', event)
    }
    if (this.workflowEvents) {
      this.workflowEvents.emit('workflow:update', event)
    }
  }

  /**
   * Emit step start event
   */
  emitStepStart(threadId: string, stepId: string): void {
    this.emit({
      type: 'step_start',
      threadId,
      stepId,
    })
  }

  /**
   * Emit step complete event
   */
  emitStepComplete(threadId: string, stepId: string, sessionId?: string): void {
    this.emit({
      type: 'step_complete',
      threadId,
      stepId,
      sessionId,
    })
  }

  /**
   * Emit step failed event
   */
  emitStepFailed(threadId: string, stepId: string, retry = 0): void {
    this.emit({
      type: 'step_failed',
      threadId,
      stepId,
      retry,
    })
  }

  /**
   * Emit workflow complete event
   */
  emitWorkflowComplete(threadId: string, status: string): void {
    this.emit({
      type: 'workflow_complete',
      threadId,
      status,
    })
  }

  /**
   * Emit workflow failed event
   */
  emitWorkflowFailed(threadId: string, lastStep: string): void {
    this.emit({
      type: 'workflow_failed',
      threadId,
      lastStep,
    })
  }

  /**
   * Emit graph update event
   */
  emitGraphUpdate(threadId: string, graph: WorkflowGraph): void {
    this.emit({
      type: 'graph_update',
      threadId,
      graph,
    })
  }
}
