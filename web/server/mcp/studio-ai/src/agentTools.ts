/**
 * Agent Tools Handlers
 *
 * SOLID: Single responsibility - agent operations
 * KISS: Simple, direct API calls
 * DRY: Reuses existing server patterns
 */

import { TextContent } from '@modelcontextprotocol/sdk/types.js'
import ky from 'ky'

// Get API base URL from environment or default
const API_BASE = process.env.STUDIO_AI_API || 'http://localhost:3456/api'

export interface Agent {
  id: string
  name: string
  role: string
  systemPrompt?: string
  model?: string
  tools?: string[]
  status?: string
}

// Agent configuration interfaces matching Studio AI
export interface AgentConfig {
  id: string
  name: string
  role: string
  model: string
  systemPrompt: string
  tools: string[]
  maxTokens: number
  temperature: number
  maxTurns?: number
  verbose?: boolean
  created: string
}

export interface CreateAgentInput {
  name: string
  role: string
  systemPrompt: string
  model?: string
  tools?: string[]
  maxTokens?: number
  temperature?: number
  maxTurns?: number
  verbose?: boolean
}

export interface UpdateAgentInput {
  name?: string
  role?: string
  systemPrompt?: string
  model?: string
  tools?: string[]
  maxTokens?: number
  temperature?: number
  maxTurns?: number
  verbose?: boolean
}

// API Response types
interface AgentResponse {
  from: string
  content: string
  sessionId: string
  timestamp: string
}

interface MentionResponse {
  responses?: Record<string, AgentResponse>
  trackingId?: string
  targets?: string[]
  wait?: boolean
}

interface BatchResponse {
  responses?: Record<string, unknown>
  trackingId?: string
  status?: string
}

/**
 * List all available agents in the system
 */
export async function handleListAgents(): Promise<TextContent> {
  try {
    const response = await fetch(`${API_BASE}/agents`)

    if (!response.ok) {
      throw new Error(`Failed to fetch agents: ${response.status}`)
    }

    const agents = (await response.json()) as Agent[]

    if (agents.length === 0) {
      return {
        type: 'text',
        text: 'No agents found in the system.',
      }
    }

    const agentList = agents
      .map((agent) => `- ${agent.name} (${agent.role})${agent.model ? ` - ${agent.model}` : ''}`)
      .join('\n')

    return {
      type: 'text',
      text: `Available agents:\n\n${agentList}`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      type: 'text',
      text: `Error listing agents: ${message}`,
    }
  }
}

/**
 * Send a message to a specific agent
 *
 * DEPRECATED: Use 'invoke' tool instead for unified agent invocation
 * Example: invoke({ workflow: { role: "developer", task: "your message" }, projectId: "..." })
 */
