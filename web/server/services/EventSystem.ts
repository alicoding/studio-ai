/**
 * EventSystem - Abstraction layer for cross-server event communication
 *
 * SOLID: Interface segregation - Clients depend on abstractions, not implementations
 * DRY: Single place to change event transport mechanism
 * KISS: Start with simplest implementation that works
 * Library-First: Can swap Redis, NATS, BullMQ, etc without changing client code
 */

import type { Server as SocketIOServer } from 'socket.io'

/**
 * Event payload structure
 */
export interface EventPayload {
  event: string
  data: unknown
  metadata?: {
    timestamp?: number
    source?: string
    priority?: 'low' | 'normal' | 'high'
    retry?: boolean
  }
}

/**
 * Event handler function type
 */
export type EventHandler = (data: unknown) => void | Promise<void>

/**
 * Configuration for event system
 */
export interface EventSystemConfig {
  type: 'in-memory' | 'redis-adapter' | 'bullmq' | 'nats'
  socketIO?: SocketIOServer
  redis?: {
    url: string
  }
  // Add more config as needed
}

/**
 * Abstract interface for event transport
 */
export interface IEventTransport {
  /**
   * Initialize the transport
   */
  initialize(config: EventSystemConfig): Promise<void>

  /**
   * Emit an event to all subscribers
   */
  emit(event: string, data: unknown): Promise<void>

  /**
   * Subscribe to an event
   */
  on(event: string, handler: EventHandler): void

  /**
   * Unsubscribe from an event
   */
  off(event: string, handler: EventHandler): void

  /**
   * Clean up resources
   */
  destroy(): Promise<void>
}

/**
 * Main EventSystem class - facade for all event operations
 */
export class EventSystem {
  private static instance: EventSystem
  private transport: IEventTransport
  private config: EventSystemConfig

  private constructor() {
    // Start with in-memory implementation
    this.config = { type: 'in-memory' }
    this.transport = new InMemoryTransport()
  }

  static getInstance(): EventSystem {
    if (!EventSystem.instance) {
      EventSystem.instance = new EventSystem()
    }
    return EventSystem.instance
  }

  /**
   * Initialize with specific transport
   */
  async initialize(config: EventSystemConfig): Promise<void> {
    this.config = config

    // Factory pattern - create transport based on config
    switch (config.type) {
      case 'redis-adapter':
        const { RedisAdapterTransport } = await import('./transports/RedisAdapterTransport')
        this.transport = new RedisAdapterTransport()
        break

      case 'bullmq':
        // TODO: Implement when needed
        // const { BullMQTransport } = await import('./transports/BullMQTransport')
        // this.transport = new BullMQTransport()
        console.warn(
          '[EventSystem] BullMQ transport not implemented yet, falling back to in-memory'
        )
        this.transport = new InMemoryTransport()
        break

      case 'nats':
        // TODO: Implement when needed
        // const { NATSTransport } = await import('./transports/NATSTransport')
        // this.transport = new NATSTransport()
        console.warn('[EventSystem] NATS transport not implemented yet, falling back to in-memory')
        this.transport = new InMemoryTransport()
        break

      default:
        this.transport = new InMemoryTransport()
    }

    await this.transport.initialize(config)
  }

  /**
   * Emit an event (fire and forget)
   */
  async emit(event: string, data: unknown): Promise<void> {
    console.log(`[EventSystem] Emitting ${event}`, data)
    await this.transport.emit(event, data)
  }

  /**
   * Subscribe to events
   */
  on(event: string, handler: EventHandler): void {
    this.transport.on(event, handler)
  }

  /**
   * Unsubscribe from events
   */
  off(event: string, handler: EventHandler): void {
    this.transport.off(event, handler)
  }

  /**
   * Helper methods for common events
   */
  async emitAgentStatus(agentId: string, status: string): Promise<void> {
    await this.emit('agent:status-changed', { agentId, status })
  }

  async emitTokenUsage(agentId: string, tokens: number, maxTokens: number): Promise<void> {
    await this.emit('agent:token-usage', { agentId, tokens, maxTokens })
  }

  async emitNewMessage(sessionId: string, message: unknown): Promise<void> {
    await this.emit('message:new', { sessionId, message })
  }

  /**
   * Clean up
   */
  async destroy(): Promise<void> {
    await this.transport.destroy()
  }
}

/**
 * Simple in-memory implementation for development
 */
class InMemoryTransport implements IEventTransport {
  private io?: SocketIOServer
  private handlers = new Map<string, Set<EventHandler>>()

  async initialize(config: EventSystemConfig): Promise<void> {
    this.io = config.socketIO
    console.log('[InMemoryTransport] Initialized')
  }

  async emit(event: string, data: unknown): Promise<void> {
    // Emit to local handlers
    const handlers = this.handlers.get(event)
    if (handlers) {
      handlers.forEach((handler) => handler(data))
    }

    // Emit to Socket.IO if available
    if (this.io) {
      this.io.emit(event, data)
    }
  }

  on(event: string, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler)
  }

  off(event: string, handler: EventHandler): void {
    this.handlers.get(event)?.delete(handler)
  }

  async destroy(): Promise<void> {
    this.handlers.clear()
  }
}

// Export singleton instance
export const eventSystem = EventSystem.getInstance()
