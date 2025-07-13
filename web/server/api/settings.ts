import { Router, Request, Response } from 'express'
import { ServerConfigService } from '../services/ServerConfigService'
import { createStorage } from '../../../src/lib/storage/UnifiedStorage'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

const router = Router()
const configService = ServerConfigService.getInstance()

// Initialize storage for different settings types
const playgroundStorage = createStorage({ namespace: 'playground', type: 'config' })

// Initialize config service on startup
configService.initialize().catch(console.error)

// GET /api/settings/system - Get system settings
router.get('/system', async (_req, res) => {
  try {
    const config = await configService.getSystemConfig()
    res.json(config)
  } catch (error) {
    console.error('Failed to load system config:', error)
    res.status(500).json({ error: 'Failed to load system configuration' })
  }
})

// GET /api/settings/hooks - Get all hooks settings
router.get('/hooks', async (req: Request, res: Response) => {
  try {
    // For Claude hooks, we still need to read from Claude's settings.json
    // because Claude itself reads from there
    const userSettingsPath = path.join(os.homedir(), '.claude', 'settings.json')
    const projectPath = req.query.projectPath as string

    let userSettings: Record<string, unknown> = {}
    let projectSettings: Record<string, unknown> = {}
    let projectLocalSettings: Record<string, unknown> = {}

    // Read Claude's actual settings files (these must stay as JSON for Claude compatibility)
    try {
      const data = await fs.readFile(userSettingsPath, 'utf-8')
      const parsed = JSON.parse(data)
      // Support both 'hooks' (Claude Code format) and 'claudeCodeHooks' (legacy)
      userSettings = parsed.hooks || parsed.claudeCodeHooks || parsed
    } catch (_) {
      // File doesn't exist, that's OK
    }

    if (projectPath) {
      try {
        const projectSettingsPath = path.join(projectPath, '.claude', 'settings.json')
        const data = await fs.readFile(projectSettingsPath, 'utf-8')
        const parsed = JSON.parse(data)
        // Support both 'hooks' (Claude Code format) and 'claudeCodeHooks' (legacy)
        projectSettings = parsed.hooks || parsed.claudeCodeHooks || parsed
      } catch (_) {}

      try {
        const projectLocalPath = path.join(projectPath, '.claude', 'settings.local.json')
        const data = await fs.readFile(projectLocalPath, 'utf-8')
        const parsed = JSON.parse(data)
        // Support both 'hooks' (Claude Code format) and 'claudeCodeHooks' (legacy)
        projectLocalSettings = parsed.hooks || parsed.claudeCodeHooks || parsed
      } catch (_) {}
    }

    // Get Studio config from unified storage
    const config = await configService.getSystemConfig()

    res.json({
      config: config,
      hooks: {
        user: userSettings,
        project: projectSettings,
        projectLocal: projectLocalSettings,
      },
    })
  } catch (error) {
    console.error('Failed to load all hooks:', error)
    res.status(500).json({ error: 'Failed to load hooks' })
  }
})

// PUT /api/settings/system - Update system settings
router.put('/system', async (req, res) => {
  try {
    await configService.updateSystemConfig(req.body)
    res.json({ success: true })
  } catch (error) {
    console.error('Failed to update system config:', error)
    res.status(500).json({ error: 'Failed to update system configuration' })
  }
})

