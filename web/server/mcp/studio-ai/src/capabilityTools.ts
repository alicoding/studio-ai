/**
 * Capability Tools Handlers
 *
 * SOLID: Single responsibility - AI capability operations
 * KISS: Direct mapping to existing endpoints
 * Configurable: Reads capabilities from API
 */

import { TextContent } from '@modelcontextprotocol/sdk/types.js'

// Get API base URL from environment or default
const API_BASE = process.env.CLAUDE_STUDIO_API || 'http://localhost:3456/api'

interface CapabilityConfig {
  id: string
  name: string
  description: string
  category?: string
  models?: {
    primary: string
    fallback?: string[]
  }
  prompts?: {
    system?: string
    user?: string
  }
  context?: {
    includeFiles?: boolean
    includeProject?: boolean
    includeHistory?: boolean
    maxTokens?: number
  }
}

export interface ExecuteCapabilityArgs {
  input: string
  context?: {
    projectId?: string
    sessionId?: string
    files?: string[]
    metadata?: Record<string, unknown>
  }
}

interface CapabilityResponse {
  content: string
  metadata?: {
    model?: string
    usage?: {
      promptTokens: number
      completionTokens: number
      totalTokens: number
    }
    capabilityId?: string
  }
  sessionId?: string
}

/**
 * Fetch available capabilities from API
 */
export async function fetchCapabilities(): Promise<Record<string, CapabilityConfig>> {
  try {
    const response = await fetch(`${API_BASE}/ai/capabilities`)
    if (!response.ok) {
      return {}
    }
    return (await response.json()) as Record<string, CapabilityConfig>
  } catch {
    return {}
  }
}

/**
 * Execute a specific AI capability
 */
export async function handleExecuteCapability(
  capabilityId: string,
  args: ExecuteCapabilityArgs
): Promise<TextContent> {
  try {
    // Validate capability exists
    const capabilities = await fetchCapabilities()
    const capability = capabilities[capabilityId]

    if (!capability) {
      throw new Error(`Unknown capability: ${capabilityId}`)
    }

    // Build request body
    const requestBody = {
      capabilityId: capabilityId,
      input: args.input,
      projectId: args.context?.projectId,
      sessionId: args.context?.sessionId,
      context: {
        files: args.context?.files || [],
        metadata: args.context?.metadata || {},
      },
    }

    // Call langchain execute endpoint
    const response = await fetch(`${API_BASE}/langchain/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Capability execution failed: ${error}`)
    }

    const result = (await response.json()) as CapabilityResponse

    // Format response with metadata if available
    let responseText = result.content

    if (result.metadata) {
      responseText += '\n\n---\n'
      if (result.metadata.model) {
        responseText += `Model: ${result.metadata.model}\n`
      }
      if (result.metadata.usage) {
        responseText += `Tokens: ${result.metadata.usage.totalTokens} (prompt: ${result.metadata.usage.promptTokens}, completion: ${result.metadata.usage.completionTokens})\n`
      }
      if (result.sessionId) {
        responseText += `Session: ${result.sessionId}\n`
      }
    }

    return {
      type: 'text',
      text: responseText,
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
 * List all available AI capabilities
 */
export async function handleListCapabilities(): Promise<TextContent> {
  try {
    const capabilities = await fetchCapabilities()

    if (Object.keys(capabilities).length === 0) {
      return {
        type: 'text',
        text: 'No AI capabilities configured. Add them in Settings → AI.',
      }
    }

    const capList = Object.entries(capabilities)
      .map(([id, cap]) => {
        const model = cap.models?.primary || 'default'
        return `- **${id}**: ${cap.description} (${model})`
      })
      .join('\n')

    return {
      type: 'text',
      text: `Available AI capabilities:\n\n${capList}\n\nUse \`execute_[capability]\` to run a specific capability.`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      type: 'text',
      text: `Error listing capabilities: ${message}`,
    }
  }
}
