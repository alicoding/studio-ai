/**
 * Project Tools Handlers
 *
 * SOLID: Single responsibility - project and role operations
 * KISS: Simple, direct API calls
 * DRY: Reuses existing server patterns
 * Library-First: Uses ky for HTTP requests
 */

import { TextContent } from '@modelcontextprotocol/sdk/types.js'
import ky from 'ky'

// Get API base URL from environment or default
const API_BASE = process.env.CLAUDE_STUDIO_API || 'http://localhost:3456/api'

// Project configuration interfaces matching Studio AI
export interface ProjectConfig {
  id: string
  name: string
  description: string
  workspacePath: string
  createdAt: string | null
  updatedAt: string | null
  settings?: {
    envVars?: Record<string, string>
    disabledTools?: string[]
    mcpServers?: string[]
  }
  // Legacy fields for compatibility
  created?: string
  lastModified?: string
  activeAgents?: string[]
}

export interface CreateProjectInput {
  name: string
  description: string
  workspacePath: string
  activeAgents?: string[]
  envVars?: Record<string, string>
  disabledTools?: string[]
  mcpServers?: string[]
}

export interface UpdateProjectInput {
  name?: string
  description?: string
  workspacePath?: string
  activeAgents?: string[]
  envVars?: Record<string, string>
  disabledTools?: string[]
  mcpServers?: string[]
}

// Role assignment interfaces
export interface RoleAssignment {
  projectId: string
  agentId: string
  role: string
}

export interface ProjectAgent {
  id: string
  configId?: string
  name: string
  role: string
  status: 'online' | 'offline'
  sessionId: string | null
  messageCount: number
  totalTokens: number
  lastMessage: string
  hasSession: boolean
}

export interface ProjectAgentWithShortId {
  shortId: string
  role: string
  agentConfigId: string
  agentConfig?: {
    id: string
    name: string
    role: string
    systemPrompt: string
    tools: string[]
    model: string
    createdAt: string
    updatedAt: string
    usedInProjects?: string[]
  }
  hasSession?: boolean
}

/**
 * List all projects
 *
 * @example
 * {} (no parameters needed)
 */
export async function handleListProjects(): Promise<TextContent> {
  try {
    const response = await ky
      .get(`${API_BASE}/studio-projects`, {
        timeout: 30000,
      })
      .json<{ projects: ProjectConfig[] }>()

    if (response.projects.length === 0) {
      return {
        type: 'text',
        text: 'No projects found.',
      }
    }

    const projectList = response.projects
      .map((project: ProjectConfig) => {
        const agents =
          project.activeAgents && project.activeAgents.length > 0
            ? `\n  Active Agents: ${project.activeAgents.join(', ')}`
            : ''
        const mcpServers =
          project.settings?.mcpServers && project.settings.mcpServers.length > 0
            ? `\n  MCP Servers: ${project.settings.mcpServers.join(', ')}`
            : ''
        const lastModified = project.updatedAt || project.lastModified || 'N/A'
        return `**${project.name}** (${project.id})\n  ${project.description}\n  Path: ${project.workspacePath}${agents}${mcpServers}\n  Last Modified: ${lastModified}`
      })
      .join('\n\n')

    return {
      type: 'text',
      text: `Projects:\n\n${projectList}`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      type: 'text',
      text: `Error listing projects: ${message}`,
    }
  }
}

/**
 * Create a new project
 *
 * @example
 * {
 *   "name": "My AI Project",
 *   "description": "Building an AI-powered application",
 *   "workspacePath": "/Users/me/projects/ai-app",
 *   "activeAgents": ["developer", "tester"],
 *   "envVars": { "API_KEY": "secret" },
 *   "mcpServers": ["filesystem", "github"]
 * }
 */
export async function handleCreateProject(args: CreateProjectInput): Promise<TextContent> {
  try {
    // Validation
    if (!args.name || !args.description || !args.workspacePath) {
      throw new Error('Required fields: name, description, and workspacePath')
    }

    const requestBody = {
      name: args.name,
      description: args.description,
      workspacePath: args.workspacePath,
      activeAgents: args.activeAgents || [],
      settings: {
        envVars: args.envVars || {},
        disabledTools: args.disabledTools || [],
        mcpServers: args.mcpServers || [],
      },
    }

    const project = await ky
      .post(`${API_BASE}/studio-projects`, {
        json: requestBody,
        timeout: 30000,
      })
      .json<ProjectConfig>()

    return {
      type: 'text',
      text: `Successfully created project:\n\nID: ${project.id}\nName: ${project.name}\nDescription: ${project.description}\nPath: ${project.workspacePath}\n\nThe project is now ready for agent assignment.`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      type: 'text',
      text: `Error creating project: ${message}`,
    }
  }
}

