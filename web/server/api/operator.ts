/**
 * Operator Configuration API
 * 
 * SOLID: Single endpoint for operator settings management
 * DRY: Reuses OperatorConfigService for all operations
 * KISS: Simple REST API for configuration
 * Type-safe: Full validation with proper types
 */

import { Router, Request, Response } from 'express'
import { OperatorConfigService } from '../services/OperatorConfigService'
import { z } from 'zod'

const router = Router()
const operatorService = OperatorConfigService.getInstance()

// Validation schema
const OperatorConfigSchema = z.object({
  model: z.string().min(1),
  systemPrompt: z.string().min(1),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().min(1).max(1000),
  apiKey: z.string().optional(),
  baseURL: z.string().url().optional()
})

// GET /api/operator/config - Get current operator configuration
router.get('/config', async (_req: Request, res: Response) => {
  try {
    const config = await operatorService.getConfig()
    res.json(config)
  } catch (error) {
    console.error('Failed to get operator config:', error)
    res.status(500).json({ 
      error: 'Failed to load operator configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// PUT /api/operator/config - Update operator configuration
router.put('/config', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const parseResult = OperatorConfigSchema.partial().safeParse(req.body)
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Invalid configuration',
        details: parseResult.error.flatten()
      })
    }

    const updated = await operatorService.updateConfig(parseResult.data)
    res.json(updated)
  } catch (error) {
    console.error('Failed to update operator config:', error)
    res.status(500).json({ 
      error: 'Failed to update operator configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// POST /api/operator/reset - Reset to default configuration
router.post('/reset', async (_req: Request, res: Response) => {
  try {
    const config = await operatorService.resetToDefault()
    res.json(config)
  } catch (error) {
    console.error('Failed to reset operator config:', error)
    res.status(500).json({ 
      error: 'Failed to reset operator configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// POST /api/operator/test - Test operator with sample text and optional context
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { text, context } = req.body
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' })
    }

    // Import SimpleOperator dynamically to use latest config
    const { SimpleOperator } = await import('../services/SimpleOperator')
    const operator = new SimpleOperator()
    
    const result = await operator.checkStatus(text, context)
    res.json(result)
  } catch (error) {
    console.error('Failed to test operator:', error)
    res.status(500).json({ 
      error: 'Failed to test operator',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router