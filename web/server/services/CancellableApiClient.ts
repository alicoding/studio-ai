/**
 * CancellableApiClient - Extends BaseApiClient with Cancellation Support
 * 
 * SOLID: Single Responsibility - Adds cancellation to existing HTTP client
 * DRY: Reuses all BaseApiClient functionality
 * KISS: Simple extension with AbortController support
 * Library-First: Uses KY's built-in AbortController support
 */

import { BaseApiClient } from '../../../src/services/api/BaseApiClient'
import type { ProviderConfig } from '../../../src/services/api/types'

export interface CancellationRequest {
  sessionId: string
  requestId?: string
  reason?: string
}

export interface CancellationResponse {
  cancelled: boolean
  sessionId: string
  requestsCancelled: number
  timestamp: Date
}

export class CancellableApiClient extends BaseApiClient {
  private activeRequests = new Map<string, AbortController>()
  private sessionRequests = new Map<string, Set<string>>() // sessionId -> Set of requestIds

  constructor(config: ProviderConfig) {
    super(config)
  }

  /**
   * POST request with cancellation support
   */
  async postWithCancellation<T = unknown>(
    endpoint: string, 
    data?: unknown, 
    sessionId?: string,
    requestId?: string
  ): Promise<T> {
    const controller = new AbortController()
    const id = requestId || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Track active request
    this.activeRequests.set(id, controller)
    
    if (sessionId) {
      // Track session requests
      if (!this.sessionRequests.has(sessionId)) {
        this.sessionRequests.set(sessionId, new Set())
      }
      this.sessionRequests.get(sessionId)!.add(id)
    }

    try {
      return await this.getRawClient().post(endpoint, { 
        json: data, 
        signal: controller.signal,
        timeout: 60000 // 60s timeout with cancellation
      }).json<T>()
    } catch (error) {
      // Handle AbortError specifically
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request cancelled: ${id}`)
      }
      throw error
    } finally {
      // Cleanup
      this.activeRequests.delete(id)
      if (sessionId) {
        this.sessionRequests.get(sessionId)?.delete(id)
        if (this.sessionRequests.get(sessionId)?.size === 0) {
          this.sessionRequests.delete(sessionId)
        }
      }
    }
  }

  /**
   * GET request with cancellation support
   */
  async getWithCancellation<T = unknown>(
    endpoint: string, 
    params?: Record<string, string>,
    sessionId?: string,
    requestId?: string
  ): Promise<T> {
    const controller = new AbortController()
    const id = requestId || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    this.activeRequests.set(id, controller)
    
    if (sessionId) {
      if (!this.sessionRequests.has(sessionId)) {
        this.sessionRequests.set(sessionId, new Set())
      }
      this.sessionRequests.get(sessionId)!.add(id)
    }

    try {
      const searchParams = params ? new URLSearchParams(params) : undefined
      return await this.getRawClient().get(endpoint, { 
        searchParams,
        signal: controller.signal,
        timeout: 30000
      }).json<T>()
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request cancelled: ${id}`)
      }
      throw error
    } finally {
      this.activeRequests.delete(id)
      if (sessionId) {
        this.sessionRequests.get(sessionId)?.delete(id)
        if (this.sessionRequests.get(sessionId)?.size === 0) {
          this.sessionRequests.delete(sessionId)
        }
      }
    }
  }

  /**
   * Cancel specific request by ID
   */
  cancelRequest(requestId: string): boolean {
    const controller = this.activeRequests.get(requestId)
    if (controller) {
      controller.abort()
      return true
    }
    return false
  }

  /**
   * Cancel all requests for a session
   */
  cancelSession(sessionId: string): CancellationResponse {
    const requestIds = this.sessionRequests.get(sessionId)
    let cancelledCount = 0
    
    if (requestIds) {
      for (const requestId of requestIds) {
        const controller = this.activeRequests.get(requestId)
        if (controller) {
          controller.abort()
          cancelledCount++
        }
      }
      // Cleanup will happen in the finally blocks of individual requests
    }
    
    return {
      cancelled: cancelledCount > 0,
      sessionId,
      requestsCancelled: cancelledCount,
      timestamp: new Date()
    }
  }

  /**
   * Cancel all active requests
   */
  cancelAll(): number {
    let cancelledCount = 0
    
    for (const controller of this.activeRequests.values()) {
      controller.abort()
      cancelledCount++
    }
    
    return cancelledCount
  }

  /**
   * Get active request count for debugging
   */
  getActiveRequestsCount(): number {
    return this.activeRequests.size
  }

  /**
   * Get active sessions for debugging
   */
  getActiveSessions(): string[] {
    return Array.from(this.sessionRequests.keys())
  }

  /**
   * Get session request count for debugging
   */
  getSessionRequestCount(sessionId: string): number {
    return this.sessionRequests.get(sessionId)?.size || 0
  }
}