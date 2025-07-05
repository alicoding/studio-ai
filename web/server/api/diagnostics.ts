/**
 * Diagnostics API - Minimal endpoints for diagnostics
 * 
 * KISS: Just return current state, no initialization needed
 * DRY: ProjectDiagnostics handles all the work
 * SOLID: Simple API layer
 */

import { Router } from 'express'
import { projectDiagnostics } from '../services/ProjectDiagnostics'
import { existsSync } from 'fs'
import { join } from 'path'

const router = Router()

// GET /api/diagnostics - Get current diagnostics
router.get('/', (_req, res) => {
  const diagnostics = projectDiagnostics.getCurrentDiagnostics()
  res.json({ diagnostics })
})

// POST /api/diagnostics/check-config - Check project configuration
router.post('/check-config', (req, res) => {
  const { projectPath } = req.body
  
  if (!projectPath) {
    return res.status(400).json({ error: 'Project path is required' })
  }

  try {
    // Check for TypeScript configuration
    const hasTypeScript = existsSync(join(projectPath, 'tsconfig.json'))
    
    // Check for ESLint configuration
    const eslintConfigs = [
      '.eslintrc.js',
      '.eslintrc.cjs',
      '.eslintrc.json',
      '.eslintrc.yaml',
      '.eslintrc.yml',
      'eslint.config.js',
      'eslint.config.mjs',
      'eslint.config.cjs'
    ]
    const hasESLint = eslintConfigs.some(config => existsSync(join(projectPath, config)))
    
    // Check package.json for scripts
    let hasTypeCheckScript = false
    let hasLintScript = false
    
    const packageJsonPath = join(projectPath, 'package.json')
    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = require(packageJsonPath)
        const scripts = packageJson.scripts || {}
        hasTypeCheckScript = !!scripts['type-check'] || !!scripts['typecheck']
        hasLintScript = !!scripts['lint'] || !!scripts['eslint']
      } catch (e) {
        console.warn('Failed to parse package.json:', e)
      }
    }
    
    res.json({
      hasTypeScript,
      hasESLint,
      hasTypeCheckScript,
      hasLintScript
    })
  } catch (error) {
    console.error('Error checking project configuration:', error)
    res.status(500).json({ error: 'Failed to check configuration' })
  }
})

export default router