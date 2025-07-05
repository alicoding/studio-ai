/**
 * AI Playground Service - Clean client for server-side LangChain
 * 
 * KISS: Simple API client for playground
 * DRY: No duplicate AI logic
 * SOLID: Single responsibility - API communication
 * Library-First: Uses ky instead of fetch
 */

import ky from 'ky'

export interface PlaygroundMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface PlaygroundRequest {
  model: string
  messages: PlaygroundMessage[]
  temperature?: number
  maxTokens?: number
}

export interface PlaygroundResponse {
  content: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface ModelInfo {
  id: string
  object: string
  created: number
  owned_by: string
}

export class PlaygroundService {
  private static instance: PlaygroundService
  private baseURL = '/api/ai'
  
  static getInstance(): PlaygroundService {
    if (!PlaygroundService.instance) {
      PlaygroundService.instance = new PlaygroundService()
    }
    return PlaygroundService.instance
  }
  
  /**
   * Send messages to AI playground
   */
  async chat(request: PlaygroundRequest): Promise<PlaygroundResponse> {
    try {
      console.log('[PlaygroundService] Sending request:', {
        model: request.model,
        messageCount: request.messages.length,
        temperature: request.temperature,
        maxTokens: request.maxTokens
      })
      
      const response = await ky.post(`${this.baseURL}/playground`, {
        json: request,
        timeout: 120000 // 2 minutes for AI processing
      }).json<PlaygroundResponse>()
      
      console.log('[PlaygroundService] Received response:', {
        contentLength: response.content.length,
        usage: response.usage
      })
      
      return response
    } catch (error) {
      console.error('[PlaygroundService] Chat error:', error)
      throw new Error(`AI chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Get available models from ElectronHub
   */
  async getModels(): Promise<string[]> {
    try {
      const response = await ky.get(`${this.baseURL}/models`, {
        timeout: 30000 // 30 seconds for model list
      }).json<{ data: ModelInfo[] }>()
      const models = response.data.map(model => model.id).sort()
      console.log('[PlaygroundService] Available models:', models)
      return models
    } catch (error) {
      console.error('[PlaygroundService] Failed to fetch models:', error)
      // Return fallback models if API fails
      return [
        'gpt-4o',
        'gpt-4',
        'gpt-3.5-turbo',
        'claude-3-opus',
        'claude-3-sonnet'
      ]
    }
  }
}