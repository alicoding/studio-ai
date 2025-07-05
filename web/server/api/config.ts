/**
 * Configuration API - Unified config management
 * 
 * SOLID: Single source of truth for all configurations
 * DRY: Reuses ConfigService for all operations
 * KISS: Simple REST endpoints
 */

import { Router } from 'express'
import { ConfigService } from '../../../src/services/ConfigService'

const router = Router()
const configService = ConfigService.getInstance()

// Initialize config service on startup
configService.initialize().catch(console.error)

// System configuration endpoints
router.get('/system', async (req, res) => {
  try {
    const config = await configService.getConfig()
    res.json(config.systemConfig)
  } catch (error) {
    console.error('Failed to get system config:', error)
    res.status(500).json({ error: 'Failed to get system configuration' })
  }
})

router.put('/system', async (req, res) => {
  try {
    await configService.updateSystemConfig(req.body)
    res.json({ success: true })
  } catch (error) {
    console.error('Failed to update system config:', error)
    res.status(500).json({ error: 'Failed to update system configuration' })
  }
})

// Master config (for debugging/export)
router.get('/master', async (req, res) => {
  try {
    const config = await configService.getConfig()
    res.json(config)
  } catch (error) {
    console.error('Failed to get master config:', error)
    res.status(500).json({ error: 'Failed to get master configuration' })
  }
})

// Export/Import
router.get('/export', async (req, res) => {
  try {
    const exportData = await configService.exportConfig()
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', 'attachment; filename="claude-studio-config.json"')
    res.send(exportData)
  } catch (error) {
    console.error('Failed to export config:', error)
    res.status(500).json({ error: 'Failed to export configuration' })
  }
})

router.post('/import', async (req, res) => {
  try {
    const { data } = req.body
    if (!data) {
      return res.status(400).json({ error: 'No configuration data provided' })
    }
    await configService.importConfig(data)
    res.json({ success: true })
  } catch (error) {
    console.error('Failed to import config:', error)
    res.status(500).json({ error: 'Failed to import configuration' })
  }
})

export default router