/**
 * Batch Messages API
 *
 * SOLID: Separate endpoint for batch operations
 * DRY: Reuses existing message sending infrastructure
 * KISS: Simple delegation to BatchExecutor
 * Configuration: Uses orchestration config for defaults
 */

import { Router, Request, Response } from 'express'
import { BatchExecutor } from '../services/BatchExecutor'
import { ClaudeService } from '../services/ClaudeService'
import {
  BatchRequestSchema,
  BatchMessage,
  BatchResult,
  validateDependencies,
} from '../schemas/batch'
import {
  getProjectConfig,
  OrchestrationConfig,
  createDefaultConfig,
} from '../schemas/orchestration'
import { z } from 'zod'

const router = Router()
const claudeService = new ClaudeService()
const batchExecutor = new BatchExecutor()

// Load orchestration config (in production, load from storage)
const defaultOrchestrationConfig: OrchestrationConfig = createDefaultConfig()

// Override defaults for testing
Object.assign(defaultOrchestrationConfig, {
  defaults: {
    mentionTimeout: 30000,
    batchTimeout: 60000,
    maxBatchSize: 10,
    waitStrategy: 'all',
    maxConcurrentBatches: 5,
    responseCleanupInterval: 60000,
    maxPendingResponses: 100,
  },
  projects: {},
  permissions: {
    crossProjectMentions: 'none',
    batchOperations: true,
    maxGlobalConcurrency: 20,
    requireExplicitWait: false,
    allowTimeoutOverride: true,
  },
  rateLimit: {
    enabled: false,
    messagesPerMinute: 60,
    messagesPerHour: 600,
    burstSize: 10,
  },
  enabled: true,
})

