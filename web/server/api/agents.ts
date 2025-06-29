import { Router } from 'express'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = Router()

// Agent configuration interface
interface AgentConfig {
  id: string
  name: string
  role: string
  systemPrompt: string
  tools: string[]
  model: string
  createdAt: string
  updatedAt: string
  usedInProjects?: string[]
}

// Storage paths
const AGENTS_DIR = path.join(__dirname, '../../../data/agents')
const AGENTS_FILE = path.join(AGENTS_DIR, 'configurations.json')

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(AGENTS_DIR, { recursive: true })
    // Check if configurations file exists, if not create it
    try {
      await fs.access(AGENTS_FILE)
    } catch {
      await fs.writeFile(AGENTS_FILE, JSON.stringify([]), 'utf-8')
    }
  } catch (error) {
    console.error('Error creating data directory:', error)
  }
}

// Load agents from file
async function loadAgents(): Promise<AgentConfig[]> {
  try {
    await ensureDataDir()
    const data = await fs.readFile(AGENTS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Error loading agents:', error)
    return []
  }
}

// Save agents to file
async function saveAgents(agents: AgentConfig[]): Promise<void> {
  await ensureDataDir()
  await fs.writeFile(AGENTS_FILE, JSON.stringify(agents, null, 2), 'utf-8')
}

// GET /api/agents - Get all agent configurations
router.get('/', async (req, res) => {
  try {
    const agents = await loadAgents()
    res.json(agents)
  } catch {
    res.status(500).json({ error: 'Failed to load agents' })
  }
})

// GET /api/agents/:id - Get specific agent configuration
router.get('/:id', async (req, res) => {
  try {
    const agents = await loadAgents()
    const agent = agents.find((a) => a.id === req.params.id)

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' })
    }

    res.json(agent)
  } catch {
    res.status(500).json({ error: 'Failed to load agent' })
  }
})

// POST /api/agents - Create new agent configuration
router.post('/', async (req, res) => {
  try {
    const { name, role, systemPrompt, tools, model } = req.body

    // Validation
    if (!name || !role || !systemPrompt) {
      return res.status(400).json({ error: 'Name, role, and system prompt are required' })
    }

    const agents = await loadAgents()

    const newAgent: AgentConfig = {
      id: `${role}_${Date.now()}`,
      name,
      role,
      systemPrompt,
      tools: tools || ['file_system', 'terminal', 'web_search'],
      model: model || 'claude-3-opus',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usedInProjects: [],
    }

    agents.push(newAgent)
    await saveAgents(agents)

    res.status(201).json(newAgent)
  } catch {
    res.status(500).json({ error: 'Failed to create agent' })
  }
})

// PUT /api/agents/:id - Update agent configuration
router.put('/:id', async (req, res) => {
  try {
    const agents = await loadAgents()
    const index = agents.findIndex((a) => a.id === req.params.id)

    if (index === -1) {
      return res.status(404).json({ error: 'Agent not found' })
    }

    const { name, role, systemPrompt, tools, model } = req.body

    agents[index] = {
      ...agents[index],
      ...(name && { name }),
      ...(role && { role }),
      ...(systemPrompt && { systemPrompt }),
      ...(tools && { tools }),
      ...(model && { model }),
      updatedAt: new Date().toISOString(),
    }

    await saveAgents(agents)
    res.json(agents[index])
  } catch {
    res.status(500).json({ error: 'Failed to update agent' })
  }
})

// DELETE /api/agents/:id - Delete agent configuration
router.delete('/:id', async (req, res) => {
  try {
    const agents = await loadAgents()
    const filteredAgents = agents.filter((a) => a.id !== req.params.id)

    if (agents.length === filteredAgents.length) {
      return res.status(404).json({ error: 'Agent not found' })
    }

    await saveAgents(filteredAgents)
    res.json({ message: 'Agent deleted successfully' })
  } catch {
    res.status(500).json({ error: 'Failed to delete agent' })
  }
})

// POST /api/agents/:id/spawn - Spawn agent to project
router.post('/:id/spawn', async (req, res) => {
  try {
    const { projectId } = req.body

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' })
    }

    const agents = await loadAgents()
    const agent = agents.find((a) => a.id === req.params.id)

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' })
    }

    // TODO: Implement actual agent spawning with ProcessManager
    // Integration point: Stage 8 - AgentSpawner
    // const agentInstance = await AgentSpawner.spawn(agent, projectId);
    // Integration point: Stage 2 - ProcessManager
    // const pid = await ProcessManager.createProcess(agentInstance);
    // Integration point: Stage 3 - IPC
    // await IPCServer.start(agentInstance.id);

    // For now, just return success
    res.json({
      message: 'Agent spawned successfully',
      agentId: req.params.id,
      projectId,
      status: 'ready',
    })
  } catch {
    res.status(500).json({ error: 'Failed to spawn agent' })
  }
})

export default router
