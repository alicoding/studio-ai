/**
 * Diagnostics API - Server-side diagnostic monitoring endpoints
 *
 * SOLID: Single responsibility - API interface for diagnostics
 * Library First: Built on Express like other API routes
 */

import { Router } from 'express'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { diagnosticService } from '../services/DiagnosticService.js'

const router = Router()

// GET /api/diagnostics - Get current diagnostics
router.get('/', async (_req, res) => {
  try {
    const diagnostics = diagnosticService.getCurrentDiagnostics()
    console.log('[Diagnostics API] Returning', diagnostics.length, 'diagnostics')

    // Add debug info
    const debugInfo = {
      diagnostics,
      isMonitoring: diagnosticService['isMonitoring'] || false,
      projectPath: diagnosticService['projectPath'] || 'none',
      sourceCount: diagnosticService['diagnostics']?.size || 0,
      sources: diagnosticService['diagnostics']
        ? Array.from(diagnosticService['diagnostics'].keys())
        : [],
    }

    res.json(debugInfo)
  } catch (error) {
    console.error('Failed to get diagnostics:', error)
    res.status(500).json({ error: 'Failed to get diagnostics' })
  }
})

// POST /api/diagnostics/start - Start monitoring a project
router.post('/start', async (req, res) => {
  try {
    const { projectPath } = req.body

    console.log('[Diagnostics API] Start monitoring request for:', projectPath)

    if (!projectPath) {
      return res.status(400).json({ error: 'projectPath is required' })
    }

    await diagnosticService.startMonitoring(projectPath)
    res.json({ success: true, message: `Started monitoring ${projectPath}` })
  } catch (error) {
    console.error('Failed to start monitoring:', error)
    res.status(500).json({ error: 'Failed to start monitoring' })
  }
})

// POST /api/diagnostics/stop - Stop monitoring
router.post('/stop', async (_req, res) => {
  try {
    await diagnosticService.stopMonitoring()
    res.json({ success: true, message: 'Stopped monitoring' })
  } catch (error) {
    console.error('Failed to stop monitoring:', error)
    res.status(500).json({ error: 'Failed to stop monitoring' })
  }
})

// GET /api/diagnostics/run-checks - Manually run diagnostic checks
router.get('/run-checks', async (_req, res) => {
  try {
    // Access the private method through prototype
    const service = diagnosticService as any

    // Run TypeScript check
    console.log('[API] Running TypeScript check...')
    const tsDiagnostics = await service.runTypeScriptCheck()
    service.diagnostics.set('typescript', tsDiagnostics)

    // Run ESLint check
    console.log('[API] Running ESLint check...')
    const eslintDiagnostics = await service.runESLintCheck()
    service.diagnostics.set('eslint', eslintDiagnostics)

    res.json({
      success: true,
      typescript: tsDiagnostics.length,
      eslint: eslintDiagnostics.length,
      total: tsDiagnostics.length + eslintDiagnostics.length,
    })
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to run checks',
      message: error.message,
    })
  }
})

// GET /api/diagnostics/test-config - Test configuration detection
router.get('/test-config', async (_req, res) => {
  try {
    const { access } = await import('fs/promises')
    const { join } = await import('path')

    const projectPath = '/Users/ali/claude-swarm/claude-team/claude-studio'
    const eslintConfigs = [
      '.eslintrc.js',
      '.eslintrc.cjs',
      '.eslintrc.json',
      'eslint.config.js',
      'eslint.config.mjs',
    ]

    const results: any = {}
    for (const config of eslintConfigs) {
      const configPath = join(projectPath, config)
      try {
        await access(configPath)
        results[config] = true
      } catch {
        results[config] = false
      }
    }

    res.json({
      projectPath,
      configs: results,
      hasAny: Object.values(results).some((v) => v),
    })
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to test config',
      message: error.message,
    })
  }
})

// GET /api/diagnostics/test-eslint - Test ESLint execution
router.get('/test-eslint', async (req, res) => {
  try {
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)

    const projectPath = '/Users/ali/claude-swarm/claude-team/claude-studio'

    const { stdout, stderr } = await execAsync('npx eslint src --ext ts,tsx --format json', {
      cwd: projectPath,
      maxBuffer: 10 * 1024 * 1024,
    }).catch((err) => {
      if (err.stdout) {
        return { stdout: err.stdout, stderr: err.stderr || '' }
      }
      throw err
    })

    const results = JSON.parse(stdout)
    const totalMessages = results.reduce((sum: number, file: any) => sum + file.messages.length, 0)

    res.json({
      success: true,
      fileCount: results.length,
      totalMessages,
      stderr: stderr || 'none',
      stdoutLength: stdout.length,
    })
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to test ESLint',
      message: error.message,
      stack: error.stack,
    })
  }
})

// POST /api/diagnostics/check-config - Check project configuration for diagnostics
router.post('/check-config', async (req, res) => {
  try {
    const { projectPath } = req.body

    if (!projectPath) {
      return res.status(400).json({ error: 'projectPath is required' })
    }

    // Check for TypeScript configuration
    const tsConfigPath = join(projectPath, 'tsconfig.json')
    const hasTypeScript = existsSync(tsConfigPath)

    // Check for ESLint configuration
    const eslintConfigPaths = [
      '.eslintrc.js',
      '.eslintrc.cjs',
      '.eslintrc.json',
      'eslint.config.js',
      'eslint.config.mjs',
    ]
    const hasESLint = eslintConfigPaths.some((configFile) =>
      existsSync(join(projectPath, configFile))
    )

    // Check package.json for required scripts
    const packageJsonPath = join(projectPath, 'package.json')
    let hasTypeCheckScript = false
    let hasLintScript = false

    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
        const scripts = packageJson.scripts || {}

        hasTypeCheckScript = Boolean(scripts['type-check'])
        hasLintScript = Boolean(scripts['lint'])
      } catch (error) {
        console.warn('Failed to parse package.json:', error)
      }
    }

    res.json({
      hasTypeScript,
      hasESLint,
      hasTypeCheckScript,
      hasLintScript,
    })
  } catch (error) {
    console.error('Failed to check configuration:', error)
    res.status(500).json({ error: 'Failed to check configuration' })
  }
})

export default router