// POST /api/messages/batch - Execute a batch of messages
// DEPRECATED: Use /api/invoke instead for unified agent invocation
router.post('/', async (req: Request, res: Response) => {
  // Add deprecation warning
  console.warn('[DEPRECATION] /api/messages/batch is deprecated. Use /api/invoke instead.')
  res.setHeader('X-Deprecated', 'true')
  res.setHeader('X-Deprecation-Message', 'Use /api/invoke for multi-agent workflows')

  try {
    // Validate request
    const validationResult = BatchRequestSchema.safeParse(req.body)
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid batch request',
        details: validationResult.error.errors,
      })
    }

    const batchRequest = validationResult.data

    // Debug logging for format parameter
    console.log('[DEBUG] Batch request format:', batchRequest.format)

    // Check if batch operations are enabled
    if (!defaultOrchestrationConfig.permissions.batchOperations) {
      return res.status(403).json({
        error: 'Batch operations are disabled',
      })
    }

    // Get project configuration
    const projectConfig = getProjectConfig(defaultOrchestrationConfig, batchRequest.projectId)

    // Validate batch size
    const maxBatchSize = projectConfig.maxBatchSize
    if (batchRequest.messages.length > maxBatchSize) {
      return res.status(400).json({
        error: `Batch size exceeds maximum of ${maxBatchSize} messages`,
      })
    }

    // Validate dependencies
    const dependencyError = validateDependencies(batchRequest.messages)
    if (dependencyError) {
      return res.status(400).json({
        error: dependencyError,
      })
    }

    // Apply default timeout if not specified
    if (!batchRequest.timeout) {
      batchRequest.timeout = projectConfig.defaults.batchTimeout
    }

    // Get socket.io instance for real-time updates
    const io = req.app.get('io')

    // Message sender function that integrates with Claude service
    const sendMessage = async (message: BatchMessage): Promise<unknown> => {
      // Determine target project (message-level override or batch default)
      const targetProjectId = message.projectId || batchRequest.projectId

      // Emit batch message event
      io.emit('batch:message:sent', {
        batchId: batchRequest.projectId,
        messageId: message.id,
        targetAgentId: message.targetAgentId,
        targetProjectId: targetProjectId,
        timestamp: new Date().toISOString(),
      })

      // Send via Claude service
      const result = await claudeService.sendMessage(
        message.content,
        targetProjectId,
        message.targetAgentId,
        undefined, // projectPath
        'dev', // role
        undefined, // sessionId
        io,
        false, // forceNewSession
        undefined // agentConfig
      )

      // Emit completion event
      io.emit('batch:message:completed', {
        batchId: batchRequest.projectId,
        messageId: message.id,
        targetAgentId: message.targetAgentId,
        targetProjectId: targetProjectId,
        timestamp: new Date().toISOString(),
      })

      return result
    }

    // Subscribe to batch events for WebSocket updates
    batchExecutor.on('batch:started', (data) => {
      io.emit('batch:started', data)
    })

    batchExecutor.on('message:completed', (data) => {
      io.emit('batch:message:completed', data)
    })

    batchExecutor.on('message:failed', (data) => {
      io.emit('batch:message:failed', data)
    })

    batchExecutor.on('batch:completed', (data) => {
      io.emit('batch:completed', data)
    })

    // Execute the batch
    const result = await batchExecutor.executeBatch(batchRequest, sendMessage)

    // Clean up event listeners
    batchExecutor.removeAllListeners()

    // Format response based on format parameter
    console.log('[DEBUG] About to check format, batchRequest.format =', batchRequest.format)
    console.log('[DEBUG] Result structure:', JSON.stringify(result, null, 2))
    if (batchRequest.format === 'text') {
      // Simple text format for MCP
      let textResults = 'No results'

      if (result.results && Array.isArray(result.results)) {
        textResults = result.results
          .map((res: BatchResult) => {
            let content = 'No response'

            if (res.response) {
              if (typeof res.response === 'string') {
                content = res.response
              } else if (typeof res.response === 'object') {
                // Try different response formats
                if ('response' in res.response) {
                  content = (res.response as { response: string }).response
                } else if ('content' in res.response) {
                  content = (res.response as { content: string }).content
                } else {
                  content = JSON.stringify(res.response)
                }
              } else {
                content = String(res.response)
              }
            }

            if (res.error) {
              content = `Error: ${res.error}`
            }

            const status = res.status === 'success' ? '✅' : res.status === 'error' ? '❌' : '⏱️'
            return `${status} **Message ${res.id}**: ${content}`
          })
          .join('\n\n')
      } else if (result.results && typeof result.results === 'object') {
        // Handle object format
        textResults = Object.entries(result.results)
          .map(([msgId, res]) => {
            const batchResult = res as BatchResult
            let content = 'No response'

            if (batchResult.response) {
              if (typeof batchResult.response === 'string') {
                content = batchResult.response
              } else if (typeof batchResult.response === 'object') {
                if ('response' in batchResult.response) {
                  content = (batchResult.response as { response: string }).response
                } else if ('content' in batchResult.response) {
                  content = (batchResult.response as { content: string }).content
                } else {
                  content = JSON.stringify(batchResult.response)
                }
              } else {
                content = String(batchResult.response)
              }
            }

            if (batchResult.error) {
              content = `Error: ${batchResult.error}`
            }

            const status =
              batchResult.status === 'success' ? '✅' : batchResult.status === 'error' ? '❌' : '⏱️'
            return `${status} **Message ${msgId}**: ${content}`
          })
          .join('\n\n')
      }

      const summary = result.summary
        ? `Batch completed: ${result.summary.successful || 0} success, ${result.summary.failed || 0} failed`
        : 'Batch completed'

      res.json({
        content: textResults,
        summary: summary,
      })
    } else {
      // Full structured format for frontend
      res.json(result)
    }
  } catch (error) {
    console.error('Batch execution error:', error)

    let errorMessage = 'Failed to execute batch'
    let statusCode = 500

    if (error instanceof z.ZodError) {
      errorMessage = 'Validation error'
      statusCode = 400
    } else if (error instanceof Error) {
      errorMessage = error.message
    }

    res.status(statusCode).json({
      error: errorMessage,
      timestamp: new Date().toISOString(),
    })
  }
})

// GET /api/messages/batch/:batchId/status - Get batch status (if we implement persistence)
router.get('/:batchId/status', async (req: Request, res: Response) => {
  // TODO: Implement batch status tracking with persistence
  res.status(501).json({
    error: 'Batch status tracking not yet implemented',
  })
})

// POST /api/messages/batch/:batchId/abort - Abort a running batch
router.post('/:batchId/abort', async (req: Request, res: Response) => {
  const { batchId } = req.params

  const aborted = batchExecutor.abortBatch(batchId)

  if (aborted) {
    res.json({
      success: true,
      message: `Batch ${batchId} aborted`,
    })
  } else {
    res.status(404).json({
      error: `Batch ${batchId} not found or already completed`,
    })
  }
})

export default router
