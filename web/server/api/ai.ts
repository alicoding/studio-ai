/**
 * AI API Endpoints - Server-side AI capability execution
 *
 * KISS: Simple endpoints that bridge to AI providers
 * DRY: Reuses existing configuration system
 * Library-First: Uses ky for HTTP requests, standard AI SDKs
 * SOLID: Now uses unified storage instead of JSON files
 */

import { Router, Request, Response } from 'express'
import ky from 'ky'
import { createStorage } from '../../../src/lib/storage/UnifiedStorage'
import { CancellableApiClient } from '../services/CancellableApiClient'
import { LangGraphOrchestrator } from '../services/LangGraphOrchestrator'
import type { CapabilityConfig } from '@/lib/ai/orchestration/capability-config'
import type { CancellationRequest } from '../services/CancellableApiClient'
import type { BaseMessage } from '@langchain/core/messages'

const router = Router()

// Using imported CapabilityConfig type from frontend
type CapabilityMap = Record<string, CapabilityConfig>

// Initialize LangGraph orchestrator for all AI operations (replaces LangChain)
const orchestrator = LangGraphOrchestrator.getInstance()

// Initialize cancellable client for AI operations
const cancellableClient = new CancellableApiClient({
  name: 'ai-operations',
  baseUrl: process.env.STUDIO_AI_API || 'http://localhost:3456/api',
  timeout: 60000,
})

// Initialize storage for AI capabilities
const capabilitiesStorage = createStorage({
  namespace: 'ai-capabilities',
  type: 'config',
})

// GET /api/ai/capabilities - Get available AI capabilities
router.get('/capabilities', async (req: Request, res: Response) => {
  try {
    const { trigger } = req.query

    try {
      // Get all capabilities from unified storage
      const keys = await capabilitiesStorage.keys()
      const capabilities: CapabilityMap = {}

      for (const key of keys) {
        const capability = await capabilitiesStorage.get<CapabilityConfig>(key)
        if (capability) {
          capabilities[key] = capability
        }
      }

      if (trigger) {
        // Find capability by trigger
        const capability = Object.values(capabilities).find(
          (cap: CapabilityConfig) =>
            cap.command?.trigger === trigger || cap.command?.aliases?.includes(trigger as string)
        )

        if (!capability) {
          return res.status(404).json({ error: `No capability found for trigger: ${trigger}` })
        }

        return res.json(capability)
      }

      // Return all capabilities
      res.json(capabilities)
    } catch (_error) {
      // No capabilities configured yet
      res.json({})
    }
  } catch (error) {
    console.error('Failed to get capabilities:', error)
    res.status(500).json({ error: 'Failed to get capabilities' })
  }
})

// POST /api/ai/execute - Execute an AI capability
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const { capabilityId, input, context } = req.body

    if (!capabilityId || !input) {
      return res.status(400).json({ error: 'capabilityId and input are required' })
    }

    // KISS: Use LangGraph for everything - single turn or multi-turn, same service
    const sessionId = context?.sessionId || `session-${Date.now()}`

    try {
      const result = await orchestrator.executeWithSession({
        input,
        sessionId,
        projectId: context?.projectId,
        capability: capabilityId,
        context: {
          files: context?.files,
          metadata: context?.metadata,
        },
      })

      res.json({
        content: result.content,
        sessionId: result.state.sessionId,
        metadata: {
          ...result.metadata,
          capabilityId,
          turnCount:
            result.state.messages?.filter((m: BaseMessage) => m._getType() === 'human').length || 0,
        },
      })
    } catch (error) {
      console.error('LangGraph execution error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      res.status(500).json({
        error: `AI execution failed: ${errorMessage}`,
      })
    }
  } catch (error) {
    console.error('Failed to execute AI capability:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to execute AI capability',
    })
  }
})

// POST /api/ai/capabilities - Save a capability configuration
router.post('/capabilities', async (req: Request, res: Response) => {
  try {
    const capability = req.body

    if (!capability.id || !capability.name) {
      return res.status(400).json({ error: 'id and name are required' })
    }

    // Save capability to unified storage
    await capabilitiesStorage.set(capability.id, capability)

    res.json({ success: true, capability })
  } catch (error) {
    console.error('Failed to save capability:', error)
    res.status(500).json({ error: 'Failed to save capability' })
  }
})

