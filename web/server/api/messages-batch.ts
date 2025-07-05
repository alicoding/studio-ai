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
import { ProjectResolver } from '../services/ProjectResolver'
import { ProjectService } from '../services/ProjectService'
import { 
  BatchRequestSchema, 
  BatchMessage,
  validateDependencies 
} from '../schemas/batch'
import { getProjectConfig, OrchestrationConfig, createDefaultConfig } from '../schemas/orchestration'
import { z } from 'zod'

const router = Router()
const claudeService = new ClaudeService()
const batchExecutor = new BatchExecutor()
const projectService = new ProjectService()

// Load orchestration config (in production, load from storage)
const defaultOrchestrationConfig: OrchestrationConfig = createDefaultConfig()
const projectResolver = new ProjectResolver(projectService, defaultOrchestrationConfig)

// Override defaults for testing
Object.assign(defaultOrchestrationConfig, {
  defaults: {
    mentionTimeout: 30000,
    batchTimeout: 60000,
    maxBatchSize: 10,
    waitStrategy: 'all',
    maxConcurrentBatches: 5,
    responseCleanupInterval: 60000,
    maxPendingResponses: 100
  },
  projects: {},
  permissions: {
    crossProjectMentions: 'none',
    batchOperations: true,
    maxGlobalConcurrency: 20,
    requireExplicitWait: false,
    allowTimeoutOverride: true
  },
  rateLimit: {
    enabled: false,
    messagesPerMinute: 60,
    messagesPerHour: 600,
    burstSize: 10
  },
  enabled: true
})

// POST /api/messages/batch - Execute a batch of messages
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request
    const validationResult = BatchRequestSchema.safeParse(req.body)
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid batch request',
        details: validationResult.error.errors
      })
    }

    const batchRequest = validationResult.data

    // Check if batch operations are enabled
    if (!defaultOrchestrationConfig.permissions.batchOperations) {
      return res.status(403).json({
        error: 'Batch operations are disabled'
      })
    }

    // Get project configuration
    const projectConfig = getProjectConfig(defaultOrchestrationConfig, batchRequest.projectId)
    
    // Validate batch size
    const maxBatchSize = projectConfig.maxBatchSize
    if (batchRequest.messages.length > maxBatchSize) {
      return res.status(400).json({
        error: `Batch size exceeds maximum of ${maxBatchSize} messages`
      })
    }

    // Validate dependencies
    const dependencyError = validateDependencies(batchRequest.messages)
    if (dependencyError) {
      return res.status(400).json({
        error: dependencyError
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
      
      // Validate cross-project permission if different from source
      if (targetProjectId !== batchRequest.projectId) {
        try {
          await projectResolver.resolveProjectContext({
            sourceProjectId: batchRequest.projectId,
            targetProjectId: targetProjectId,
            userId: batchRequest.fromAgentId,
            action: 'batch'
          })
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Cross-project access denied'
          throw new Error(`Message ${message.id}: ${errorMessage}`)
        }
      }
      
      // Emit batch message event
      io.emit('batch:message:sent', {
        batchId: batchRequest.projectId,
        messageId: message.id,
        targetAgentId: message.targetAgentId,
        targetProjectId: targetProjectId,
        timestamp: new Date().toISOString()
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
        timestamp: new Date().toISOString()
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

    // Return result
    res.json(result)

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
      timestamp: new Date().toISOString()
    })
  }
})

// GET /api/messages/batch/:batchId/status - Get batch status (if we implement persistence)
router.get('/:batchId/status', async (req: Request, res: Response) => {
  // TODO: Implement batch status tracking with persistence
  res.status(501).json({
    error: 'Batch status tracking not yet implemented'
  })
})

// POST /api/messages/batch/:batchId/abort - Abort a running batch
router.post('/:batchId/abort', async (req: Request, res: Response) => {
  const { batchId } = req.params
  
  const aborted = batchExecutor.abortBatch(batchId)
  
  if (aborted) {
    res.json({
      success: true,
      message: `Batch ${batchId} aborted`
    })
  } else {
    res.status(404).json({
      error: `Batch ${batchId} not found or already completed`
    })
  }
})

export default router