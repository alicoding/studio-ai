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
import { handleListAgents } from './agentTools.js'
import { invokeTool, getRolesTool, handleInvoke, handleGetRoles } from './invokeTools.js'
import {
  fetchCapabilities,
  handleExecuteCapability,
  handleListCapabilities,
  type CapabilityConfig,
  type ExecuteCapabilityArgs
} from './capabilityTools.js'

// Create server instance
const server = new Server(
  {
    name: 'studio-ai',
    version: '1.0.0',
    description: 'AI capabilities with automatic session management. Each MCP connection maintains its own conversation context that persists across calls. No manual session ID handling required.',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

// Cache for capabilities to avoid re-fetching
let cachedCapabilities: Record<string, CapabilityConfig> | null = null

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

  // Old mention and batch_messages tools removed - use invoke instead

  // Add new unified invoke tools
  tools.push(invokeTool)
  tools.push(getRolesTool)
  
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
    // Use cache or fetch new capabilities
    if (!cachedCapabilities) {
      cachedCapabilities = await fetchCapabilities()
      console.error('[MCP] Fetched capabilities:', Object.keys(cachedCapabilities))
    }
    
    for (const [id, capability] of Object.entries(cachedCapabilities)) {
      const model = capability.models?.primary || 'default'
      tools.push({
        name: `execute_${id}`,
        description: `${capability.description} (Model: ${model})\n\n` +
          `SESSION MANAGEMENT:\n` +
          `• Conversations persist automatically across multiple calls\n` +
          `• Each MCP connection maintains its own conversation session\n` +
          `• To continue the conversation: Just call normally (default behavior)\n` +
          `• To start a new conversation: Set startNewConversation=true\n` +
          `• No session IDs to manage - everything is handled automatically\n\n` +
          `EXAMPLES:\n` +
          `• Continue conversation: {input: "What did we discuss?"}\n` +
          `• New conversation: {input: "debug this", startNewConversation: true}\n` +
          `• With files: {input: "analyze", includeFiles: ["src/main.js"]}`,
        inputSchema: {
          type: 'object',
          properties: {
            input: {
              type: 'string',
              description: 'Your prompt or question',
            },
            includeFiles: {
              type: 'array',
              items: { type: 'string' },
              description: 'Files to include as context (e.g., ["src/utils.js", "README.md"])',
            },
            projectPath: {
              type: 'string',
              description: 'Base directory for relative file paths (e.g., "/Users/name/project")',
            },
            startNewConversation: {
              type: 'boolean',
              description: 'Set to true to start a fresh conversation with no memory of previous messages. Default: false (continues existing conversation)',
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

      // Old mention and batch_messages handlers removed - use invoke instead

      case 'list_capabilities':
        return {
          content: [await handleListCapabilities()],
        }

      case 'invoke': {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments')
        }
        return {
          content: [await handleInvoke(args)],
        }
      }

      case 'get_roles': {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments')
        }
        return {
          content: [await handleGetRoles(args)],
        }
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
            includeFiles: capArgs.includeFiles as string[] | undefined,
            projectPath: capArgs.projectPath as string | undefined,
            startNewConversation: capArgs.startNewConversation as boolean | undefined,
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
