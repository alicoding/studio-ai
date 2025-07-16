/**
 * MCP Server Handler - Thin Bridge to Studio AI APIs
 *
 * KISS: Just translates MCP calls to API calls
 * DRY: Reuses existing backend functionality (KY, AbortSignal)
 * Library-First: Uses existing APIs instead of reimplementing
 * SOLID: Uses existing cancellation patterns
 */

import { TextContent } from '@modelcontextprotocol/sdk/types.js'
import ky from 'ky'

export interface ToolCallArgs {
  type: 'chat' | 'command' | 'mention' | 'batch'
  capability?: string
  input: string
  context?: {
    projectId?: string
    targetProjectId?: string // For cross-project routing
    sessionId?: string
    files?: string[]
    metadata?: Record<string, unknown>
  }
  // Orchestration parameters
  wait?: boolean
  timeout?: number
  waitStrategy?: 'all' | 'any' | 'none'
  messages?: Array<{
    id: string
    targetAgentId: string
    content: string
    projectId?: string
    dependencies?: string[]
  }>
  // Cancellation support
  requestId?: string
  signal?: AbortSignal
}

interface AIExecuteResponse {
  content: string
  sessionId?: string
  metadata?: {
    capabilityId?: string
    model?: string
    temperature?: number
    maxTokens?: number
    usage?: {
      promptTokens: number
      completionTokens: number
      totalTokens: number
    }
    turnCount?: number
    [key: string]: unknown
  }
}

// Get API base URL from environment or default
const API_BASE = process.env.STUDIO_AI_API || 'http://localhost:3456/api'

