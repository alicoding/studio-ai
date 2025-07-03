import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { ProcessManager } from '../../../lib/process/ProcessManager.js'
import { ConfigService } from '../../../src/services/ConfigService.js'
import { AgentConfigService } from '../services/AgentConfigService.js'
import { ProjectService } from '../services/ProjectService.js'
const router = Router()
const configService = ConfigService.getInstance()
const agentConfigService = AgentConfigService.getInstance()
const projectService = new ProjectService()

// GET /api/agents - Get all agent configurations
router.get('/', async (req, res) => {
  try {
    const agents = await agentConfigService.getAllAgents()
    
    // Get all projects from ProjectService to check which agents are being used
    const projects = await projectService.getAllProjects()
    
    // Create a map of agent usage by reading project configuration files
    const agentProjectMap = new Map<string, string[]>()
    
    for (const project of projects) {
      // Read the project configuration file to get agentIds
      try {
        const projectConfigPath = path.join(os.homedir(), '.claude-studio', 'projects', `${project.id}.json`)
        const projectData = await fs.readFile(projectConfigPath, 'utf-8')
        const projectConfig = JSON.parse(projectData)
        
        const agentList = projectConfig.agentIds || []
        if (Array.isArray(agentList)) {
          for (const agentId of agentList) {
            if (!agentProjectMap.has(agentId)) {
              agentProjectMap.set(agentId, [])
            }
            agentProjectMap.get(agentId)!.push(project.id)
          }
        }
      } catch (error) {
        // If project config doesn't exist in .claude-studio, skip it
        console.log(`No project config found for ${project.id}`)
      }
    }
    
    // Add projects using info from the map
    const clientAgents = agents.map((agent) => ({
      ...agent,
      projectsUsing: agentProjectMap.get(agent.id) || [],
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
    const agent = await agentConfigService.getAgent(req.params.id)
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' })
    }
    
    // Get all projects from ProjectService to check which ones use this agent
    const projects = await projectService.getAllProjects()
    const projectsUsing: string[] = []
    
    for (const project of projects) {
      try {
        const projectConfigPath = path.join(os.homedir(), '.claude-studio', 'projects', `${project.id}.json`)
        const projectData = await fs.readFile(projectConfigPath, 'utf-8')
        const projectConfig = JSON.parse(projectData)
        
        const agentList = projectConfig.agentIds || []
        if (Array.isArray(agentList) && agentList.includes(req.params.id)) {
          projectsUsing.push(project.id)
        }
      } catch (error) {
        // If project config doesn't exist in .claude-studio, skip it
        console.log(`No project config found for ${project.id}`)
      }
    }
    
    const clientAgent = {
      ...agent,
      projectsUsing,
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

    // First check if agent exists
    const existingAgent = await agentConfigService.getAgent(req.params.id)
    if (!existingAgent) {
      return res.status(404).json({ error: 'Agent not found' })
    }

    // Update in legacy configurations.json
    const legacyConfigPath = '/Users/ali/claude-swarm/claude-team/claude-studio/data/agents/configurations.json'
    try {
      const data = await fs.readFile(legacyConfigPath, 'utf-8')
      const configs = JSON.parse(data)
      
      const agentIndex = configs.findIndex((a: any) => a.id === req.params.id)
      if (agentIndex !== -1) {
        // Update the agent
        configs[agentIndex] = {
          ...configs[agentIndex],
          ...(name && { name }),
          ...(role && { role }),
          ...(systemPrompt && { systemPrompt }),
          ...(tools && { tools }),
          ...(model && { model }),
          updatedAt: new Date().toISOString(),
        }
        
        // Save back to file
        await fs.writeFile(legacyConfigPath, JSON.stringify(configs, null, 2))
      }
    } catch (error) {
      console.error('Failed to update legacy config:', error)
    }

    // Also try to update via ConfigService (for non-legacy agents)
    try {
      await configService.updateAgent(req.params.id, {
        ...(name && { name }),
        ...(role && { role }),
        ...(systemPrompt && { systemPrompt }),
        ...(tools && { tools }),
        ...(model && { model }),
        ...(maxTokens && { maxTokens }),
        ...(temperature !== undefined && { temperature }),
      })
    } catch (error) {
      // It's OK if ConfigService update fails for legacy agents
      console.log('ConfigService update failed (expected for legacy agents):', error)
    }

    // Get the updated agent
    const updated = await agentConfigService.getAgent(req.params.id)
    if (!updated) {
      return res.status(404).json({ error: 'Agent not found after update' })
    }

    // Get project usage info
    const projects = await projectService.getAllProjects()
    const projectsUsing: string[] = []
    
    for (const project of projects) {
      try {
        const projectConfigPath = path.join(os.homedir(), '.claude-studio', 'projects', `${project.id}.json`)
        const projectData = await fs.readFile(projectConfigPath, 'utf-8')
        const projectConfig = JSON.parse(projectData)
        
        const agentList = projectConfig.agentIds || []
        if (Array.isArray(agentList) && agentList.includes(req.params.id)) {
          projectsUsing.push(project.id)
        }
      } catch (error) {
        // Skip if no project config
      }
    }

    const clientAgent = {
      ...updated,
      projectsUsing,
    }
    res.json(clientAgent)
  } catch (error) {
    console.error('Failed to update agent:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: 'Failed to update agent', details: errorMessage })
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

    const agent = await agentConfigService.getAgent(req.params.id)
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

// POST /api/agents/:id/abort - Abort running Claude agent to prevent final messages
router.post('/:id/abort', async (req, res) => {
  try {
    const agentId = req.params.id
    const { projectId } = req.body

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' })
    }

    console.log(`Aborting Claude agent ${agentId} in project ${projectId}`)

    // Import ClaudeService to abort the agent
    const { ClaudeService } = await import('../services/ClaudeService.js')
    const claudeService = new ClaudeService()

    // Remove/abort the agent to prevent any final messages
    await claudeService.removeAgent(projectId, agentId)

    res.json({
      message: 'Agent aborted successfully',
      agentId,
      projectId,
    })
  } catch (error) {
    console.error('Failed to abort agent:', error)
    res.status(500).json({ error: 'Failed to abort agent' })
  }
})

// POST /api/agents/:id/clear-session - Clear agent session and clean up files
router.post('/:id/clear-session', async (req, res) => {
  try {
    const agentId = req.params.id
    const { projectId, oldSessionId } = req.body

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' })
    }

    console.log(`Clearing session for agent ${agentId} in project ${projectId}`)

    // Clean up session files if we have a session ID
    let sessionFileDeleted = false
    if (oldSessionId) {
      try {
        // Import SessionService dynamically to avoid module resolution issues
        const { SessionService } = await import('../services/SessionService.js')
        const sessionService = SessionService.getInstance()
        const sessionPath = sessionService.getSessionPath(projectId, oldSessionId)
        
        try {
          await fs.access(sessionPath)
          await fs.unlink(sessionPath)
          console.log(`Successfully deleted session file: ${sessionPath}`)
          sessionFileDeleted = true
        } catch (error) {
          console.log(`Session file not found or already deleted: ${sessionPath}`)
          sessionFileDeleted = true // File doesn't exist, which is the desired state
        }
      } catch (error) {
        console.error('Failed to import SessionService or delete session file:', error)
        throw new Error(`Failed to clean up session file: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Also try to clean up any legacy files
    const legacyPath = path.join(
      os.homedir(),
      '.claude',
      'projects',
      projectId,
      `${agentId}.jsonl`
    )

    try {
      await fs.access(legacyPath)
      await fs.unlink(legacyPath)
      console.log(`Deleted legacy session file: ${legacyPath}`)
    } catch (error) {
      // Legacy file might not exist, that's ok
    }

    // Remove session tracking from session service
    if (oldSessionId) {
      try {
        // Import SessionService dynamically to avoid module resolution issues
        const { SessionService } = await import('../services/SessionService.js')
        const sessionService = SessionService.getInstance()
        await sessionService.clearSession(projectId, agentId)
      } catch (error) {
        console.error('Failed to clear session tracking:', error)
      }
    }

    res.json({
      message: 'Agent session cleared successfully',
      agentId,
      projectId,
      filesDeleted: {
        sessionFile: sessionFileDeleted,
        oldSessionId: oldSessionId || null,
      },
    })
  } catch (error) {
    console.error('Failed to clear agent session:', error)
    res.status(500).json({ error: 'Failed to clear agent session' })
  }
})

export default router
