/**
 * API Client Factory - Creates and manages API providers
 *
 * SOLID: Single Responsibility - Client creation and management
 * DRY: Centralized provider instantiation
 * KISS: Simple factory pattern with caching
 * Library-First: Supports multiple provider types
 */

import { BaseApiClient } from './BaseApiClient'
import { StudioApiProvider } from './StudioApiProvider'
import { ApiConfigService } from './ConfigService'
import type {
  ClientFactory as IClientFactory,
  ApiProvider,
  StudioProvider,
  LLMProvider,
  ProviderConfig,
} from './types'

export class ApiClientFactory implements IClientFactory {
  private static instance: ApiClientFactory | null = null
  private configService: ApiConfigService

  // Provider cache for performance and consistency
  private providerCache = new Map<string, ApiProvider>()

  private constructor() {
    this.configService = ApiConfigService.getInstance()

    // Initialize default configurations
    this.configService.initializeDefaults()
  }

  /**
   * Singleton pattern - SOLID: Single instance for consistency
   */
  static getInstance(): ApiClientFactory {
    if (!ApiClientFactory.instance) {
      ApiClientFactory.instance = new ApiClientFactory()
    }
    return ApiClientFactory.instance
  }

  /**
   * Create Studio API client (current Studio AI)
   */
  createStudioClient(): StudioProvider {
    const cacheKey = 'studio'

    if (this.providerCache.has(cacheKey)) {
      return this.providerCache.get(cacheKey) as StudioProvider
    }

    const provider = new StudioApiProvider()
    this.providerCache.set(cacheKey, provider)

    return provider
  }

  /**
   * Create LLM provider client (future feature)
   */
  createLLMClient(providerName: string): LLMProvider {
    const cacheKey = `llm-${providerName}`

    if (this.providerCache.has(cacheKey)) {
      return this.providerCache.get(cacheKey) as LLMProvider
    }

    const config = this.configService.getProviderConfig(providerName)
    if (!config) {
      throw new Error(`No configuration found for LLM provider: ${providerName}`)
    }

    const apiKey = this.configService.getApiKey(providerName)
    if (!apiKey) {
      throw new Error(`No API key found for LLM provider: ${providerName}`)
    }

    // Create provider based on type
    let provider: LLMProvider

    switch (providerName) {
      case 'openai':
        provider = this.createOpenAIProvider({ ...config, apiKey })
        break
      case 'anthropic':
        provider = this.createAnthropicProvider({ ...config, apiKey })
        break
      case 'openrouter':
        provider = this.createOpenRouterProvider({ ...config, apiKey })
        break
      case 'gemini':
        provider = this.createGeminiProvider({ ...config, apiKey })
        break
      case 'ollama':
        provider = this.createOllamaProvider({ ...config, apiKey })
        break
      default:
        throw new Error(`Unsupported LLM provider: ${providerName}`)
    }

    this.providerCache.set(cacheKey, provider)
    return provider
  }

  /**
   * Create generic API client with custom configuration
   */
  createGenericClient(config: ProviderConfig): ApiProvider {
    const cacheKey = `generic-${config.name}`

    if (this.providerCache.has(cacheKey)) {
      const cached = this.providerCache.get(cacheKey)!
      cached.updateConfig(config) // Update with new config
      return cached
    }

    const provider = new BaseApiClient(config)
    this.providerCache.set(cacheKey, provider)

    return provider
  }

  /**
   * Get all available provider names
   */
  getAvailableProviders(): string[] {
    return this.configService.getAvailableProviders()
  }

  /**
   * Get providers that are ready to use (have API keys)
   */
  getReadyProviders(): string[] {
    return this.configService.getReadyProviders()
  }

  /**
   * Check if provider is configured and ready
   */
  isProviderReady(name: string): boolean {
    return this.configService.isProviderReady(name)
  }

  /**
   * Configure a provider with API key and settings
   */
  configureProvider(name: string, config: ProviderConfig, apiKey?: string): void {
    this.configService.setProviderConfig(name, config)

    if (apiKey) {
      this.configService.setApiKey(name, apiKey)
    }

    // Clear cache to force recreation with new config
    this.clearProviderCache(name)
  }

  /**
   * Remove provider configuration
   */
  removeProvider(name: string): void {
    this.configService.removeProviderConfig(name)
    this.clearProviderCache(name)
  }

  /**
   * Clear cached provider instance
   */
  clearProviderCache(name: string): void {
    const keys = [`studio`, `llm-${name}`, `generic-${name}`]
    keys.forEach((key) => this.providerCache.delete(key))
  }

  /**
   * Clear all cached providers
   */
  clearAllCaches(): void {
    this.providerCache.clear()
  }

  // Future LLM provider implementations (placeholders for now)

  private createOpenAIProvider(_config: ProviderConfig): LLMProvider {
    // TODO: Implement OpenAI-specific provider
    // This will extend BaseApiClient with OpenAI chat completion API
    throw new Error('OpenAI provider not yet implemented - coming in next iteration')
  }

  private createAnthropicProvider(_config: ProviderConfig): LLMProvider {
    // TODO: Implement Anthropic-specific provider
    throw new Error('Anthropic provider not yet implemented - coming in next iteration')
  }

  private createOpenRouterProvider(_config: ProviderConfig): LLMProvider {
    // TODO: Implement OpenRouter-specific provider
    throw new Error('OpenRouter provider not yet implemented - coming in next iteration')
  }

  private createGeminiProvider(_config: ProviderConfig): LLMProvider {
    // TODO: Implement Gemini-specific provider
    throw new Error('Gemini provider not yet implemented - coming in next iteration')
  }

  private createOllamaProvider(_config: ProviderConfig): LLMProvider {
    // TODO: Implement Ollama-specific provider
    throw new Error('Ollama provider not yet implemented - coming in next iteration')
  }
}

// Convenience exports for common usage patterns
export const apiFactory = ApiClientFactory.getInstance()
export const studioApi = apiFactory.createStudioClient()