// Create KY instance with base configuration
const api = ky.create({
  prefixUrl: API_BASE,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Handle MCP tool calls by routing to appropriate Studio AI API
 */
export async function handleToolCall(args: ToolCallArgs): Promise<TextContent> {
  try {
    switch (args.type) {
      case 'mention':
        return await handleMention(args)

      case 'command':
        return await handleCommand(args)

      case 'chat':
        return await handleChat(args)

      case 'batch':
        return await handleBatch(args)

      default:
        throw new Error(`Unknown operation type: ${args.type}`)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      type: 'text',
      text: `Error: ${message}`,
    }
  }
}

/**
 * Handle @mention by calling existing mention API with orchestration support
 */
async function handleMention(args: ToolCallArgs): Promise<TextContent> {
  // Extract mention target from input (e.g., "@reviewer please check this")
  const mentionMatch = args.input.match(/^@(\S+)\s+(.*)/)
  if (!mentionMatch) {
    throw new Error('Invalid mention format. Use: @target message')
  }

  const [, target] = mentionMatch

  // Build request with orchestration parameters
  const requestBody: Record<string, unknown> = {
    message: args.input,
    fromAgentId: args.context?.metadata?.agentId || 'claude',
    projectId: args.context?.projectId || 'default',
  }

  // Add orchestration parameters if provided
  if (args.context?.targetProjectId) {
    requestBody.targetProjectId = args.context.targetProjectId
  }
  if (args.wait !== undefined) {
    requestBody.wait = args.wait
  }
  if (args.timeout !== undefined) {
    requestBody.timeout = args.timeout
  }

  // Call existing mention API using KY with optional cancellation
  const result = await api
    .post('messages/mention', {
      json: requestBody,
      signal: args.signal,
    })
    .json<{
      responses?: Record<string, unknown>
      targets?: string[]
      wait?: boolean
    }>()

  // Format response based on wait mode
  if (args.wait && result.responses) {
    const responses = Object.entries(result.responses)
      .map(([agent, resp]) => `**@${agent}**: ${JSON.stringify(resp)}`)
      .join('\n\n')

    return {
      type: 'text',
      text: `Responses received:\n\n${responses}`,
    }
  }

  return {
    type: 'text',
    text: `Message sent to @${target}${args.wait ? ' (wait mode)' : ''}`,
  }
}

/**
 * Handle command by executing with specified capability
 */
async function handleCommand(args: ToolCallArgs): Promise<TextContent> {
  const capabilityId = args.capability || 'search'

  // Execute through AI endpoint (uses LangGraph orchestration) using KY
  const result = await api
    .post('ai/execute', {
      json: {
        capabilityId,
        input: args.input,
        context: args.context,
      },
      signal: args.signal,
    })
    .json<AIExecuteResponse>()

  // Format response with metadata
  let responseText = result.content
  if (result.metadata) {
    const meta = result.metadata
    responseText += `\n\n📊 **Model Info:**`
    if (meta.model) responseText += `\n• Model: ${meta.model}`
    if (meta.capabilityId) responseText += `\n• Capability: ${meta.capabilityId}`
    if (meta.usage) {
      responseText += `\n• Tokens: ${meta.usage.promptTokens} prompt + ${meta.usage.completionTokens} completion = ${meta.usage.totalTokens} total`
    }
    if (meta.turnCount) responseText += `\n• Turn: ${meta.turnCount}`
  }

  return {
    type: 'text',
    text: responseText,
  }
}

/**
 * Handle batch operations by calling batch API
 */
async function handleBatch(args: ToolCallArgs): Promise<TextContent> {
  if (!args.messages || args.messages.length === 0) {
    throw new Error('Batch operation requires messages array')
  }

  // Build batch request
  const batchRequest: Record<string, unknown> = {
    messages: args.messages,
    fromAgentId: args.context?.metadata?.agentId || 'claude',
    projectId: args.context?.projectId || 'default',
    waitStrategy: args.waitStrategy || 'all',
  }

  // Add optional parameters
  if (args.timeout !== undefined) {
    batchRequest.timeout = args.timeout
  }

  // Call batch API using KY
  const result = await api
    .post('messages/batch', {
      json: batchRequest,
      signal: args.signal,
    })
    .json<{
      batchId?: string
      results?: Record<
        string,
        {
          id: string
          status: string
          response?: unknown
          error?: string
          duration: number
        }
      >
      summary?: {
        total: number
        successful: number
        failed: number
        timedOut: number
        duration: number
      }
    }>()

  // Format batch results
  let responseText = `Batch operation completed\n\n`

  if (result.summary) {
    responseText += `**Summary:**\n`
    responseText += `• Total: ${result.summary.total}\n`
    responseText += `• Successful: ${result.summary.successful}\n`
    responseText += `• Failed: ${result.summary.failed}\n`
    responseText += `• Timed out: ${result.summary.timedOut}\n`
    responseText += `• Duration: ${result.summary.duration}ms\n\n`
  }

  if (result.results) {
    responseText += `**Results:**\n`
    for (const [msgId, msgResult] of Object.entries(result.results)) {
      responseText += `\n**${msgId}** (${msgResult.status}):\n`
      if (msgResult.response) {
        responseText += `Response: ${JSON.stringify(msgResult.response)}\n`
      }
      if (msgResult.error) {
        responseText += `Error: ${msgResult.error}\n`
      }
      responseText += `Duration: ${msgResult.duration}ms\n`
    }
  }

  return {
    type: 'text',
    text: responseText,
  }
}

/**
 * Handle general chat through configured AI capability
 */
async function handleChat(args: ToolCallArgs): Promise<TextContent> {
  const capabilityId = args.capability || 'general-chat'

  // Execute through AI endpoint (uses LangGraph orchestration) using KY
  const result = await api
    .post('ai/execute', {
      json: {
        capabilityId,
        input: args.input,
        context: args.context,
      },
      signal: args.signal,
    })
    .json<AIExecuteResponse>()

  // Format response with metadata
  let responseText = result.content
  if (result.metadata) {
    const meta = result.metadata
    responseText += `\n\n📊 **Model Info:**`
    if (meta.model) responseText += `\n• Model: ${meta.model}`
    if (meta.capabilityId) responseText += `\n• Capability: ${meta.capabilityId}`
    if (meta.usage) {
      responseText += `\n• Tokens: ${meta.usage.promptTokens} prompt + ${meta.usage.completionTokens} completion = ${meta.usage.totalTokens} total`
    }
    if (meta.turnCount) responseText += `\n• Turn: ${meta.turnCount}`
  }

  return {
    type: 'text',
    text: responseText,
  }
}
