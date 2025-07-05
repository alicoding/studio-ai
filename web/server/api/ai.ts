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
import { LangChainAIService } from '../services/LangChainAIService'
import type { CapabilityConfig } from '@/lib/ai/orchestration/capability-config'

const router = Router()

// Using imported CapabilityConfig type from frontend
type CapabilityMap = Record<string, CapabilityConfig>

// Initialize AI service
const aiService = LangChainAIService.getInstance()

// Initialize storage for AI capabilities
const capabilitiesStorage = createStorage({
  namespace: 'ai-capabilities',
  type: 'config'
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
        const capability = Object.values(capabilities).find((cap: CapabilityConfig) => 
          cap.command?.trigger === trigger ||
          cap.command?.aliases?.includes(trigger as string)
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
    
    // Load capability configuration from unified storage
    let capability: CapabilityConfig | null
    try {
      capability = await capabilitiesStorage.get<CapabilityConfig>(capabilityId)
      
      if (!capability) {
        return res.status(404).json({ error: `Capability not found: ${capabilityId}` })
      }
    } catch (_error) {
      return res.status(404).json({ error: 'No capabilities configured' })
    }
    
    try {
      // KISS: Use LangChain service for all AI execution
      const result = await aiService.executeCapability(capability, input, context)
      res.json(result)
    } catch (error) {
      console.error('AI execution error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      res.status(500).json({ 
        error: `AI execution failed: ${errorMessage}` 
      })
    }
  } catch (error) {
    console.error('Failed to execute AI capability:', error)
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to execute AI capability' 
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
    // Get ElectronHub configuration from environment
    const apiKey = process.env.ELECTRONHUB_API_KEY
    const apiUrl = process.env.ELECTRONHUB_API_URL || 'https://api.electronhub.ai/v1'
    
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'ElectronHub API key not configured. Please set ELECTRONHUB_API_KEY in your environment.' 
      })
    }
    
    // Fetch models from ElectronHub using ky (Library-First)
    const data = await ky.get(`${apiUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }).json()
    
    // Return the response as-is to maintain compatibility
    res.json(data)
  } catch (error) {
    console.error('Failed to fetch models from provider:', error)
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch models' 
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
      modified: new Date().toISOString()
    }
    
    await capabilitiesStorage.set(id, capability)
    
    res.json({ success: true, capability })
  } catch (error) {
    console.error('Failed to update capability:', error)
    res.status(500).json({ error: 'Failed to update capability' })
  }
})

export default router