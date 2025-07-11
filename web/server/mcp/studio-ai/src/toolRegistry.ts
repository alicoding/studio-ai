/**
 * Tool Registry - Single Responsibility: Manage tool definitions
 *
 * This module is responsible for creating and managing all tool definitions
 * following the KISS principle - each tool is a simple configuration object
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js'
import { CapabilityConfig } from './capabilityTools.js'
import { toolPermissionTools } from './toolPermissionTools.js'

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map()

  constructor() {
    this.registerStaticTools()
  }

  /**
   * Register all static tools that don't depend on external data
   */
  private registerStaticTools(): void {
    // Agent Management Tools
    this.register({
      name: 'list_agents',
      description: 'List all available agents in the Claude Studio system',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    })

    this.register({
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

    this.register({
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

    this.register({
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

    this.register({
      name: 'list_agent_configs',
      description: 'List all agent configurations with detailed information',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    })

    this.register({
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

    // Project Management Tools
    this.register({
      name: 'list_projects',
      description: 'List all projects in Claude Studio',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    })

    this.register({
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

    this.register({
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

    this.register({
      name: 'delete_project',
      description: 'Delete a project',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID of the project to delete',
          },
          deleteWorkspace: {
            type: 'boolean',
            description:
              'Whether to also delete the workspace directory (moves to trash). Default: false',
            default: false,
          },
        },
        required: ['id'],
        additionalProperties: false,
      },
    })

    this.register({
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

    // Role Assignment Tools
    this.register({
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

    this.register({
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

    this.register({
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

    // Project Agent Management Tools
    this.register({
      name: 'list_project_agents',
      description:
        'List all agents currently in a project with their short IDs (e.g., dev_01, ux_01). If projectId not provided, uses current working directory.',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: 'ID of the project (optional - uses current directory if not provided)',
          },
        },
        required: [],
        additionalProperties: false,
      },
    })

    this.register({
      name: 'add_agent_to_project',
      description: 'Add a single agent to a project with custom name',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: 'ID of the project (optional - uses current directory if not provided)',
          },
          agentConfigId: {
            type: 'string',
            description: 'ID of the agent configuration to add',
          },
          role: {
            type: 'string',
            description: 'Role for the agent (e.g., developer, tester, reviewer)',
          },
          name: {
            type: 'string',
            description: 'Custom name for the agent instance (optional)',
          },
          customTools: {
            type: 'array',
            items: { type: 'string' },
            description: 'Custom tools for this agent instance (optional)',
          },
        },
        required: ['agentConfigId', 'role'],
        additionalProperties: false,
      },
    })

    this.register({
      name: 'add_team_to_project',
      description: 'Add a team template to a project (batch add agents)',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: 'ID of the project (optional - uses current directory if not provided)',
          },
          teamId: {
            type: 'string',
            description: 'ID of the team template to add',
          },
        },
        required: ['teamId'],
        additionalProperties: false,
      },
    })

    this.register({
      name: 'remove_agent_from_project',
      description: 'Remove an agent from a project',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: 'ID of the project (optional - uses current directory if not provided)',
          },
          agentRole: {
            type: 'string',
            description: 'Role of the agent to remove',
          },
        },
        required: ['agentRole'],
        additionalProperties: false,
      },
    })

    // Capability Tool
    this.register({
      name: 'list_capabilities',
      description: 'List all configured AI capabilities',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    })

    // Workflow Management Tools
    this.register({
      name: 'list_workflows',
      description: `List all workflows in the system.

WHAT IT DOES:
• Shows all workflows with their status, creation time, and basic details
• Helps you see what workflows exist before cleaning up

RETURNS:
• Array of workflows with threadId, status, invocation, lastUpdate

EXAMPLE:
list_workflows()`,
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    })

    this.register({
      name: 'delete_workflow',
      description: `Delete a specific workflow by its thread ID.

WHEN TO USE:
• Remove individual workflows you no longer need
• Clean up specific failed or completed workflows

WARNING: This action cannot be undone!

EXAMPLE:
delete_workflow({ threadId: "abc-123-def-456" })`,
      inputSchema: {
        type: 'object',
        properties: {
          threadId: {
            type: 'string',
            description: 'The thread ID of the workflow to delete',
          },
        },
        required: ['threadId'],
        additionalProperties: false,
      },
    })

    this.register({
      name: 'bulk_delete_workflows',
      description: `Delete multiple workflows at once by providing an array of thread IDs.

WHEN TO USE:
• Clean up multiple specific workflows
• Remove several failed or completed workflows

WARNING: This action cannot be undone!

EXAMPLE:
bulk_delete_workflows({ threadIds: ["abc-123", "def-456", "ghi-789"] })`,
      inputSchema: {
        type: 'object',
        properties: {
          threadIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of thread IDs to delete',
            minItems: 1,
          },
        },
        required: ['threadIds'],
        additionalProperties: false,
      },
    })

    this.register({
      name: 'cleanup_old_workflows',
      description: `Delete all workflows older than the specified number of days.

WHEN TO USE:
• Regular maintenance to free up storage
• Clean up old completed/failed workflows
• Automatic cleanup in scripts

WARNING: This action cannot be undone!

EXAMPLE:
cleanup_old_workflows({ daysOld: 30 })  // Delete workflows older than 30 days`,
      inputSchema: {
        type: 'object',
        properties: {
          daysOld: {
            type: 'number',
            description: 'Delete workflows older than this many days',
            minimum: 1,
          },
        },
        required: ['daysOld'],
        additionalProperties: false,
      },
    })
  }

  /**
   * Register a tool definition
   */
  register(tool: Tool): void {
    this.tools.set(tool.name, tool)
  }

  /**
   * Register tools from external modules
   */
  registerExternalTools(tools: Tool[]): void {
    tools.forEach((tool) => this.register(tool))
  }

  /**
   * Register dynamic capability tools
   */
  registerCapabilityTools(capabilities: Record<string, CapabilityConfig>): void {
    for (const [id, capability] of Object.entries(capabilities)) {
      const model = capability.models?.primary || 'default'
      this.register({
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

    // Tool Permission Tools
    toolPermissionTools.forEach((tool) => {
      this.register(tool as Tool)
    })
  }

  /**
   * Get all registered tools
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values())
  }

  /**
   * Check if a tool exists
   */
  hasTool(name: string): boolean {
    return this.tools.has(name)
  }

  /**
   * Get a specific tool
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name)
  }
}
