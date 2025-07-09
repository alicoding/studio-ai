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

// Operator must be configured via database - no hardcoded defaults

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
      if (!stored || !stored.model || !stored.systemPrompt) {
        throw new Error('Operator not configured. Please configure the operator in settings.')
      }
      return stored
    } catch (error) {
      console.error('Failed to load operator config:', error)
      throw new Error('Operator configuration required. Please configure the operator in settings.')
    }
  }

  async updateConfig(config: Partial<OperatorConfig>): Promise<OperatorConfig> {
    // Get current config or use empty object if not configured
    let current: OperatorConfig
    try {
      current = await this.getConfig()
    } catch {
      // If not configured yet, start with empty config
      current = { model: '', systemPrompt: '', temperature: 0, maxTokens: 10 }
    }
    const updated = { ...current, ...config }

    // Validate required fields
    if (!updated.model || !updated.systemPrompt) {
      throw new Error('Model and system prompt are required')
    }

    await this.storage.set(this.CONFIG_KEY, updated)
    return updated
  }

  async resetToDefault(): Promise<void> {
    // Clear the operator config - must be reconfigured
    await this.storage.delete(this.CONFIG_KEY)
  }
}
