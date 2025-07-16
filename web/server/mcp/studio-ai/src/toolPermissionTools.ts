/**
 * Tool Permission MCP Tools
 *
 * SOLID: Single responsibility - Tool permission management
 * DRY: Reuses API endpoints
 * KISS: Simple interface for tool permission operations
 */

import ky from 'ky'

// Define ToolPermission locally to avoid rootDir issues
export interface ToolPermission {
  name: string
  enabled: boolean
  restrictions?: {
    paths?: string[]
    excludePaths?: string[]
    readOnly?: boolean
    commands?: string[]
    blockedCommands?: string[]
    sudo?: boolean
    domains?: string[]
    blockedDomains?: string[]
    servers?: string[]
    operations?: string[]
  }
  metadata?: {
    description?: string
    addedBy?: string
    addedAt?: string
  }
}

const API_BASE = process.env.STUDIO_AI_API || 'http://localhost:3456/api'

export interface ToolPermissionPreset {
  name: string
  description: string
  categories: Record<string, unknown>
}

export async function handleGetToolPermissionPresets(): Promise<{
  presets: Record<string, ToolPermissionPreset>
}> {
  const response = await ky.get(`${API_BASE}/tool-permissions/presets`).json<{
    presets: Record<string, ToolPermissionPreset>
  }>()
  return response
}

export async function handleGetAgentToolPermissions(args: { agentId: string }): Promise<{
  agentId: string
  permissions: ToolPermission[]
  enabledTools: string[]
}> {
  if (!args.agentId) {
    throw new Error('agentId is required')
  }

  const response = await ky.get(`${API_BASE}/tool-permissions/agents/${args.agentId}`).json<{
    agentId: string
    permissions: ToolPermission[]
    enabledTools: string[]
  }>()

  return response
}

export async function handleUpdateAgentToolPermissions(args: {
  agentId: string
  permissions: ToolPermission[]
}): Promise<{
  agentId: string
  permissions: ToolPermission[]
  enabledTools: string[]
}> {
  if (!args.agentId || !args.permissions) {
    throw new Error('agentId and permissions are required')
  }

  const response = await ky
    .put(`${API_BASE}/tool-permissions/agents/${args.agentId}`, {
      json: { permissions: args.permissions },
    })
    .json<{
      agentId: string
      permissions: ToolPermission[]
      enabledTools: string[]
    }>()

  return response
}

export async function handleApplyToolPermissionPreset(args: {
  agentId: string
  presetName: string
}): Promise<{
  agentId: string
  presetName: string
  permissions: ToolPermission[]
  enabledTools: string[]
}> {
  if (!args.agentId || !args.presetName) {
    throw new Error('agentId and presetName are required')
  }

  const response = await ky
    .post(`${API_BASE}/tool-permissions/agents/${args.agentId}/preset`, {
      json: { presetName: args.presetName },
    })
    .json<{
      agentId: string
      presetName: string
      permissions: ToolPermission[]
      enabledTools: string[]
    }>()

  return response
}

export async function handleGetProjectAgentPermissions(args: {
  projectId: string
  role: string
}): Promise<{
  projectId: string
  role: string
  permissions: ToolPermission[]
  enabledTools: string[]
}> {
  if (!args.projectId || !args.role) {
    throw new Error('projectId and role are required')
  }

  const response = await ky
    .get(`${API_BASE}/tool-permissions/projects/${args.projectId}/agents/${args.role}`)
    .json<{
      projectId: string
      role: string
      permissions: ToolPermission[]
      enabledTools: string[]
    }>()

  return response
}

export async function handleValidateToolUsage(args: {
  toolName: string
  args: Record<string, unknown>
  permissions: ToolPermission[]
}): Promise<{
  allowed: boolean
  reason?: string
}> {
  if (!args.toolName || !args.permissions) {
    throw new Error('toolName and permissions are required')
  }

  const response = await ky
    .post(`${API_BASE}/tool-permissions/validate`, {
      json: {
        toolName: args.toolName,
        args: args.args || {},
        permissions: args.permissions,
      },
    })
    .json<{
      allowed: boolean
      reason?: string
    }>()

  return response
}

