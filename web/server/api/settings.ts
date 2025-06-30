import { Router } from 'express'
import { ConfigService } from '../../../src/services/ConfigService.js'

const router = Router()
const configService = ConfigService.getInstance()

// Initialize config service on startup
configService.initialize().catch(console.error)

// GET /api/settings/system - Get system settings
router.get('/system', async (req, res) => {
  try {
    const config = await configService.getConfig()
    res.json(config.systemConfig)
  } catch (error) {
    console.error('Failed to load system settings:', error)
    res.status(500).json({ error: 'Failed to load system settings' })
  }
})

// PUT /api/settings/system - Update system settings
router.put('/system', async (req, res) => {
  try {
    await configService.updateSystemConfig(req.body)
    res.json({ success: true })
  } catch (error) {
    console.error('Failed to update system settings:', error)
    res.status(500).json({ error: 'Failed to update system settings' })
  }
})

// GET /api/settings/project/:projectId - Get project settings
router.get('/project/:projectId', async (req, res) => {
  try {
    const project = await configService.getProject(req.params.projectId)
    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }
    res.json(project.settings)
  } catch (error) {
    console.error('Failed to load project settings:', error)
    res.status(500).json({ error: 'Failed to load project settings' })
  }
})

// PUT /api/settings/project/:projectId - Update project settings
router.put('/project/:projectId', async (req, res) => {
  try {
    await configService.updateProject(req.params.projectId, {
      settings: req.body
    })
    res.json({ success: true })
  } catch (error) {
    console.error('Failed to update project settings:', error)
    res.status(500).json({ error: 'Failed to update project settings' })
  }
})

// GET /api/settings/teams - Get all team templates
router.get('/teams', async (req, res) => {
  try {
    const teams = await configService.getAllTeams()
    res.json(teams)
  } catch (error) {
    console.error('Failed to load teams:', error)
    res.status(500).json({ error: 'Failed to load teams' })
  }
})

// POST /api/settings/teams - Create team template
router.post('/teams', async (req, res) => {
  try {
    const { v4: uuidv4 } = await import('uuid')
    const newTeam = await configService.createTeam({
      id: uuidv4(),
      name: req.body.name,
      description: req.body.description || '',
      agents: req.body.agents || []
    })
    res.status(201).json(newTeam)
  } catch (error) {
    console.error('Failed to create team:', error)
    res.status(500).json({ error: 'Failed to create team' })
  }
})

export default router