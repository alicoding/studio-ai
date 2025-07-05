/**
 * Agent Roles API - Manages role assignments for agents in projects
 * 
 * SOLID: Single responsibility for agent role assignment management
 * DRY: Eliminates duplicate role loading logic
 * KISS: Simple REST API with batch operations for performance
 * Library-First: Uses UnifiedAgentConfigService for consistent data access
 */

import { Router, Request, Response } from 'express'
import { UnifiedAgentConfigService, type AgentRoleAssignment } from '../services/UnifiedAgentConfigService'

const router = Router()
const agentConfigService = UnifiedAgentConfigService.getInstance()

interface BatchRoleRequest {
  agentIds: string[]
  projectId?: string
}

interface BatchAssignRequest {
  assignments: Array<{
    projectId: string
    role: string
    agentConfigId: string
    customTools?: string[]
    hasCustomTools?: boolean
  }>
}

// GET /api/agent-roles/:agentId - Get role assignment for specific agent
router.get('/:agentId', async (req: Request, res: Response) => {
  try {
    const { projectId, role } = req.query as { projectId?: string; role?: string }
    
    if (!projectId || !role) {
      return res.status(400).json({ 
        error: 'projectId and role query parameters are required' 
      })
    }
    
    const assignment = await agentConfigService.getRoleAssignment(projectId, role)
    
    if (!assignment) {
      // Return null for consistency with existing frontend code
      return res.json(null)
    }
    
    res.json(assignment)
  } catch (error) {
    console.error('Failed to load role assignment:', error)
    res.status(500).json({ error: 'Failed to load role assignment' })
  }
})

// POST /api/agent-roles/batch - Get role assignments for multiple agents (fixes N+1 problem)
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { agentIds, projectId }: BatchRoleRequest = req.body
    
    if (!Array.isArray(agentIds) || agentIds.length === 0) {
      return res.status(400).json({ error: 'agentIds array is required' })
    }
    
    if (projectId) {
      // Get all role assignments for a specific project
      const assignments = await agentConfigService.getProjectRoleAssignments(projectId)
      
      // Create a map for easy lookup by agent config ID
      const assignmentMap: Record<string, AgentRoleAssignment> = {}
      assignments.forEach(assignment => {
        assignmentMap[assignment.agentConfigId] = assignment
      })
      
      res.json(assignmentMap)
    } else {
      // Legacy behavior - return empty object for each agent ID
      const result: Record<string, AgentRoleAssignment | null> = {}
      agentIds.forEach(agentId => {
        result[agentId] = null
      })
      res.json(result)
    }
  } catch (error) {
    console.error('Failed to load batch role assignments:', error)
    res.status(500).json({ error: 'Failed to load batch role assignments' })
  }
})

// GET /api/agent-roles/project/:projectId - Get all role assignments for a project
router.get('/project/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    
    const assignments = await agentConfigService.getProjectRoleAssignments(projectId)
    
    // Convert to a map for easier frontend consumption
    const assignmentMap: Record<string, AgentRoleAssignment> = {}
    assignments.forEach(assignment => {
      assignmentMap[assignment.role] = assignment
    })
    
    res.json(assignmentMap)
  } catch (error) {
    console.error('Failed to load project role assignments:', error)
    res.status(500).json({ error: 'Failed to load project role assignments' })
  }
})

// POST /api/agent-roles/batch-assign - Assign multiple roles at once
router.post('/batch-assign', async (req: Request, res: Response) => {
  try {
    const { assignments }: BatchAssignRequest = req.body
    
    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ error: 'assignments array is required' })
    }
    
    const results = []
    
    for (const assignment of assignments) {
      if (!assignment.projectId || !assignment.role || !assignment.agentConfigId) {
        return res.status(400).json({ 
          error: 'Each assignment must have projectId, role, and agentConfigId' 
        })
      }
      
      const result = await agentConfigService.assignRole({
        projectId: assignment.projectId,
        role: assignment.role,
        agentConfigId: assignment.agentConfigId,
        customTools: assignment.customTools,
        hasCustomTools: assignment.hasCustomTools
      })
      
      results.push(result)
    }
    
    res.json(results)
  } catch (error) {
    console.error('Failed to batch assign roles:', error)
    res.status(500).json({ error: 'Failed to batch assign roles' })
  }
})

// PUT /api/agent-roles/:projectId/:role - Assign agent config to role in project
router.put('/:projectId/:role', async (req: Request, res: Response) => {
  try {
    const { projectId, role } = req.params
    const { agentConfigId, customTools, hasCustomTools } = req.body
    
    if (!agentConfigId) {
      return res.status(400).json({ error: 'agentConfigId is required' })
    }
    
    const assignment = await agentConfigService.assignRole({
      projectId,
      role,
      agentConfigId,
      customTools,
      hasCustomTools
    })
    
    res.json(assignment)
  } catch (error) {
    console.error('Failed to assign role:', error)
    res.status(500).json({ error: 'Failed to assign role' })
  }
})

// DELETE /api/agent-roles/:projectId/:role - Remove role assignment
router.delete('/:projectId/:role', async (req: Request, res: Response) => {
  try {
    const { projectId, role } = req.params
    
    await agentConfigService.removeRoleAssignment(projectId, role)
    
    res.json({ success: true })
  } catch (error) {
    console.error('Failed to remove role assignment:', error)
    res.status(500).json({ error: 'Failed to remove role assignment' })
  }
})

// GET /api/agent-roles/configs - Get all available agent configurations
router.get('/configs', async (req: Request, res: Response) => {
  try {
    const configs = await agentConfigService.getAllConfigs()
    res.json(configs)
  } catch (error) {
    console.error('Failed to load agent configs:', error)
    res.status(500).json({ error: 'Failed to load agent configs' })
  }
})

// POST /api/agent-roles/configs - Create new agent configuration
router.post('/configs', async (req: Request, res: Response) => {
  try {
    const config = await agentConfigService.createConfig(req.body)
    res.status(201).json(config)
  } catch (error) {
    console.error('Failed to create agent config:', error)
    res.status(500).json({ error: 'Failed to create agent config' })
  }
})

// PUT /api/agent-roles/configs/:id - Update agent configuration
router.put('/configs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const config = await agentConfigService.updateConfig(id, req.body)
    
    if (!config) {
      return res.status(404).json({ error: 'Agent config not found' })
    }
    
    res.json(config)
  } catch (error) {
    console.error('Failed to update agent config:', error)
    res.status(500).json({ error: 'Failed to update agent config' })
  }
})

// DELETE /api/agent-roles/configs/:id - Delete agent configuration
router.delete('/configs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await agentConfigService.deleteConfig(id)
    res.json({ success: true })
  } catch (error) {
    console.error('Failed to delete agent config:', error)
    res.status(500).json({ error: 'Failed to delete agent config' })
  }
})

export default router