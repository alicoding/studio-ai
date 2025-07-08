/**
 * Studio Projects API
 *
 * SOLID: Single responsibility - Studio project endpoints
 * DRY: Reuses StudioProjectService
 * KISS: Simple REST API design
 */

import { Router } from 'express'
import { StudioProjectService } from '../services/StudioProjectService.js'
import type { Request, Response } from 'express'

const router = Router()
const studioProjectService = new StudioProjectService()

// GET /api/studio-projects - List all Studio projects
router.get('/', async (req: Request, res: Response) => {
  try {
    const projects = await studioProjectService.listProjects()
    res.json({ projects })
  } catch (error) {
    console.error('Error listing Studio projects:', error)
    res.status(500).json({ error: 'Failed to list projects' })
  }
})

// GET /api/studio-projects/:id - Get a specific project with agents
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const project = await studioProjectService.getProjectWithAgents(id)
    res.json(project)
  } catch (error) {
    console.error('Error getting Studio project:', error)
    const message = error instanceof Error ? error.message : 'Failed to get project'
    const status = message.includes('not found') ? 404 : 500
    res.status(status).json({ error: message })
  }
})

// POST /api/studio-projects - Create a new Studio project
router.post('/', async (req: Request, res: Response) => {
  try {
    const project = await studioProjectService.createProject(req.body)
    res.status(201).json(project)
  } catch (error) {
    console.error('Error creating Studio project:', error)
    const message = error instanceof Error ? error.message : 'Failed to create project'
    res.status(500).json({ error: message })
  }
})

// PUT /api/studio-projects/:id - Update project settings
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const project = await studioProjectService.updateProject(id, req.body)
    res.json(project)
  } catch (error) {
    console.error('Error updating Studio project:', error)
    const message = error instanceof Error ? error.message : 'Failed to update project'
    const status = message.includes('not found') ? 404 : 500
    res.status(status).json({ error: message })
  }
})

// DELETE /api/studio-projects/:id - Delete a project
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await studioProjectService.deleteProject(id)
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting Studio project:', error)
    res.status(500).json({ error: 'Failed to delete project' })
  }
})

// POST /api/studio-projects/:id/agents - Add agent to project
router.post('/:id/agents', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { role, agentConfigId, customTools } = req.body

    if (!role || !agentConfigId) {
      return res.status(400).json({ error: 'role and agentConfigId are required' })
    }

    await studioProjectService.addAgentToProject(id, {
      role,
      agentConfigId,
      customTools,
    })

    // Return updated project with agents
    const project = await studioProjectService.getProjectWithAgents(id)
    res.json(project)
  } catch (error) {
    console.error('Error adding agent to project:', error)
    const message = error instanceof Error ? error.message : 'Failed to add agent'
    const status = message.includes('already assigned') ? 409 : 500
    res.status(status).json({ error: message })
  }
})

// DELETE /api/studio-projects/:id/agents/:role - Remove agent from project
router.delete('/:id/agents/:role', async (req: Request, res: Response) => {
  try {
    const { id, role } = req.params
    await studioProjectService.removeAgentFromProject(id, role)

    // Return updated project with agents
    const project = await studioProjectService.getProjectWithAgents(id)
    res.json(project)
  } catch (error) {
    console.error('Error removing agent from project:', error)
    res.status(500).json({ error: 'Failed to remove agent' })
  }
})

// GET /api/studio-projects/:id/agents/short-ids - Get agents with short IDs
router.get('/:id/agents/short-ids', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const agents = await studioProjectService.getProjectAgentsWithShortIds(id)
    res.json({ agents })
  } catch (error) {
    console.error('Error getting project agents with short IDs:', error)
    res.status(500).json({ error: 'Failed to get agents' })
  }
})

// POST /api/studio-projects/:id/team-template - Create team template from project
router.post('/:id/team-template', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, description } = req.body

    if (!name) {
      return res.status(400).json({ error: 'name is required' })
    }

    const templateId = await studioProjectService.createTeamTemplateFromProject(
      id,
      name,
      description
    )
    res.status(201).json({ templateId })
  } catch (error) {
    console.error('Error creating team template:', error)
    res.status(500).json({ error: 'Failed to create team template' })
  }
})

export default router
