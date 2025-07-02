import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { ProcessManager } from '../../../lib/process/ProcessManager.js'
import { ConfigService } from '../../../src/services/ConfigService.js'
const router = Router()
const configService = ConfigService.getInstance()

// GET /api/agents - Get all agent configurations
router.get('/', async (req, res) => {
  try {
    const agents = await configService.getAllAgents()
    // Add projects using info (would need to scan all projects)
    const clientAgents = agents.map((agent) => ({
      ...agent,
      projectsUsing: [], // TODO: Implement project scanning
    }))
    res.json(clientAgents)
  } catch (error) {
    console.error('Failed to load agents:', error)
    res.status(500).json({ error: 'Failed to load agents' })
  }
})

// GET /api/agents/:id - Get specific agent configuration
router.get('/:id', async (req, res) => {
  try {
    const agent = await configService.getAgent(req.params.id)
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' })
    }
    const clientAgent = {
      ...agent,
      projectsUsing: [], // TODO: Implement project scanning
    }
    res.json(clientAgent)
  } catch (error) {
    console.error('Failed to load agent:', error)
    res.status(500).json({ error: 'Failed to load agent' })
  }
})

// POST /api/agents - Create new agent configuration
router.post('/', async (req, res) => {
  try {
    const { id, name, role, systemPrompt, tools, model } = req.body

    // Validation
    if (!name || !role || !systemPrompt) {
      return res.status(400).json({ error: 'Name, role, and system prompt are required' })
    }

    // Check if agent with this ID already exists
    if (id) {
      const existing = await configService.getAgent(id)
      if (existing) {
        return res.status(409).json({ error: 'Agent with this ID already exists' })
      }
    }

    const newAgent = await configService.createAgent({
      id: id || uuidv4(),
      name,
      role,
      systemPrompt,
      tools: tools || ['read', 'write', 'bash'],
      model: model || 'claude-3-opus',
      maxTokens: 200000,
      temperature: 0.7,
    })

    const clientAgent = {
      ...newAgent,
      projectsUsing: [],
    }
    res.status(201).json(clientAgent)
  } catch (error) {
    console.error('Failed to create agent:', error)
    res.status(500).json({ error: 'Failed to create agent' })
  }
})

// PUT /api/agents/:id - Update agent configuration
router.put('/:id', async (req, res) => {
  try {
    const { name, role, systemPrompt, tools, model, maxTokens, temperature } = req.body

    await configService.updateAgent(req.params.id, {
      ...(name && { name }),
      ...(role && { role }),
      ...(systemPrompt && { systemPrompt }),
      ...(tools && { tools }),
      ...(model && { model }),
      ...(maxTokens && { maxTokens }),
      ...(temperature !== undefined && { temperature }),
    })

    const updated = await configService.getAgent(req.params.id)
    if (!updated) {
      return res.status(404).json({ error: 'Agent not found' })
    }

    const clientAgent = {
      ...updated,
      projectsUsing: [],
    }
    res.json(clientAgent)
  } catch (error) {
    console.error('Failed to update agent:', error)
    res.status(500).json({ error: 'Failed to update agent' })
  }
})

