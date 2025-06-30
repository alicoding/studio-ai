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

// DELETE /api/agents/:id - Kill running agent and delete configuration
router.delete('/:id', async (req, res) => {
  try {
    // Kill running agent process first
    const processManager = ProcessManager.getInstance()
    await processManager.killAgent(req.params.id)

    console.log(`Agent ${req.params.id} killed`)

    await configService.deleteAgent(req.params.id)
    res.json({ message: 'Agent killed and deleted successfully' })
  } catch (error) {
    console.error('Failed to delete agent:', error)
    res.status(500).json({ error: 'Failed to delete agent' })
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

// DELETE /api/agents/session - Delete Claude native session file
router.delete('/session', async (req, res) => {
  try {
    const { projectId, agentId } = req.body

    if (!projectId || !agentId) {
      return res.status(400).json({ error: 'projectId and agentId are required' })
    }

    // Construct the session file path
    const sessionPath = path.join(
      os.homedir(),
      '.claude',
      'projects',
      projectId,
      `${agentId}.jsonl`
    )

    try {
      // Check if file exists
      await fs.access(sessionPath)

      // Delete the file
      await fs.unlink(sessionPath)
      console.log(`Deleted session file: ${sessionPath}`)

      res.json({
        message: 'Session file deleted successfully',
        path: sessionPath,
      })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist, that's OK
        res.json({
          message: 'Session file not found (already deleted)',
          path: sessionPath,
        })
      } else {
        throw error
      }
    }
  } catch (error) {
    console.error('Failed to delete session file:', error)
    res.status(500).json({ error: 'Failed to delete session file' })
  }
})

export default router
