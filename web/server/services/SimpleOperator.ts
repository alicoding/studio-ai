/**
 * Simple Operator Service - Telephone switchboard style routing
 * 
 * SOLID: Single responsibility - status detection only
 * KISS: Simple pattern matching, no deep analysis
 * DRY: Reusable for all workflow steps
 * Configuration: Model and prompts configurable
 */

import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import type { OperatorAnalysis } from '../schemas/invoke'
import { OperatorConfigService } from './OperatorConfigService'

export class SimpleOperator {
  private model: ChatOpenAI | null = null
  private systemPrompt: string = ''
  private configService = OperatorConfigService.getInstance()
  private initialized = false

  async initialize() {
    if (this.initialized) return

    // Load configuration from database
    const config = await this.configService.getConfig()
    
    // Use config API key or fall back to environment variables
    const apiKey = config.apiKey || 
                   process.env.ELECTRONHUB_API_KEY || 
                   process.env.VITE_ELECTRONHUB_API_KEY
    
    const baseURL = config.baseURL || 
                    process.env.ELECTRONHUB_API_URL || 
                    'https://api.electronhub.ai/v1'

    if (!apiKey) {
      throw new Error('ElectronHub API key not configured for operator')
    }

    // Create model with configuration from database
    this.model = new ChatOpenAI({
      modelName: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      openAIApiKey: apiKey,
      configuration: { baseURL }
    })

    this.systemPrompt = config.systemPrompt
    this.initialized = true
  }

  /**
   * Check agent output status - context-aware based on role and task
   */
  async checkStatus(
    agentOutput: string, 
    context?: {
      role?: string
      task?: string
      roleSystemPrompt?: string
    }
  ): Promise<OperatorAnalysis> {
    try {
      // Ensure operator is initialized
      await this.initialize()

      if (!this.model) {
        throw new Error('Operator model not initialized')
      }

      if (!agentOutput || agentOutput.trim() === '') {
        return { status: 'failed', reason: 'Empty agent output' }
      }

      // Build context-aware system prompt
      const contextAwarePrompt = this.buildContextAwarePrompt(context)

      const messages = [
        new SystemMessage(contextAwarePrompt),
        new HumanMessage(`Agent output: ${agentOutput}`)
      ]

      const response = await this.model.invoke(messages)
      const status = response.content.toString().trim().toLowerCase()

      // Validate response
      if (!['success', 'blocked', 'failed'].includes(status)) {
        console.warn(`Operator returned unexpected status: ${status}`)
        return { status: 'failed', reason: 'Invalid operator response' }
      }

      return { 
        status: status as 'success' | 'blocked' | 'failed' 
      }

    } catch (error) {
      console.error('Operator error:', error)
      return { 
        status: 'failed', 
        reason: error instanceof Error ? error.message : 'Operator check failed' 
      }
    }
  }

  /**
   * Build context-aware system prompt based on role and task
   */
  private buildContextAwarePrompt(context?: {
    role?: string
    task?: string
    roleSystemPrompt?: string
  }): string {
    let prompt = this.systemPrompt

    if (context?.role || context?.task || context?.roleSystemPrompt) {
      prompt = `You are a workflow status checker. Given the context below, analyze if the agent fulfilled their role and task.

CONTEXT:
${context?.role ? `Role: ${context.role}` : ''}
${context?.task ? `Task: ${context.task}` : ''}
${context?.roleSystemPrompt ? `Role Capabilities: ${context.roleSystemPrompt}` : ''}

EVALUATION CRITERIA:
- SUCCESS: Agent provided output that fulfills the task given their role capabilities
- BLOCKED: Agent clearly states inability to proceed due to missing dependencies or access
- FAILED: Agent produced errors, empty output, or output that doesn't address the task

Respond with ONLY: SUCCESS, BLOCKED, or FAILED`
    }

    return prompt
  }

  /**
   * Get reason for blocked/failed status from output
   * KISS: Just extract the part that mentions the issue
   */
  async extractReason(agentOutput: string, status: 'blocked' | 'failed'): Promise<string> {
    if (status === 'blocked') {
      // Look for common blocking patterns
      const patterns = [
        /cannot .+ because (.+)/i,
        /unable to .+ because (.+)/i,
        /missing (.+)/i,
        /need (.+) to proceed/i,
        /blocked by (.+)/i
      ]

      for (const pattern of patterns) {
        const match = agentOutput.match(pattern)
        if (match) return match[1]
      }
    }

    // Default reason
    return status === 'blocked' ? 'Agent blocked on previous step' : 'Agent task failed'
  }
}