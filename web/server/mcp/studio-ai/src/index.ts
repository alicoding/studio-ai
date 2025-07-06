#!/usr/bin/env node
/**
 * Studio AI MCP Server
 *
 * KISS: Explicit tools for clear discovery
 * SOLID: Each handler has single responsibility
 * Configuration-driven: AI capabilities from UI become tools
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js'
import { handleListAgents, handleMention, handleBatchMessages } from './agentTools.js'
import {
  fetchCapabilities,
  handleExecuteCapability,
  handleListCapabilities,
} from './capabilityTools.js'
import type { ExecuteCapabilityArgs } from './capabilityTools.js'

// Create server instance
const server = new Server(
  {
    name: 'studio-ai',
    version: '1.0.0',
    description: 'Configurable AI capabilities for Claude Studio',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

// Register tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools: Tool[] = []

  // Fixed tools for agent operations
  tools.push({
    name: 'list_agents',
    description: 'List all available agents in the Claude Studio system',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  })

  tools.push({
    name: 'mention',
    description: 'Send a message to a specific agent (@mention style)',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Agent name/ID to send message to' },
        message: { type: 'string', description: 'Message content' },
        wait: { type: 'boolean', description: 'Wait for response (default: false)' },
        timeout: { type: 'number', description: 'Timeout in milliseconds' },
        projectId: { type: 'string', description: 'Project ID for context' },
      },
      required: ['to', 'message'],
      additionalProperties: false,
    },
  })

  tools.push({
    name: 'batch_messages',
    description: 'Send messages to multiple agents with orchestration',
    inputSchema: {
      type: 'object',
      properties: {
        messages: {
          type: 'array',
          description: 'Array of messages to send',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Message ID' },
              to: { type: 'string', description: 'Target agent' },
              content: { type: 'string', description: 'Message content' },
              projectId: { type: 'string', description: 'Project ID' },
              dependencies: {
                type: 'array',
                items: { type: 'string' },
                description: 'Message IDs this depends on',
              },
            },
            required: ['id', 'to', 'content'],
          },
        },
        waitStrategy: {
          type: 'string',
          enum: ['all', 'any', 'none'],
          description: 'How to wait for responses',
        },
        timeout: { type: 'number', description: 'Timeout in milliseconds' },
      },
      required: ['messages'],
      additionalProperties: false,
    },
  })

  tools.push({
    name: 'list_capabilities',
    description: 'List all configured AI capabilities',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  })

  // Dynamic tools from AI capabilities
  try {
    const capabilities = await fetchCapabilities()
    for (const [id, capability] of Object.entries(capabilities)) {
      const model = capability.models?.primary || 'default'
      tools.push({
        name: `execute_${id}`,
        description: `${capability.description} (Model: ${model})`,
        inputSchema: {
          type: 'object',
          properties: {
            input: {
              type: 'string',
              description: 'Input/prompt for the AI capability',
            },
            context: {
              type: 'object',
              description: 'Additional context',
              properties: {
                projectId: { type: 'string', description: 'Project ID' },
                sessionId: { type: 'string', description: 'Session ID for continuity' },
                files: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'File paths to include as context',
                },
                metadata: {
                  type: 'object',
                  description: 'Additional metadata',
                },
              },
              additionalProperties: false,
            },
          },
          required: ['input'],
          additionalProperties: false,
        },
      })
    }
  } catch (error) {
    console.error('Failed to fetch capabilities:', error)
  }

  return { tools }
})

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      case 'list_agents':
        return {
          content: [await handleListAgents()],
        }

      case 'mention': {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments')
        }
        const mentionArgs = args as Record<string, unknown>
        const typedArgs = {
          to: String(mentionArgs.to),
          message: String(mentionArgs.message),
          wait: mentionArgs.wait as boolean | undefined,
          timeout: mentionArgs.timeout as number | undefined,
          projectId: mentionArgs.projectId as string | undefined,
        }
        return {
          content: [await handleMention(typedArgs)],
        }
      }

      case 'batch_messages': {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments')
        }
        const batchArgs = args as Record<string, unknown>
        const typedArgs = {
          messages: batchArgs.messages as Array<{
            id: string
            to: string
            content: string
            projectId?: string
            dependencies?: string[]
          }>,
          waitStrategy: batchArgs.waitStrategy as 'all' | 'any' | 'none' | undefined,
          timeout: batchArgs.timeout as number | undefined,
        }
        return {
          content: [await handleBatchMessages(typedArgs)],
        }
      }

      case 'list_capabilities':
        return {
          content: [await handleListCapabilities()],
        }

      default: {
        // Check if it's a capability execution
        if (name.startsWith('execute_')) {
          const capabilityId = name.replace('execute_', '')
          if (!args || typeof args !== 'object') {
            throw new Error('Invalid arguments')
          }
          const capArgs = args as Record<string, unknown>
          const typedArgs: ExecuteCapabilityArgs = {
            input: String(capArgs.input),
            context: capArgs.context as ExecuteCapabilityArgs['context'],
          }
          return {
            content: [await handleExecuteCapability(capabilityId, typedArgs)],
          }
        }
        throw new Error(`Unknown tool: ${name}`)
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${message}`,
        },
      ],
    }
  }
})

// Error handling
server.onerror = (error) => {
  console.error('[MCP Server Error]', error)
}

// Start server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Studio AI MCP server started')
}

main().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
