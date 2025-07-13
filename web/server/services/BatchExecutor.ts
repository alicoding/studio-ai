/**
 * BatchExecutor - Executes batch operations with configurable wait strategies
 * 
 * DEPRECATED: This service is deprecated in favor of WorkflowOrchestrator
 * TODO: Remove this file once /api/messages and /api/messages/batch endpoints are removed
 * 
 * The functionality of this service is now handled by:
 * - WorkflowOrchestrator: For multi-agent workflows with dependencies
 * - /api/invoke endpoint: Unified agent invocation (single or multi)
 * 
 * SOLID: Single responsibility - batch execution with strategies
 * DRY: Extends ResponseTracker for response management
 * Library First: Uses p-all for controlled concurrency
 * KISS: Simple strategy pattern for wait modes
 */

import pAll from 'p-all'
import { ResponseTracker, ResponseTrackerOptions } from './ResponseTracker'
import { WaitStrategy } from '../schemas/orchestration'
import { EventEmitter } from 'events'

export interface BatchMessage {
  id: string
  targetAgentId: string
  content: string
  projectId?: string
  dependencies?: string[] // IDs of messages that must complete first
  timeout?: number
}

export interface BatchRequest {
  messages: BatchMessage[]
  fromAgentId: string
  projectId: string
  waitStrategy: WaitStrategy
  concurrency?: number
  timeout?: number // Global timeout for the batch
}

export interface BatchResult {
  id: string
  status: 'success' | 'error' | 'timeout'
  response?: unknown
  error?: string
  duration: number
}

export interface BatchResponse {
  batchId: string
  waitStrategy: WaitStrategy
  results: Record<string, BatchResult>
  summary: {
    total: number
    successful: number
    failed: number
    timedOut: number
    duration: number
  }
}

export class BatchExecutor extends EventEmitter {
  private responseTracker: ResponseTracker
  private activeBatches = new Map<string, AbortController>()

  constructor(options?: ResponseTrackerOptions) {
    super()
    this.responseTracker = new ResponseTracker(options)
  }

  /**
   * Execute a batch of messages with the specified wait strategy
   */
  async executeBatch(
    request: BatchRequest,
    sendMessage: (message: BatchMessage) => Promise<unknown>
  ): Promise<BatchResponse> {
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const startTime = Date.now()
    const abortController = new AbortController()
    
    this.activeBatches.set(batchId, abortController)
    this.emit('batch:started', { batchId, messageCount: request.messages.length })

    try {
      // Execute messages according to strategy
      const results = await this.executeWithStrategy(
        request,
        request.messages, // Use original messages for now
        sendMessage,
        abortController.signal
      )

      const duration = Date.now() - startTime
      const summary = this.calculateSummary(results, duration)

      const response: BatchResponse = {
        batchId,
        waitStrategy: request.waitStrategy,
        results,
        summary
      }

      this.emit('batch:completed', { batchId, summary })
      return response

    } catch (error) {
      this.emit('batch:error', { batchId, error })
      throw error
    } finally {
      this.activeBatches.delete(batchId)
    }
  }

  /**
   * Execute messages according to wait strategy
   */
  private async executeWithStrategy(
    request: BatchRequest,
    messages: BatchMessage[],
    sendMessage: (message: BatchMessage) => Promise<unknown>,
    signal: AbortSignal
  ): Promise<Record<string, BatchResult>> {
    const { waitStrategy } = request

    switch (waitStrategy) {
      case 'all':
        // Wait for all messages to complete
        return this.executeAll(messages, sendMessage, request, signal)
      
      case 'any':
        // Return as soon as any message completes successfully
        return this.executeAny(messages, sendMessage, request, signal)
      
      case 'none':
        // Fire and forget - return immediately
        return this.executeNone(messages, sendMessage, request, signal)
      
      default:
        throw new Error(`Unknown wait strategy: ${waitStrategy}`)
    }
  }

  /**
   * Execute all messages and wait for completion
   */
  private async executeAll(
    messages: BatchMessage[],
    sendMessage: (message: BatchMessage) => Promise<unknown>,
    request: BatchRequest,
    signal: AbortSignal
  ): Promise<Record<string, BatchResult>> {
    const results: Record<string, BatchResult> = {}
    const { concurrency = 5 } = request

    // Group messages by dependency level
    const levels = this.groupByDependencyLevel(messages)

    // Execute each level sequentially, but messages within a level in parallel
    for (const level of levels) {
      const levelPromises = level.map(message => async () => {
        if (signal.aborted) {
          throw new Error('Batch aborted')
        }

        const startTime = Date.now()
        try {
          const response = await this.executeMessage(message, sendMessage, request.timeout)
          results[message.id] = {
            id: message.id,
            status: 'success',
            response,
            duration: Date.now() - startTime
          }
          this.emit('message:completed', { batchId: request.projectId, messageId: message.id })
        } catch (error) {
          results[message.id] = {
            id: message.id,
            status: error instanceof Error && error.message.includes('timeout') ? 'timeout' : 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - startTime
          }
          this.emit('message:failed', { batchId: request.projectId, messageId: message.id, error })
        }
      })

      await pAll(levelPromises, { concurrency })
    }

    return results
  }

