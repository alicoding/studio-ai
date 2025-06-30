/**
 * System API - Process Management & Health Monitoring
 *
 * SOLID: Single Responsibility - only system-level operations
 * DRY: Centralized system management endpoints
 * KISS: Simple REST endpoints with error handling
 * Library-First: Will integrate with ProcessManager/ProcessCleaner
 */

import { Router } from 'express'
import { ProcessManager } from '../../../lib/process/ProcessManager.js'
import { ProcessCleaner } from '../../../lib/process/ProcessCleaner.js'
import { exec } from 'child_process'
import { promisify } from 'util'
import { access } from 'fs/promises'
import { constants } from 'fs'
import * as os from 'os'

const router = Router()
const execAsync = promisify(exec)

// GET /api/system/process-stats - Get current process statistics
router.get('/process-stats', async (req, res) => {
  try {
    const processManager = ProcessManager.getInstance()

    const stats = processManager.getStats()

    // Get all projects and their agents
    const projectAgents: Record<string, any[]> = {}
    // For now, we don't have a way to get all projects, so we'll return empty
    // This would be populated by iterating through known projects

    const response = {
      processCount: stats.activeProcesses,
      projectAgents,
      registryHealth: stats.registryStats.health,
    }

    console.log('Process stats:', response)
    res.json(response)
  } catch (error) {
    console.error('Failed to get process stats:', error)
    res.status(500).json({ error: 'Failed to get process stats' })
  }
})

// POST /api/system/cleanup-zombies - Cleanup zombie Claude processes
router.post('/cleanup-zombies', async (req, res) => {
  try {
    const cleaner = ProcessCleaner.getInstance()
    const result = await cleaner.cleanupZombies()

    const response = {
      killedCount: result.killedProcesses.length,
      killedProcesses: result.killedProcesses,
      message: `Cleanup completed: ${result.killedProcesses.length} zombie processes killed`,
    }

    console.log('Zombie cleanup result:', response)
    res.json(response)
  } catch (error) {
    console.error('Failed to cleanup zombies:', error)
    res.status(500).json({ error: 'Failed to cleanup zombie processes' })
  }
})

// GET /api/system/health - System health check
router.get('/health', async (req, res) => {
  try {
    // TODO: Integration point - Stage 2 ProcessRegistry
    // const registryHealth = ProcessRegistry.getInstance().healthCheck()

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      processRegistry: 'healthy',
    }

    res.json(health)
  } catch (error) {
    console.error('Health check failed:', error)
    res.status(500).json({ error: 'Health check failed' })
  }
})

// POST /api/system/detect-command - Detect command location using 'which' (Unix) or 'where' (Windows)
router.post('/detect-command', async (req, res) => {
  try {
    const { command } = req.body
    if (!command) {
      return res.status(400).json({ error: 'Command is required' })
    }

    const whichCommand = process.platform === 'win32' ? 'where' : 'which'
    const { stdout } = await execAsync(
      `${whichCommand} -a ${command} 2>/dev/null || ${whichCommand} ${command}`
    )
    const paths = stdout.trim().split('\n').filter(Boolean)

    // Filter out node_modules paths and prioritize system installations
    const systemPaths = paths.filter((p) => !p.includes('node_modules'))
    const selectedPath =
      systemPaths.length > 0
        ? systemPaths[0]
        : paths.find((p) => !p.includes(process.cwd())) || // Prefer paths outside current project
          null

    res.json({ path: selectedPath })
  } catch {
    // Command not found is not an error, just return null
    res.json({ path: null })
  }
})

// POST /api/system/check-path - Check if a path exists and is executable
router.post('/check-path', async (req, res) => {
  try {
    const { path } = req.body
    if (!path) {
      return res.status(400).json({ error: 'Path is required' })
    }

    // Expand ~ to home directory
    const expandedPath = path.startsWith('~') ? path.replace('~', os.homedir()) : path

    await access(expandedPath, constants.F_OK | constants.X_OK)
    res.json({ exists: true, expandedPath })
  } catch {
    res.json({ exists: false })
  }
})

export default router
