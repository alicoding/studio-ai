/**
 * Tools API - Provides available tools from Claude SDK
 *
 * SOLID: Single responsibility - Tool information endpoint
 * DRY: Uses centralized ToolDiscoveryService
 * KISS: Simple REST API for tool data
 */

import { Router, Request, Response } from 'express'
import { ToolDiscoveryService } from '../services/ToolDiscoveryService.js'

const router = Router()

// GET /api/tools - Get all available tools
router.get('/', async (req: Request, res: Response) => {
  try {
    const toolDiscovery = ToolDiscoveryService.getInstance()
    const tools = toolDiscovery.getTools()
    const toolPermissions = toolDiscovery.getToolPermissions()

    res.json({
      tools,
      toolPermissions,
      count: tools.length,
    })
  } catch (error) {
    console.error('Failed to get tools:', error)
    res.status(500).json({ error: 'Failed to get tools' })
  }
})

// GET /api/tools/permissions - Get tools as ToolPermission format
router.get('/permissions', async (req: Request, res: Response) => {
  try {
    const toolDiscovery = ToolDiscoveryService.getInstance()
    const toolPermissions = toolDiscovery.getToolPermissions()

    res.json(toolPermissions)
  } catch (error) {
    console.error('Failed to get tool permissions:', error)
    res.status(500).json({ error: 'Failed to get tool permissions' })
  }
})

// GET /api/tools/check/:toolName - Check if a specific tool is available
router.get('/check/:toolName', async (req: Request, res: Response) => {
  try {
    const { toolName } = req.params
    const toolDiscovery = ToolDiscoveryService.getInstance()
    const isAvailable = toolDiscovery.isToolAvailable(toolName)

    res.json({
      tool: toolName,
      available: isAvailable,
    })
  } catch (error) {
    console.error('Failed to check tool availability:', error)
    res.status(500).json({ error: 'Failed to check tool availability' })
  }
})

export default router
