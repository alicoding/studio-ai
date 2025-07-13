/**
 * RedisAdapterTransport - Socket.IO Redis adapter for cross-server communication
 *
 * SOLID: Single responsibility - handles Redis-based event transport
 * DRY: Implements IEventTransport interface
 * KISS: Uses Socket.IO's built-in Redis adapter
 * Library-First: Leverages @socket.io/redis-adapter
 */

import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'
import type { Server as SocketIOServer } from 'socket.io'
import type { EventHandler, EventSystemConfig, IEventTransport } from '../EventSystem'

export class RedisAdapterTransport implements IEventTransport {
  private io?: SocketIOServer
  private pubClient?: ReturnType<typeof createClient>
  private subClient?: ReturnType<typeof createClient>
  private handlers: Map<string, Set<EventHandler>> = new Map()
  private redisUrl: string = 'redis://localhost:6379'

  async initialize(config: EventSystemConfig): Promise<void> {
    if (!config.socketIO) {
      throw new Error('Socket.IO instance required for RedisAdapterTransport')
    }

    this.io = config.socketIO
    this.redisUrl = config.redis?.url || 'redis://localhost:6379'

    try {
      // Create Redis clients for pub/sub
      this.pubClient = createClient({ url: this.redisUrl })
      this.subClient = this.pubClient.duplicate()

      // Handle Redis connection errors
      this.pubClient.on('error', (err) => {
        console.error('[RedisAdapter] Redis pub client error:', err)
      })

      this.subClient.on('error', (err) => {
        console.error('[RedisAdapter] Redis sub client error:', err)
      })

      // Connect to Redis
      await Promise.all([this.pubClient.connect(), this.subClient.connect()])

      console.log('[RedisAdapter] Connected to Redis at', this.redisUrl)

      // Configure Socket.IO to use Redis adapter
      this.io.adapter(createAdapter(this.pubClient, this.subClient))

      console.log('[RedisAdapter] Socket.IO configured with Redis adapter')
      console.log('[RedisAdapter] Cross-server communication enabled')
    } catch (error) {
      console.error('[RedisAdapter] Failed to initialize:', error)
      throw error
    }
  }

  async emit(event: string, data: unknown): Promise<void> {
    if (!this.io) {
      console.warn('[RedisAdapter] No Socket.IO instance, cannot emit event:', event)
      return
    }

    // Emit to all connected clients across all servers
    this.io.emit(event, data)

    // Also notify local handlers
    const handlers = this.handlers.get(event)
    if (handlers) {
      for (const handler of handlers) {
        try {
          await handler(data)
        } catch (error) {
          console.error(`[RedisAdapter] Handler error for event ${event}:`, error)
        }
      }
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

    if (this.pubClient) {
      await this.pubClient.quit()
    }

    if (this.subClient) {
      await this.subClient.quit()
    }

    console.log('[RedisAdapter] Destroyed and disconnected from Redis')
  }
}
