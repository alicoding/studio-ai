/**
 * ResponseTracker - Tracks pending agent responses
 * 
 * SOLID: Single responsibility - only tracks responses
 * Library First: Uses p-queue and p-timeout
 * KISS: Simple Map-based tracking with automatic cleanup
 */

import PQueue from 'p-queue'
import pTimeout from 'p-timeout'
import { EventEmitter } from 'events'
import { randomUUID } from 'crypto'

export interface TrackedResponse<T = unknown> {
  correlationId: string
  agentId: string
  projectId: string
  createdAt: Date
  resolve: (value: T) => void
  reject: (error: Error) => void
  timeout: number
}

export interface ResponseTrackerOptions {
  defaultTimeout?: number
  cleanupInterval?: number
  maxPendingResponses?: number
}

export class ResponseTracker extends EventEmitter {
  private responses = new Map<string, TrackedResponse>()
  private queue: PQueue
  private cleanupTimer: NodeJS.Timeout | null = null
  private options: Required<ResponseTrackerOptions>

  constructor(options: ResponseTrackerOptions = {}) {
    super()
    
    this.options = {
      defaultTimeout: options.defaultTimeout || 30000, // 30 seconds
      cleanupInterval: options.cleanupInterval || 60000, // 1 minute
      maxPendingResponses: options.maxPendingResponses || 100
    }

    // Create queue with concurrency limit
    this.queue = new PQueue({ concurrency: 50 })
    
    // Start cleanup timer
    this.startCleanupTimer()
  }

  /**
   * Track a new response expectation
   */
  async trackResponse<T = unknown>(
    agentId: string,
    projectId: string,
    timeout?: number
  ): Promise<{ correlationId: string; promise: Promise<T> }> {
    const correlationId = randomUUID()
    
    // Check if we've hit the limit
    if (this.responses.size >= this.options.maxPendingResponses) {
      throw new Error('Maximum pending responses limit reached')
    }

    // Create the promise
    let resolveFunc: (value: T) => void
    let rejectFunc: (error: Error) => void
    
    const promise = new Promise<T>((resolve, reject) => {
      resolveFunc = resolve
      rejectFunc = reject
    })

    // Track the response
    const tracked: TrackedResponse<T> = {
      correlationId,
      agentId,
      projectId,
      createdAt: new Date(),
      resolve: resolveFunc!,
      reject: rejectFunc!,
      timeout: timeout || this.options.defaultTimeout
    }

    this.responses.set(correlationId, tracked as TrackedResponse)

    // Apply timeout
    const timeoutPromise = pTimeout(promise, {
      milliseconds: tracked.timeout,
      message: `Response timeout for agent ${agentId} (${tracked.timeout}ms)`
    })

    // Clean up on completion
    timeoutPromise
      .finally(() => {
        this.responses.delete(correlationId)
      })
      .catch(() => {
        // Timeout errors are expected, just clean up
      })

    this.emit('response:tracked', { correlationId, agentId, projectId })

    return { correlationId, promise: timeoutPromise }
  }

  /**
   * Resolve a pending response
   */
  resolveResponse(correlationId: string, data: unknown): boolean {
    const tracked = this.responses.get(correlationId)
    if (!tracked) {
      return false
    }

    tracked.resolve(data)
    this.responses.delete(correlationId)
    this.emit('response:resolved', { correlationId, agentId: tracked.agentId })
    
    return true
  }

  /**
   * Reject a pending response
   */
  rejectResponse(correlationId: string, error: Error): boolean {
    const tracked = this.responses.get(correlationId)
    if (!tracked) {
      return false
    }

    tracked.reject(error)
    this.responses.delete(correlationId)
    this.emit('response:rejected', { correlationId, agentId: tracked.agentId, error })
    
    return true
  }

  /**
   * Get pending response count
   */
  getPendingCount(): number {
    return this.responses.size
  }

  /**
   * Get pending responses for an agent
   */
  getPendingForAgent(agentId: string): string[] {
    const pending: string[] = []
    for (const [correlationId, tracked] of this.responses) {
      if (tracked.agentId === agentId) {
        pending.push(correlationId)
      }
    }
    return pending
  }

  /**
   * Clean up expired responses
   */
  private cleanup(): void {
    const now = Date.now()
    const expired: string[] = []

    for (const [correlationId, tracked] of this.responses) {
      const age = now - tracked.createdAt.getTime()
      if (age > tracked.timeout * 2) {
        // Double timeout for safety
        expired.push(correlationId)
      }
    }

    for (const correlationId of expired) {
      this.rejectResponse(correlationId, new Error('Response expired during cleanup'))
    }

    if (expired.length > 0) {
      this.emit('cleanup:expired', { count: expired.length })
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.options.cleanupInterval)
  }

  /**
   * Stop tracking and clean up
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }

    // Reject all pending responses
    for (const [correlationId] of this.responses) {
      this.rejectResponse(correlationId, new Error('ResponseTracker destroyed'))
    }

    this.queue.clear()
    this.removeAllListeners()
  }
}

// Singleton instance
let instance: ResponseTracker | null = null

export function getResponseTracker(options?: ResponseTrackerOptions): ResponseTracker {
  if (!instance) {
    instance = new ResponseTracker(options)
  }
  return instance
}