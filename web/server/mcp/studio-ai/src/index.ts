#!/usr/bin/env node
/**
 * Studio AI MCP Server
 * 
 * KISS: Single tool, parameter-based routing
 * SOLID: Each module has single responsibility
 * Library-First: Uses standard MCP SDK
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { 
  ListToolsRequestSchema,
  CallToolRequestSchema 
} from '@modelcontextprotocol/sdk/types.js'
import { createStudioAITool } from './tool.js'
import { handleToolCall, type ToolCallArgs } from './server.js'

// Create server instance
const server = new Server(
  {
    name: 'studio-ai',
    version: '1.0.0',
    description: 'Configurable AI capabilities for Claude Studio'
  },
  {
    capabilities: {
      tools: {}
    }
  }
)

// Register tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [await createStudioAITool()]
}))

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  
  if (name !== 'studio-ai') {
    throw new Error(`Unknown tool: ${name}`)
  }
  
  // Validate and construct typed arguments
  if (!args || typeof args !== 'object') {
    throw new Error('Invalid tool arguments: expected object')
  }
  
  const argsObj = args as Record<string, unknown>
  
  if (!argsObj.type || !argsObj.input) {
    throw new Error('Invalid tool arguments: missing required fields')
  }
  
  // Construct properly typed arguments
  const toolArgs: ToolCallArgs = {
    type: argsObj.type as 'chat' | 'command' | 'mention' | 'batch',
    input: String(argsObj.input),
    capability: argsObj.capability ? String(argsObj.capability) : undefined,
    context: argsObj.context as ToolCallArgs['context'],
    wait: argsObj.wait as boolean | undefined,
    timeout: argsObj.timeout as number | undefined,
    waitStrategy: argsObj.waitStrategy as 'all' | 'any' | 'none' | undefined,
    messages: argsObj.messages as ToolCallArgs['messages'] | undefined
  }
  
  return {
    content: [await handleToolCall(toolArgs)]
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