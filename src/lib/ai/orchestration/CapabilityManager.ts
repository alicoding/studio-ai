/**
 * Capability Manager
 * 
 * SOLID: Single responsibility - manages capability configurations
 * DRY: Centralized capability management
 * KISS: Simple configuration-based approach
 * Library-First: Uses server API for persistence (no more localStorage)
 */

import { CapabilityConfig, DEFAULT_CAPABILITIES } from './capability-config'
import { create } from 'zustand'
import { BaseApiClient } from '../../../services/api/BaseApiClient'

interface CapabilityState {
  capabilities: Record<string, CapabilityConfig>
  activeCapability: string | null
  loading: boolean
  
  // Actions
  loadCapabilities: () => Promise<void>
  loadCapability: (id: string) => CapabilityConfig | undefined
  saveCapability: (config: CapabilityConfig) => Promise<void>
  deleteCapability: (id: string) => Promise<void>
  updateCapability: (id: string, updates: Partial<CapabilityConfig>) => Promise<void>
  
  // Import/Export
  exportCapability: (id: string) => string
  importCapability: (jsonString: string) => Promise<void>
  
  // Presets
  loadDefaults: () => void
  resetToDefault: (id: string) => Promise<void>
  
  // Template operations
  createFromTemplate: (templateId: string, newConfig: Partial<CapabilityConfig>) => Promise<void>
  
  // Validation
  validateCapability: (config: CapabilityConfig) => { valid: boolean; errors?: string[] }
}

// Server API client using KY
const apiClient = new BaseApiClient({
  name: 'capabilities-api',
  baseUrl: '/api/ai',
})

const api = {
  async getCapabilities(): Promise<Record<string, CapabilityConfig>> {
    return apiClient.get('capabilities')
  },
  
  async saveCapability(capability: CapabilityConfig): Promise<void> {
    return apiClient.post('capabilities', capability)
  },
  
  async deleteCapability(id: string): Promise<void> {
    return apiClient.delete(`capabilities/${id}`)
  }
}

