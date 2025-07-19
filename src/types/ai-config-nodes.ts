/**
 * AI Provider Configuration Node Types
 *
 * SOLID: Single responsibility - each config type handles one provider
 * DRY: Shared base interface reduces duplication
 * KISS: Simple, focused interfaces for each provider
 * Library-First: Compatible with existing workflow builder patterns
 */

// Base configuration interface for all AI providers
export interface BaseAIProviderConfig {
  id: string
  name: string // User-friendly name like "Production OpenAI" or "Dev Anthropic"
  description?: string
  createdAt: string
  updatedAt: string
  // Connection validation
  isValid?: boolean
  lastTestedAt?: string
  testError?: string
}

// Provider-specific configuration types
export type AIProviderType = 'openai' | 'anthropic' | 'azure' | 'google' | 'custom'

// OpenAI Configuration Node
export interface OpenAIProviderConfig extends BaseAIProviderConfig {
  provider: 'openai'
  settings: {
    apiKey?: string
    organizationId?: string
    projectId?: string
    baseUrl?: string // For custom OpenAI endpoints
    maxRetries?: number
    timeout?: number
    defaultModel?: string
    availableModels?: string[]
  }
}

// Anthropic Configuration Node
export interface AnthropicProviderConfig extends BaseAIProviderConfig {
  provider: 'anthropic'
  settings: {
    apiKey?: string
    baseUrl?: string
    version?: string // API version like "2023-06-01"
    maxRetries?: number
    timeout?: number
    defaultModel?: string
    availableModels?: string[]
  }
}

// Azure OpenAI Configuration Node
export interface AzureProviderConfig extends BaseAIProviderConfig {
  provider: 'azure'
  settings: {
    apiKey?: string
    endpoint: string // Azure endpoint URL
    apiVersion?: string
    deploymentName?: string
    resourceName?: string
    maxRetries?: number
    timeout?: number
    defaultModel?: string
    availableModels?: string[]
  }
}

// Google AI Configuration Node
export interface GoogleProviderConfig extends BaseAIProviderConfig {
  provider: 'google'
  settings: {
    apiKey?: string
    projectId?: string
    location?: string // For Vertex AI
    baseUrl?: string
    maxRetries?: number
    timeout?: number
    defaultModel?: string
    availableModels?: string[]
  }
}

// Custom API Configuration Node (for OpenAI-compatible providers)
export interface CustomProviderConfig extends BaseAIProviderConfig {
  provider: 'custom'
  settings: {
    apiKey?: string
    baseUrl: string
    headers?: Record<string, string>
    authType: 'bearer' | 'api-key' | 'custom'
    modelFormat: 'openai' | 'anthropic' | 'custom'
    maxRetries?: number
    timeout?: number
    defaultModel?: string
    availableModels?: string[]
    // Custom authentication
    customAuth?: {
      headerName?: string
      headerValue?: string
      queryParam?: string
      queryValue?: string
    }
  }
}

// Union type for all provider configurations
export type AIProviderConfig =
  | OpenAIProviderConfig
  | AnthropicProviderConfig
  | AzureProviderConfig
  | GoogleProviderConfig
  | CustomProviderConfig

// Configuration node data for React Flow
export interface AIConfigNodeData extends BaseAIProviderConfig {
  provider: AIProviderType
  settings: Record<string, unknown>
  // UI state
  isExpanded?: boolean
  isTestingConnection?: boolean
}

// Provider metadata for UI rendering
export interface ProviderMetadata {
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }> | null
  colorClass: string
  colorHex: string
  defaultModels: string[]
  requiresApiKey: boolean
  supportsCustomUrl: boolean
  documentationUrl?: string
}

// Provider registry for UI components
export const AI_PROVIDER_METADATA: Record<AIProviderType, ProviderMetadata> = {
  openai: {
    label: 'OpenAI',
    description: 'GPT models - Fast and cost-effective',
    icon: () => null, // Will be imported in components
    colorClass: 'bg-green-500',
    colorHex: '#10b981',
    defaultModels: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    requiresApiKey: true,
    supportsCustomUrl: true,
    documentationUrl: 'https://platform.openai.com/docs',
  },
  anthropic: {
    label: 'Anthropic',
    description: 'Claude models - Advanced reasoning',
    icon: () => null,
    colorClass: 'bg-orange-500',
    colorHex: '#f97316',
    defaultModels: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    requiresApiKey: true,
    supportsCustomUrl: false,
    documentationUrl: 'https://docs.anthropic.com',
  },
  azure: {
    label: 'Azure OpenAI',
    description: 'Enterprise OpenAI via Azure',
    icon: () => null,
    colorClass: 'bg-blue-500',
    colorHex: '#3b82f6',
    defaultModels: ['gpt-4', 'gpt-35-turbo'],
    requiresApiKey: true,
    supportsCustomUrl: false,
    documentationUrl: 'https://docs.microsoft.com/en-us/azure/cognitive-services/openai',
  },
  google: {
    label: 'Google AI',
    description: 'Gemini models - Multimodal capabilities',
    icon: () => null,
    colorClass: 'bg-purple-500',
    colorHex: '#8b5cf6',
    defaultModels: ['gemini-pro', 'gemini-pro-vision'],
    requiresApiKey: true,
    supportsCustomUrl: false,
    documentationUrl: 'https://ai.google.dev',
  },
  custom: {
    label: 'Custom API',
    description: 'OpenAI-compatible APIs',
    icon: () => null,
    colorClass: 'bg-gray-500',
    colorHex: '#6b7280',
    defaultModels: ['custom-model'],
    requiresApiKey: true,
    supportsCustomUrl: true,
    documentationUrl: undefined,
  },
}

// Configuration validation types
export interface ConfigValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  modelList?: string[]
}

// Connection test result
export interface ConnectionTestResult {
  success: boolean
  responseTime?: number
  error?: string
  availableModels?: string[]
  testedAt: string
}

// Updated AI Task Node data with n8n-style multiple connections
export interface AITaskNodeData {
  label: string
  task: string
  systemPrompt?: string
  // No configNodeId - connections handle this
  model?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  // Task-specific parameters only (no provider config)
}

// n8n-style connection types for AI nodes
export interface AINodeConnectionTypes {
  // Data flow (left/right)
  input: 'workflow-data'
  output: 'workflow-data'
  // Configuration connections (bottom)
  provider: 'ai-provider-config'
  memory?: 'memory-config' // Future: RAG, conversation memory
  tools?: 'tools-config' // Future: Function calling, tools
}

// Handle positions for n8n-style layout
export interface AINodeHandles {
  input: { type: 'target'; position: 'Left' }
  output: { type: 'source'; position: 'Right' }
  provider: { type: 'target'; position: 'Bottom'; style: { left: '25%' } }
  memory?: { type: 'target'; position: 'Bottom'; style: { left: '50%' } }
  tools?: { type: 'target'; position: 'Bottom'; style: { left: '75%' } }
}
