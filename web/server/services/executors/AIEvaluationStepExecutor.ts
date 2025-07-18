/**
 * AI Evaluation Step Executor
 * Uses LangChain BaseChatModel for multi-provider AI evaluation (like n8n AI node)
 *
 * SOLID: Single responsibility - AI evaluation only using standard LangChain patterns
 * DRY: Reuses LangChain BaseChatModel abstraction for multi-provider support
 * KISS: Simple evaluation pattern with provider abstraction
 * Library-First: Uses LangChain standard models instead of custom implementation
 */

import type { StepExecutor, WorkflowContext } from './StepExecutor'
import type { StepResult, WorkflowStep } from '../../schemas/invoke'
import { ChatOpenAI } from '@langchain/openai'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'

export class AIEvaluationStepExecutor implements StepExecutor {
  canHandle(step: WorkflowStep): boolean {
    return step.type === 'ai_evaluation'
  }

  async execute(step: WorkflowStep, context: WorkflowContext): Promise<StepResult> {
    const startTime = Date.now()

    try {
      // Skip AI evaluation in mock mode (consistent with other executors)
      if (process.env.USE_MOCK_AI === 'true') {
        console.log(`[AIEvaluationStepExecutor] Using mock mode for step ${step.id}`)
        return {
          id: step.id!,
          status: 'success',
          response: 'SUCCESS - Mock AI evaluation passed (mock mode enabled)',
          sessionId: '',
          duration: Date.now() - startTime,
        }
      }

      // Validate step has required provider
      if (!step.provider) {
        throw new Error(
          'AI evaluation step requires a provider (openai, anthropic, azure, or google)'
        )
      }

      // Get input from previous step (via dependencies)
      const inputStepId = step.deps?.[0]
      if (!inputStepId) {
        throw new Error('AI evaluation step requires a dependency to evaluate')
      }

      const inputContent = context.stepOutputs[inputStepId]
      if (!inputContent) {
        throw new Error(`No output found from step: ${inputStepId}`)
      }

      // Create LangChain model (multi-provider support like n8n AI node)
      const model = this.createModel(step.provider, {
        model: step.model,
        temperature: 0.1, // Low temperature for consistent evaluation
      })

      // Build evaluation prompt
      const systemPrompt = step.systemPrompt || this.getDefaultEvaluationPrompt()
      const evaluationTask =
        step.task || 'Evaluate the provided content and respond with SUCCESS, FAILED, or BLOCKED'

      // Use LangChain for evaluation
      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(`Task: ${evaluationTask}\n\nContent to evaluate:\n${inputContent}`),
      ]

      const response = await model.invoke(messages)
      const evaluationResult = response.content.toString().trim()

      // Parse evaluation result to determine step status
      const status = this.parseEvaluationResult(evaluationResult)

      return {
        id: step.id!,
        status,
        response: evaluationResult,
        sessionId: '', // AI evaluation doesn't create sessions
        duration: Date.now() - startTime,
      }
    } catch (error) {
      console.error(`AI Evaluation step ${step.id} error:`, error)

      return {
        id: step.id!,
        status: 'failed',
        response: `AI evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sessionId: '',
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * Create LangChain model based on provider (like n8n AI node)
   * SOLID: Single responsibility - model creation
   * Library-First: Uses standard LangChain models
   */
  private createModel(
    provider: string,
    config: { model?: string; temperature?: number }
  ): BaseChatModel {
    switch (provider) {
      case 'openai':
        return new ChatOpenAI({
          modelName: config.model || 'gpt-4',
          temperature: config.temperature || 0.1,
          openAIApiKey: process.env.OPENAI_API_KEY,
        })

      case 'azure':
        return new ChatOpenAI({
          modelName: config.model || 'gpt-4',
          temperature: config.temperature || 0.1,
          openAIApiKey: process.env.AZURE_OPENAI_API_KEY,
          configuration: {
            baseURL: process.env.AZURE_OPENAI_ENDPOINT,
            defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION },
          },
        })

      case 'anthropic':
        throw new Error(
          `Anthropic provider requires @langchain/anthropic package. Please install: npm install @langchain/anthropic`
        )

      case 'google':
        throw new Error(
          `Google provider requires @langchain/google-genai package. Please install: npm install @langchain/google-genai`
        )

      default:
        throw new Error(
          `Unsupported AI provider: ${provider}. Currently supported: openai, azure. Install additional packages for: anthropic, google`
        )
    }
  }

  /**
   * Parse evaluation result to determine step status
   * KISS: Simple keyword-based parsing
   */
  private parseEvaluationResult(result: string): StepResult['status'] {
    const normalized = result.toLowerCase().trim()

    // Look for explicit status keywords
    if (
      normalized.includes('success') ||
      normalized.includes('completed') ||
      normalized.includes('passed')
    ) {
      return 'success'
    }

    if (
      normalized.includes('blocked') ||
      normalized.includes('waiting') ||
      normalized.includes('pending')
    ) {
      return 'blocked'
    }

    if (
      normalized.includes('failed') ||
      normalized.includes('error') ||
      normalized.includes('invalid')
    ) {
      return 'failed'
    }

    // Default to success if no clear status indicators
    return 'success'
  }

  /**
   * Default evaluation prompt for AI assessment
   * SOLID: Single responsibility - prompt generation
   */
  private getDefaultEvaluationPrompt(): string {
    return `You are a workflow evaluation assistant. Analyze the provided content and determine if the task was completed successfully.

Respond with one of these statuses:
- SUCCESS: Task completed successfully, high quality output
- FAILED: Task failed, errors present, or poor quality output  
- BLOCKED: Task cannot proceed, missing dependencies or access

Provide your assessment followed by a brief explanation of your reasoning.

Format your response as:
STATUS: [SUCCESS/FAILED/BLOCKED]
Reasoning: [Your explanation]`
  }
}
