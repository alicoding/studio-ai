/**
 * useOrchestrationSettings - Hook for managing orchestration configuration
 * 
 * SOLID: Single responsibility - orchestration settings management
 * DRY: Reuses storage API
 * KISS: Simple interface for settings operations
 * Library First: Uses unified storage API
 */

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import type { OrchestrationConfig } from '../../web/server/schemas/orchestration'

interface UseOrchestrationSettingsReturn {
  settings: OrchestrationConfig | null
  updateSettings: (config: OrchestrationConfig) => Promise<void>
  isLoading: boolean
  error: string | null
}

const NAMESPACE = 'orchestration'
const SETTINGS_KEY = 'config'

export function useOrchestrationSettings(): UseOrchestrationSettingsReturn {
  const [settings, setSettings] = useState<OrchestrationConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/storage/item/${NAMESPACE}/${SETTINGS_KEY}`)
      
      if (response.ok) {
        const { value } = await response.json()
        setSettings(value as OrchestrationConfig)
      } else if (response.status === 404) {
        // No settings exist yet, use defaults
        const defaultConfig: OrchestrationConfig = {
          defaults: {
            mentionTimeout: 30000,
            batchTimeout: 60000,
            maxBatchSize: 10,
            waitStrategy: 'all',
            maxConcurrentBatches: 5,
            responseCleanupInterval: 60000,
            maxPendingResponses: 100
          },
          projects: {},
          permissions: {
            crossProjectMentions: 'all',
            batchOperations: true,
            maxGlobalConcurrency: 20,
            requireExplicitWait: false,
            allowTimeoutOverride: true
          },
          rateLimit: {
            enabled: false,
            messagesPerMinute: 60,
            messagesPerHour: 600,
            burstSize: 10
          },
          enabled: true
        }
        setSettings(defaultConfig)
      } else {
        throw new Error('Failed to load orchestration settings')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      console.error('Failed to load orchestration settings:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const updateSettings = useCallback(async (config: OrchestrationConfig) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/storage/item/${NAMESPACE}/${SETTINGS_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          value: config,
          type: 'state'
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save orchestration settings')
      }
      
      setSettings(config)
      toast.success('Orchestration settings saved successfully')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save settings'
      setError(message)
      toast.error(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    settings,
    updateSettings,
    isLoading,
    error
  }
}