/**
 * Update an existing project
 *
 * @example
 * {
 *   "id": "project-123",
 *   "updates": {
 *     "description": "Updated project description",
 *     "activeAgents": ["developer", "reviewer", "tester"]
 *   }
 * }
 */
export async function handleUpdateProject(args: {
  id: string
  updates: UpdateProjectInput
}): Promise<TextContent> {
  try {
    if (!args.id) {
      throw new Error('Project ID is required')
    }

    if (!args.updates || Object.keys(args.updates).length === 0) {
      throw new Error('No updates provided')
    }

    // Transform updates to match API structure if needed
    interface UpdateRequestBody {
      name?: string
      description?: string
      workspacePath?: string
      activeAgents?: string[]
      settings?: {
        envVars?: Record<string, string>
        disabledTools?: string[]
        mcpServers?: string[]
      }
    }
    const requestBody: UpdateRequestBody = {}

    if (args.updates.name !== undefined) requestBody.name = args.updates.name
    if (args.updates.description !== undefined) requestBody.description = args.updates.description
    if (args.updates.workspacePath !== undefined)
      requestBody.workspacePath = args.updates.workspacePath
    if (args.updates.activeAgents !== undefined)
      requestBody.activeAgents = args.updates.activeAgents

    // Handle settings separately
    if (
      args.updates.envVars !== undefined ||
      args.updates.disabledTools !== undefined ||
      args.updates.mcpServers !== undefined
    ) {
      requestBody.settings = {
        ...(args.updates.envVars !== undefined && { envVars: args.updates.envVars }),
        ...(args.updates.disabledTools !== undefined && {
          disabledTools: args.updates.disabledTools,
        }),
        ...(args.updates.mcpServers !== undefined && { mcpServers: args.updates.mcpServers }),
      }
    }

    const project = await ky
      .put(`${API_BASE}/studio-projects/${args.id}`, {
        json: requestBody,
        timeout: 30000,
      })
      .json<ProjectConfig>()

    const updatedFields = Object.keys(args.updates)
      .map(
        (field) => `- ${field}: ${JSON.stringify(args.updates[field as keyof UpdateProjectInput])}`
      )
      .join('\n')

    return {
      type: 'text',
      text: `Successfully updated project ${project.name} (${project.id}):\n\nUpdated fields:\n${updatedFields}`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      type: 'text',
      text: `Error updating project: ${message}`,
    }
  }
}

/**
 * Delete a project
 *
 * @example
 * { "id": "project-123" }
 */
export async function handleDeleteProject(args: {
  id: string
  deleteWorkspace?: boolean
}): Promise<TextContent> {
  try {
    if (!args.id) {
      throw new Error('Project ID is required')
    }

    // First get the project to show details before deletion
    let projectName = args.id
    try {
      const project = await ky
        .get(`${API_BASE}/studio-projects/${args.id}`, {
          timeout: 30000,
        })
        .json<ProjectConfig>()
      projectName = project.name
    } catch (_) {
      // If we can't get the project, continue with deletion anyway
    }

    const url = args.deleteWorkspace
      ? `${API_BASE}/studio-projects/${args.id}?deleteWorkspace=true`
      : `${API_BASE}/studio-projects/${args.id}`

    await ky.delete(url, {
      timeout: 30000,
    })

    return {
      type: 'text',
      text: args.deleteWorkspace
        ? `Successfully deleted project ${projectName} (${args.id}) and moved workspace to trash`
        : `Successfully deleted project ${projectName} (${args.id}) from Studio AI`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      type: 'text',
      text: `Error deleting project: ${message}`,
    }
  }
}

/**
 * Get a specific project
 *
 * @example
 * { "id": "project-123" }
 */
