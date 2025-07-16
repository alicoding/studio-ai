/**
 * MCP Configuration Tools
 *
 * SOLID: Single responsibility - MCP server configuration
 * DRY: Reuses existing API patterns
 * KISS: Simple tool wrappers around API
 * Type-safe: Full TypeScript types
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js'
import ky from 'ky'

const API_URL = process.env.CLAUDE_STUDIO_API || 'http://localhost:3456/api'

// Template variables that can be used in MCP server ENV configuration
export const TEMPLATE_VARIABLES = {
  PROJECT_ID: 'Current project ID',
  PROJECT_NAME: 'Current project name',
  PROJECT_PATH: 'Current project workspace path',
  AGENT_ID: 'Current agent ID',
  AGENT_ROLE: 'Current agent role',
  SESSION_ID: 'Current session ID',
  CLAUDE_STUDIO_API: 'Studio AI API base URL',
  CLAUDE_STUDIO_PROJECT_ID: 'Active project ID (legacy compatibility)',
}

interface MCPServer {
  id: string
  name: string
  command: string
  args: string[]
  env: Record<string, string>
  enabled: boolean
}

interface MCPServerInput {
  name: string
  command: string
  args?: string[]
  env?: Record<string, string>
  enabled?: boolean
}

/**
 * Tool: list_mcp_servers
 * List all configured MCP servers
 */
export const listMCPServersTool: Tool = {
  name: 'list_mcp_servers',
  description: `List all configured MCP servers in Studio AI.

Shows server configurations including:
• Name and command
• Arguments and environment variables
• Enabled/disabled status
• Available template variables

Template variables you can use in ENV:
${Object.entries(TEMPLATE_VARIABLES)
  .map(([key, desc]) => `• {${key}} - ${desc}`)
  .join('\n')}`,
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

export async function handleListMCPServers(): Promise<{ type: 'text'; text: string }> {
  try {
    const response = await ky.get(`${API_URL}/settings/mcp`).json<{ servers: MCPServer[] }>()

    if (!response.servers || response.servers.length === 0) {
      return {
        type: 'text',
        text: 'No MCP servers configured yet.\n\nUse add_mcp_server to configure new servers.',
      }
    }

    const serverList = response.servers
      .map((server) => {
        const envVars = Object.entries(server.env || {})
          .map(([key, value]) => `    ${key}: ${value}`)
          .join('\n')

        return `${server.enabled ? '✓' : '✗'} ${server.name} (${server.id})
  Command: ${server.command}
  Args: ${server.args.length > 0 ? server.args.join(' ') : '(none)'}
  ENV: ${envVars || '(none)'}
  Status: ${server.enabled ? 'Enabled' : 'Disabled'}`
      })
      .join('\n\n')

    const templateHelp = `
Available template variables for ENV:
${Object.entries(TEMPLATE_VARIABLES)
  .map(([key, desc]) => `• {${key}} - ${desc}`)
  .join('\n')}`

    return {
      type: 'text',
      text: `MCP Servers:\n\n${serverList}\n${templateHelp}`,
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to list MCP servers: ${error.message}`)
    }
    throw error
  }
}

/**
 * Tool: add_mcp_server
 * Add a new MCP server configuration
 */
export const addMCPServerTool: Tool = {
  name: 'add_mcp_server',
  description: `Add a new MCP server configuration to Studio AI.

Example for studio-ai server:
add_mcp_server({
  name: "studio-ai",
  command: "node",
  args: ["/path/to/studio-ai/dist/index.js"],
  env: {
    "CLAUDE_STUDIO_API": "{CLAUDE_STUDIO_API}",
    "CLAUDE_STUDIO_PROJECT_ID": "{PROJECT_ID}"
  }
})

Available template variables for ENV:
${Object.entries(TEMPLATE_VARIABLES)
  .map(([key, desc]) => `• {${key}} - ${desc}`)
  .join('\n')}`,
  inputSchema: {
    type: 'object',
    required: ['name', 'command'],
    properties: {
      name: {
        type: 'string',
        description: 'Unique name for the MCP server',
      },
      command: {
        type: 'string',
        description: 'Command to execute (e.g., "node", "python")',
      },
      args: {
        type: 'array',
        items: { type: 'string' },
        description: 'Command arguments',
      },
      env: {
        type: 'object',
        description: 'Environment variables (supports template variables like {PROJECT_ID})',
        additionalProperties: { type: 'string' },
      },
      enabled: {
        type: 'boolean',
        description: 'Whether to enable the server immediately (default: true)',
      },
    },
    additionalProperties: false,
  },
}

export async function handleAddMCPServer(args: unknown): Promise<{ type: 'text'; text: string }> {
  const input = args as MCPServerInput

  try {
    const newServer = await ky
      .post(`${API_URL}/settings/mcp/servers`, { json: input })
      .json<MCPServer>()

    const envDisplay = Object.entries(newServer.env || {})
      .map(([key, value]) => `  ${key}: ${value}`)
      .join('\n')

    return {
      type: 'text',
      text: `Successfully added MCP server:

Name: ${newServer.name}
ID: ${newServer.id}
Command: ${newServer.command} ${newServer.args.join(' ')}
ENV:
${envDisplay || '  (none)'}
Status: ${newServer.enabled ? 'Enabled' : 'Disabled'}

The server configuration has been saved. ${newServer.enabled ? 'It will be available when Claude Code is restarted with MCP support.' : 'Enable it when ready to use.'}`,
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to add MCP server: ${error.message}`)
    }
    throw error
  }
}