// PUT /api/settings/hooks - Update hooks in Claude settings
router.put('/hooks', async (req: Request, res: Response) => {
  try {
    const { location, hooks } = req.body
    const projectPath = req.query.projectPath as string

    let settingsPath: string

    // Determine which settings file to update
    switch (location) {
      case 'userSettings':
        settingsPath = path.join(os.homedir(), '.claude', 'settings.json')
        break
      case 'projectSettings':
        if (!projectPath) {
          return res.status(400).json({ error: 'Project path required for project settings' })
        }
        settingsPath = path.join(projectPath, '.claude', 'settings.json')
        break
      case 'projectLocalSettings':
        if (!projectPath) {
          return res.status(400).json({ error: 'Project path required for project local settings' })
        }
        settingsPath = path.join(projectPath, '.claude', 'settings.local.json')
        break
      default:
        return res.status(400).json({ error: 'Invalid location' })
    }

    // Read existing settings to preserve non-hook settings
    let settings: Record<string, unknown> = {}
    try {
      const existingContent = await fs.readFile(settingsPath, 'utf-8')
      settings = JSON.parse(existingContent)
    } catch (_) {
      // No existing settings, that's OK
    }

    // Update the claudeCodeHooks (for Claude compatibility)
    settings.claudeCodeHooks = hooks

    // Write back to settings file
    await fs.mkdir(path.dirname(settingsPath), { recursive: true })
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2))

    res.json({ success: true })
  } catch (error) {
    console.error('Failed to update hooks:', error)
    res.status(500).json({ error: 'Failed to update hooks' })
  }
})

// GET /api/settings/mcp-servers - Get available MCP servers
router.get('/mcp-servers', async (_req, res) => {
  try {
    // TODO: Implement MCP server discovery
    res.json([])
  } catch (error) {
    console.error('Failed to get MCP servers:', error)
    res.status(500).json({ error: 'Failed to get MCP servers' })
  }
})

// GET /api/settings/models - DEPRECATED: Use /api/ai/models instead
// DRY: Redirect to the single source of truth for models
router.get('/models', async (_req: Request, res: Response) => {
  // Redirect to the canonical models endpoint
  res.redirect('/api/ai/models')
})

// GET /api/settings/teams - Get team templates
router.get('/teams', async (_req, res) => {
  try {
    const teams = await configService.listTeams()
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
      agents: req.body.agents || [],
      created: new Date().toISOString(),
    })
    res.status(201).json(newTeam)
  } catch (error) {
    console.error('Failed to create team:', error)
    res.status(500).json({ error: 'Failed to create team' })
  }
})

// GET /api/settings/playground-defaults - Get configurable playground defaults
router.get('/playground-defaults', async (req: Request, res: Response) => {
  try {
    const defaults = await playgroundStorage.get('defaults')
    if (defaults) {
      res.json(defaults)
    } else {
      // Return built-in defaults
      const builtInDefaults = {
        model: 'gpt-4o',
        systemPrompt: 'You are a helpful AI assistant.',
        temperature: 0.7,
        maxTokens: 2000,
      }
      res.json(builtInDefaults)
    }
  } catch (error) {
    console.error('Failed to get playground defaults:', error)
    res.status(500).json({ error: 'Failed to get playground defaults' })
  }
})

// GET /api/settings/playground - Get playground settings
router.get('/playground', async (req: Request, res: Response) => {
  try {
    const settings = await playgroundStorage.get('settings')
    if (settings) {
      res.json(settings)
    } else {
      // Try defaults
      const defaults = await playgroundStorage.get('defaults')
      if (defaults) {
        res.json(defaults)
      } else {
        // Built-in defaults
        res.json({
          model: 'gpt-4o',
          systemPrompt: 'You are a helpful AI assistant.',
          temperature: 0.7,
          maxTokens: 2000,
        })
      }
    }
  } catch (error) {
    console.error('Failed to get playground settings:', error)
    res.status(500).json({ error: 'Failed to get playground settings' })
  }
})

// PUT /api/settings/playground - Save playground settings
router.put('/playground', async (req: Request, res: Response) => {
  try {
    const { settings } = req.body

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object is required' })
    }

    // Save to unified storage
    await playgroundStorage.set('settings', settings)

    res.json({ success: true })
  } catch (error) {
    console.error('Failed to save playground settings:', error)
    res.status(500).json({ error: 'Failed to save playground settings' })
  }
})

