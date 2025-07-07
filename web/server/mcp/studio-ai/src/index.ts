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
import {
  handleListAgents,
  handleCreateAgent,
  handleUpdateAgent,
  handleDeleteAgent,
  handleListAgentConfigs,
  handleGetAgentConfig,
  type CreateAgentInput,
  type UpdateAgentInput,
} from './agentTools.js'
import { invokeTool, getRolesTool, handleInvoke, handleGetRoles } from './invokeTools.js'
import {
  handleListProjects,
  handleCreateProject,
  handleUpdateProject,
  handleDeleteProject,
  handleGetProject,
  handleAssignRole,
  handleUnassignRole,
  handleListRoles,
  type CreateProjectInput,
  type UpdateProjectInput,
  type RoleAssignment,
} from './projectTools.js'
import {
  fetchCapabilities,
  handleExecuteCapability,
  handleListCapabilities,
  type CapabilityConfig,
  type ExecuteCapabilityArgs,
} from './capabilityTools.js'

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

  // Agent configuration tools
  tools.push({
    name: 'create_agent',
    description: 'Create a new agent configuration',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the agent',
        },
        role: {
          type: 'string',
          description: 'Role/type of the agent (e.g., developer, tester, reviewer)',
        },
        systemPrompt: {
          type: 'string',
          description: "System prompt that defines the agent's behavior",
        },
        model: {
          type: 'string',
          description: 'AI model to use (default: claude-3-opus)',
        },
        tools: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of tools the agent can use (default: ["read", "write", "bash"])',
        },
        maxTokens: {
          type: 'number',
          description: 'Maximum tokens for responses (default: 200000)',
        },
        temperature: {
          type: 'number',
          description: 'Temperature for model responses (default: 0.7)',
        },
        maxTurns: {
          type: 'number',
          description: 'Maximum conversation turns (default: 500)',
        },
        verbose: {
          type: 'boolean',
          description: 'Enable verbose mode (default: true)',
        },
      },
      required: ['name', 'role', 'systemPrompt'],
      additionalProperties: false,
    },
  })

  tools.push({
    name: 'update_agent',
    description: 'Update an existing agent configuration',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID of the agent to update',
        },
        updates: {
          type: 'object',
          description: 'Fields to update',
          properties: {
            name: { type: 'string' },
            role: { type: 'string' },
            systemPrompt: { type: 'string' },
            model: { type: 'string' },
            tools: {
              type: 'array',
              items: { type: 'string' },
            },
            maxTokens: { type: 'number' },
            temperature: { type: 'number' },
            maxTurns: { type: 'number' },
            verbose: { type: 'boolean' },
          },
        },
      },
      required: ['id', 'updates'],
      additionalProperties: false,
    },
  })

  tools.push({
    name: 'delete_agent',
    description: 'Delete an agent configuration',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID of the agent to delete',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
  })

  tools.push({
    name: 'list_agent_configs',
    description: 'List all agent configurations with detailed information',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  })

  tools.push({
    name: 'get_agent_config',
    description: 'Get a specific agent configuration by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID of the agent to retrieve',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
  })

  // Old mention and batch_messages tools removed - use invoke instead

  // Add new unified invoke tools
  tools.push(invokeTool)
  tools.push(getRolesTool)

  // Project management tools
  tools.push({
    name: 'list_projects',
    description: 'List all projects in Claude Studio',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  })

  tools.push({
    name: 'create_project',
    description: 'Create a new project',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the project',
        },
        description: {
          type: 'string',
          description: 'Description of the project',
        },
        workspacePath: {
          type: 'string',
          description: 'Path to the project workspace',
        },
        activeAgents: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of agent IDs to activate for this project',
        },
        envVars: {
          type: 'object',
          description: 'Environment variables for the project',
        },
        disabledTools: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of tools to disable for this project',
        },
        mcpServers: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of MCP servers to enable for this project',
        },
      },
      required: ['name', 'description', 'workspacePath'],
      additionalProperties: false,
    },
  })

  tools.push({
    name: 'update_project',
    description: 'Update an existing project',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID of the project to update',
        },
        updates: {
          type: 'object',
          description: 'Fields to update',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            workspacePath: { type: 'string' },
            activeAgents: {
              type: 'array',
              items: { type: 'string' },
            },
            envVars: { type: 'object' },
            disabledTools: {
              type: 'array',
              items: { type: 'string' },
            },
            mcpServers: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
      required: ['id', 'updates'],
      additionalProperties: false,
    },
  })

  tools.push({
    name: 'delete_project',
    description: 'Delete a project',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID of the project to delete',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
  })

  tools.push({
    name: 'get_project',
    description: 'Get a specific project by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID of the project to retrieve',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
  })

  tools.push({
    name: 'assign_role',
    description: 'Assign an agent to a project with a specific role',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'ID of the project',
        },
        agentId: {
          type: 'string',
          description: 'ID of the agent to assign',
        },
        role: {
          type: 'string',
          description: 'Role to assign to the agent (e.g., developer, tester, reviewer)',
        },
      },
      required: ['projectId', 'agentId', 'role'],
      additionalProperties: false,
    },
  })

  tools.push({
    name: 'unassign_role',
    description: 'Remove an agent from a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'ID of the project',
        },
        agentId: {
          type: 'string',
          description: 'ID of the agent to remove',
        },
      },
      required: ['projectId', 'agentId'],
      additionalProperties: false,
    },
  })

  tools.push({
    name: 'list_roles',
    description: 'List all role assignments for a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'ID of the project',
        },
      },
      required: ['projectId'],
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
    // Use cache or fetch new capabilities
    if (!cachedCapabilities) {
      cachedCapabilities = await fetchCapabilities()
      console.error('[MCP] Fetched capabilities:', Object.keys(cachedCapabilities))
    }

    for (const [id, capability] of Object.entries(cachedCapabilities)) {
      const model = capability.models?.primary || 'default'
      tools.push({
        name: `execute_${id}`,
        description:
          `${capability.description} (Model: ${model})\n\n` +
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
              description:
                'Set to true to start a fresh conversation with no memory of previous messages. Default: false (continues existing conversation)',
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

      case 'create_agent': {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments')
        }
        const typedArgs = args as Record<string, unknown>
        const createArgs: CreateAgentInput = {
          name: String(typedArgs.name),
          role: String(typedArgs.role),
          systemPrompt: String(typedArgs.systemPrompt),
          model: typedArgs.model ? String(typedArgs.model) : undefined,
          tools: Array.isArray(typedArgs.tools) ? typedArgs.tools.map(String) : undefined,
          maxTokens: typeof typedArgs.maxTokens === 'number' ? typedArgs.maxTokens : undefined,
          temperature:
            typeof typedArgs.temperature === 'number' ? typedArgs.temperature : undefined,
          maxTurns: typeof typedArgs.maxTurns === 'number' ? typedArgs.maxTurns : undefined,
          verbose: typeof typedArgs.verbose === 'boolean' ? typedArgs.verbose : undefined,
        }
        return {
          content: [await handleCreateAgent(createArgs)],
        }
      }

      case 'update_agent': {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments')
        }
        const typedArgs = args as Record<string, unknown>
        const updates: UpdateAgentInput = {}
        if (typedArgs.updates && typeof typedArgs.updates === 'object') {
          const u = typedArgs.updates as Record<string, unknown>
          if (u.name !== undefined) updates.name = String(u.name)
          if (u.role !== undefined) updates.role = String(u.role)
          if (u.systemPrompt !== undefined) updates.systemPrompt = String(u.systemPrompt)
          if (u.model !== undefined) updates.model = String(u.model)
          if (Array.isArray(u.tools)) updates.tools = u.tools.map(String)
          if (typeof u.maxTokens === 'number') updates.maxTokens = u.maxTokens
          if (typeof u.temperature === 'number') updates.temperature = u.temperature
          if (typeof u.maxTurns === 'number') updates.maxTurns = u.maxTurns
          if (typeof u.verbose === 'boolean') updates.verbose = u.verbose
        }
        return {
          content: [await handleUpdateAgent({ id: String(typedArgs.id), updates })],
        }
      }

      case 'delete_agent': {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments')
        }
        const typedArgs = args as Record<string, unknown>
        return {
          content: [await handleDeleteAgent({ id: String(typedArgs.id) })],
        }
      }

      case 'list_agent_configs':
        return {
          content: [await handleListAgentConfigs()],
        }

      case 'get_agent_config': {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments')
        }
        const typedArgs = args as Record<string, unknown>
        return {
          content: [await handleGetAgentConfig({ id: String(typedArgs.id) })],
        }
      }

      // Old mention and batch_messages handlers removed - use invoke instead

      // Project management handlers
      case 'list_projects':
        return {
          content: [await handleListProjects()],
        }

      case 'create_project': {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments')
        }
        const typedArgs = args as Record<string, unknown>
        const createArgs: CreateProjectInput = {
          name: String(typedArgs.name),
          description: String(typedArgs.description),
          workspacePath: String(typedArgs.workspacePath),
          activeAgents: Array.isArray(typedArgs.activeAgents)
            ? typedArgs.activeAgents.map(String)
            : undefined,
          envVars:
            typedArgs.envVars && typeof typedArgs.envVars === 'object'
              ? (typedArgs.envVars as Record<string, string>)
              : undefined,
          disabledTools: Array.isArray(typedArgs.disabledTools)
            ? typedArgs.disabledTools.map(String)
            : undefined,
          mcpServers: Array.isArray(typedArgs.mcpServers)
            ? typedArgs.mcpServers.map(String)
            : undefined,
        }
        return {
          content: [await handleCreateProject(createArgs)],
        }
      }

      case 'update_project': {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments')
        }
        const typedArgs = args as Record<string, unknown>
        const updates: UpdateProjectInput = {}
        if (typedArgs.updates && typeof typedArgs.updates === 'object') {
          const u = typedArgs.updates as Record<string, unknown>
          if (u.name !== undefined) updates.name = String(u.name)
          if (u.description !== undefined) updates.description = String(u.description)
          if (u.workspacePath !== undefined) updates.workspacePath = String(u.workspacePath)
          if (Array.isArray(u.activeAgents)) updates.activeAgents = u.activeAgents.map(String)
          if (u.envVars && typeof u.envVars === 'object')
            updates.envVars = u.envVars as Record<string, string>
          if (Array.isArray(u.disabledTools)) updates.disabledTools = u.disabledTools.map(String)
          if (Array.isArray(u.mcpServers)) updates.mcpServers = u.mcpServers.map(String)
        }
        return {
          content: [await handleUpdateProject({ id: String(typedArgs.id), updates })],
        }
      }

      case 'delete_project': {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments')
        }
        const typedArgs = args as Record<string, unknown>
        return {
          content: [await handleDeleteProject({ id: String(typedArgs.id) })],
        }
      }

      case 'get_project': {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments')
        }
        const typedArgs = args as Record<string, unknown>
        return {
          content: [await handleGetProject({ id: String(typedArgs.id) })],
        }
      }

      case 'assign_role': {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments')
        }
        const typedArgs = args as Record<string, unknown>
        const roleArgs: RoleAssignment = {
          projectId: String(typedArgs.projectId),
          agentId: String(typedArgs.agentId),
          role: String(typedArgs.role),
        }
        return {
          content: [await handleAssignRole(roleArgs)],
        }
      }

      case 'unassign_role': {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments')
        }
        const typedArgs = args as Record<string, unknown>
        return {
          content: [
            await handleUnassignRole({
              projectId: String(typedArgs.projectId),
              agentId: String(typedArgs.agentId),
            }),
          ],
        }
      }

      case 'list_roles': {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments')
        }
        const typedArgs = args as Record<string, unknown>
        return {
          content: [await handleListRoles({ projectId: String(typedArgs.projectId) })],
        }
      }

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
