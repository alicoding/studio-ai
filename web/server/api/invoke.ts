/**
 * Invoke API - Unified agent invocation endpoint
 * 
 * SOLID: Single endpoint for single/multi agent workflows
 * DRY: Replaces separate mention/batch endpoints
 * KISS: Simple request/response with workflow orchestrator
 * Configuration: All behavior configurable via request
 */

import { Router, Request, Response } from 'express'
import { WorkflowOrchestrator } from '../services/WorkflowOrchestrator'
import { InvokeRequestSchema } from '../schemas/invoke'
import { z } from 'zod'

const router = Router()

// POST /api/invoke - Execute single agent or multi-agent workflow
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request
    const parseResult = InvokeRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        details: parseResult.error.flatten() 
      })
    }

    const request = parseResult.data

    // Get socket.io instance for real-time updates
    const io = req.app.get('io')
    
    // Create orchestrator with socket.io support
    const orchestrator = new WorkflowOrchestrator(io)

    // Execute workflow
    const response = await orchestrator.execute(request)

    // Return response
    res.json(response)

  } catch (error) {
    console.error('Invoke API error:', error)
    
    // Send appropriate error response
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Validation error', 
        details: error.flatten() 
      })
    } else if (error instanceof Error && error.message.includes('No agent configured')) {
      res.status(404).json({ 
        error: 'Role not found', 
        message: error.message 
      })
    } else {
      res.status(500).json({ 
        error: 'Workflow execution failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
})

// GET /api/invoke/roles - Get available roles for the project
router.get('/roles/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' })
    }

    // Import service dynamically to avoid circular dependencies
    const { UnifiedAgentConfigService } = await import('../services/UnifiedAgentConfigService')
    const configService = UnifiedAgentConfigService.getInstance()

    // Get role assignments for project
    const roleAssignments = await configService.getProjectRoleAssignments(projectId)

    // Transform to simple role list
    const roles = roleAssignments.map(assignment => ({
      role: assignment.role,
      agentId: assignment.agentConfigId
    }))

    res.json({ roles })

  } catch (error) {
    console.error('Get roles error:', error)
    res.status(500).json({ 
      error: 'Failed to get roles',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router