/**
 * LibreChat Types - OpenAI-compatible chat interface types
 * 
 * SOLID: Interface segregation for different chat operations
 * DRY: Shared types across all chat providers
 */

// OpenAI-compatible message format
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function'
  content: string
  name?: string // For function messages
  function_call?: {
    name: string
    arguments: string
  }
}

// Chat completion request options
export interface ChatCompletionOptions {
  model: string
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  stop?: string | string[]
  stream?: boolean
  n?: number
  functions?: ChatFunction[]
  function_call?: 'none' | 'auto' | { name: string }
  response_format?: { type: 'text' | 'json_object' }
}

// Function definition for function calling
export interface ChatFunction {
  name: string
  description?: string
  parameters?: Record<string, any>
}

// Non-streaming response
export interface ChatCompletion {
  id: string
  object: 'chat.completion'
  created: number
  model: string
  choices: ChatChoice[]
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface ChatChoice {
  index: number
  message: ChatMessage
  finish_reason: 'stop' | 'length' | 'function_call' | 'content_filter' | null
  logprobs?: any
}

// Streaming response chunk
export interface ChatCompletionChunk {
  id: string
  object: 'chat.completion.chunk'
  created: number
  model: string
  choices: ChatChunkChoice[]
}

export interface ChatChunkChoice {
  index: number
  delta: Partial<ChatMessage>
  finish_reason: 'stop' | 'length' | 'function_call' | 'content_filter' | null
  logprobs?: any
}

// Model information
export interface Model {
  id: string
  object: 'model'
  created: number
  owned_by: string
  permission?: any[]
  root?: string
  parent?: string
}

// Provider configuration
export interface ChatProviderConfig {
  name: string
  baseUrl: string
  apiKey: string
  defaultModel?: string
  headers?: Record<string, string>
  timeout?: number
}

// Chat provider interface
export interface ChatProvider {
  readonly name: string
  readonly baseUrl: string
  
  // Core operations
  createChatCompletion(options: ChatCompletionOptions): Promise<ChatCompletion>
  createChatCompletionStream(options: ChatCompletionOptions): AsyncGenerator<ChatCompletionChunk>
  
  // Model operations
  listModels(): Promise<Model[]>
  
  // Configuration
  updateConfig(config: Partial<ChatProviderConfig>): void
  isConfigured(): boolean
}

// Error types
export interface ChatError extends Error {
  status?: number
  code?: string
  type?: string
  param?: string
}

// Event types for streaming
export interface StreamEvent {
  type: 'chunk' | 'error' | 'done'
  data?: ChatCompletionChunk
  error?: ChatError
}