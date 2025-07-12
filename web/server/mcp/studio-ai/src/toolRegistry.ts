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

    // Workflow Builder Tools
    this.register({
      name: 'list_workflow_node_types',
      description: `List all available node types for workflow building.

WHAT IT DOES:
• Shows all supported workflow node types (task, parallel, conditional)
• Provides description and requirements for each type
• Essential for discovering workflow building capabilities

WHEN TO USE:
• Before creating workflows to understand available node types
• When designing complex workflows with different execution patterns

RETURNS:
• List of node types with descriptions and required/optional fields

EXAMPLE:
list_workflow_node_types()`,
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    })

    this.register({
      name: 'list_available_agents',
      description: `List agents available for workflow steps.

WHAT IT DOES:
• Lists all agent configurations if no projectId provided
• Lists project-specific agents with short IDs if projectId provided
• Shows agent roles, names, and IDs for workflow assignment

WHEN TO USE:
• Before building workflows to see available agents
• To get correct agent IDs for workflow steps

RETURNS:
• Agent configurations or project agents with short IDs

EXAMPLE:
list_available_agents({ projectId: "my-project" })`,
      inputSchema: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: 'Optional project ID to list project-specific agents',
          },
        },
        additionalProperties: false,
      },
    })

    this.register({
      name: 'get_node_schema',
      description: `Get detailed schema for a specific workflow node type.

WHAT IT DOES:
• Returns complete JSON schema for a node type
• Shows all properties, types, and usage examples
• Provides validation requirements

WHEN TO USE:
• When creating nodes of specific types
• To understand node configuration options
• For validation and development guidance

RETURNS:
• Complete schema definition with examples

EXAMPLE:
get_node_schema({ nodeType: "task" })`,
      inputSchema: {
        type: 'object',
        properties: {
          nodeType: {
            type: 'string',
            description: 'Node type to get schema for (e.g., "task", "parallel", "conditional")',
          },
        },
        required: ['nodeType'],
        additionalProperties: false,
      },
    })

    this.register({
      name: 'create_workflow',
      description: `Create a new workflow programmatically.

WHAT IT DOES:
• Creates empty workflow with metadata
• Generates unique workflow ID
• Sets up basic structure for adding steps

WHEN TO USE:
• Starting new workflow creation
• Programmatic workflow generation
• Template-based workflow initialization

RETURNS:
• Created workflow definition ready for steps

EXAMPLE:
create_workflow({ 
  name: "My Workflow", 
  description: "Automated development workflow",
  projectId: "my-project",
  tags: ["development", "automation"]
})`,
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the workflow',
          },
          description: {
            type: 'string',
            description: 'Optional description of the workflow',
          },
          projectId: {
            type: 'string',
            description: 'Project ID where workflow belongs',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional tags for categorization',
          },
        },
        required: ['name', 'projectId'],
        additionalProperties: false,
      },
    })

    this.register({
      name: 'add_workflow_step',
      description: `Add a step to a workflow.

WHAT IT DOES:
• Adds new step to workflow definition
• Auto-generates step ID if not provided
• Supports all node types (task, parallel, conditional)

WHEN TO USE:
• Building workflow step by step
• Adding steps to existing workflows
• Programmatic workflow construction

RETURNS:
• Updated workflow with new step added

EXAMPLE:
add_workflow_step({
  workflow: workflowDefinition,
  step: {
    task: "Review code changes",
    agentId: "reviewer_01",
    deps: ["implementation"]
  }
})`,
      inputSchema: {
        type: 'object',
        properties: {
          workflow: {
            type: 'object',
            description: 'Workflow definition to add step to',
          },
          step: {
            type: 'object',
            description: 'Step definition to add',
            properties: {
              id: { type: 'string' },
              type: { type: 'string' },
              task: { type: 'string' },
              agentId: { type: 'string' },
              role: { type: 'string' },
              deps: { type: 'array', items: { type: 'string' } },
              config: { type: 'object' },
            },
            required: ['task'],
          },
        },
        required: ['workflow', 'step'],
        additionalProperties: false,
      },
    })

    this.register({
      name: 'set_workflow_dependencies',
      description: `Set dependencies for a workflow step.

WHAT IT DOES:
• Sets which steps must complete before this step runs
• Validates dependency step IDs exist
• Checks for circular dependencies

WHEN TO USE:
• Setting up sequential workflow execution
• Creating complex dependency graphs
• Ensuring proper execution order

RETURNS:
• Confirmation of dependencies set

EXAMPLE:
set_workflow_dependencies({
  workflow: workflowDefinition,
  stepId: "testing",
  dependencies: ["implementation", "code_review"]
})`,
      inputSchema: {
        type: 'object',
        properties: {
          workflow: {
            type: 'object',
            description: 'Workflow definition containing the step',
          },
          stepId: {
            type: 'string',
            description: 'ID of step to set dependencies for',
          },
          dependencies: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of step IDs this step depends on',
          },
        },
        required: ['workflow', 'stepId', 'dependencies'],
        additionalProperties: false,
      },
    })

    this.register({
      name: 'validate_workflow',
      description: `Validate workflow structure using the API endpoint.

WHAT IT DOES:
• Validates workflow definition structure
• Checks for circular dependencies
• Verifies agents and roles exist
• Returns detailed errors and warnings

WHEN TO USE:
• Before executing workflows
• During workflow development
• Debugging workflow issues

RETURNS:
• Validation result with errors/warnings

EXAMPLE:
validate_workflow({ workflow: workflowDefinition })`,
      inputSchema: {
        type: 'object',
        properties: {
          workflow: {
            type: 'object',
            description: 'Workflow definition to validate',
          },
        },
        required: ['workflow'],
        additionalProperties: false,
      },
    })

    this.register({
      name: 'execute_workflow',
      description: `Execute a workflow using the API endpoint.

WHAT IT DOES:
• Starts workflow execution
• Returns thread ID for monitoring
• Converts to invoke format internally

WHEN TO USE:
• Running validated workflows
• Starting programmatically created workflows
• Resuming workflows with existing thread ID

RETURNS:
• Execution status and thread ID for monitoring

EXAMPLE:
execute_workflow({
  workflow: workflowDefinition,
  threadId: "optional-resume-id"
})`,
      inputSchema: {
        type: 'object',
        properties: {
          workflow: {
            type: 'object',
            description: 'Workflow definition to execute',
          },
          threadId: {
            type: 'string',
            description: 'Optional thread ID for resuming workflows',
          },
          startNewConversation: {
            type: 'boolean',
            description: 'Force new conversation (default: false)',
          },
        },
        required: ['workflow'],
        additionalProperties: false,
      },
    })

    // Workflow Storage Tools
    this.register({
      name: 'save_workflow',
      description: `Save a workflow definition to persistent storage.

WHAT IT DOES:
• Saves workflow to the database for later use
• Supports different scopes (project, global, cross-project)
• Can save as template for reuse
• Preserves all workflow metadata and steps

WHEN TO USE:
• After creating or modifying a workflow
• To save templates for common patterns
• To share workflows across projects

RETURNS:
• Saved workflow ID and details

EXAMPLE:
save_workflow({
  workflow: workflowDefinition,
  scope: "project",
  projectId: "my-project",
  isTemplate: false
})`,
      inputSchema: {
        type: 'object',
        properties: {
          workflow: {
            type: 'object',
            description: 'The workflow definition to save',
          },
          scope: {
            type: 'string',
            enum: ['project', 'global', 'cross-project'],
            description: 'Scope of the workflow (default: project)',
          },
          projectId: {
            type: 'string',
            description: 'Project ID (required for project scope)',
          },
          isTemplate: {
            type: 'boolean',
            description: 'Save as template (default: false)',
          },
        },
        required: ['workflow'],
        additionalProperties: false,
      },
    })

    this.register({
      name: 'load_workflow',
      description: `Load a saved workflow by ID.

WHAT IT DOES:
• Retrieves workflow definition from storage
• Includes all metadata and steps
• Ready for editing or execution

WHEN TO USE:
• To resume work on a saved workflow
• To execute a previously saved workflow
• To use a template as starting point

RETURNS:
• Complete workflow definition

EXAMPLE:
load_workflow({ workflowId: "wf-123-abc" })`,
      inputSchema: {
        type: 'object',
        properties: {
          workflowId: {
            type: 'string',
            description: 'ID of the workflow to load',
          },
        },
        required: ['workflowId'],
        additionalProperties: false,
      },
    })

    this.register({
      name: 'list_saved_workflows',
      description: `List all saved workflows with filters.

WHAT IT DOES:
• Lists workflows from storage
• Supports filtering by scope and project
• Shows metadata like name, description, steps count

WHEN TO USE:
• To browse available workflows
• To find templates
• To see project-specific workflows

RETURNS:
• Array of workflow summaries

EXAMPLE:
list_saved_workflows({
  projectId: "my-project",
  scope: "project"
})`,
      inputSchema: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: 'Filter by project ID',
          },
          scope: {
            type: 'string',
            enum: ['project', 'global', 'cross-project'],
            description: 'Filter by scope',
          },
          global: {
            type: 'boolean',
            description: 'Include global workflows',
          },
        },
        additionalProperties: false,
      },
    })

    this.register({
      name: 'delete_saved_workflow',
      description: `Delete a saved workflow by ID.

WHAT IT DOES:
• Permanently removes workflow from storage
• Cannot be undone

WHEN TO USE:
• To clean up old workflows
• To remove test workflows

WARNING: This action cannot be undone!

EXAMPLE:
delete_saved_workflow({ workflowId: "wf-123-abc" })`,
      inputSchema: {
        type: 'object',
        properties: {
          workflowId: {
            type: 'string',
            description: 'ID of the workflow to delete',
          },
        },
        required: ['workflowId'],
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