export async function handleListAllTools(): Promise<{
  tools: Array<{
    name: string
    category: string
    description: string
  }>
}> {
  // Define all available tools by category (using actual Claude Code tool names)
  const allTools = [
    // CORE TOOLS
    { name: 'Task', category: 'CORE', description: 'Launch agents to perform tasks' },
    { name: 'Bash', category: 'EXECUTION', description: 'Execute bash commands' },
    { name: 'Glob', category: 'FILE_SYSTEM', description: 'Find files by pattern matching' },
    { name: 'Grep', category: 'SEARCH', description: 'Search file contents with regex' },
    { name: 'LS', category: 'FILE_SYSTEM', description: 'List directory contents' },
    { name: 'exit_plan_mode', category: 'PLANNING', description: 'Exit planning mode' },
    { name: 'Read', category: 'FILE_SYSTEM', description: 'Read files from filesystem' },
    { name: 'Edit', category: 'FILE_SYSTEM', description: 'Edit existing files' },
    { name: 'MultiEdit', category: 'FILE_SYSTEM', description: 'Make multiple edits to a file' },
    { name: 'Write', category: 'FILE_SYSTEM', description: 'Write files to filesystem' },
    { name: 'NotebookRead', category: 'FILE_SYSTEM', description: 'Read Jupyter notebooks' },
    { name: 'NotebookEdit', category: 'FILE_SYSTEM', description: 'Edit Jupyter notebooks' },
    { name: 'WebFetch', category: 'WEB', description: 'Fetch content from URLs' },
    { name: 'WebSearch', category: 'WEB', description: 'Search the web' },
    { name: 'TodoWrite', category: 'PLANNING', description: 'Manage todo lists' },

    // MCP TOOLS (examples from the list you showed)
    {
      name: 'mcp__mcp-server-firecrawl__firecrawl_scrape',
      category: 'MCP',
      description: 'Scrape web content',
    },
    {
      name: 'mcp__taskmaster-ai__get_tasks',
      category: 'MCP',
      description: 'Get task management data',
    },
    {
      name: 'mcp__studio-ai__invoke',
      category: 'MCP',
      description: 'Multi-agent workflow coordination',
    },
    { name: 'mcp__studio-ai__list_agents', category: 'MCP', description: 'List available agents' },
    {
      name: 'mcp__playwright__browser_navigate',
      category: 'MCP',
      description: 'Browser automation',
    },
    { name: 'mcp__screen-pilot__see_screen', category: 'MCP', description: 'Screen interaction' },
    { name: 'ListMcpResourcesTool', category: 'MCP', description: 'List MCP resources' },
    { name: 'ReadMcpResourceTool', category: 'MCP', description: 'Read MCP resources' },
  ]

  return { tools: allTools }
}

// Tool definitions for MCP
export const toolPermissionTools = [
  {
    name: 'list_all_tools',
    description: 'List all available tools with categories and descriptions',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_tool_permission_presets',
    description: 'Get all available tool permission presets',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_agent_tool_permissions',
    description: 'Get tool permissions for a specific agent',
    inputSchema: {
      type: 'object' as const,
      properties: {
        agentId: {
          type: 'string',
          description: 'ID of the agent',
        },
      },
      required: ['agentId'],
    },
  },
  {
    name: 'update_agent_tool_permissions',
    description: 'Update tool permissions for an agent',
    inputSchema: {
      type: 'object' as const,
      properties: {
        agentId: {
          type: 'string',
          description: 'ID of the agent',
        },
        permissions: {
          type: 'array',
          description: 'Array of tool permissions',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              enabled: { type: 'boolean' },
              restrictions: { type: 'object' },
              metadata: { type: 'object' },
            },
            required: ['name', 'enabled'],
          },
        },
      },
      required: ['agentId', 'permissions'],
    },
  },
  {
    name: 'apply_tool_permission_preset',
    description: 'Apply a permission preset to an agent',
    inputSchema: {
      type: 'object' as const,
      properties: {
        agentId: {
          type: 'string',
          description: 'ID of the agent',
        },
        presetName: {
          type: 'string',
          description: 'Name of the preset to apply (e.g., "developer", "architect", "reviewer")',
        },
      },
      required: ['agentId', 'presetName'],
    },
  },
  {
    name: 'get_project_agent_permissions',
    description: 'Get effective tool permissions for an agent in a project',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: {
          type: 'string',
          description: 'ID of the project',
        },
        role: {
          type: 'string',
          description: 'Role of the agent in the project',
        },
      },
      required: ['projectId', 'role'],
    },
  },
  {
    name: 'validate_tool_usage',
    description: 'Validate if a tool can be used with given arguments and permissions',
    inputSchema: {
      type: 'object' as const,
      properties: {
        toolName: {
          type: 'string',
          description: 'Name of the tool to validate',
        },
        args: {
          type: 'object',
          description: 'Arguments for the tool',
          additionalProperties: true,
        },
        permissions: {
          type: 'array',
          description: 'Tool permissions to validate against',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              enabled: { type: 'boolean' },
              restrictions: { type: 'object' },
              metadata: { type: 'object' },
            },
            required: ['name', 'enabled'],
          },
        },
      },
      required: ['toolName', 'permissions'],
    },
  },
]