/**
 * Tool: update_mcp_server
 * Update an existing MCP server configuration
 */
export const updateMCPServerTool: Tool = {
  name: 'update_mcp_server',
  description: `Update an existing MCP server configuration.

You can update any field including ENV variables with template support.

Available template variables:
${Object.entries(TEMPLATE_VARIABLES)
  .map(([key, desc]) => `• {{${key}}} - ${desc}`)
  .join('\n')}`,
  inputSchema: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        description: 'ID of the MCP server to update',
      },
      name: {
        type: 'string',
        description: 'New name for the server',
      },
      command: {
        type: 'string',
        description: 'New command',
      },
      args: {
        type: 'array',
        items: { type: 'string' },
        description: 'New command arguments',
      },
      env: {
        type: 'object',
        description: 'New environment variables (supports templates)',
        additionalProperties: { type: 'string' },
      },
      enabled: {
        type: 'boolean',
        description: 'Enable or disable the server',
      },
    },
    additionalProperties: false,
  },
}

export async function handleUpdateMCPServer(
  args: unknown
): Promise<{ type: 'text'; text: string }> {
  const { id, ...updates } = args as { id: string } & Partial<MCPServerInput>

  try {
    const updatedServer = await ky
      .put(`${API_URL}/settings/mcp/servers/${id}`, { json: updates })
      .json<MCPServer>()

    return {
      type: 'text',
      text: `Successfully updated MCP server ${updatedServer.name}`,
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to update MCP server: ${error.message}`)
    }
    throw error
  }
}

/**
 * Tool: delete_mcp_server
 * Delete an MCP server configuration
 */
export const deleteMCPServerTool: Tool = {
  name: 'delete_mcp_server',
  description: 'Delete an MCP server configuration from Studio AI.',
  inputSchema: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        description: 'ID of the MCP server to delete',
      },
    },
    additionalProperties: false,
  },
}

export async function handleDeleteMCPServer(
  args: unknown
): Promise<{ type: 'text'; text: string }> {
  const { id } = args as { id: string }

  try {
    await ky.delete(`${API_URL}/settings/mcp/servers/${id}`)

    return {
      type: 'text',
      text: 'Successfully deleted MCP server configuration',
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to delete MCP server: ${error.message}`)
    }
    throw error
  }
}

/**
 * Tool: get_mcp_config
 * Get the current MCP configuration in Claude Code format
 */
export const getMCPConfigTool: Tool = {
  name: 'get_mcp_config',
  description: `Get the current MCP configuration in Claude Code format.

This shows the configuration that would be used when launching Claude Code with MCP support.
Only enabled servers are included.`,
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

export async function handleGetMCPConfig(): Promise<{ type: 'text'; text: string }> {
  try {
    const config = await ky.get(`${API_URL}/settings/mcp/config`).json<{
      mcpServers: Record<
        string,
        {
          command: string
          args: string[]
          env?: Record<string, string>
        }
      >
    }>()

    if (Object.keys(config.mcpServers).length === 0) {
      return {
        type: 'text',
        text: 'No enabled MCP servers found.\n\nEnable servers using update_mcp_server or add new ones with add_mcp_server.',
      }
    }

    return {
      type: 'text',
      text: `Current MCP configuration (Claude Code format):

\`\`\`json
${JSON.stringify(config, null, 2)}
\`\`\`

This configuration will be used when launching Claude Code with MCP support.
Template variables like {PROJECT_ID} will be resolved at runtime.`,
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get MCP config: ${error.message}`)
    }
    throw error
  }
}
