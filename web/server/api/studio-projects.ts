/**
 * Studio Projects API
 *
 * SOLID: Single responsibility - Studio project endpoints
 * DRY: Reuses StudioProjectService
 * KISS: Simple REST API design
 */

import { Router } from 'express'
import { StudioProjectService } from '../services/StudioProjectService.js'
import { StudioSessionService } from '../services/StudioSessionService.js'
import { SessionService } from '../services/SessionService.js'
import type { Request, Response } from 'express'

const router = Router()
const studioProjectService = new StudioProjectService()
const studioSessionService = StudioSessionService.getInstance()

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
    const { deleteWorkspace } = req.query

    await studioProjectService.deleteProject(id, {
      deleteWorkspace: deleteWorkspace === 'true',
    })

    res.status(204).send()
  } catch (error) {
    console.error('Error deleting Studio project:', error)
    const message = error instanceof Error ? error.message : 'Failed to delete project'
    res.status(500).json({ error: message })
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
    const agentsWithShortIds = await studioProjectService.getProjectAgentsWithShortIds(id)

    // Map to format expected by frontend - use shortId as the main id
    const agents = agentsWithShortIds.map((agent) => ({
      id: agent.shortId, // Use short ID as the main ID
      agentId: agent.agentConfigId,
      projectId: id,
      status: 'idle' as const,
      sessionId: undefined,
      // Include other properties that might be useful
      role: agent.role,
      customTools: agent.customTools,
      agentConfig: agent.agentConfig,
    }))

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

// GET /api/studio-projects/:id/sessions - List sessions for a Studio project
router.get('/:id/sessions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // Get project to get workspace path
    const project = await studioProjectService.getProjectWithAgents(id)
    const sessions = await studioSessionService.listProjectSessions(project.workspacePath)

    res.json({ sessions })
  } catch (error) {
    console.error('Error listing Studio project sessions:', error)
    const message = error instanceof Error ? error.message : 'Failed to list sessions'
    const status = message.includes('not found') ? 404 : 500
    res.status(status).json({ error: message })
  }
})

// GET /api/studio-projects/:id/agents/:agentId/session - Get current session ID for an agent
router.get('/:id/agents/:agentId/session', async (req: Request, res: Response) => {
  try {
    const { id, agentId } = req.params
    const sessionService = SessionService.getInstance()

    // Get current session ID for this agent
    const sessionId = await sessionService.getSession(id, agentId)

    res.json({ sessionId })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

// GET /api/studio-projects/:id/agents/:agentId/messages - Get messages for an agent (UPDATED: agent-based instead of session-based)
router.get('/:id/agents/:agentId/messages', async (req: Request, res: Response) => {
  try {
    const { id, agentId } = req.params
    const { cursor, limit = '50' } = req.query

    // CRITICAL: Get session ID directly from ClaudeAgent (single source of truth)
    // This prevents race condition where SessionService has stale session IDs
    console.log(
      `[AGENT MESSAGES DEBUG] projectId: ${id}, agentId: ${agentId} - getting session from ClaudeAgent`
    )

    let sessionId: string | null = null

    // Try to get session from active ClaudeAgent first (most current)
    try {
      const { ClaudeService } = await import('../services/ClaudeService')
      const claudeService = new ClaudeService()

      // Get project for workspace path and find agent role
      const project = await studioProjectService.getProjectWithAgents(id)
      console.log(`[AGENT MESSAGES DEBUG] Project workspacePath: ${project.workspacePath}`)

      // Get agents with short IDs to find the correct role
      const agentsWithShortIds = await studioProjectService.getProjectAgentsWithShortIds(id)
      const projectAgent = agentsWithShortIds.find((a) => a.shortId === agentId)
      const role = projectAgent?.role || 'dev' // fallback to 'dev' if not found
      console.log(`[AGENT MESSAGES DEBUG] Found agent role: ${role} for agentId: ${agentId}`)

      // Get the agent (this will create or retrieve cached agent)
      const agent = await claudeService.getOrCreateAgent(
        id,
        agentId,
        role as 'dev' | 'ux' | 'test' | 'pm',
        project.workspacePath
      )
      sessionId = (await agent.getCurrentSessionId()) || null
      console.log(`[AGENT MESSAGES DEBUG] ClaudeAgent returned session: ${sessionId}`)
    } catch (error) {
      console.log(`[AGENT MESSAGES DEBUG] Error getting session from ClaudeAgent:`, error)
    }

    // Fallback to SessionService if agent doesn't have session yet
    if (!sessionId) {
      const sessionService = SessionService.getInstance()
      sessionId = await sessionService.getSession(id, agentId)
      console.log(`[AGENT MESSAGES DEBUG] SessionService fallback returned: ${sessionId}`)
    }

    // If we still don't have a session ID, return empty messages
    if (!sessionId) {
      console.log(
        `[AGENT MESSAGES DEBUG] No session found for agent ${agentId} - returning empty messages`
      )
      return res.json({
        messages: [],
        hasMore: false,
        nextCursor: null,
      })
    }

    console.log(`[AGENT MESSAGES DEBUG] Loading messages for session: ${sessionId}`)

    // Get project for workspace path
    const project = await studioProjectService.getProjectWithAgents(id)

    // Get messages from session using the session-based logic
    const studioSessionService = StudioSessionService.getInstance()
    const result = await studioSessionService.getSessionMessages(
      project.workspacePath,
      sessionId,
      {
        cursor: cursor as string | undefined,
        limit: parseInt(limit as string, 10),
      },
      id // Pass the project ID for caching
    )

    res.json(result)
  } catch (error) {
    console.error('Error fetching agent messages:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch messages'
    const status = message.includes('not found') ? 404 : 500
    res.status(status).json({ error: message })
  }
})

// DELETE /api/studio-projects/:id/sessions/:sessionId - Delete a session
router.delete('/:id/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const { id, sessionId } = req.params

    // Get project to get workspace path
    const project = await studioProjectService.getProjectWithAgents(id)

    // Delete the session
    await studioSessionService.deleteSession(project.workspacePath, sessionId)

    res.status(204).send()
  } catch (error) {
    console.error('Error deleting Studio project session:', error)
    const message = error instanceof Error ? error.message : 'Failed to delete session'
    res.status(500).json({ error: message })
  }
})

// GET /api/studio-projects/:id/sessions/:sessionId/export - Export session as JSONL
router.get('/:id/sessions/:sessionId/export', async (req: Request, res: Response) => {
  try {
    const { id, sessionId } = req.params

    // Get project to get workspace path
    const project = await studioProjectService.getProjectWithAgents(id)

    // Export the session as JSONL
    const jsonlContent = await studioSessionService.exportSessionAsJsonl(
      project.workspacePath,
      sessionId
    )

    // Set appropriate headers for JSONL download
    res.setHeader('Content-Type', 'application/x-ndjson')
    res.setHeader('Content-Disposition', `attachment; filename="${sessionId}.jsonl"`)
    res.send(jsonlContent)
  } catch (error) {
    console.error('Error exporting Studio project session:', error)
    const message = error instanceof Error ? error.message : 'Failed to export session'
    const status = message.includes('not found') ? 404 : 500
    res.status(status).json({ error: message })
  }
})

export default router