// DELETE /api/ai/capabilities/:id - Delete a capability
router.delete('/capabilities/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({ error: 'id is required' })
    }

    // Check if capability exists
    const capability = await capabilitiesStorage.get(id)
    if (!capability) {
      return res.status(404).json({ error: `Capability not found: ${id}` })
    }

    // Delete from unified storage
    await capabilitiesStorage.delete(id)

    res.json({ success: true, deleted: id })
  } catch (error) {
    console.error('Failed to delete capability:', error)
    res.status(500).json({ error: 'Failed to delete capability' })
  }
})

// GET /api/ai/models - Fetch available models from provider
router.get('/models', async (req: Request, res: Response) => {
  try {
    // Get OpenAI-compatible API configuration from environment
    const apiKey = process.env.OPENAI_API_KEY || process.env.ELECTRONHUB_API_KEY
    const apiUrl =
      process.env.OPENAI_API_BASE_URL ||
      process.env.ELECTRONHUB_API_URL ||
      'https://api.openai.com/v1'

    if (!apiKey) {
      return res.status(500).json({
        error:
          'OpenAI-compatible API key not configured. Please set OPENAI_API_KEY in your environment.',
      })
    }

    // Fetch models from OpenAI-compatible API using ky (Library-First)
    const data = await ky
      .get(`${apiUrl}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      })
      .json()

    // Return the response as-is to maintain compatibility
    res.json(data)
  } catch (error) {
    console.error('Failed to fetch models from provider:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch models',
    })
  }
})

// PUT /api/ai/capabilities/:id - Update a capability
router.put('/capabilities/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const capability = req.body

    if (!id) {
      return res.status(400).json({ error: 'id is required' })
    }

    // Check if capability exists
    const existing = await capabilitiesStorage.get(id)
    if (!existing) {
      return res.status(404).json({ error: `Capability not found: ${id}` })
    }

    // Update capability
    capability.id = id // Ensure ID matches
    capability.metadata = {
      ...capability.metadata,
      modified: new Date().toISOString(),
    }

    await capabilitiesStorage.set(id, capability)

    res.json({ success: true, capability })
  } catch (error) {
    console.error('Failed to update capability:', error)
    res.status(500).json({ error: 'Failed to update capability' })
  }
})

// POST /api/ai/cancel - Cancel ongoing AI operations for a session
router.post('/cancel', async (req: Request, res: Response) => {
  try {
    const cancellationRequest: CancellationRequest = req.body

    if (!cancellationRequest.sessionId) {
      return res.status(400).json({ error: 'sessionId is required' })
    }

    // Cancel all requests for the session
    const result = cancellableClient.cancelSession(cancellationRequest.sessionId)

    console.log(
      `[AI API] Cancelled ${result.requestsCancelled} requests for session ${cancellationRequest.sessionId}`
    )

    res.json({
      success: true,
      cancellation: result,
      message: `Cancelled ${result.requestsCancelled} active requests`,
    })
  } catch (error) {
    console.error('Failed to cancel AI operations:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to cancel operations',
    })
  }
})

// GET /api/ai/status - Get status of active operations (for debugging)
router.get('/status', async (req: Request, res: Response) => {
  try {
    const activeRequests = cancellableClient.getActiveRequestsCount()
    const activeSessions = cancellableClient.getActiveSessions()

    res.json({
      activeRequests,
      activeSessions,
      sessionDetails: activeSessions.reduce(
        (acc, sessionId) => {
          acc[sessionId] = cancellableClient.getSessionRequestCount(sessionId)
          return acc
        },
        {} as Record<string, number>
      ),
    })
  } catch (error) {
    console.error('Failed to get AI status:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get status',
    })
  }
})

// GET /api/ai/conversation/:sessionId - Get conversation history for a session
router.get('/conversation/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' })
    }

    const history = await orchestrator.getConversationHistory(sessionId)

    // Convert BaseMessage objects to our expected format
    const formattedHistory = {
      ...history,
      messages:
        history.messages?.map((msg: BaseMessage) => ({
          role:
            msg._getType() === 'human'
              ? 'user'
              : msg._getType() === 'system'
                ? 'system'
                : 'assistant',
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
          timestamp: new Date(), // BaseMessage doesn't have timestamp, so we use current time
        })) || [],
    }

    res.json(formattedHistory)
  } catch (error) {
    console.error('Failed to get conversation history:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get conversation history',
    })
  }
})

export default router