export async function handleGetProject(args: { id: string }): Promise<TextContent> {
  try {
    if (!args.id) {
      throw new Error('Project ID is required')
    }

    const project = await ky
      .get(`${API_BASE}/studio-projects/${args.id}`, {
        timeout: 30000,
      })
      .json<ProjectConfig>()

    const activeAgents =
      project.activeAgents && project.activeAgents.length > 0
        ? `\nActive Agents: ${project.activeAgents.join(', ')}`
        : '\nActive Agents: None'

    const envVars =
      project.settings?.envVars && Object.keys(project.settings.envVars).length > 0
        ? `\nEnvironment Variables:\n${Object.entries(project.settings.envVars)
            .map(([key, value]) => `  ${key}: ${value}`)
            .join('\n')}`
        : ''

    const disabledTools =
      project.settings?.disabledTools && project.settings.disabledTools.length > 0
        ? `\nDisabled Tools: ${project.settings.disabledTools.join(', ')}`
        : ''

    const mcpServers =
      project.settings?.mcpServers && project.settings.mcpServers.length > 0
        ? `\nMCP Servers: ${project.settings.mcpServers.join(', ')}`
        : ''

    const details = `Project: ${project.name}\n\nID: ${project.id}\nDescription: ${project.description}\nWorkspace Path: ${project.workspacePath}\nCreated: ${project.created}\nLast Modified: ${project.lastModified}${activeAgents}${envVars}${disabledTools}${mcpServers}`

    return {
      type: 'text',
      text: details,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      type: 'text',
      text: `Error getting project: ${message}`,
    }
  }
}

/**
 * Assign an agent to a project with a specific role
 *
 * @example
 * {
 *   "projectId": "project-123",
 *   "agentId": "agent-456",
 *   "role": "developer"
 * }
 */
export async function handleAssignRole(args: RoleAssignment): Promise<TextContent> {
  try {
    if (!args.projectId || !args.agentId || !args.role) {
      throw new Error('Required fields: projectId, agentId, and role')
    }

    // Get current project to update active agents
    const project = await ky
      .get(`${API_BASE}/projects/${args.projectId}`, {
        timeout: 30000,
      })
      .json<ProjectConfig>()

    // Add agent to active agents if not already present
    const activeAgents = new Set(project.activeAgents)
    activeAgents.add(args.agentId)

    // Update project with new active agents
    await ky.put(`${API_BASE}/projects/${args.projectId}`, {
      json: {
        activeAgents: Array.from(activeAgents),
      },
      timeout: 30000,
    })

    // Also update the agent's role if needed
    await ky.put(`${API_BASE}/agents/${args.agentId}`, {
      json: {
        role: args.role,
      },
      timeout: 30000,
    })

    return {
      type: 'text',
      text: `Successfully assigned agent ${args.agentId} to project ${project.name} with role: ${args.role}`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      type: 'text',
      text: `Error assigning role: ${message}`,
    }
  }
}

/**
 * Remove an agent from a project
 *
 * @example
 * {
 *   "projectId": "project-123",
 *   "agentId": "agent-456"
 * }
 */
export async function handleUnassignRole(args: {
  projectId: string
  agentId: string
}): Promise<TextContent> {
  try {
    if (!args.projectId || !args.agentId) {
      throw new Error('Required fields: projectId and agentId')
    }

    // Get current project to update active agents
    const project = await ky
      .get(`${API_BASE}/projects/${args.projectId}`, {
        timeout: 30000,
      })
      .json<ProjectConfig>()

    // Remove agent from active agents
    const activeAgents = (project.activeAgents || []).filter((id) => id !== args.agentId)

    // Update project
    await ky.put(`${API_BASE}/projects/${args.projectId}`, {
      json: {
        activeAgents,
      },
      timeout: 30000,
    })

    return {
      type: 'text',
      text: `Successfully removed agent ${args.agentId} from project ${project.name}`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      type: 'text',
      text: `Error unassigning role: ${message}`,
    }
  }
}

/**
 * List all role assignments for a project
 *
 * @example
 * { "projectId": "project-123" }
 */
export async function handleListRoles(args: { projectId: string }): Promise<TextContent> {
  try {
    if (!args.projectId) {
      throw new Error('Project ID is required')
    }

    // Get project with active agents
    const project = await ky
      .get(`${API_BASE}/projects/${args.projectId}`, {
        timeout: 30000,
      })
      .json<ProjectConfig>()

    if (!project.activeAgents || project.activeAgents.length === 0) {
      return {
        type: 'text',
        text: `No agents assigned to project ${project.name}`,
      }
    }

    // Get details for each agent
    const agentDetails = await Promise.all(
      project.activeAgents.map(async (agentId) => {
        try {
          const agent = await ky
            .get(`${API_BASE}/agents/${agentId}`, {
              timeout: 30000,
            })
            .json<{ id: string; name: string; role: string }>()
          return `- ${agent.name} (${agent.id}): ${agent.role}`
        } catch {
          return `- ${agentId}: (agent not found)`
        }
      })
    )

    return {
      type: 'text',
      text: `Agents assigned to project ${project.name}:\n\n${agentDetails.join('\n')}`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      type: 'text',
      text: `Error listing roles: ${message}`,
    }
  }
}

