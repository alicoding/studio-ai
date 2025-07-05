/**
 * API Configuration Service
 * 
 * SOLID: Single Responsibility - Configuration management only
 * DRY: Centralized config for all providers
 * KISS: Simple get/set interface with persistence
 * Library-First: Uses unified storage for persistence
 */

import type { ProviderConfig, ApiConfigStore } from './types'
import { createClientStorage } from '../../lib/storage/client'
import type { ClientStorage } from '../../lib/storage/client'

export class ApiConfigService implements ApiConfigStore {
  private static instance: ApiConfigService | null = null
  
  // Storage instances
  private configStorage: ClientStorage
  private keysStorage: ClientStorage
  
  // In-memory cache for performance
  private configCache: Record<string, ProviderConfig> = {}
  private keysCache: Record<string, string> = {}

  private constructor() {
    // Create storage instances for configs and keys
    this.configStorage = createClientStorage({
      namespace: 'api-config',
      type: 'config'
    })
    
    this.keysStorage = createClientStorage({
      namespace: 'api-keys',
      type: 'secret',
      encrypt: true // Always encrypt API keys
    })
    
    // Load data on initialization - happens in background
    this.loadFromStorage()
  }

  /**
   * Singleton pattern - SOLID: Single instance for consistency
   */
  static getInstance(): ApiConfigService {
    if (!ApiConfigService.instance) {
      ApiConfigService.instance = new ApiConfigService()
    }
    return ApiConfigService.instance
  }

  /**
   * Get provider configuration
   */
  getProviderConfig(name: string): ProviderConfig | undefined {
    this.ensureInitialized()
    return this.configCache[name]
  }

  /**
   * Set provider configuration
   */
  async setProviderConfig(name: string, config: ProviderConfig): Promise<void> {
    this.ensureInitialized()
    this.configCache[name] = { ...config }
    await this.saveToStorage()
  }

  /**
   * Remove provider configuration
   */
  async removeProviderConfig(name: string): Promise<void> {
    this.ensureInitialized()
    delete this.configCache[name]
    await this.removeApiKey(name) // Also remove associated API key
    await this.saveToStorage()
  }

  /**
   * Get all provider configurations
   */
  getAllConfigs(): Record<string, ProviderConfig> {
    this.ensureInitialized()
    return { ...this.configCache }
  }

  /**
   * Get API key for provider (secure)
   */
  getApiKey(provider: string): string | undefined {
    this.ensureInitialized()
    return this.keysCache[provider]
  }

  /**
   * Set API key for provider (secure)
   */
  async setApiKey(provider: string, key: string): Promise<void> {
    this.ensureInitialized()
    this.keysCache[provider] = key
    await this.saveKeysToStorage()
  }

  /**
   * Remove API key for provider
   */
  async removeApiKey(provider: string): Promise<void> {
    this.ensureInitialized()
    delete this.keysCache[provider]
    await this.saveKeysToStorage()
  }

  /**
   * Initialize default configurations for known providers
   */
  async initializeDefaults(): Promise<void> {
    // Claude Studio API (current system)
    if (!this.getProviderConfig('studio')) {
      await this.setProviderConfig('studio', {
        name: 'studio',
        baseUrl: '/api', // Relative URL for same-origin requests
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      })
    }

    // Future LLM providers (ready for when user adds them)
    const defaultProviders: ProviderConfig[] = [
      {
        name: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      },
      {
        name: 'anthropic',
        baseUrl: 'https://api.anthropic.com',
        headers: { 
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        timeout: 60000
      },
      {
        name: 'openrouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      },
      {
        name: 'gemini',
        baseUrl: 'https://generativelanguage.googleapis.com/v1',
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      }
    ]

    // Only set if not already configured (don't overwrite user settings)
    for (const provider of defaultProviders) {
      if (!this.getProviderConfig(provider.name)) {
        await this.setProviderConfig(provider.name, provider)
      }
    }
  }

  /**
   * Check if provider is configured and has API key (if required)
   */
  isProviderReady(name: string): boolean {
    const config = this.getProviderConfig(name)
    if (!config) return false

    // Studio API doesn't need API key (same-origin)
    if (name === 'studio') return true

    // Other providers need API keys
    const apiKey = this.getApiKey(name)
    return !!apiKey
  }

  /**
   * Get list of available/configured providers
   */
  getAvailableProviders(): string[] {
    this.ensureInitialized()
    return Object.keys(this.configCache)
  }

  /**
   * Get list of ready providers (configured with API keys)
   */
  getReadyProviders(): string[] {
    return this.getAvailableProviders().filter(name => this.isProviderReady(name))
  }

  /**
   * Update provider with custom base URL (for OpenAI-compatible endpoints)
   */
  async setCustomEndpoint(provider: string, baseUrl: string): Promise<void> {
    const config = this.getProviderConfig(provider)
    if (config) {
      await this.setProviderConfig(provider, { ...config, baseUrl })
    }
  }

  /**
   * Load configuration from unified storage
   */
  private async loadFromStorage(): Promise<void> {
    try {
      // Load provider configs
      const configs = await this.configStorage.get<Record<string, ProviderConfig>>('providers')
      if (configs) {
        this.configCache = configs
      }

      // Load API keys (encrypted in storage)
      const keys = await this.keysStorage.get<Record<string, string>>('keys')
      if (keys) {
        this.keysCache = keys
      }
    } catch (error) {
      console.error('Failed to load API configuration from storage:', error)
      this.configCache = {}
      this.keysCache = {}
    }
  }

  /**
   * Save configuration to unified storage
   */
  private async saveToStorage(): Promise<void> {
    try {
      await this.configStorage.set('providers', this.configCache)
    } catch (error) {
      console.error('Failed to save API configuration to storage:', error)
    }
  }

  /**
   * Save API keys to unified storage (encrypted)
   */
  private async saveKeysToStorage(): Promise<void> {
    try {
      await this.keysStorage.set('keys', this.keysCache)
    } catch (error) {
      console.error('Failed to save API keys to storage:', error)
    }
  }

  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    // The initialization happens in the background
    // This is just a no-op now since we can't block
  }

  /**
   * Clear all configuration (useful for testing or reset)
   */
  async clearAll(): Promise<void> {
    this.configCache = {}
    this.keysCache = {}
    await this.configStorage.delete('providers')
    await this.keysStorage.delete('keys')
  }

  /**
   * Export configuration for backup/sharing (excludes API keys)
   */
  exportConfig(): Record<string, Omit<ProviderConfig, 'apiKey'>> {
    const exported: Record<string, Omit<ProviderConfig, 'apiKey'>> = {}
    
    Object.entries(this.configCache).forEach(([name, config]) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { apiKey, ...configWithoutKey } = config
      exported[name] = configWithoutKey
    })
    
    return exported
  }

  /**
   * Import configuration from backup
   */
  async importConfig(configs: Record<string, ProviderConfig>): Promise<void> {
    for (const [name, config] of Object.entries(configs)) {
      await this.setProviderConfig(name, config)
    }
  }
}