// GET /api/settings/all-hooks - Get all hooks from all sources (Claude + Studio)
router.get('/all-hooks', async (req: Request, res: Response) => {
  try {
    // Get Claude hooks from settings files
    const userSettingsPath = path.join(os.homedir(), '.claude', 'settings.json')
    const projectPath = req.query.projectPath as string

    let userHooks: Record<string, unknown> = {}
    let projectHooks: Record<string, unknown> = {}
    let projectLocalHooks: Record<string, unknown> = {}

    // Read user settings
    try {
      const data = await fs.readFile(userSettingsPath, 'utf-8')
      const settings = JSON.parse(data)
      // Support both 'hooks' (Claude Code format) and 'claudeCodeHooks' (legacy)
      userHooks = settings.hooks || settings.claudeCodeHooks || {}
    } catch (_) {
      // File doesn't exist
    }

    // Read project settings if path provided
    if (projectPath) {
      try {
        const projectSettingsPath = path.join(projectPath, '.claude', 'settings.json')
        const data = await fs.readFile(projectSettingsPath, 'utf-8')
        const settings = JSON.parse(data)
        // Support both 'hooks' (Claude Code format) and 'claudeCodeHooks' (legacy)
        projectHooks = settings.hooks || settings.claudeCodeHooks || {}
      } catch (_) {
        // File doesn't exist
      }

      try {
        const projectLocalPath = path.join(projectPath, '.claude', 'settings.local.json')
        const data = await fs.readFile(projectLocalPath, 'utf-8')
        const settings = JSON.parse(data)
        // Support both 'hooks' (Claude Code format) and 'claudeCodeHooks' (legacy)
        projectLocalHooks = settings.hooks || settings.claudeCodeHooks || {}
      } catch (_) {
        // File doesn't exist
      }
    }

    // Get system config (Studio hooks)
    const systemConfig = await configService.getSystemConfig()

    res.json({
      config: systemConfig || {},
      hooks: {
        user: { hooks: userHooks },
        project: { hooks: projectHooks },
        projectLocal: { hooks: projectLocalHooks },
        studioHooks: systemConfig?.studioHooks || [],
      },
    })
  } catch (error) {
    console.error('Failed to get all hooks:', error)
    res.status(500).json({ error: 'Failed to get all hooks' })
  }
})

// GET /api/settings/claude/defaults - Get default Claude settings
router.get('/claude/defaults', async (req: Request, res: Response) => {
  try {
    const config = await configService.getSystemConfig()
    res.json({
      defaultClearSessionPrompt: config?.defaultClearSessionPrompt || '> new',
    })
  } catch (error) {
    console.error('Failed to get Claude defaults:', error)
    res.status(500).json({ error: 'Failed to get Claude defaults' })
  }
})

// PUT /api/settings/claude/defaults - Update default Claude settings
router.put('/claude/defaults', async (req: Request, res: Response) => {
  try {
    const { settings } = req.body
    await configService.updateSystemConfig(settings)
    res.json({ success: true })
  } catch (error) {
    console.error('Failed to update Claude defaults:', error)
    res.status(500).json({ error: 'Failed to update Claude defaults' })
  }
})

// GET /api/settings/telemetry - Get telemetry settings
router.get('/telemetry', async (req: Request, res: Response) => {
  try {
    const config = await configService.getSystemConfig()
    res.json({
      enableTelemetry: config?.enableTelemetry ?? true,
    })
  } catch (error) {
    console.error('Failed to get telemetry settings:', error)
    res.status(500).json({ error: 'Failed to get telemetry settings' })
  }
})

