import { Router, Request, Response } from 'express'
import { createStorage } from '../../../src/lib/storage/UnifiedStorage'

const router = Router()

// Team template interface
interface TeamTemplate {
  id: string
  name: string
  description: string
  agents: {
    role: string
    configId?: string // Reference to agent configuration
    customizations?: {
      systemPromptAdditions?: string
      tools?: string[]
    }
  }[]
  createdAt: string
  updatedAt: string
  isDefault?: boolean // For predefined templates
}

// Create storage instance for teams
const teamsStorage = createStorage({ namespace: 'teams', type: 'config' })

// Start with empty templates - users will create their own based on available agents
const DEFAULT_TEMPLATES: TeamTemplate[] = []

// Load teams from storage
async function loadTeams(): Promise<TeamTemplate[]> {
  try {
    const teams = await teamsStorage.get<TeamTemplate[]>('templates')
    return teams || DEFAULT_TEMPLATES
  } catch (error) {
    console.error('Error loading teams:', error)
    return DEFAULT_TEMPLATES
  }
}

// Save teams to storage
async function saveTeams(teams: TeamTemplate[]): Promise<void> {
  await teamsStorage.set('templates', teams)
}

// GET /api/teams - Get all team templates
router.get('/', async (req: Request, res: Response) => {
  try {
    const teams = await loadTeams()
    res.json(teams)
  } catch (error) {
    console.error('Failed to load teams:', error)
    res.status(500).json({ error: 'Failed to load teams' })
  }
})

// GET /api/teams/:id - Get specific team template
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const teams = await loadTeams()
    const team = teams.find((t) => t.id === req.params.id)

    if (!team) {
      return res.status(404).json({ error: 'Team template not found' })
    }

    res.json(team)
  } catch (error) {
    console.error('Failed to load team:', error)
    res.status(500).json({ error: 'Failed to load team' })
  }
})

// POST /api/teams - Create new team template
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, agents } = req.body

    if (!name || !agents || !Array.isArray(agents)) {
      return res.status(400).json({ error: 'Name and agents array are required' })
    }

    const teams = await loadTeams()

    const newTeam: TeamTemplate = {
      id: `team_${Date.now()}`,
      name,
      description: description || '',
      agents,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDefault: false,
    }

    teams.push(newTeam)
    await saveTeams(teams)

    res.status(201).json(newTeam)
  } catch (error) {
    console.error('Failed to create team:', error)
    res.status(500).json({ error: 'Failed to create team' })
  }
})

// PUT /api/teams/:id - Update team template
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const teams = await loadTeams()
    const index = teams.findIndex((t) => t.id === req.params.id)

    if (index === -1) {
      return res.status(404).json({ error: 'Team template not found' })
    }

    // Don't allow editing default templates
    if (teams[index].isDefault) {
      return res.status(403).json({ error: 'Cannot edit default team templates' })
    }

    const { name, description, agents } = req.body

    teams[index] = {
      ...teams[index],
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(agents && { agents }),
      updatedAt: new Date().toISOString(),
    }

    await saveTeams(teams)
    res.json(teams[index])
  } catch (error) {
    console.error('Failed to update team:', error)
    res.status(500).json({ error: 'Failed to update team' })
  }
})

// DELETE /api/teams/:id - Delete team template
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const teams = await loadTeams()
    const team = teams.find((t) => t.id === req.params.id)

    if (!team) {
      return res.status(404).json({ error: 'Team template not found' })
    }

    if (team.isDefault) {
      return res.status(403).json({ error: 'Cannot delete default team templates' })
    }

    const filteredTeams = teams.filter((t) => t.id !== req.params.id)
    await saveTeams(filteredTeams)

    res.json({ message: 'Team template deleted successfully' })
  } catch (error) {
    console.error('Failed to delete team:', error)
    res.status(500).json({ error: 'Failed to delete team' })
  }
})

// POST /api/teams/:id/spawn - Spawn team to project
router.post('/:id/spawn', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.body

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' })
    }

    const teams = await loadTeams()
    const team = teams.find((t) => t.id === req.params.id)

    if (!team) {
      return res.status(404).json({ error: 'Team template not found' })
    }

    // TODO: Actually spawn all agents in the team
    const spawnedAgents = team.agents.map((agent, index) => ({
      role: agent.role,
      instanceId: `${agent.role}_${Date.now()}_${index}`,
      status: 'ready',
    }))

    res.json({
      message: 'Team spawned successfully',
      teamId: req.params.id,
      projectId,
      agents: spawnedAgents,
    })
  } catch (error) {
    console.error('Failed to spawn team:', error)
    res.status(500).json({ error: 'Failed to spawn team' })
  }
})

// POST /api/teams/:id/clone - Clone team template
router.post('/:id/clone', async (req: Request, res: Response) => {
  try {
    const teams = await loadTeams()
    const sourceTeam = teams.find((t) => t.id === req.params.id)

    if (!sourceTeam) {
      return res.status(404).json({ error: 'Team template not found' })
    }

    const { name } = req.body

    const clonedTeam: TeamTemplate = {
      ...sourceTeam,
      id: `team_${Date.now()}`,
      name: name || `${sourceTeam.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDefault: false,
    }

    teams.push(clonedTeam)
    await saveTeams(teams)

    res.status(201).json(clonedTeam)
  } catch (error) {
    console.error('Failed to clone team:', error)
    res.status(500).json({ error: 'Failed to clone team' })
  }
})

// POST /api/teams/import - Import team from JSON
router.post('/import', async (req: Request, res: Response) => {
  try {
    const { team } = req.body

    if (!team || !team.name || !team.agents) {
      return res.status(400).json({ error: 'Invalid team data' })
    }

    const teams = await loadTeams()

    const importedTeam: TeamTemplate = {
      ...team,
      id: `team_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDefault: false,
    }

    teams.push(importedTeam)
    await saveTeams(teams)

    res.status(201).json(importedTeam)
  } catch (error) {
    console.error('Failed to import team:', error)
    res.status(500).json({ error: 'Failed to import team' })
  }
})

export default router
