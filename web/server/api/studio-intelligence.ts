import { Router } from 'express'
import { StudioIntelligence } from '../services/studio-intelligence/StudioIntelligence.js'

const router = Router()

// POST /api/studio-intelligence/initialize - Ensure Studio Intelligence defaults exist
// This is now called on startup, but kept for backward compatibility
router.post('/initialize', async (req, res) => {
  try {
    const si = new StudioIntelligence()
    await si.ensureDefaultHooks()

    const status = si.getStatus()
    res.json({
      success: true,
      status,
      message: 'Studio Intelligence defaults are active',
    })
  } catch (error) {
    console.error('Failed to initialize Studio Intelligence:', error)
    res.status(500).json({ error: 'Failed to initialize Studio Intelligence' })
  }
})

// GET /api/studio-intelligence/status - Get current Studio Intelligence status
router.get('/status', async (req, res) => {
  try {
    const si = new StudioIntelligence()
    const status = si.getStatus()
    res.json(status)
  } catch (error) {
    console.error('Failed to get Studio Intelligence status:', error)
    res.status(500).json({ error: 'Failed to get status' })
  }
})

export default router
