/**
 * Studio AI API Client - Centralized HTTP Client System
 *
 * SOLID: Well-separated concerns across different provider types
 * DRY: Reusable HTTP client logic across all providers
 * KISS: Simple, intuitive API for common operations
 * Library-First: Built on ky, ready for future provider extensions
 *
 * Usage Examples:
 *
 * // Current Studio API (immediate replacement for existing fetch calls)
 * import { studioApi } from '@/services/api'
 * const agents = await studioApi.agents.getAll()
 *
 * // Future LLM providers (ready for next iteration)
 * import { apiFactory } from '@/services/api'
 * const openaiClient = apiFactory.createLLMClient('openai')
 * const response = await openaiClient.chat([{ role: 'user', content: 'Hello' }])
 *
 * // Custom providers
 * const customClient = apiFactory.createGenericClient({
 *   name: 'custom',
 *   baseUrl: 'https://api.example.com',
 *   apiKey: 'your-key'
 * })
 */

// Core types and interfaces
export type {
  ProviderConfig,
  ApiProvider,
  LLMProvider,
  StudioProvider,
  ApiRequest,
  ApiResponse,
  ApiError,
  ChatMessage,
  ChatOptions,
  ChatCompletion,
  ChatStreamChunk,
  Model,
  ProviderRegistry,
  ApiConfigStore,
  ClientFactory,
  Agent,
  Team,
  Project,
} from './types'

// Base classes and services
export { BaseApiClient } from './BaseApiClient'
export { ApiConfigService } from './ConfigService'
export { StudioApiProvider } from './StudioApiProvider'
export { ApiClientFactory } from './ClientFactory'

// Main exports - these are what most of the app will use
export { apiFactory, studioApi } from './ClientFactory'

// Import for legacy helpers and development utilities
import { apiFactory, studioApi } from './ClientFactory'
import { ApiConfigService } from './ConfigService'
import type {
  ProviderConfig,
  CreateAgentData,
  UpdateAgentData,
  CreateTeamData,
  UpdateTeamData,
} from './types'

/**
 * Migration helper - provides backwards compatibility
 *
 * This allows existing code to migrate gradually:
 *
 * OLD:
 * import { agentsApi } from '@/services/api/agents'
 *
 * NEW:
 * import { studioApi } from '@/services/api'
 * studioApi.agents.getAll() // same interface
 */
export const legacyAgentsApi = {
  getAll: () => studioApi.agents.getAll(),
  get: (id: string) => studioApi.agents.get(id),
  create: (data: CreateAgentData) => studioApi.agents.create(data),
  update: (id: string, data: UpdateAgentData) => studioApi.agents.update(id, data),
  delete: (id: string) => studioApi.agents.delete(id),
}

export const legacyTeamsApi = {
  getAll: () => studioApi.teams.getAll(),
  create: (data: CreateTeamData) => studioApi.teams.create(data),
  update: (id: string, data: UpdateTeamData) => studioApi.teams.update(id, data),
  delete: (id: string) => studioApi.teams.delete(id),
  clone: (id: string, name?: string) => studioApi.teams.clone(id, name),
  spawn: (teamId: string, projectId: string) => studioApi.teams.spawn(teamId, projectId),
  import: (team: CreateTeamData) => studioApi.teams.import(team),
}

/**
 * Configuration helpers for easy setup
 */
export const apiConfig = {
  /**
   * Configure OpenAI provider for user chat tabs
   */
  setupOpenAI: (apiKey: string, baseUrl?: string) => {
    apiFactory.configureProvider(
      'openai',
      {
        name: 'openai',
        baseUrl: baseUrl || 'https://api.openai.com/v1',
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000,
      },
      apiKey
    )
  },

  /**
   * Configure custom OpenAI-compatible provider
   */
  setupCustomOpenAI: (name: string, baseUrl: string, apiKey: string) => {
    apiFactory.configureProvider(
      name,
      {
        name,
        baseUrl,
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000,
      },
      apiKey
    )
  },

  /**
   * Configure Anthropic provider
   */
  setupAnthropic: (apiKey: string) => {
    apiFactory.configureProvider(
      'anthropic',
      {
        name: 'anthropic',
        baseUrl: 'https://api.anthropic.com',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        timeout: 60000,
      },
      apiKey
    )
  },

  /**
   * Configure OpenRouter provider
   */
  setupOpenRouter: (apiKey: string) => {
    apiFactory.configureProvider(
      'openrouter',
      {
        name: 'openrouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000,
      },
      apiKey
    )
  },

  /**
   * Configure Ollama provider (local)
   */
  setupOllama: (baseUrl: string = 'http://localhost:11434') => {
    apiFactory.configureProvider('ollama', {
      name: 'ollama',
      baseUrl: `${baseUrl}/api`,
      headers: { 'Content-Type': 'application/json' },
      timeout: 120000, // Longer timeout for local inference
    })
  },

  /**
   * Get all configured providers
   */
  getProviders: () => apiFactory.getAvailableProviders(),

  /**
   * Get ready providers (with API keys)
   */
  getReadyProviders: () => apiFactory.getReadyProviders(),

  /**
   * Check if provider is ready
   */
  isProviderReady: (name: string) => apiFactory.isProviderReady(name),

  /**
   * Remove provider
   */
  removeProvider: (name: string) => apiFactory.removeProvider(name),
}

/**
 * Development helpers
 */
export const apiDev = {
  /**
   * Clear all provider caches (useful for development)
   */
  clearCaches: () => apiFactory.clearAllCaches(),

  /**
   * Get raw configuration service
   */
  getConfigService: () => ApiConfigService.getInstance(),

  /**
   * Export all configurations (for backup)
   */
  exportConfig: () => ApiConfigService.getInstance().exportConfig(),

  /**
   * Import configurations (for restore)
   */
  importConfig: (configs: Record<string, ProviderConfig>) =>
    ApiConfigService.getInstance().importConfig(configs),
}
