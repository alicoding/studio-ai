/**
 * EventBus - SOLID Event System for Workspace Communication
 * 
 * SOLID: Single responsibility - Event coordination only
 * DRY: One event system for all workspace communication
 * KISS: Simple pub/sub pattern
 * Library-First: Uses mitt (3kb, battle-tested)
 */

import mitt, { type Emitter } from 'mitt'

// Define all workspace events with proper typing
export interface WorkspaceEvents extends Record<string | symbol, unknown> {
  // Panel events
  'panel:opened': { panelId: string; position: 'sidebar' | 'main' | 'bottom' }
  'panel:closed': { panelId: string }
  'panel:focused': { panelId: string }
  
  // Layout events
  'layout:changed': { projectId: string; layout: unknown }
  'layout:reset': { projectId: string }
  
  // File events
  'file:opened': { path: string; panelId?: string }
  'file:modified': { path: string }
  'file:saved': { path: string }
  'file:closed': { path: string }
  
  // Search events
  'search:indexing': { projectId: string; progress: number }
  'search:completed': { projectId: string; stats: unknown }
  'search:error': { projectId: string; error: string }
  
  // Project events
  'project:changed': { projectId: string }
  'project:loaded': { projectId: string }
}

export type EventBus = Emitter<WorkspaceEvents>

/**
 * Create a new event bus instance
 * Each workspace should have its own instance
 */
export function createEventBus(): EventBus {
  return mitt<WorkspaceEvents>()
}

/**
 * Type-safe event emitter wrapper
 */
export class TypedEventBus {
  constructor(private emitter: EventBus) {}
  
  emit<K extends keyof WorkspaceEvents>(
    type: K,
    event: WorkspaceEvents[K]
  ): void {
    this.emitter.emit(type, event)
  }
  
  on<K extends keyof WorkspaceEvents>(
    type: K,
    handler: (event: WorkspaceEvents[K]) => void
  ): void {
    this.emitter.on(type, handler)
  }
  
  off<K extends keyof WorkspaceEvents>(
    type: K,
    handler: (event: WorkspaceEvents[K]) => void
  ): void {
    this.emitter.off(type, handler)
  }
  
  /**
   * Remove all listeners for a specific event type
   */
  clear<K extends keyof WorkspaceEvents>(type?: K): void {
    if (type) {
      this.emitter.all.delete(type)
    } else {
      this.emitter.all.clear()
    }
  }
}