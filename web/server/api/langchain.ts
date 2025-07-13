/**
 * LangChain API Endpoint - For MCP integration only
 * 
 * KISS: Simple endpoint for MCP to use AI capabilities
 * DRY: Reuses existing AI API endpoints
 * Library-First: Forwards to unified AI API
 */

import { Router } from 'express'

const router = Router()

// POST /api/langchain/execute - Execute AI capability through proper AI API
router.post('/execute', async (req: any, res: any) => {
  try {
    const { capabilityId, input, context } = req.body
    
    if (!capabilityId || !input) {
      return res.status(400).json({ error: 'capabilityId and input are required' })
    }
    
    // Use the unified AI API instead of hardcoded LangChain
    const response = await fetch('http://localhost:3456/api/ai/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capabilityId, input, context })
    })
    
    if (!response.ok) {
      throw new Error(`AI API call failed: ${response.status}`)
    }
    
    const result = await response.json()
    res.json(result)
  } catch (error) {
    console.error('LangChain execution error:', error)
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to execute LangChain capability' 
    })
  }
})

// GET /api/langchain/capabilities - List configured capabilities from UI API
router.get('/capabilities', async (req: any, res: any) => {
  try {
    // Fallback: make internal API call to unified AI endpoint
    const response = await fetch('http://localhost:3456/api/ai/capabilities')
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`)
    }
    const capabilities = await response.json()
    res.json(capabilities)
  } catch (error) {
    console.error('Failed to get LangChain capabilities:', error)
    res.status(500).json({ error: 'Failed to get capabilities' })
  }
})

export default router