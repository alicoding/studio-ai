/**
 * Operator Configuration Service
 * 
 * SOLID: Single responsibility - manage operator settings
 * DRY: Reuses unified storage for persistence
 * KISS: Simple interface for operator configuration
 * Library-First: Uses existing storage patterns
 */

import { createStorage } from '../../../src/lib/storage/UnifiedStorage'

export interface OperatorConfig {
  model: string
  systemPrompt: string
  temperature: number
  maxTokens: number
  apiKey?: string // Optional, defaults to ELECTRONHUB_API_KEY
  baseURL?: string // Optional, defaults to ElectronHub URL
}

const DEFAULT_CONFIG: OperatorConfig = {
  model: 'gpt-3.5-turbo',
  systemPrompt: `You are a workflow status checker. Look at agent output and respond with ONLY one word:

- If output indicates task completion (contains "done", "completed", "implemented", "fixed", "here's", "created") → SUCCESS
- If output indicates inability to proceed (contains "can't", "cannot", "unable", "missing", "need", "blocked") → BLOCKED  
- If output indicates error or failure (contains "error", "failed", "couldn't", "exception") → FAILED
- If output is empty or says nothing meaningful → FAILED

Respond with ONLY: SUCCESS, BLOCKED, or FAILED`,
  temperature: 0,
  maxTokens: 10
}

export class OperatorConfigService {
  private static instance: OperatorConfigService
  private storage = createStorage({ namespace: 'operator', type: 'config' })
  private readonly CONFIG_KEY = 'operator-settings'
  
  static getInstance(): OperatorConfigService {
    if (!OperatorConfigService.instance) {
      OperatorConfigService.instance = new OperatorConfigService()
    }
    return OperatorConfigService.instance
  }

  async getConfig(): Promise<OperatorConfig> {
    try {
      const stored = await this.storage.get<OperatorConfig>(this.CONFIG_KEY)
      return stored || DEFAULT_CONFIG
    } catch (error) {
      console.error('Failed to load operator config:', error)
      return DEFAULT_CONFIG
    }
  }

  async updateConfig(config: Partial<OperatorConfig>): Promise<OperatorConfig> {
    const current = await this.getConfig()
    const updated = { ...current, ...config }
    
    // Validate required fields
    if (!updated.model || !updated.systemPrompt) {
      throw new Error('Model and system prompt are required')
    }
    
    await this.storage.set(this.CONFIG_KEY, updated)
    return updated
  }

  async resetToDefault(): Promise<OperatorConfig> {
    await this.storage.set(this.CONFIG_KEY, DEFAULT_CONFIG)
    return DEFAULT_CONFIG
  }
}