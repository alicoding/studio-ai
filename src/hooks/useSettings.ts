/**
 * useSettings - Centralized Settings Management Hook
 *
 * SOLID: Single Responsibility - only handles settings state and API
 * DRY: Centralizes all settings logic
 * KISS: Simple interface for settings operations
 */

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import type { Hook, ClaudeCodeEvent } from '../types/hooks'

// Claude Code hook format
interface ClaudeCodeHook {
  type: 'command'
  command: string
}

interface ClaudeCodeHookGroup {
  matcher: string
  hooks: ClaudeCodeHook[]
}

interface SystemConfig {
  claudeCodePath: string
  defaultWorkspacePath: string
  apiEndpoint: string
  enableTelemetry: boolean
  defaultClearSessionPrompt: string
  hooks: {
    PreToolUse: ClaudeCodeHookGroup[]
    PostToolUse: ClaudeCodeHookGroup[]
    Notification: ClaudeCodeHookGroup[]
    Stop: ClaudeCodeHookGroup[]
  }
}

interface UseSettingsReturn {
  // State
  systemConfig: SystemConfig
  hooks: Hook[]
  loading: boolean
  saving: boolean

  // System config actions
  updateSystemConfig: (updates: Partial<SystemConfig>) => void
  saveSystemSettings: () => Promise<void>
  loadSystemSettings: () => Promise<void>

  // Hooks actions
  addHook: (hook: Hook) => void
  updateHook: (hook: Hook) => void
  removeHook: (hookId: string) => void

  // Claude path detection
  detectClaudePath: () => Promise<void>
  detectedPaths: string[]
  detectingPath: boolean

  // Studio Intelligence
  initializeStudioIntelligence: (projectPath: string) => Promise<void>
  studioIntelligenceStatus: {
    initialized: boolean
    activeHooks: string[]
  }
}

const DEFAULT_CONFIG: SystemConfig = {
  claudeCodePath: '',
  defaultWorkspacePath: '~/projects',
  apiEndpoint: typeof window !== 'undefined' ? window.location.origin : '',
  enableTelemetry: false,
  defaultClearSessionPrompt:
    'Session cleared. You are an AI assistant. Please stand by for instructions. Do not respond to this message.',
  hooks: {
    PreToolUse: [],
    PostToolUse: [],
    Notification: [],
    Stop: [],
  },
}

