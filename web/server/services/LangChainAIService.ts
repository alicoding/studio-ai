/**
 * Server-side LangChain AI Service
 * 
 * KISS: Simple LangChain wrapper for AI capabilities
 * DRY: Single implementation for all AI models
 * SOLID: Single responsibility - AI execution
 * Library-First: Using LangChain for all AI operations
 */

import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages'
import type { CapabilityConfig } from '../../../src/lib/ai/orchestration/capability-config'

export class LangChainAIService {
  private static instance: LangChainAIService
  
  static getInstance(): LangChainAIService {
    if (!LangChainAIService.instance) {
      LangChainAIService.instance = new LangChainAIService()
    }
    return LangChainAIService.instance
  }
  
  async executeCapability(
    capability: CapabilityConfig,
    input: string,
    context?: {
      files?: string[]
      sessionId?: string
    }
  ): Promise<{
    content: string
    sessionId: string
    metadata: {
      capabilityId: string
      model: string
      temperature: number
      maxTokens: number
      usage: {
        promptTokens: number
        completionTokens: number
        totalTokens: number
      }
      turnCount: number
    }
  }> {
    const sessionId = context?.sessionId || `session-${Date.now()}`
    
    // Build prompts from capability configuration
    let systemPrompt = capability.prompts?.system || 'You are a helpful AI assistant.'
    let userPrompt = capability.prompts?.user || '{input}'
    
    // Replace template variables
    userPrompt = userPrompt.replace('{input}', input)
    if (context?.files) {
      userPrompt = userPrompt.replace('{files}', context.files.join('\n'))
    }
    
    // Model configuration from capability
    const modelName = capability.models.primary || 'gpt-4'
    const temperature = capability.advanced?.temperature || 0.7
    const maxTokens = capability.advanced?.maxTokens || 2000
    
    // Get API configuration from environment
    const apiKey = process.env.ELECTRONHUB_API_KEY || process.env.VITE_ELECTRONHUB_API_KEY
    const baseURL = process.env.ELECTRONHUB_API_URL || process.env.VITE_ELECTRONHUB_API_URL || 'https://api.electronhub.ai/v1'
    
    if (!apiKey) {
      throw new Error('ElectronHub API key not configured')
    }
    
    console.log(`[LangChain AI] Executing capability ${capability.id} with model ${modelName}`)
    
    // Create LangChain model instance
    const model = new ChatOpenAI({
      modelName,
      temperature,
      maxTokens,
      openAIApiKey: apiKey,
      configuration: {
        baseURL
      }
    })
    
    try {
      // Create messages
      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt)
      ]
      
      console.log('[LangChain AI] Invoking model with messages:', {
        system: systemPrompt.substring(0, 100) + '...',
        user: userPrompt.substring(0, 100) + '...'
      })
      
      // Invoke the model
      const response = await model.invoke(messages)
      
      console.log('[LangChain AI] Raw response type:', response.constructor.name)
      console.log('[LangChain AI] Response content type:', typeof response.content)
      
      // Extract content - LangChain returns AIMessage with content property
      let content = ''
      if (typeof response.content === 'string') {
        content = response.content
      } else if (Array.isArray(response.content)) {
        // Handle structured content (for thinking models)
        content = response.content.map((item: any) => {
          if (typeof item === 'string') return item
          if (item.text) return item.text
          return JSON.stringify(item)
        }).join('\n')
      } else {
        content = String(response.content || '')
      }
      
      // Get usage info if available
      const usage = response.response_metadata?.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
      
      console.log(`[LangChain AI] Execution complete. Content length: ${content.length}`)
      