// DELETE /api/agents/session - Delete Claude native session file
// This must be defined BEFORE the /:id route to avoid route matching issues
router.delete('/session', async (req, res) => {
  try {
    const { projectId, agentId } = req.body

    if (!projectId || !agentId) {
      return res.status(400).json({ error: 'projectId and agentId are required' })
    }

    console.log('Delete session file request:', {
      projectId,
      agentId,
    })

    // Import SessionService
    const { SessionService } = await import('../services/SessionService.js')
    const sessionService = SessionService.getInstance()

    // Get the tracked sessionId for this agent
    const trackedSessionId = await sessionService.getSession(projectId, agentId)

    if (trackedSessionId) {
      // Delete using the tracked sessionId
      // The projectId might be either the Claude directory name or the original path
      // We need to handle both cases
      let projectPath = projectId

      // If projectId looks like a Claude directory name (starts with dash),
      // try to convert it back to a path
      if (projectId.startsWith('-')) {
        projectPath = projectId.replace(/-/g, '/')
      }

      try {
        await sessionService.deleteSessionFile(projectPath, trackedSessionId)
        console.log(`Successfully deleted session file for sessionId: ${trackedSessionId}`)
      } catch (error) {
        console.error('Error deleting session file:', error)
        // Continue even if file deletion fails
      }

      // Clear the session tracking
      await sessionService.clearSession(projectId, agentId)
      console.log(`Cleared session tracking for agent ${agentId} in project ${projectId}`)

      res.json({
        message: 'Session deleted and tracking cleared successfully',
        sessionId: trackedSessionId,
      })
    } else {
      // No tracked session, try legacy approach with agentId as filename
      const sessionPath = path.join(
        os.homedir(),
        '.claude',
        'projects',
        projectId,
        `${agentId}.jsonl`
      )

      console.log(`No tracked session, attempting legacy delete: ${sessionPath}`)

      try {
        await fs.access(sessionPath)
        await fs.unlink(sessionPath)
        console.log(`Successfully deleted legacy session file: ${sessionPath}`)

        res.json({
          message: 'Legacy session file deleted successfully',
          path: sessionPath,
        })
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          res.json({
            message: 'No session found to delete',
            path: sessionPath,
          })
        } else {
          throw error
        }
      }
    }
  } catch (error) {
    console.error('Failed to delete session:', error)
    res.status(500).json({ error: 'Failed to delete session' })
  }
})

// DELETE /api/agents/:id - Kill running agent and delete configuration if exists
router.delete('/:id', async (req, res) => {
  try {
    // Kill running agent process first
    const processManager = ProcessManager.getInstance()
    await processManager.killAgent(req.params.id)

    console.log(`Agent ${req.params.id} killed`)

    // Try to delete agent configuration if it exists
    try {
      const agent = await configService.getAgent(req.params.id)
      if (agent) {
        await configService.deleteAgent(req.params.id)
        console.log(`Agent ${req.params.id} configuration deleted`)
      } else {
        console.log(`Agent ${req.params.id} has no configuration to delete (runtime agent)`)
      }
    } catch (configError) {
      // It's OK if there's no configuration to delete
      console.log(`No configuration found for agent ${req.params.id}:`, configError)
    }

    res.json({ message: 'Agent killed successfully' })
  } catch (error) {
    console.error('Failed to kill agent:', error)
    res.status(500).json({ error: 'Failed to kill agent' })
  }
})

// POST /api/agents/:id/spawn - Spawn agent to project
router.post('/:id/spawn', async (req, res) => {
  try {
    const { projectId, config } = req.body

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' })
    }

    const agent = await configService.getAgent(req.params.id)
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' })
    }

    // Spawn agent using ProcessManager
    const processManager = ProcessManager.getInstance()
    const agentConfig = {
      role: config?.role || agent.role,
      systemPrompt: config?.systemPrompt || agent.systemPrompt,
      tools: config?.tools || agent.tools,
      model: config?.model || agent.model,
      maxTokens: config?.maxTokens || agent.maxTokens,
    }

    await processManager.spawnAgent(req.params.id, projectId, agentConfig)

    // Update project to include this agent
    const project = await configService.getProject(projectId)
    if (project && !project.activeAgents.includes(req.params.id)) {
      await configService.updateProject(projectId, {
        activeAgents: [...project.activeAgents, req.params.id],
      })
    }

    console.log(`Agent ${req.params.id} spawned for project ${projectId}`)

    res.json({
      message: 'Agent spawned successfully',
      agentId: req.params.id,
      projectId,
      status: 'ready',
    })
  } catch (error) {
    console.error('Failed to spawn agent:', error)
    res.status(500).json({ error: 'Failed to spawn agent' })
  }
})

// PUT /api/agents/:id/status - Set agent status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body

    if (!status || !['online', 'offline'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required (online, offline)' })
    }

    // Update agent status using ProcessManager
    const processManager = ProcessManager.getInstance()
    await processManager.setAgentStatus(req.params.id, status as 'online' | 'offline')

    console.log(`Agent ${req.params.id} status updated to ${status}`)

    res.json({
      message: 'Agent status updated successfully',
      agentId: req.params.id,
      status,
    })
  } catch (error) {
    console.error('Failed to update agent status:', error)
    res.status(500).json({ error: 'Failed to update agent status' })
  }
})

export default router
