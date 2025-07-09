#!/usr/bin/env node
/**
 * Studio AI MCP Server - Minimal Entry Point
 *
 * SOLID: Single responsibility - Server setup and request routing only
 * DRY: Delegates all tool logic to specialized modules
 * KISS: Simple server setup with clean separation of concerns
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { ToolRegistry } from './toolRegistry.js'
import { ToolHandlerRegistry } from './toolHandlers.js'
import { invokeTool, getRolesTool, invokeAsyncTool, invokeStatusTool } from './invokeTools.js'
import {
  listMCPServersTool,
  addMCPServerTool,
  updateMCPServerTool,
  deleteMCPServerTool,
  getMCPConfigTool,
} from './mcpConfigTools.js'
import { toolPermissionTools } from './toolPermissionTools.js'
import { fetchCapabilities, type CapabilityConfig } from './capabilityTools.js'

// Create server instance
const server = new Server(
  {
    name: 'studio-ai',
    version: '1.0.0',
    description:
      'AI capabilities with automatic session management. Each MCP connection maintains its own conversation context that persists across calls. No manual session ID handling required.',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

// Initialize registries
const toolRegistry = new ToolRegistry()
const handlerRegistry = new ToolHandlerRegistry()

// Cache for capabilities to avoid re-fetching
let cachedCapabilities: Record<string, CapabilityConfig> | null = null

// Register tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  // Register external tools
  toolRegistry.registerExternalTools([
    invokeTool,
    getRolesTool,
    invokeAsyncTool,
    invokeStatusTool,
    listMCPServersTool,
    addMCPServerTool,
    updateMCPServerTool,
    deleteMCPServerTool,
    getMCPConfigTool,
    ...toolPermissionTools,
  ])

  // Dynamic tools from AI capabilities
  try {
    // Use cache or fetch new capabilities
    if (!cachedCapabilities) {
      cachedCapabilities = await fetchCapabilities()
      console.error('[MCP] Fetched capabilities:', Object.keys(cachedCapabilities))
    }

    // Register capability tools and handlers
    toolRegistry.registerCapabilityTools(cachedCapabilities)
    for (const capabilityId of Object.keys(cachedCapabilities)) {
      handlerRegistry.registerCapabilityHandler(capabilityId)
    }
  } catch (error) {
    console.error('Failed to fetch capabilities:', error)
  }

  return { tools: toolRegistry.getAllTools() }
})

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    // Get handler from registry
    const handler = handlerRegistry.getHandler(name)
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`)
    }

    // Execute handler and return result
    const result = await handler(args)
    return {
      content: [result],
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

// Track server state
let isShuttingDown = false
let transport: StdioServerTransport | null = null

// Graceful shutdown handling
async function shutdown(signal: string) {
  if (isShuttingDown) return
  isShuttingDown = true

  console.error(`[MCP] Received ${signal}, shutting down gracefully...`)

  try {
    if (transport) {
      await server.close()
    }
    console.error('[MCP] Server closed successfully')
    process.exit(0)
  } catch (error) {
    console.error('[MCP] Error during shutdown:', error)
    process.exit(1)
  }
}

// Register signal handlers
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGHUP', () => shutdown('SIGHUP'))

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('[MCP] Uncaught exception:', error)
  shutdown('uncaughtException')
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('[MCP] Unhandled rejection at:', promise, 'reason:', reason)
  shutdown('unhandledRejection')
})

// Start server
async function main() {
  const isStableMode = process.env.MCP_STABLE_MODE === 'true'
  const mode = isStableMode ? 'STABLE' : 'DEV'

  console.error(`[MCP] Starting Studio AI MCP server in ${mode} mode...`)

  transport = new StdioServerTransport()
  await server.connect(transport)

  console.error(`[MCP] Studio AI MCP server started successfully in ${mode} mode`)

  // Log process info for debugging
  console.error(`[MCP] Process PID: ${process.pid}`)
  console.error(`[MCP] Parent PID: ${process.ppid}`)

  // Keep the process alive
  process.stdin.resume()
}

main().catch((error) => {
  console.error('[MCP] Failed to start server:', error)
  process.exit(1)
})