      // Try fallback models if no content
      if (!content && capability.models.fallback?.length) {
        console.log('[LangChain AI] No content from primary model, trying fallbacks...')
        for (const fallbackModel of capability.models.fallback) {
          try {
            const fallbackLLM = new ChatOpenAI({
              modelName: fallbackModel,
              temperature,
              maxTokens,
              openAIApiKey: apiKey,
              configuration: { baseURL }
            })
            
            const fallbackResponse = await fallbackLLM.invoke(messages)
            if (fallbackResponse.content) {
              content = String(fallbackResponse.content)
              console.log(`[LangChain AI] Fallback model ${fallbackModel} succeeded`)
              break
            }
          } catch (fallbackError) {
            console.error(`[LangChain AI] Fallback model ${fallbackModel} failed:`, fallbackError)
          }
        }
      }
      
      return {
        content: content || 'No response generated',
        sessionId,
        metadata: {
          capabilityId: capability.id,
          model: modelName,
          temperature,
          maxTokens,
          usage: {
            promptTokens: usage.prompt_tokens || 0,
            completionTokens: usage.completion_tokens || 0,
            totalTokens: usage.total_tokens || 0
          },
          turnCount: 1
        }
      }
    } catch (error) {
      console.error('[LangChain AI] Execution error:', error)
      throw error
    }
  }
  
  async executePlayground(options: {
    model: string
    messages: Array<{ role: string; content: string }>
    temperature?: number
    maxTokens?: number
  }): Promise<{
    content: string
    usage: {
      promptTokens: number
      completionTokens: number
      totalTokens: number
    }
  }> {
    const { model, messages, temperature = 0.7, maxTokens = 2000 } = options
    
    // Get API configuration from environment
    const apiKey = process.env.ELECTRONHUB_API_KEY || process.env.VITE_ELECTRONHUB_API_KEY
    const baseURL = process.env.ELECTRONHUB_API_URL || process.env.VITE_ELECTRONHUB_API_URL || 'https://api.electronhub.ai/v1'
    
    if (!apiKey) {
      throw new Error('ElectronHub API key not configured')
    }
    
    console.log(`[LangChain Playground] Executing with model ${model}`)
    console.log(`[LangChain Playground] Using baseURL: ${baseURL}`)
    console.log(`[LangChain Playground] API key present: ${!!apiKey}`)
    
    // Create LangChain model instance
    const llm = new ChatOpenAI({
      modelName: model,
      temperature,
      maxTokens,
      openAIApiKey: apiKey,
      configuration: {
        baseURL
      }
    })
    
    try {
      // Convert messages to LangChain format
      const langChainMessages = messages.map(msg => {
        switch (msg.role) {
          case 'system':
            return new SystemMessage(msg.content)
          case 'user':
            return new HumanMessage(msg.content)
          case 'assistant':
            return new AIMessage(msg.content)
          default:
            return new HumanMessage(msg.content)
        }
      })
      
      console.log('[LangChain Playground] Invoking model with messages:', {
        messageCount: langChainMessages.length,
        model,
        messages: langChainMessages.map(m => ({ 
          type: m._getType(), 
          content: String(m.content).substring(0, 100) + '...' 
        }))
      })
      
      // Invoke the model
      const response = await llm.invoke(langChainMessages)
      
      console.log('[LangChain Playground] Raw response received:', {
        type: response.constructor.name,
        contentType: typeof response.content,
        contentLength: String(response.content).length,
        responseMetadata: response.response_metadata
      })
      
      // Extract content
      let content = ''
      if (typeof response.content === 'string') {
        content = response.content
      } else if (Array.isArray(response.content)) {
        content = response.content.map((item: any) => {
          if (typeof item === 'string') return item
          if (item.text) return item.text
          return JSON.stringify(item)
        }).join('\n')
      } else {
        content = String(response.content || '')
      }
      
      // Get usage info if available
      const usage = response.response_metadata?.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
      
      console.log(`[LangChain Playground] Execution complete. Content length: ${content.length}`)
      
      return {
        content: content || 'No response generated',
        usage: {
          promptTokens: usage.prompt_tokens || 0,
          completionTokens: usage.completion_tokens || 0,
          totalTokens: usage.total_tokens || 0
        }
      }
    } catch (error) {
      console.error('[LangChain Playground] Execution error:', error)
      throw error
    }
  }
}