// PUT /api/settings/telemetry - Update telemetry settings
router.put('/telemetry', async (req: Request, res: Response) => {
  try {
    const { enableTelemetry } = req.body

    if (typeof enableTelemetry !== 'boolean') {
      return res.status(400).json({ error: 'enableTelemetry must be a boolean' })
    }

    await configService.updateSystemConfig({
      enableTelemetry,
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Failed to update telemetry settings:', error)
    res.status(500).json({ error: 'Failed to update telemetry settings' })
  }
})

// GET /api/settings/claude-instructions - Get CLAUDE.md files
router.get('/claude-instructions', async (req: Request, res: Response) => {
  try {
    const projectPath = req.query.projectPath as string
    const scope = req.query.scope as 'all' | 'global' | 'project' | 'local'

    const result: {
      global?: { content: string; path: string }
      project?: { content: string; path: string }
      local?: { content: string; path: string }
    } = {}

    // Helper to read file safely
    const readFile = async (filePath: string) => {
      try {
        const content = await fs.readFile(filePath, 'utf-8')
        return content
      } catch (_error) {
        // File doesn't exist or can't be read
        return null
      }
    }

    // Global CLAUDE.md
    if (scope === 'all' || scope === 'global') {
      const globalPath = path.join(os.homedir(), '.claude', 'CLAUDE.md')
      const globalContent = await readFile(globalPath)
      if (globalContent !== null) {
        result.global = { content: globalContent, path: globalPath }
      }
    }

    // Project and Local CLAUDE.md (only if projectPath provided)
    if (projectPath && (scope === 'all' || scope === 'project' || scope === 'local')) {
      // Project CLAUDE.md
      if (scope === 'all' || scope === 'project') {
        const projectMdPath = path.join(projectPath, 'CLAUDE.md')
        const projectContent = await readFile(projectMdPath)
        if (projectContent !== null) {
          result.project = { content: projectContent, path: projectMdPath }
        }
      }

      // Local CLAUDE.md
      if (scope === 'all' || scope === 'local') {
        const localPath = path.join(projectPath, '.claude', 'CLAUDE.local.md')
        const localContent = await readFile(localPath)
        if (localContent !== null) {
          result.local = { content: localContent, path: localPath }
        }
      }
    }

    res.json(result)
  } catch (error) {
    console.error('Failed to read CLAUDE.md files:', error)
    res.status(500).json({ error: 'Failed to read CLAUDE.md files' })
  }
})

// PUT /api/settings/claude-instructions - Update CLAUDE.md file
router.put('/claude-instructions', async (req: Request, res: Response) => {
  try {
    const { scope, content, projectPath } = req.body

    if (!scope || !['global', 'project', 'local'].includes(scope)) {
      return res.status(400).json({ error: 'Invalid scope. Must be: global, project, or local' })
    }

    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'Content must be a string' })
    }

    let filePath: string

    switch (scope) {
      case 'global':
        filePath = path.join(os.homedir(), '.claude', 'CLAUDE.md')
        break
      case 'project':
        if (!projectPath) {
          return res.status(400).json({ error: 'Project path required for project scope' })
        }
        filePath = path.join(projectPath, 'CLAUDE.md')
        break
      case 'local':
        if (!projectPath) {
          return res.status(400).json({ error: 'Project path required for local scope' })
        }
        filePath = path.join(projectPath, '.claude', 'CLAUDE.local.md')
        break
      default:
        return res.status(400).json({ error: 'Invalid scope' })
    }

    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true })

    // Write the file
    await fs.writeFile(filePath, content, 'utf-8')

    // If creating local file, ensure it's gitignored
    if (scope === 'local' && projectPath) {
      const gitignorePath = path.join(projectPath, '.claude', '.gitignore')
      try {
        let gitignoreContent = ''
        try {
          gitignoreContent = await fs.readFile(gitignorePath, 'utf-8')
        } catch (_) {
          // File doesn't exist
        }

        if (!gitignoreContent.includes('CLAUDE.local.md')) {
          gitignoreContent += (gitignoreContent ? '\n' : '') + 'CLAUDE.local.md\n'
          await fs.writeFile(gitignorePath, gitignoreContent, 'utf-8')
        }
      } catch (error) {
        console.warn('Failed to update .gitignore:', error)
        // Non-critical, continue
      }
    }

    res.json({
      success: true,
      path: filePath,
      message: `Successfully updated ${scope} CLAUDE.md`,
    })
  } catch (error) {
    console.error('Failed to update CLAUDE.md:', error)
    res.status(500).json({ error: 'Failed to update CLAUDE.md file' })
  }
})

export default router
