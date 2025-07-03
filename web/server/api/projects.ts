import { Router } from 'express'
import { ProjectService } from '../services/ProjectService.js'
// ProcessManager removed - using Claude SDK instances instead

const router = Router()
const projectService = new ProjectService()

// GET /api/projects - Get all projects
router.get('/', async (req, res) => {
  try {
    const projects = await projectService.getAllProjects()
    res.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    res.status(500).json({ error: 'Failed to fetch projects' })
  }
})

// GET /api/projects/:id - Get specific project
router.get('/:id', async (req, res) => {
  try {
    const project = await projectService.getProject(req.params.id)

    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    res.json(project)
  } catch (error) {
    console.error('Error fetching project:', error)
    res.status(500).json({ error: 'Failed to fetch project' })
  }
})

// PUT /api/projects/:id/metadata - Update project metadata (tags, favorite, status, etc.)
router.put('/:id/metadata', async (req, res) => {
  try {
    const { status, tags, favorite, notes } = req.body

    await projectService.updateProjectMetadata(req.params.id, {
      status,
      tags,
      favorite,
      notes,
    })

    const updatedProject = await projectService.getProject(req.params.id)
    res.json(updatedProject)
  } catch (error) {
    console.error('Error updating project metadata:', error)
    res.status(500).json({ error: 'Failed to update project metadata' })
  }
})

// POST /api/projects/:id/favorite - Toggle favorite status
router.post('/:id/favorite', async (req, res) => {
  try {
    await projectService.toggleFavorite(req.params.id)
    const updatedProject = await projectService.getProject(req.params.id)
    res.json(updatedProject)
  } catch (error) {
    console.error('Error toggling favorite:', error)
    res.status(500).json({ error: 'Failed to toggle favorite' })
  }
})

// POST /api/projects/:id/tags - Add tag to project
router.post('/:id/tags', async (req, res) => {
  try {
    const { tag } = req.body

    if (!tag) {
      return res.status(400).json({ error: 'Tag is required' })
    }

    await projectService.addTag(req.params.id, tag)
    const updatedProject = await projectService.getProject(req.params.id)
    res.json(updatedProject)
  } catch (error) {
    console.error('Error adding tag:', error)
    res.status(500).json({ error: 'Failed to add tag' })
  }
})

// DELETE /api/projects/:id/tags/:tag - Remove tag from project
router.delete('/:id/tags/:tag', async (req, res) => {
  try {
    await projectService.removeTag(req.params.id, decodeURIComponent(req.params.tag))
    const updatedProject = await projectService.getProject(req.params.id)
    res.json(updatedProject)
  } catch (error) {
    console.error('Error removing tag:', error)
    res.status(500).json({ error: 'Failed to remove tag' })
  }
})

// POST /api/projects/:id/archive - Archive project
router.post('/:id/archive', async (req, res) => {
  try {
    await projectService.archiveProject(req.params.id)
    const updatedProject = await projectService.getProject(req.params.id)
    res.json(updatedProject)
  } catch (error) {
    console.error('Error archiving project:', error)
    res.status(500).json({ error: 'Failed to archive project' })
  }
})

// POST /api/projects/:id/unarchive - Unarchive project
router.post('/:id/unarchive', async (req, res) => {
  try {
    await projectService.unarchiveProject(req.params.id)
    const updatedProject = await projectService.getProject(req.params.id)
    res.json(updatedProject)
  } catch (error) {
    console.error('Error unarchiving project:', error)
    res.status(500).json({ error: 'Failed to unarchive project' })
  }
})

// GET /api/projects/:id/sessions - Get project sessions (agents)
// DEPRECATED: This returns all JSONL files as agents which is incorrect
// Use /api/projects/:id/agents instead
router.get('/:id/sessions', async (req, res) => {
  try {
    const sessions = await projectService.getProjectSessions(req.params.id)
    res.json({ sessions })
  } catch (error) {
    console.error('Error fetching project sessions:', error)
    res.status(500).json({ error: 'Failed to fetch project sessions' })
  }
})

// GET /api/projects/:id/agents - Get agents configured for this project
// NEW: Returns only agents that are properly configured with tracked sessions
router.get('/:id/agents', async (req, res) => {
  try {
    const agents = await projectService.getProjectAgents(req.params.id)
    res.json({ agents })
  } catch (error) {
    console.error('Error fetching project agents:', error)
    res.status(500).json({ error: 'Failed to fetch project agents' })
  }
})

// POST /api/projects/:id/agents - Add agents to a project
router.post('/:id/agents', async (req, res) => {
  try {
    const { agentIds } = req.body

    if (!Array.isArray(agentIds)) {
      return res.status(400).json({ error: 'agentIds must be an array' })
    }

    await projectService.addAgentsToProject(req.params.id, agentIds)

    // Return updated agents list
    const agents = await projectService.getProjectAgents(req.params.id)
    res.json({ agents })
  } catch (error) {
    console.error('Error adding agents to project:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to add agents to project'
    // Return 400 for validation errors, 500 for other errors
    const statusCode = errorMessage.includes('No valid agent configurations') ? 400 : 500
    res.status(statusCode).json({ error: errorMessage })
  }
})

// DELETE /api/projects/:id/agents/:agentInstanceId - Remove an agent from a project
router.delete('/:id/agents/:agentInstanceId', async (req, res) => {
  try {
    const { id: projectId, agentInstanceId } = req.params

    await projectService.removeAgentFromProject(projectId, agentInstanceId)

    // Return updated agents list
    const agents = await projectService.getProjectAgents(projectId)
    res.json({ agents })
  } catch (error) {
    console.error('Error removing agent from project:', error)
    res.status(500).json({ error: 'Failed to remove agent from project' })
  }
})

// DELETE /api/projects/:id/sessions/:fileName - Delete a session
router.delete('/:id/sessions/:fileName', async (req, res) => {
  try {
    await projectService.deleteProjectSession(req.params.id, req.params.fileName)
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting session:', error)
    res.status(500).json({ error: 'Failed to delete session' })
  }
})

// GET /api/projects/:id/sessions/:sessionId/messages - Get messages from a session
router.get('/:id/sessions/:sessionId/messages', async (req, res) => {
  try {
    const { cursor, limit = '50' } = req.query
    const result = await projectService.getSessionMessages(req.params.id, req.params.sessionId, {
      cursor: cursor as string | undefined,
      limit: parseInt(limit as string, 10),
    })
    res.json(result)
  } catch (error) {
    console.error('Error fetching session messages:', error)
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
})

// DELETE /api/projects/:id/agents - Kill all agents for project
router.delete('/:id/agents', async (req, res) => {
  try {
    // No processes to kill - agents are Claude SDK instances
    // This endpoint exists for API compatibility
    console.log(`Project ${req.params.id} agents cleared (no processes - using SDK instances)`)

    res.json({
      message: 'Project agents killed successfully',
      projectId: req.params.id,
    })
  } catch (error) {
    console.error('Error killing project agents:', error)
    res.status(500).json({ error: 'Failed to kill project agents' })
  }
})

export default router