export function useSettings(): UseSettingsReturn {
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(DEFAULT_CONFIG)
  const [hooks, setHooks] = useState<Hook[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [detectedPaths, setDetectedPaths] = useState<string[]>([])
  const [detectingPath, setDetectingPath] = useState(false)
  const [studioIntelligenceStatus, setStudioIntelligenceStatus] = useState({
    initialized: false,
    activeHooks: [] as string[],
  })

  const updateSystemConfig = useCallback((updates: Partial<SystemConfig>) => {
    setSystemConfig((prev) => ({ ...prev, ...updates }))
  }, [])

  const loadSystemSettings = useCallback(async () => {
    try {
      // Load from all three native Claude Code locations
      const response = await fetch('/api/settings/all-hooks')
      if (response.ok) {
        const { config, hooks: allHookSources } = await response.json()

        // Set system config
        setSystemConfig((prev) => ({
          ...prev,
          ...config,
          apiEndpoint: config.apiEndpoint || window.location.origin,
        }))

        // Process hooks from all sources
        const allHooks: Hook[] = []
        let hookIndex = 0

        // Helper to process native Claude Code hooks
        const processNativeHooks = (hooks: any, location: string) => {
          if (!hooks) return

          Object.entries(hooks).forEach(([event, eventHooks]: [string, any]) => {
            if (
              Array.isArray(eventHooks) &&
              ['PreToolUse', 'PostToolUse', 'Notification', 'Stop'].includes(event)
            ) {
              eventHooks.forEach((hookConfig: any) => {
                if (hookConfig.hooks && Array.isArray(hookConfig.hooks)) {
                  hookConfig.hooks.forEach((hook: any) => {
                    if (hook.type === 'command') {
                      // Determine source and scope
                      const isStudioHook = hook.command?.includes('.claude-studio/scripts')
                      let scope: 'system' | 'project' | 'studio' = 'system'
                      let source = location

                      if (isStudioHook) {
                        scope = 'studio'
                        source = 'Studio Intelligence'
                      } else if (location.includes('project')) {
                        scope = 'project'
                      }

                      allHooks.push({
                        id: `${location}-${hookIndex++}`,
                        type: 'command',
                        event: event as ClaudeCodeEvent,
                        matcher: hookConfig.matcher || '*',
                        command: hook.command,
                        scope,
                        enabled: true,
                        source,
                        description: `From ${location}`,
                      })
                    }
                  })
                }
              })
            }
          })
        }

        // Process hooks from all three locations
        if (allHookSources.user) {
          processNativeHooks(allHookSources.user.hooks, '~/.claude/settings.json')
        }
        if (allHookSources.project) {
          processNativeHooks(allHookSources.project.hooks, '.claude/settings.json')
        }
        if (allHookSources.projectLocal) {
          processNativeHooks(allHookSources.projectLocal.hooks, '.claude/settings.local.json')
        }

        setHooks(allHooks)

        // Check Studio Intelligence status
        const studioHooks = allHooks.filter((h) => h.source === 'Studio Intelligence')
        if (studioHooks.length > 0) {
          // Get status from API
          fetch('/api/studio-intelligence/status')
            .then((res) => res.json())
            .then((status) => {
              setStudioIntelligenceStatus({
                initialized: status.hooksConfigured,
                activeHooks: status.activeHooks,
              })
            })
            .catch((err) => console.error('Failed to get Studio Intelligence status:', err))
        }
      }
      setLoading(false)
    } catch (error) {
      console.error('Failed to load settings:', error)
      toast.error('Failed to load settings')
      setLoading(false)
    }
  }, [])

  const saveSystemSettings = useCallback(async () => {
    setSaving(true)
    try {
      // Separate hooks by scope
      const systemHooks = hooks.filter((h) => h.scope === 'system')
      const studioHooks = hooks.filter((h) => h.scope === 'studio')
      const projectHooks = hooks.filter((h) => h.scope === 'project')

      // Convert system hooks to Claude Code format
      const hooksConfig: Record<string, any[]> = {
        PreToolUse: [],
        PostToolUse: [],
        Notification: [],
        Stop: [],
      }

      systemHooks.forEach((hook) => {
        if (
          hook.type === 'command' &&
          ['PreToolUse', 'PostToolUse', 'Notification', 'Stop'].includes(hook.event)
        ) {
          const event = hook.event as keyof typeof hooksConfig

          // Find existing matcher group or create new one
          let matcherGroup = hooksConfig[event].find((group) => group.matcher === hook.matcher)
          if (!matcherGroup) {
            matcherGroup = {
              matcher: hook.matcher,
              hooks: [],
            }
            hooksConfig[event].push(matcherGroup)
          }

          matcherGroup.hooks.push({
            type: 'command',
            command: hook.command,
          })
        }
      })

      const configToSave = {
        ...systemConfig,
        hooks: hooksConfig,
        // Store multi-tier hooks separately
        studioHooks: [...studioHooks, ...projectHooks],
      }

      const response = await fetch('/api/settings/system', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configToSave),
      })

      if (response.ok) {
        toast.success('Settings saved successfully!')
      } else {
        toast.error('Failed to save settings. Please try again.')
      }
    } catch (error) {
      console.error('Failed to save system settings:', error)
      toast.error('An error occurred while saving settings.')
    } finally {
      setSaving(false)
    }
  }, [systemConfig, hooks])

  const detectClaudePath = useCallback(async () => {
    setDetectingPath(true)
    try {
      const checkPaths: string[] = []
      const commands = ['claude', 'claude-code', 'claude-cli']

      for (const cmd of commands) {
        try {
          const response = await fetch('/api/system/detect-command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: cmd }),
          })
          if (response.ok) {
            const { path } = await response.json()
            if (path) checkPaths.push(path)
          }
        } catch (error) {
          console.error(`Failed to detect ${cmd}:`, error)
        }
      }

      const uniquePaths = [...new Set(checkPaths)]
      setDetectedPaths(uniquePaths)

      if (uniquePaths.length > 0 && !systemConfig.claudeCodePath) {
        const newConfig = { claudeCodePath: uniquePaths[0] }
        updateSystemConfig(newConfig)

        try {
          const response = await fetch('/api/settings/system', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...systemConfig, ...newConfig }),
          })
          if (response.ok) {
            toast.success(`Found and saved Claude at: ${uniquePaths[0]}`)
          } else {
            toast.success(`Found Claude at: ${uniquePaths[0]}`)
          }
        } catch (error) {
          console.error('Failed to auto-save detected path:', error)
          toast.success(`Found Claude at: ${uniquePaths[0]}`)
        }
      } else if (uniquePaths.length === 0) {
        toast.error('Claude Code not found. Please enter the path manually.')
      }
    } catch (error) {
      console.error('Failed to detect Claude path:', error)
      toast.error('Failed to detect Claude installation.')
    } finally {
      setDetectingPath(false)
    }
  }, [systemConfig, updateSystemConfig])

  const addHook = useCallback((hook: Hook) => {
    setHooks((prev) => [...prev, hook])
  }, [])

  const updateHook = useCallback((hook: Hook) => {
    setHooks((prev) => prev.map((h) => (h.id === hook.id ? hook : h)))
  }, [])

  const removeHook = useCallback((hookId: string) => {
    setHooks((prev) => prev.filter((h) => h.id !== hookId))
  }, [])

  const initializeStudioIntelligence = useCallback(async () => {
    try {
      // Studio Intelligence is now initialized on startup
      // This method just checks the status
      const response = await fetch('/api/studio-intelligence/status')

      if (!response.ok) {
        throw new Error('Failed to get status')
      }

      const status = await response.json()

      // Update status
      setStudioIntelligenceStatus({
        initialized: status.hooksConfigured,
        activeHooks: status.activeHooks,
      })

      if (status.hooksConfigured) {
        toast.info('Studio Intelligence is active with smart defaults')
      } else {
        toast.warning('Studio Intelligence hooks not found. Restart Studio to install defaults.')
      }
    } catch (error) {
      console.error('Failed to check Studio Intelligence status:', error)
      toast.error('Failed to check Studio Intelligence status')
    }
  }, [])

  // Load settings on mount
  useEffect(() => {
    loadSystemSettings()
  }, [loadSystemSettings])

  return {
    // State
    systemConfig,
    hooks,
    loading,
    saving,

    // System config actions
    updateSystemConfig,
    saveSystemSettings,
    loadSystemSettings,

    // Hooks actions
    addHook,
    updateHook,
    removeHook,

    // Claude path detection
    detectClaudePath,
    detectedPaths,
    detectingPath,

    // Studio Intelligence
    initializeStudioIntelligence,
    studioIntelligenceStatus,
  }
}