export async function handleMention(args: {
  to: string
  message: string
  wait?: boolean
  timeout?: number
  projectId?: string
}): Promise<TextContent> {
  try {
    // Validate required fields
    if (!args.to || !args.message) {
      throw new Error('Missing required fields: to and message')
    }

    // Format message with @mention
    const mentionMessage = args.message.includes('@') ? args.message : `@${args.to} ${args.message}`

    const requestBody = {
      to: args.to,
      message: mentionMessage,
      fromAgentId: 'claude',
      projectId: args.projectId || 'default',
      wait: args.wait || false,
      timeout: args.timeout,
      format: 'text', // Use simplified format for MCP
    }

    const response = await fetch(`${API_BASE}/messages/mention`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Mention failed: ${error}`)
    }

    const result = (await response.json()) as MentionResponse

    // Handle response based on wait mode
    if (args.wait) {
      // With format=text, we get a simplified response
      if ('content' in result) {
        return {
          type: 'text',
          text: result.content as string,
        }
      }
      // Fallback for old format
      if (result.responses) {
        const responses = Object.entries(result.responses)
          .map(([agent, resp]) => {
            if (typeof resp === 'object' && resp !== null && 'content' in resp) {
              return `**@${agent}**: ${resp.content}`
            }
            return `**@${agent}**: ${JSON.stringify(resp)}`
          })
          .join('\n\n')

        return {
          type: 'text',
          text: responses,
        }
      }
      // No valid response found
      return {
        type: 'text',
        text: `No response received from @${args.to}`,
      }
    } else {
      return {
        type: 'text',
        text: `Message sent to @${args.to}${result.trackingId ? ` (tracking: ${result.trackingId})` : ''}`,
      }
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
 * Send messages to multiple agents with orchestration
 *
 * DEPRECATED: Use 'invoke' tool instead for multi-agent workflows
 * Example: invoke({
 *   workflow: [
 *     { id: "step1", role: "developer", task: "..." },
 *     { id: "step2", role: "tester", task: "...", deps: ["step1"] }
 *   ],
 *   projectId: "..."
 * })
 */
export async function handleBatchMessages(args: {
  messages: Array<{
    id: string
    to: string
    content: string
    projectId?: string
    dependencies?: string[]
  }>
  waitStrategy?: 'all' | 'any' | 'none'
  timeout?: number
}): Promise<TextContent> {
  try {
    if (!args.messages || args.messages.length === 0) {
      throw new Error('No messages provided')
    }

    // Transform messages to API format
    const batchMessages = args.messages.map((msg) => ({
      id: msg.id,
      targetAgentId: msg.to,
      content: msg.content,
      projectId: msg.projectId || 'default',
      dependencies: msg.dependencies || [],
    }))

    const requestBody = {
      messages: batchMessages,
      fromAgentId: 'claude',
      projectId: 'default',
      waitStrategy: args.waitStrategy || 'none',
      timeout: args.timeout || 60000,
      format: 'text', // Use simplified format for MCP
    }

    const response = await fetch(`${API_BASE}/messages/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Batch operation failed: ${error}`)
    }

    const result = (await response.json()) as BatchResponse

    // Handle response based on wait strategy and format
    if (args.waitStrategy && args.waitStrategy !== 'none') {
      // With format=text, we get a simplified response
      if ('content' in result) {
        const summary = 'summary' in result ? `\n\n📊 ${result.summary}` : ''
        return {
          type: 'text',
          text: `${result.content}${summary}`,
        }
      }
      // Fallback for old format
      if (result.responses) {
        const responses = Object.entries(result.responses)
          .map(([msgId, resp]) => {
            const msg = args.messages.find((m) => m.id === msgId)
            return `Message ${msgId} to @${msg?.to}: ${JSON.stringify(resp)}`
          })
          .join('\n\n')

        return {
          type: 'text',
          text: `Batch operation completed:\n\n${responses}`,
        }
      }
      // No valid response found
      return {
        type: 'text',
        text: 'Batch operation completed but no responses received',
      }
    } else {
      return {
        type: 'text',
        text: `Batch operation started. ${result.trackingId ? `Tracking: ${result.trackingId}` : ''}`,
      }
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
 * Create a new agent configuration
 *
 * @example
 * {
 *   "name": "Code Reviewer",
 *   "role": "reviewer",
 *   "systemPrompt": "You are a code review specialist focusing on best practices.",
 *   "model": "claude-3-opus",
 *   "tools": ["read", "write", "bash"],
 *   "temperature": 0.7
 * }
 */
export async function handleCreateAgent(args: CreateAgentInput): Promise<TextContent> {
  try {
    // Validation
    if (!args.name || !args.role || !args.systemPrompt) {
      throw new Error('Required fields: name, role, and systemPrompt')
    }

    const requestBody = {
      name: args.name,
      role: args.role,
      systemPrompt: args.systemPrompt,
      model: args.model || 'opus', // Use alias for latest opus version
      tools: args.tools, // If undefined, SDK gives access to all tools
      maxTokens: args.maxTokens || 200000,
      temperature: args.temperature ?? 0.7,
      maxTurns: args.maxTurns || 500,
      verbose: args.verbose ?? true,
    }

    const response = await ky
      .post(`${API_BASE}/agents`, {
        json: requestBody,
        timeout: 30000,
      })
      .json<AgentConfig & { projectsUsing?: string[] }>()

    return {
      type: 'text',
      text: `Successfully created agent:\n\nID: ${response.id}\nName: ${response.name}\nRole: ${response.role}\nModel: ${response.model}\nTools: ${response.tools.join(', ')}\n\nThe agent is now available for use in projects.`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      type: 'text',
      text: `Error creating agent: ${message}`,
    }
  }
}

/**
 * Update an existing agent configuration
 *
 * @example
 * {
 *   "id": "agent-123",
 *   "updates": {
 *     "systemPrompt": "Updated prompt with new instructions",
 *     "temperature": 0.5
 *   }
 * }
 */
export async function handleUpdateAgent(args: {
  id: string
  updates: UpdateAgentInput
}): Promise<TextContent> {
  try {
    if (!args.id) {
      throw new Error('Agent ID is required')
    }

    if (!args.updates || Object.keys(args.updates).length === 0) {
      throw new Error('No updates provided')
    }

    const response = await ky
      .put(`${API_BASE}/agents/${args.id}`, {
        json: args.updates,
        timeout: 30000,
      })
      .json<AgentConfig & { projectsUsing?: string[] }>()

    const updatedFields = Object.keys(args.updates)
      .map(
        (field) => `- ${field}: ${JSON.stringify(args.updates[field as keyof UpdateAgentInput])}`
      )
      .join('\n')

    return {
      type: 'text',
      text: `Successfully updated agent ${response.name} (${response.id}):\n\nUpdated fields:\n${updatedFields}\n\nProjects using this agent: ${response.projectsUsing?.join(', ') || 'None'}`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      type: 'text',
      text: `Error updating agent: ${message}`,
    }
  }
}

/**
 * Delete an agent configuration
 *
 * @example
 * { "id": "agent-123" }
 */
export async function handleDeleteAgent(args: { id: string }): Promise<TextContent> {
  try {
    if (!args.id) {
      throw new Error('Agent ID is required')
    }

    // First get the agent to show details before deletion
    let agentName = args.id
    try {
      const agent = await ky
        .get(`${API_BASE}/agents/${args.id}`, {
          timeout: 30000,
        })
        .json<AgentConfig>()
      agentName = agent.name
    } catch (_) {
      // If we can't get the agent, continue with deletion anyway
    }

    await ky.delete(`${API_BASE}/agents/${args.id}`, {
      timeout: 30000,
    })

    return {
      type: 'text',
      text: `Successfully deleted agent ${agentName} (${args.id})`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      type: 'text',
      text: `Error deleting agent: ${message}`,
    }
  }
}

/**
 * List all agent configurations
 *
 * @example
 * {} (no parameters needed)
 */
export async function handleListAgentConfigs(): Promise<TextContent> {
  try {
    const agents = await ky
      .get(`${API_BASE}/agents`, {
        timeout: 30000,
      })
      .json<Array<AgentConfig & { projectsUsing?: string[] }>>()

    if (agents.length === 0) {
      return {
        type: 'text',
        text: 'No agent configurations found.',
      }
    }

    const agentList = agents
      .map((agent) => {
        const projects = agent.projectsUsing?.length
          ? `\n  Projects: ${agent.projectsUsing.join(', ')}`
          : ''
        return `**${agent.name}** (${agent.id})\n  Role: ${agent.role}\n  Model: ${agent.model}\n  Tools: ${agent.tools.join(', ')}\n  Temperature: ${agent.temperature}\n  Max Tokens: ${agent.maxTokens}${projects}`
      })
      .join('\n\n')

    return {
      type: 'text',
      text: `Agent Configurations:\n\n${agentList}`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      type: 'text',
      text: `Error listing agent configurations: ${message}`,
    }
  }
}

/**
 * Get a specific agent configuration
 *
 * @example
 * { "id": "agent-123" }
 */
export async function handleGetAgentConfig(args: { id: string }): Promise<TextContent> {
  try {
    if (!args.id) {
      throw new Error('Agent ID is required')
    }

    const agent = await ky
      .get(`${API_BASE}/agents/${args.id}`, {
        timeout: 30000,
      })
      .json<AgentConfig & { projectsUsing?: string[] }>()

    const projects = agent.projectsUsing?.length
      ? `\nProjects Using: ${agent.projectsUsing.join(', ')}`
      : '\nProjects Using: None'

    const details = `Agent Configuration: ${agent.name}\n\nID: ${agent.id}\nRole: ${agent.role}\nModel: ${agent.model}\nTools: ${agent.tools.join(', ')}\nTemperature: ${agent.temperature}\nMax Tokens: ${agent.maxTokens}\nMax Turns: ${agent.maxTurns || 'Not set'}\nVerbose: ${agent.verbose || false}\nCreated: ${agent.created}${projects}\n\nSystem Prompt:\n${agent.systemPrompt}`

    return {
      type: 'text',
      text: details,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      type: 'text',
      text: `Error getting agent configuration: ${message}`,
    }
  }
}