/**
 * List agents in a project with their short IDs
 *
 * @example
 * { "projectId": "studio-project-123" }
 * or
 * {} // Uses project ID from environment context
 */
export async function handleListProjectAgents(args: { projectId?: string }): Promise<TextContent> {
  try {
    // Use project ID from args or environment context
    const projectId = args.projectId || process.env.CLAUDE_STUDIO_PROJECT_ID

    if (!projectId) {
      return {
        type: 'text',
        text: 'Error: No project ID provided and no Studio project context found.\n\nPlease provide a projectId or ensure you are running within a Studio project context.',
      }
    }

    // Get the caller's agent ID if available
    const callerId = process.env.CLAUDE_STUDIO_AGENT_ID

    // Get project agents from the API
    const response = await ky
      .get(`${API_BASE}/studio-projects/${encodeURIComponent(projectId)}/agents/short-ids`, {
        timeout: 30000,
      })
      .json<{ agents: ProjectAgentWithShortId[] }>()

    if (!response.agents || response.agents.length === 0) {
      return {
        type: 'text',
        text: `No agents found in project ${projectId}.\n\nUse 'add_agent_to_project' or 'add_team_to_project' to add agents.`,
      }
    }

    // Create agent list with short IDs
    const agentList: string[] = []
    response.agents.forEach((agent) => {
      const status = agent.hasSession ? '✓' : '○'
      const name = agent.agentConfig?.name || 'Unknown'
      const shortId = agent.shortId || `${agent.role}_01`
      agentList.push(`- ${name} (${shortId}) - Role: ${agent.role} ${status}`)
    })

    const header = `Project agents for ${projectId}:`
    const footer = '\n\n✓ = Has active session, ○ = No session yet'
    const callerInfo = callerId ? `\n(Called by: ${callerId})` : ''

    return {
      type: 'text',
      text: `${header}${callerInfo}\n\n${agentList.join('\n')}${footer}`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      type: 'text',
      text: `Error listing project agents: ${message}`,
    }
  }
}

/**
 * Add a single agent to a project with custom name
 *
 * @example
 * {
 *   "projectId": "studio-project-123",
 *   "agentConfigId": "dev-1751310141224",
 *   "role": "developer",
 *   "name": "Senior Developer"
 * }
 * or
 * {
 *   "agentConfigId": "dev-1751310141224",
 *   "role": "developer",
 *   "name": "Senior Developer"
 * } // Uses project ID from environment context
 */
export async function handleAddAgentToProject(args: {
  projectId?: string
  agentConfigId: string
  role: string
  name?: string
  customTools?: string[]
}): Promise<TextContent> {
  try {
    // Use project ID from args or environment context
    const projectId = args.projectId || process.env.CLAUDE_STUDIO_PROJECT_ID

    if (!projectId) {
      return {
        type: 'text',
        text: 'Error: No project ID provided and no Studio project context found.\n\nPlease provide a projectId or ensure you are running within a Studio project context.',
      }
    }

    if (!args.agentConfigId || !args.role) {
      throw new Error('Required fields: agentConfigId and role')
    }

    // Get the caller's agent ID if available
    const callerId = process.env.CLAUDE_STUDIO_AGENT_ID

    // Add agent to project using studio-projects API
    const response = await ky
      .post(`${API_BASE}/studio-projects/${encodeURIComponent(projectId)}/agents`, {
        json: {
          agentConfigId: args.agentConfigId,
          role: args.role,
          name: args.name,
          customTools: args.customTools,
        },
        timeout: 30000,
      })
      .json<{ id: string; name: string; description: string }>()

    const callerInfo = callerId ? `\n(Called by: ${callerId})` : ''

    return {
      type: 'text',
      text: `Successfully added agent to project ${response.name}:${callerInfo}\n\n- Agent Config: ${args.agentConfigId}\n- Role: ${args.role}\n- Name: ${args.name || 'Default name'}\n\nUse 'list_project_agents' to see all agents with their short IDs.`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      type: 'text',
      text: `Error adding agent to project: ${message}`,
    }
  }
}

