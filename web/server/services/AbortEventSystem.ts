/**
 * Event-driven abort system for Studio AI
 *
 * SOLID: Single responsibility - handle abort events across the system
 * DRY: Centralized event handling for all abort scenarios
 * KISS: Simple publish/subscribe pattern for immediate agent termination
 * Library-First: Uses Node.js EventEmitter for proven event handling
 */

import { EventEmitter } from 'events'

interface AbortEvent {
  type: 'workflow_abort' | 'agent_abort' | 'project_abort'
  projectId: string
  threadId?: string
  agentId?: string
  timestamp: string
}

export class AbortEventSystem extends EventEmitter {
  private static instance: AbortEventSystem | null = null

  private constructor() {
    super()
    // Increase max listeners to handle many agents subscribing
    this.setMaxListeners(100)
    console.log('[AbortEventSystem] Initialized with max 100 listeners')
  }

  static getInstance(): AbortEventSystem {
    if (!AbortEventSystem.instance) {
      AbortEventSystem.instance = new AbortEventSystem()
    }
    return AbortEventSystem.instance
  }

  /**
   * Publish workflow abort event - terminates all agents working on the workflow
   */
  publishWorkflowAbort(threadId: string, projectId: string): void {
    const event: AbortEvent = {
      type: 'workflow_abort',
      projectId,
      threadId,
      timestamp: new Date().toISOString(),
    }

    console.log(`[AbortEventSystem] 🚨 Publishing workflow abort event:`, event)
    this.emit('abort', event)
    this.emit('workflow_abort', event) // Specific event type
  }

  /**
   * Publish agent abort event - terminates specific agent
   */
  publishAgentAbort(agentId: string, projectId: string): void {
    const event: AbortEvent = {
      type: 'agent_abort',
      projectId,
      agentId,
      timestamp: new Date().toISOString(),
    }

    console.log(`[AbortEventSystem] 🚨 Publishing agent abort event:`, event)
    this.emit('abort', event)
    this.emit('agent_abort', event) // Specific event type
  }

  /**
   * Publish project abort event - terminates all agents in the project
   */
  publishProjectAbort(projectId: string): void {
    const event: AbortEvent = {
      type: 'project_abort',
      projectId,
      timestamp: new Date().toISOString(),
    }

    console.log(`[AbortEventSystem] 🚨 Publishing project abort event:`, event)
    this.emit('abort', event)
    this.emit('project_abort', event) // Specific event type
  }

  /**
   * Subscribe to abort events with filtering
   */
  subscribeToAborts(
    callback: (event: AbortEvent) => void,
    filter?: {
      projectId?: string
      agentId?: string
      types?: AbortEvent['type'][]
    }
  ): () => void {
    const handler = (event: AbortEvent) => {
      // Apply filters if provided
      if (filter) {
        if (filter.projectId && event.projectId !== filter.projectId) {
          return // Skip - wrong project
        }
        if (filter.agentId && event.agentId !== filter.agentId) {
          return // Skip - wrong agent
        }
        if (filter.types && !filter.types.includes(event.type)) {
          return // Skip - wrong event type
        }
      }

      // Event passed all filters, execute callback
      callback(event)
    }

    this.on('abort', handler)

    // Return unsubscribe function
    return () => {
      this.off('abort', handler)
    }
  }

  /**
   * Check if an event should abort a specific agent
   */
  static shouldAbortAgent(event: AbortEvent, agentId: string, projectId: string): boolean {
    // Project mismatch - never abort
    if (event.projectId !== projectId) {
      return false
    }

    switch (event.type) {
      case 'agent_abort':
        // Only abort if this is the target agent
        return event.agentId === agentId

      case 'workflow_abort':
        // Abort any agent in the same project (workflows can use any agent)
        return true

      case 'project_abort':
        // Abort all agents in the project
        return true

      default:
        return false
    }
  }

  /**
   * Get current listener count for debugging
   */
  getListenerCount(): number {
    return this.listenerCount('abort')
  }
}
