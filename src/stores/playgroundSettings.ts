/**
 * Playground Settings Store - Server-side persistence
 * 
 * SOLID: Single responsibility - playground settings management
 * DRY: Centralized settings state
 * KISS: Simple interface for settings operations
 * Library-First: Uses ky for API calls
 */

import { create } from 'zustand'
import ky from 'ky'

interface PlaygroundSettings {
  model: string
  systemPrompt: string
  temperature: number
  maxTokens: number
}

interface PlaygroundSettingsState {
  settings: PlaygroundSettings
  isLoading: boolean
  loadSettings: () => Promise<void>
  updateSettings: (settings: Partial<PlaygroundSettings>) => Promise<void>
  resetToDefaults: () => Promise<void>
}

// Get defaults from server config instead of hardcoding
const getDefaultSettings = async (): Promise<PlaygroundSettings> => {
  try {
    const response = await ky.get('/api/settings/playground-defaults').json<PlaygroundSettings>()
    return response
  } catch (error) {
    console.warn('Failed to load default settings from server:', error)
    throw new Error('Cannot load playground defaults - server unavailable')
  }
}

export const usePlaygroundSettingsStore = create<PlaygroundSettingsState>((set, get) => ({
  settings: {
    model: '',
    systemPrompt: '',
    temperature: 0.7,
    maxTokens: 2000
  },
  isLoading: false,

  loadSettings: async () => {
    try {
      set({ isLoading: true })
      const settings = await ky.get('/api/settings/playground', {
        timeout: 10000
      }).json<PlaygroundSettings>()
      set({ settings, isLoading: false })
    } catch (error) {
      console.error('Failed to load playground settings:', error)
      // Use defaults on error
      const defaults = await getDefaultSettings()
      set({ settings: defaults, isLoading: false })
    }
  },

  updateSettings: async (updates: Partial<PlaygroundSettings>) => {
    try {
      const currentSettings = get().settings
      const newSettings = { ...currentSettings, ...updates }
      
      // Optimistic update
      set({ settings: newSettings })
      
      // Save to server
      await ky.put('/api/settings/playground', {
        json: newSettings,
        timeout: 10000
      })
    } catch (error) {
      console.error('Failed to save playground settings:', error)
      // Revert on error
      await get().loadSettings()
      throw error
    }
  },

  resetToDefaults: async () => {
    const defaults = await getDefaultSettings()
    await get().updateSettings(defaults)
  }
}))