  /**
   * Execute until any message succeeds
   */
  private async executeAny(
    messages: BatchMessage[],
    sendMessage: (message: BatchMessage) => Promise<unknown>,
    request: BatchRequest,
    signal: AbortSignal
  ): Promise<Record<string, BatchResult>> {
    const results: Record<string, BatchResult> = {}
    
    return new Promise((resolve) => {
      let resolved = false
      const promises: Promise<void>[] = []

      for (const message of messages) {
        const promise = (async () => {
          if (signal.aborted || resolved) return

          const startTime = Date.now()
          try {
            const response = await this.executeMessage(message, sendMessage, request.timeout)
            results[message.id] = {
              id: message.id,
              status: 'success',
              response,
              duration: Date.now() - startTime
            }
            
            if (!resolved) {
              resolved = true
              // Cancel other pending operations
              signal.dispatchEvent(new Event('abort'))
              resolve(results)
            }
          } catch (error) {
            results[message.id] = {
              id: message.id,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
              duration: Date.now() - startTime
            }
          }
        })()
        
        promises.push(promise)
      }

      // If all fail, still resolve
      Promise.all(promises).then(() => {
        if (!resolved) {
          resolve(results)
        }
      })
    })
  }

  /**
   * Fire and forget - return immediately
   */
  private async executeNone(
    messages: BatchMessage[],
    sendMessage: (message: BatchMessage) => Promise<unknown>,
    request: BatchRequest,
    _signal: AbortSignal
  ): Promise<Record<string, BatchResult>> {
    const results: Record<string, BatchResult> = {}
    
    // Start all operations but don't wait
    for (const message of messages) {
      results[message.id] = {
        id: message.id,
        status: 'success',
        duration: 0
      }

      // Execute in background
      this.executeMessage(message, sendMessage, request.timeout)
        .then(() => {
          this.emit('message:completed', { batchId: request.projectId, messageId: message.id })
        })
        .catch(error => {
          this.emit('message:failed', { batchId: request.projectId, messageId: message.id, error })
        })
    }

    return results
  }

  /**
   * Execute a single message with tracking
   */
  private async executeMessage(
    message: BatchMessage,
    sendMessage: (message: BatchMessage) => Promise<unknown>,
    timeout?: number
  ): Promise<unknown> {
    const { correlationId, promise } = await this.responseTracker.trackResponse(
      message.targetAgentId,
      message.projectId || 'default',
      message.timeout || timeout || 30000
    )

    // Send the message asynchronously
    sendMessage(message)
      .then(result => {
        this.responseTracker.resolveResponse(correlationId, result)
      })
      .catch(error => {
        this.responseTracker.rejectResponse(
          correlationId, 
          error instanceof Error ? error : new Error('Failed to send message')
        )
      })
    
    // Return the tracked promise which will resolve/reject based on the response
    return promise
  }

  /**
   * Build dependency graph from messages
   */
  private buildDependencyGraph(messages: BatchMessage[]): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>()
    
    for (const message of messages) {
      if (!graph.has(message.id)) {
        graph.set(message.id, new Set())
      }
      
      if (message.dependencies) {
        for (const dep of message.dependencies) {
          graph.get(message.id)!.add(dep)
        }
      }
    }
    
    return graph
  }

  /**
   * Topological sort for dependency resolution
   */
  private topologicalSort(_graph: Map<string, Set<string>>): BatchMessage[] {
    // Implementation simplified for now - just return messages without dependencies first
    // In production, implement proper topological sort
    return []
  }

  /**
   * Group messages by dependency level
   */
  private groupByDependencyLevel(messages: BatchMessage[]): BatchMessage[][] {
    const levels: BatchMessage[][] = []
    
    // Simple implementation - messages without deps first, then others
    const noDeps = messages.filter(m => !m.dependencies || m.dependencies.length === 0)
    const withDeps = messages.filter(m => m.dependencies && m.dependencies.length > 0)
    
    if (noDeps.length > 0) levels.push(noDeps)
    if (withDeps.length > 0) levels.push(withDeps)
    
    return levels
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(
    results: Record<string, BatchResult>, 
    duration: number
  ): BatchResponse['summary'] {
    const values = Object.values(results)
    
    return {
      total: values.length,
      successful: values.filter(r => r.status === 'success').length,
      failed: values.filter(r => r.status === 'error').length,
      timedOut: values.filter(r => r.status === 'timeout').length,
      duration
    }
  }

  /**
   * Abort a batch operation
   */
  abortBatch(batchId: string): boolean {
    const controller = this.activeBatches.get(batchId)
    if (controller) {
      controller.abort()
      this.activeBatches.delete(batchId)
      this.emit('batch:aborted', { batchId })
      return true
    }
    return false
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Abort all active batches
    for (const [, controller] of this.activeBatches) {
      controller.abort()
    }
    this.activeBatches.clear()
    
    this.responseTracker.destroy()
    this.removeAllListeners()
  }
}