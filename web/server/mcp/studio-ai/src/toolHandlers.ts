/**
 * Tool Handlers - Single Responsibility: Map tool names to their handler functions
 *
 * This module follows DRY principle by centralizing all tool handler mappings
 * Each handler import has single responsibility for its domain
 */

import { TextContent } from '@modelcontextprotocol/sdk/types.js'
import {
  handleListAgents,
  handleCreateAgent,
  handleUpdateAgent,
  handleDeleteAgent,
  handleListAgentConfigs,
  handleGetAgentConfig,
  CreateAgentInput,
  UpdateAgentInput,
} from './agentTools.js'
import {
  handleInvoke,
  handleGetRoles,
  handleInvokeAsync,
  handleInvokeStatus,
  handleListWorkflows,
  handleDeleteWorkflow,
  handleBulkDeleteWorkflows,
  handleCleanupOldWorkflows,
} from './invokeTools.js'
import {
  handleListProjects,
  handleCreateProject,
  handleUpdateProject,
  handleDeleteProject,
  handleGetProject,
  handleAssignRole,
  handleUnassignRole,
  handleListRoles,
  handleListProjectAgents,
  handleAddAgentToProject,
  handleAddTeamToProject,
  handleRemoveAgentFromProject,
  CreateProjectInput,
  UpdateProjectInput,
  RoleAssignment,
} from './projectTools.js'
import {
  handleExecuteCapability,
  handleListCapabilities,
  ExecuteCapabilityArgs,
} from './capabilityTools.js'
import {
  handleListMCPServers,
  handleAddMCPServer,
  handleUpdateMCPServer,
  handleDeleteMCPServer,
  handleGetMCPConfig,
} from './mcpConfigTools.js'
import {
  handleListAllTools,
  handleGetToolPermissionPresets,
  handleGetAgentToolPermissions,
  handleUpdateAgentToolPermissions,
  handleApplyToolPermissionPreset,
  handleGetProjectAgentPermissions,
  handleValidateToolUsage,
  ToolPermission,
} from './toolPermissionTools.js'
import {
  handleListWorkflowNodeTypes,
  handleListAvailableAgents,
  handleGetNodeSchema,
  handleCreateWorkflow,
  handleAddWorkflowStep,
  handleSetWorkflowDependencies,
  handleValidateWorkflow,
  handleExecuteWorkflow,
  WorkflowDefinition,
  WorkflowStepDefinition,
} from './workflowBuilderTools.js'

type ToolHandler = (args: unknown) => Promise<TextContent>

/**
 * Type definitions for workflow tool arguments
 */
interface AddWorkflowStepArgs {
  workflow: WorkflowDefinition
  step: Partial<WorkflowStepDefinition>
}

interface SetWorkflowDependenciesArgs {
  workflow: WorkflowDefinition
  stepId: string
  dependencies: string[]
}

interface ValidateWorkflowArgs {
  workflow: WorkflowDefinition
}

interface ExecuteWorkflowArgs {
  workflow: WorkflowDefinition
  threadId?: string
  startNewConversation?: boolean
}

/**
 * Parse and validate arguments for agent creation
 */
function parseCreateAgentArgs(args: unknown): CreateAgentInput {
  if (!args || typeof args !== 'object') {
    throw new Error('Invalid arguments')
  }
  const typedArgs = args as Record<string, unknown>
  return {
    name: String(typedArgs.name),
    role: String(typedArgs.role),
    systemPrompt: String(typedArgs.systemPrompt),
    model: typedArgs.model ? String(typedArgs.model) : undefined,
    tools: Array.isArray(typedArgs.tools) ? typedArgs.tools.map(String) : undefined,
    maxTokens: typeof typedArgs.maxTokens === 'number' ? typedArgs.maxTokens : undefined,
    temperature: typeof typedArgs.temperature === 'number' ? typedArgs.temperature : undefined,
    maxTurns: typeof typedArgs.maxTurns === 'number' ? typedArgs.maxTurns : undefined,
    verbose: typeof typedArgs.verbose === 'boolean' ? typedArgs.verbose : undefined,
  }
}

/**
 * Parse and validate arguments for agent update
 */
function parseUpdateAgentArgs(args: unknown): { id: string; updates: UpdateAgentInput } {
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
  return { id: String(typedArgs.id), updates }
}

/**
 * Parse and validate arguments for project creation
 */
function parseCreateProjectArgs(args: unknown): CreateProjectInput {
  if (!args || typeof args !== 'object') {
    throw new Error('Invalid arguments')
  }
  const typedArgs = args as Record<string, unknown>
  return {
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
    mcpServers: Array.isArray(typedArgs.mcpServers) ? typedArgs.mcpServers.map(String) : undefined,
  }
}

/**
 * Parse and validate arguments for project update
 */