/**
 * Add a team template to a project (batch add agents)
 *
 * @example
 * {
 *   "projectId": "studio-project-123",
 *   "teamId": "team_1751455976208"
 * }
 * or
 * {
 *   "teamId": "team_1751455976208"
 * } // Uses project ID from environment context
 */
export async function handleAddTeamToProject(args: {
  projectId?: string
  teamId: string
}): Promise<TextContent> {
  try {
    // Use project ID from args or environment context
    const projectId = args.projectId || process.env.CLAUDE_STUDIO_PROJECT_ID

    if (!projectId) {
      return {
        type: 'text',
        text: 'Error: No project ID provided and no Studio project context found.\n\nPlease provide a projectId or ensure you are running within a Studio project context.',
      }
    }

    if (!args.teamId) {
      throw new Error('Required field: teamId')
    }

    // Get the caller's agent ID if available
    const callerId = process.env.CLAUDE_STUDIO_AGENT_ID

    // First, get the team template
    const teams = await ky
      .get(`${API_BASE}/teams`, {
        timeout: 30000,
      })
      .json<
        Array<{
          id: string
          name: string
          description: string
          agents: Array<{
            role: string
            name: string
            configId: string
            customizations?: Record<string, unknown>
          }>
        }>
      >()

    const team = teams.find((t) => t.id === args.teamId)
    if (!team) {
      return {
        type: 'text',
        text: `Error: Team template ${args.teamId} not found.\n\nUse the teams API to see available team templates.`,
      }
    }

    if (team.agents.length === 0) {
      return {
        type: 'text',
        text: `Error: Team template ${team.name} has no agents defined.`,
      }
    }

    // Add each agent from the team to the project
    const results: string[] = []
    for (const agent of team.agents) {
      try {
        await ky.post(`${API_BASE}/studio-projects/${encodeURIComponent(projectId)}/agents`, {
          json: {
            agentConfigId: agent.configId,
            role: agent.role,
            name: agent.name,
            customTools: agent.customizations?.customTools as string[] | undefined,
          },
          timeout: 30000,
        })
        results.push(`✓ ${agent.name} (${agent.role})`)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        results.push(`✗ ${agent.name} (${agent.role}) - ${message}`)
      }
    }

    const callerInfo = callerId ? `\n(Called by: ${callerId})` : ''

    return {
      type: 'text',
      text: `Added team "${team.name}" to project:${callerInfo}\n\n${results.join('\n')}\n\nUse 'list_project_agents' to see all agents with their short IDs.`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      type: 'text',
      text: `Error adding team to project: ${message}`,
    }
  }
}

/**
 * Remove an agent from a project
 *
 * @example
 * {
 *   "projectId": "studio-project-123",
 *   "agentRole": "developer"
 * }
 * or
 * {
 *   "agentRole": "developer"
 * } // Uses project ID from environment context
 */
export async function handleRemoveAgentFromProject(args: {
  projectId?: string
  agentRole: string
}): Promise<TextContent> {
  try {
    // Use project ID from args or environment context
    const projectId = args.projectId || process.env.CLAUDE_STUDIO_PROJECT_ID

    if (!projectId) {
      return {
        type: 'text',
        text: 'Error: No project ID provided and no Studio project context found.\n\nPlease provide a projectId or ensure you are running within a Studio project context.',
      }
    }

    if (!args.agentRole) {
      throw new Error('Required field: agentRole')
    }

    // Get the caller's agent ID if available
    const callerId = process.env.CLAUDE_STUDIO_AGENT_ID

    // Remove agent from project using studio-projects API
    const response = await ky
      .delete(
        `${API_BASE}/studio-projects/${encodeURIComponent(projectId)}/agents/${encodeURIComponent(args.agentRole)}`,
        {
          timeout: 30000,
        }
      )
      .json<{ id: string; name: string; description: string }>()

    const callerInfo = callerId ? `\n(Called by: ${callerId})` : ''

    return {
      type: 'text',
      text: `Successfully removed agent with role "${args.agentRole}" from project ${response.name}${callerInfo}\n\nUse 'list_project_agents' to see remaining agents.`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      type: 'text',
      text: `Error removing agent from project: ${message}`,
    }
  }
}
