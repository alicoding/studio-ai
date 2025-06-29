import { Router } from 'express'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = Router()

// Project interface
interface Project {
  id: string
  name: string
  description?: string
  activeAgents: string[] // agent instance IDs
  createdAt: string
  updatedAt: string
  cwd: string // Current working directory for the project
}

// Storage paths
const PROJECTS_DIR = path.join(__dirname, '../../../data/projects')
const PROJECTS_FILE = path.join(PROJECTS_DIR, 'projects.json')

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(PROJECTS_DIR, { recursive: true })
    try {
      await fs.access(PROJECTS_FILE)
    } catch {
      await fs.writeFile(PROJECTS_FILE, JSON.stringify([]), 'utf-8')
    }
  } catch {
    console.error('Error creating projects directory:', error)
  }
}

// Load projects from file
async function loadProjects(): Promise<Project[]> {
  try {
    await ensureDataDir()
    const data = await fs.readFile(PROJECTS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    console.error('Error loading projects:', error)
    return []
  }
}

// Save projects to file
async function saveProjects(projects: Project[]): Promise<void> {
  await ensureDataDir()
  await fs.writeFile(PROJECTS_FILE, JSON.stringify(projects, null, 2), 'utf-8')
}

// GET /api/projects - Get all projects
router.get('/', async (req, res) => {
  try {
    const projects = await loadProjects()
    res.json(projects)
  } catch {
    res.status(500).json({ error: 'Failed to load projects' })
  }
})

// GET /api/projects/:id - Get specific project
router.get('/:id', async (req, res) => {
  try {
    const projects = await loadProjects()
    const project = projects.find((p) => p.id === req.params.id)

    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    res.json(project)
  } catch {
    res.status(500).json({ error: 'Failed to load project' })
  }
})

// POST /api/projects - Create new project
router.post('/', async (req, res) => {
  try {
    const { name, description, cwd } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' })
    }

    const projects = await loadProjects()

    const newProject: Project = {
      id: `project_${Date.now()}`,
      name,
      description: description || '',
      activeAgents: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      cwd: cwd || process.cwd(),
    }

    projects.push(newProject)
    await saveProjects(projects)

    // Create project directory
    const projectDir = path.join(__dirname, `../../../data/projects/${newProject.id}`)
    await fs.mkdir(projectDir, { recursive: true })

    res.status(201).json(newProject)
  } catch {
    res.status(500).json({ error: 'Failed to create project' })
  }
})

// PUT /api/projects/:id - Update project
router.put('/:id', async (req, res) => {
  try {
    const projects = await loadProjects()
    const index = projects.findIndex((p) => p.id === req.params.id)

    if (index === -1) {
      return res.status(404).json({ error: 'Project not found' })
    }

    const { name, description, cwd } = req.body

    projects[index] = {
      ...projects[index],
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(cwd && { cwd }),
      updatedAt: new Date().toISOString(),
    }

    await saveProjects(projects)
    res.json(projects[index])
  } catch {
    res.status(500).json({ error: 'Failed to update project' })
  }
})

// DELETE /api/projects/:id - Delete project
router.delete('/:id', async (req, res) => {
  try {
    const projects = await loadProjects()
    const filteredProjects = projects.filter((p) => p.id !== req.params.id)

    if (projects.length === filteredProjects.length) {
      return res.status(404).json({ error: 'Project not found' })
    }

    await saveProjects(filteredProjects)

    // TODO: Clean up project directory and stop any active agents

    res.json({ message: 'Project deleted successfully' })
  } catch {
    res.status(500).json({ error: 'Failed to delete project' })
  }
})

// GET /api/projects/:id/agents - Get active agents in project
router.get('/:id/agents', async (req, res) => {
  try {
    const projects = await loadProjects()
    const project = projects.find((p) => p.id === req.params.id)

    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    // TODO: Get actual agent instances with their status
    // For now, return the agent IDs
    res.json({
      projectId: project.id,
      agents: project.activeAgents,
    })
  } catch {
    res.status(500).json({ error: 'Failed to load project agents' })
  }
})

// POST /api/projects/:id/agents - Add agent to project
router.post('/:id/agents', async (req, res) => {
  try {
    const { agentConfigId } = req.body

    if (!agentConfigId) {
      return res.status(400).json({ error: 'Agent configuration ID is required' })
    }

    const projects = await loadProjects()
    const project = projects.find((p) => p.id === req.params.id)

    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    // TODO: Actually spawn the agent process
    const agentInstanceId = `${agentConfigId}_${Date.now()}`
    project.activeAgents.push(agentInstanceId)
    project.updatedAt = new Date().toISOString()

    await saveProjects(projects)

    res.json({
      message: 'Agent added to project',
      agentInstanceId,
      projectId: project.id,
    })
  } catch {
    res.status(500).json({ error: 'Failed to add agent to project' })
  }
})

// DELETE /api/projects/:id/agents/:agentId - Remove agent from project
router.delete('/:id/agents/:agentId', async (req, res) => {
  try {
    const projects = await loadProjects()
    const project = projects.find((p) => p.id === req.params.id)

    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    project.activeAgents = project.activeAgents.filter((a) => a !== req.params.agentId)
    project.updatedAt = new Date().toISOString()

    await saveProjects(projects)

    // TODO: Actually stop the agent process

    res.json({ message: 'Agent removed from project' })
  } catch {
    res.status(500).json({ error: 'Failed to remove agent from project' })
  }
})

export default router