function parseUpdateProjectArgs(args: unknown): { id: string; updates: UpdateProjectInput } {
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
  return { id: String(typedArgs.id), updates }
}

/**
 * Central handler registry following DRY principle
 */
export class ToolHandlerRegistry {
  private handlers: Map<string, ToolHandler> = new Map()

  constructor() {
    this.registerHandlers()
  }

  private registerHandlers(): void {
    // Agent Management Handlers
    this.register('list_agents', async () => await handleListAgents())
    this.register(
      'create_agent',
      async (args) => await handleCreateAgent(parseCreateAgentArgs(args))
    )
    this.register('update_agent', async (args) => {
      const { id, updates } = parseUpdateAgentArgs(args)
      return await handleUpdateAgent({ id, updates })
    })
    this.register('delete_agent', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      const typedArgs = args as Record<string, unknown>
      return await handleDeleteAgent({ id: String(typedArgs.id) })
    })
    this.register('list_agent_configs', async () => await handleListAgentConfigs())
    this.register('get_agent_config', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      const typedArgs = args as Record<string, unknown>
      return await handleGetAgentConfig({ id: String(typedArgs.id) })
    })

    // Project Management Handlers
    this.register('list_projects', async () => await handleListProjects())
    this.register(
      'create_project',
      async (args) => await handleCreateProject(parseCreateProjectArgs(args))
    )
    this.register('update_project', async (args) => {
      const { id, updates } = parseUpdateProjectArgs(args)
      return await handleUpdateProject({ id, updates })
    })
    this.register('delete_project', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      const typedArgs = args as Record<string, unknown>
      return await handleDeleteProject({
        id: String(typedArgs.id),
        deleteWorkspace: typedArgs.deleteWorkspace === true,
      })
    })
    this.register('get_project', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      const typedArgs = args as Record<string, unknown>
      return await handleGetProject({ id: String(typedArgs.id) })
    })

    // Role Assignment Handlers
    this.register('assign_role', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      const typedArgs = args as Record<string, unknown>
      const roleArgs: RoleAssignment = {
        projectId: String(typedArgs.projectId),
        agentId: String(typedArgs.agentId),
        role: String(typedArgs.role),
      }
      return await handleAssignRole(roleArgs)
    })
    this.register('unassign_role', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      const typedArgs = args as Record<string, unknown>
      return await handleUnassignRole({
        projectId: String(typedArgs.projectId),
        agentId: String(typedArgs.agentId),
      })
    })
    this.register('list_roles', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      const typedArgs = args as Record<string, unknown>
      return await handleListRoles({ projectId: String(typedArgs.projectId) })
    })

    // Project Agent Management Handlers
    this.register('list_project_agents', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      const typedArgs = args as Record<string, unknown>
      return await handleListProjectAgents({ projectId: String(typedArgs.projectId) })
    })
    this.register('add_agent_to_project', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      const typedArgs = args as Record<string, unknown>
      return await handleAddAgentToProject({
        projectId: typedArgs.projectId ? String(typedArgs.projectId) : undefined,
        agentConfigId: String(typedArgs.agentConfigId),
        role: String(typedArgs.role),
        name: typedArgs.name ? String(typedArgs.name) : undefined,
        customTools: Array.isArray(typedArgs.customTools)
          ? typedArgs.customTools.map(String)
          : undefined,
      })
    })
    this.register('add_team_to_project', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      const typedArgs = args as Record<string, unknown>
      return await handleAddTeamToProject({
        projectId: typedArgs.projectId ? String(typedArgs.projectId) : undefined,
        teamId: String(typedArgs.teamId),
      })
    })
    this.register('remove_agent_from_project', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      const typedArgs = args as Record<string, unknown>
      return await handleRemoveAgentFromProject({
        projectId: typedArgs.projectId ? String(typedArgs.projectId) : undefined,
        agentRole: String(typedArgs.agentRole),
      })
    })

    // Capability Handlers
    this.register('list_capabilities', async () => await handleListCapabilities())

    // Invoke Handlers
    this.register('invoke', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      console.error('[MCP] invoke tool called with args:', JSON.stringify(args, null, 2))
      return await handleInvoke(args)
    })
    this.register('get_roles', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      return await handleGetRoles(args)
    })
    this.register('invoke_async', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      return await handleInvokeAsync(args)
    })
    this.register('invoke_status', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      return await handleInvokeStatus(args)
    })

    // Workflow Management Handlers
    this.register('list_workflows', async () => await handleListWorkflows({}))
    this.register('delete_workflow', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      return await handleDeleteWorkflow(args)
    })
    this.register('bulk_delete_workflows', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      return await handleBulkDeleteWorkflows(args)
    })
    this.register('cleanup_old_workflows', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      return await handleCleanupOldWorkflows(args)
    })

    // Workflow Builder Handlers
    this.register('list_workflow_node_types', async () => await handleListWorkflowNodeTypes())
    this.register('list_available_agents', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      const typedArgs = args as Record<string, unknown>
      return await handleListAvailableAgents({
        projectId: typedArgs.projectId ? String(typedArgs.projectId) : undefined,
      })
    })
    this.register('get_node_schema', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      const typedArgs = args as Record<string, unknown>
      return await handleGetNodeSchema({ nodeType: String(typedArgs.nodeType) })
    })
    this.register('create_workflow', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      const typedArgs = args as Record<string, unknown>
      return await handleCreateWorkflow({
        name: String(typedArgs.name),
        description: typedArgs.description ? String(typedArgs.description) : undefined,
        projectId: String(typedArgs.projectId),
        tags: Array.isArray(typedArgs.tags) ? typedArgs.tags.map(String) : undefined,
      })
    })
    this.register('add_workflow_step', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      const typedArgs = args as Record<string, unknown>
      return await handleAddWorkflowStep({
        workflow: typedArgs.workflow as WorkflowDefinition,
        step: typedArgs.step as Partial<WorkflowStepDefinition>,
      })
    })
    this.register('set_workflow_dependencies', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      const typedArgs = args as Record<string, unknown>
      return await handleSetWorkflowDependencies({
        workflow: typedArgs.workflow as WorkflowDefinition,
        stepId: String(typedArgs.stepId),
        dependencies: Array.isArray(typedArgs.dependencies)
          ? typedArgs.dependencies.map(String)
          : [],
      })
    })
    this.register('validate_workflow', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      const typedArgs = args as Record<string, unknown>
      return await handleValidateWorkflow({ workflow: typedArgs.workflow as WorkflowDefinition })
    })
    this.register('execute_workflow', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      const typedArgs = args as Record<string, unknown>
      return await handleExecuteWorkflow({
        workflow: typedArgs.workflow as WorkflowDefinition,
        threadId: typedArgs.threadId ? String(typedArgs.threadId) : undefined,
        startNewConversation: typedArgs.startNewConversation === true,
      })
    })

    // MCP Configuration Handlers
    this.register('list_mcp_servers', async () => await handleListMCPServers())
    this.register('add_mcp_server', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      return await handleAddMCPServer(args)
    })
    this.register('update_mcp_server', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      return await handleUpdateMCPServer(args)
    })
    this.register('delete_mcp_server', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      return await handleDeleteMCPServer(args)
    })
    this.register('get_mcp_config', async () => await handleGetMCPConfig())

    // Tool Permission Handlers
    this.register('list_all_tools', async () => {
      const result = await handleListAllTools()
      return {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }
    })
    this.register('get_tool_permission_presets', async () => {
      const result = await handleGetToolPermissionPresets()
      return {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }
    })
    this.register('get_agent_tool_permissions', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      const typedArgs = args as Record<string, unknown>
      const result = await handleGetAgentToolPermissions({ agentId: String(typedArgs.agentId) })
      return {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }
    })
    this.register('update_agent_tool_permissions', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      const typedArgs = args as Record<string, unknown>
      const result = await handleUpdateAgentToolPermissions({
        agentId: String(typedArgs.agentId),
        permissions: typedArgs.permissions as ToolPermission[],
      })
      return {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }
    })
    this.register('apply_tool_permission_preset', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      const typedArgs = args as Record<string, unknown>
      const result = await handleApplyToolPermissionPreset({
        agentId: String(typedArgs.agentId),
        presetName: String(typedArgs.presetName),
      })
      return {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }
    })
    this.register('get_project_agent_permissions', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      const typedArgs = args as Record<string, unknown>
      const result = await handleGetProjectAgentPermissions({
        projectId: String(typedArgs.projectId),
        role: String(typedArgs.role),
      })
      return {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }
    })
    this.register('validate_tool_usage', async (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Invalid arguments')
      }
      const typedArgs = args as Record<string, unknown>
      const result = await handleValidateToolUsage({
        toolName: String(typedArgs.toolName),
        args: typedArgs.args as Record<string, unknown>,
        permissions: typedArgs.permissions as ToolPermission[],
      })
      return {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }
    })
  }

  /**
   * Register a handler
   */
  private register(name: string, handler: ToolHandler): void {
    this.handlers.set(name, handler)
  }

  /**
   * Register a dynamic capability handler
   */
  registerCapabilityHandler(capabilityId: string): void {
    this.register(`execute_${capabilityId}`, async (args) => {
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
      return await handleExecuteCapability(capabilityId, typedArgs)
    })
  }

  /**
   * Get a handler by name
   */
  getHandler(name: string): ToolHandler | undefined {
    return this.handlers.get(name)
  }

  /**
   * Check if a handler exists
   */
  hasHandler(name: string): boolean {
    return this.handlers.has(name)
  }
}