export const useCapabilityStore = create<CapabilityState>((set, get) => ({
  capabilities: {},
  activeCapability: null,
  loading: false,
  
  loadCapabilities: async () => {
    set({ loading: true })
    try {
      const capabilities = await api.getCapabilities()
      // Merge with default capabilities to ensure they're always available
      const mergedCapabilities = {
        ...DEFAULT_CAPABILITIES,
        ...capabilities
      }
      set({ capabilities: mergedCapabilities, loading: false })
    } catch (error) {
      console.error('Failed to load capabilities:', error)
      // If loading fails, at least show default capabilities
      set({ capabilities: DEFAULT_CAPABILITIES, loading: false })
    }
  },
  
  loadCapability: (id: string) => {
    const state = get()
    return state.capabilities[id] || DEFAULT_CAPABILITIES[id]
  },
  
  saveCapability: async (config: CapabilityConfig) => {
    try {
      const configWithTimestamp = {
        ...config,
        metadata: {
          ...config.metadata,
          modified: new Date().toISOString()
        }
      }
      
      await api.saveCapability(configWithTimestamp)
      
      // Immediately update local state
      set((state) => ({
        capabilities: {
          ...state.capabilities,
          [config.id]: configWithTimestamp
        }
      }))
      
      // Then reload from server to ensure consistency
      await get().loadCapabilities()
    } catch (error) {
      console.error('Failed to save capability:', error)
      throw error
    }
  },
  
  deleteCapability: async (id: string) => {
    await api.deleteCapability(id)
    
    set((state) => {
      const newCapabilities = { ...state.capabilities }
      delete newCapabilities[id]
      return { capabilities: newCapabilities }
    })
  },
  
  updateCapability: async (id: string, updates: Partial<CapabilityConfig>) => {
    const current = get().loadCapability(id)
    if (current) {
      await get().saveCapability({
        ...current,
        ...updates,
        id // Ensure ID doesn't change
      })
    }
  },
  
  exportCapability: (id: string) => {
    const capability = get().loadCapability(id)
    if (!capability) throw new Error(`Capability ${id} not found`)
    
    return JSON.stringify(capability, null, 2)
  },
  
  importCapability: async (jsonString: string) => {
    try {
      const config = JSON.parse(jsonString) as CapabilityConfig
      const validation = get().validateCapability(config)
      
      if (!validation.valid) {
        throw new Error(`Invalid capability: ${validation.errors?.join(', ')}`)
      }
      
      await get().saveCapability({
        ...config,
        metadata: {
          ...config.metadata,
          modified: new Date().toISOString()
        }
      })
    } catch (error) {
      throw new Error(`Failed to import capability: ${error}`)
    }
  },
  
  loadDefaults: () => {
    set((state) => ({
      capabilities: {
        ...DEFAULT_CAPABILITIES,
        ...state.capabilities // Keep custom capabilities
      }
    }))
  },
  
  resetToDefault: async (id: string) => {
    if (DEFAULT_CAPABILITIES[id]) {
      await get().saveCapability(DEFAULT_CAPABILITIES[id])
    }
  },
  
  createFromTemplate: async (templateId: string, newConfig: Partial<CapabilityConfig>) => {
    const template = get().loadCapability(templateId)
    if (!template) throw new Error(`Template ${templateId} not found`)
    
    const newCapability: CapabilityConfig = {
      ...template,
      ...newConfig,
      id: newConfig.id || `${templateId}-${Date.now()}`,
      metadata: {
        ...template.metadata,
        ...newConfig.metadata,
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      }
    }
    
    await get().saveCapability(newCapability)
  },
  
  validateCapability: (config: CapabilityConfig) => {
    const errors: string[] = []
    
    if (!config.id) errors.push('ID is required')
    if (!config.name) errors.push('Name is required')
    if (!config.models?.primary) errors.push('Primary model is required')
    if (!config.prompts?.system) errors.push('System prompt is required')
    
    // Validate model IDs exist
    // TODO: Check against available models
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    }
  }
}))

// Singleton manager class for non-React contexts
export class CapabilityManager {
  private static instance: CapabilityManager
  
  static getInstance(): CapabilityManager {
    if (!CapabilityManager.instance) {
      CapabilityManager.instance = new CapabilityManager()
    }
    return CapabilityManager.instance
  }
  
  private constructor() {
    // Load defaults on first initialization
    const store = useCapabilityStore.getState()
    if (Object.keys(store.capabilities).length === 0) {
      store.loadDefaults()
    }
  }
  
  getCapability(id: string): CapabilityConfig | undefined {
    return useCapabilityStore.getState().loadCapability(id)
  }
  
  getAllCapabilities(): CapabilityConfig[] {
    const store = useCapabilityStore.getState()
    const customCaps = Object.values(store.capabilities)
    const defaultCaps = Object.values(DEFAULT_CAPABILITIES)
    
    // Merge, with custom overriding defaults
    const merged = new Map<string, CapabilityConfig>()
    defaultCaps.forEach(cap => merged.set(cap.id, cap))
    customCaps.forEach(cap => merged.set(cap.id, cap))
    
    return Array.from(merged.values())
  }
  
  getCapabilitiesByCategory(category: string): CapabilityConfig[] {
    return this.getAllCapabilities().filter(cap => cap.category === category)
  }
  
  // Process template variables in prompts
  processPrompt(prompt: string, variables: Record<string, any>): string {
    return prompt.replace(/\{(\w+)\}/g, (match, key) => {
      return variables[key] || match
    })
  }
  
  // Add a new capability
  addCapability(capability: CapabilityConfig): void {
    useCapabilityStore.getState().saveCapability(capability)
  }
  
  // Remove a capability
  removeCapability(id: string): void {
    useCapabilityStore.getState().deleteCapability(id)
  }
  
  // Update a capability
  updateCapability(id: string, updates: Partial<CapabilityConfig>): void {
    useCapabilityStore.getState().updateCapability(id, updates)
  }
}