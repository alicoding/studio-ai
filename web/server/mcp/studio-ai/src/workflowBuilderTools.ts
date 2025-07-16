/**
 * Workflow Builder MCP Tools
 *
 * SOLID: Single responsibility - workflow creation and management tools
 * DRY: Reuses existing validation and execution logic
 * KISS: Simple tool implementations
 * Library-First: Uses existing workflow infrastructure
 */

import { TextContent } from '@modelcontextprotocol/sdk/types.js'
import ky from 'ky'

// API URL for calling workflow endpoints
const API_URL = process.env.STUDIO_AI_API || 'http://localhost:3456/api'

// Type definitions (copying to avoid complex import paths in MCP build)
export interface WorkflowDefinition {
  id: string
  name: string
  description?: string
  steps: WorkflowStepDefinition[]
  metadata: {
    createdBy: string
    createdAt: string
    updatedAt?: string
    version: number
    tags: string[]
    projectId: string
    isTemplate?: boolean
    templateId?: string
  }
}

export interface WorkflowStepDefinition {
  id: string
  type: 'task' | 'parallel' | 'conditional'
  agentId?: string
  role?: string
  task: string
  deps: string[]
  config?: {
    timeout?: number
    retries?: number
    continueOnError?: boolean
    parallelLimit?: number
  }
  // Conditional step fields for structured conditions v2.0
  condition?: WorkflowCondition
  trueBranch?: string
  falseBranch?: string
}

// Structured condition types for v2.0 support
interface StructuredCondition {
  version: '2.0'
  rootGroup: ConditionGroup
}

interface LegacyCondition {
  version?: '1.0' | undefined
  expression: string
}

type WorkflowCondition = StructuredCondition | LegacyCondition | string

interface ConditionGroup {
  id: string
  combinator: 'AND' | 'OR'
  rules?: ConditionRule[]
  groups?: ConditionGroup[]
}

interface ConditionRule {
  id: string
  leftValue: TemplateVariable | StaticValue
  operation: string
  rightValue?: TemplateVariable | StaticValue
  dataType: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'dateTime'
}

interface TemplateVariable {
  stepId: string
  field: 'output' | 'status' | 'response'
}

interface StaticValue {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'dateTime'
  value: string | number | boolean | null
}

interface WorkflowValidationResult {
  valid: boolean
  errors: Array<{
    stepId?: string
    field?: string
    message: string
    code: string
  }>
  warnings: Array<{
    stepId?: string
    message: string
    code: string
  }>
}

interface WorkflowExecutionRequest {
  workflow: WorkflowDefinition
  threadId?: string
  startNewConversation?: boolean
  projectId?: string
}

interface WorkflowExecutionResponse {
  threadId: string
  status: 'started' | 'failed'
  message?: string
  error?: string
}

/**
 * Node type definitions with schemas
 */
const NODE_TYPES = [
  {
    type: 'task',
    description: 'Single task executed by an agent',
    required: ['task'],
    optional: ['agentId', 'role', 'deps', 'config'],
    schema: {
      id: 'string (auto-generated)',
      type: '"task"',
      agentId: 'string (e.g., "dev_01") - specific agent ID',
      role: 'string (e.g., "developer") - role-based assignment',
      task: 'string - task description with optional {stepId.output} variables',
      deps: 'string[] - array of step IDs this depends on',
      config: {
        timeout: 'number - timeout in milliseconds',
        retries: 'number - retry attempts',
        continueOnError: 'boolean - continue workflow on step failure',
      },
    },
  },
  {
    type: 'parallel',
    description: 'Group of tasks that can run in parallel',
    required: ['task'],
    optional: ['agentId', 'role', 'deps', 'config'],
    schema: {
      id: 'string (auto-generated)',
      type: '"parallel"',
      agentId: 'string - specific agent ID',
      role: 'string - role-based assignment',
      task: 'string - task description',
      deps: 'string[] - dependencies',
      config: {
        timeout: 'number - timeout in milliseconds',
        retries: 'number - retry attempts',
        continueOnError: 'boolean',
        parallelLimit: 'number - max concurrent executions',
      },
    },
  },
  {
    type: 'conditional',
    description: 'Task with conditional execution using structured conditions (v2.0)',
    required: ['task', 'condition'],
    optional: ['agentId', 'role', 'deps', 'config', 'trueBranch', 'falseBranch'],
    schema: {
      id: 'string (auto-generated)',
      type: '"conditional"',
      agentId: 'string - specific agent ID',
      role: 'string - role-based assignment',
      task: 'string - task description',
      deps: 'string[] - dependencies',
      condition: 'WorkflowCondition - structured condition (v2.0) or legacy expression',
      trueBranch: 'string - step ID to execute if condition is true',
      falseBranch: 'string - step ID to execute if condition is false',
      config: {
        timeout: 'number - timeout in milliseconds',
        retries: 'number - retry attempts',
        continueOnError: 'boolean',
      },
    },
  },
]

/**
 * Tool: list_workflow_node_types
 * Lists all available node types for workflow building
 */
export async function handleListWorkflowNodeTypes(): Promise<TextContent> {
  try {
    const nodeTypesList = NODE_TYPES.map(
      (node) =>
        `• **${node.type}**: ${node.description}\n  Required: ${node.required.join(
          ', '
        )}\n  Optional: ${node.optional.join(', ')}`
    ).join('\n\n')

    return {
      type: 'text',
      text: `Available workflow node types:\n\n${nodeTypesList}\n\nUse get_node_schema to see detailed schema for each type.`,
    }
  } catch (error) {
    console.error('MCP list_workflow_node_types error:', error)
    return {
      type: 'text',
      text: `Failed to list node types: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Tool: list_available_agents
 * Lists agents available for workflow steps in a project
 */
export async function handleListAvailableAgents(args: {
  projectId?: string
}): Promise<TextContent> {
  try {
    if (!args.projectId) {
      // List all agent configs if no project specified
      interface AgentConfig {
        id: string
        name: string
        role: string
      }
      const response = await ky.get(`${API_URL}/agents`).json<AgentConfig[]>()

      if (response.length === 0) {
        return {
          type: 'text',
          text: 'No agent configurations found. Create agents first before building workflows.',
        }
      }

      const agentList = response
        .map((config) => `• **${config.role}**: ${config.name} (ID: ${config.id})`)
        .join('\n')

      return {
        type: 'text',
        text: `Available agent configurations:\n\n${agentList}\n\nUse add_agent_to_project to add these to a specific project, then use their short IDs (e.g., dev_01) in workflows.`,
      }
    }

    // List agents in specific project using workspace API
    interface WorkspaceResponse {
      projects?: Array<{
        id: string
        agents?: Array<{
          id: string
          name: string
          role: string
          agentConfigId?: string
        }>
      }>
    }
    const response = await ky.get(`${API_URL}/workspace`).json<WorkspaceResponse>()
    const project = response.projects?.find((p) => p.id === args.projectId)

    if (!project || !project.agents || project.agents.length === 0) {
      return {
        type: 'text',
        text: `No agents found in project ${args.projectId}. Add agents to the project first using add_agent_to_project.`,
      }
    }

    const agentList = project.agents
      .map(
        (agent) =>
          `• **${agent.id}**: ${agent.name} (${agent.role})\n  Config ID: ${agent.agentConfigId || 'N/A'}`
      )
      .join('\n')

    return {
      type: 'text',
      text: `Agents available in project ${args.projectId}:\n\n${agentList}\n\nUse these short IDs (e.g., ${project.agents[0]?.id}) as agentId in workflow steps.`,
    }
  } catch (error) {
    console.error('MCP list_available_agents error:', error)
    return {
      type: 'text',
      text: `Failed to list agents: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Tool: get_node_schema
 * Get detailed schema for a specific node type
 */
export async function handleGetNodeSchema(args: { nodeType: string }): Promise<TextContent> {
  try {
    const nodeType = NODE_TYPES.find((node) => node.type === args.nodeType)

    if (!nodeType) {
      const availableTypes = NODE_TYPES.map((node) => node.type).join(', ')
      return {
        type: 'text',
        text: `Unknown node type '${args.nodeType}'. Available types: ${availableTypes}`,
      }
    }

    const schemaText = JSON.stringify(nodeType.schema, null, 2)
    return {
      type: 'text',
      text: `Schema for '${nodeType.type}' node:\n\n**Description**: ${nodeType.description}\n\n**Schema**:\n\`\`\`json\n${schemaText}\n\`\`\`\n\n**Usage Example**:\n\`\`\`json\n{\n  "id": "step1",\n  "type": "${nodeType.type}",\n  "task": "Your task description here",\n  "agentId": "dev_01",\n  "deps": []\n}\n\`\`\``,
    }
  } catch (error) {
    console.error('MCP get_node_schema error:', error)
    return {
      type: 'text',
      text: `Failed to get node schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Tool: create_workflow
 * Create a new workflow programmatically
 */
export async function handleCreateWorkflow(args: {
  name: string
  description?: string
  projectId: string
  tags?: string[]
}): Promise<TextContent> {
  try {
    const workflow: WorkflowDefinition = {
      id: `wf-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      name: args.name,
      description: args.description,
      steps: [],
      metadata: {
        createdBy: 'mcp-user',
        createdAt: new Date().toISOString(),
        version: 1,
        tags: args.tags || [],
        projectId: args.projectId,
      },
    }

    return {
      type: 'text',
      text: `Created workflow '${workflow.name}' with ID: ${workflow.id}\n\nWorkflow structure:\n\`\`\`json\n${JSON.stringify(workflow, null, 2)}\n\`\`\`\n\nNext steps:\n1. Use add_workflow_step to add steps\n2. Use set_workflow_dependencies to set dependencies\n3. Use validate_workflow to check for errors\n4. Use execute_workflow to run it`,
    }
  } catch (error) {
    console.error('MCP create_workflow error:', error)
    return {
      type: 'text',
      text: `Failed to create workflow: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Tool: validate_workflow
 * Validate workflow structure using the API endpoint
 */
export async function handleValidateWorkflow(args: {
  workflow: WorkflowDefinition
}): Promise<TextContent> {
  try {
    const response = await ky
      .post(`${API_URL}/workflows/validate`, {
        json: args.workflow,
        timeout: 30000,
      })
      .json<WorkflowValidationResult>()

    if (response.valid) {
      return {
        type: 'text',
        text: `✅ Workflow '${args.workflow.name}' is valid!\n\nWarnings (${response.warnings.length}):\n${
          response.warnings.map((w) => `• ${w.message}`).join('\n') || 'None'
        }\n\nReady for execution.`,
      }
    } else {
      const errorsList = response.errors
        .map((error) => `• ${error.stepId ? `[${error.stepId}] ` : ''}${error.message}`)
        .join('\n')

      const warningsList = response.warnings
        .map((warning) => `• ${warning.stepId ? `[${warning.stepId}] ` : ''}${warning.message}`)
        .join('\n')

      return {
        type: 'text',
        text: `❌ Workflow '${args.workflow.name}' has validation errors:\n\n**Errors (${response.errors.length}):**\n${errorsList}\n\n**Warnings (${response.warnings.length}):**\n${warningsList || 'None'}\n\nFix these issues before execution.`,
      }
    }
  } catch (error) {
    console.error('MCP validate_workflow error:', error)
    return {
      type: 'text',
      text: `Failed to validate workflow: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Tool: execute_workflow
 * Execute a workflow using the API endpoint
 */
export async function handleExecuteWorkflow(args: {
  workflow: WorkflowDefinition
  threadId?: string
  startNewConversation?: boolean
}): Promise<TextContent> {
  try {
    const request: WorkflowExecutionRequest = {
      workflow: args.workflow,
      threadId: args.threadId,
      startNewConversation: args.startNewConversation,
    }

    const response = await ky
      .post(`${API_URL}/workflows/execute`, {
        json: request,
        timeout: 30000,
      })
      .json<WorkflowExecutionResponse>()

    if (response.status === 'started') {
      return {
        type: 'text',
        text: `🚀 Workflow '${args.workflow.name}' started successfully!\n\nThread ID: ${response.threadId}\nMessage: ${response.message}\n\nUse invoke_status with threadId '${response.threadId}' to monitor progress.`,
      }
    } else {
      return {
        type: 'text',
        text: `❌ Failed to start workflow '${args.workflow.name}': ${response.error || 'Unknown error'}`,
      }
    }
  } catch (error) {
    console.error('MCP execute_workflow error:', error)
    return {
      type: 'text',
      text: `Failed to execute workflow: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Tool: add_workflow_step
 * Add a step to a workflow (in-memory operation, use save_workflow to persist)
 */
export async function handleAddWorkflowStep(args: {
  workflow: WorkflowDefinition
  step: Partial<WorkflowStepDefinition>
}): Promise<TextContent> {
  try {
    // Generate step ID if not provided
    const stepId = args.step.id || `step${args.workflow.steps.length + 1}`

    // Create full step definition
    const newStep: WorkflowStepDefinition = {
      id: stepId,
      type: args.step.type || 'task',
      task: args.step.task || '',
      deps: args.step.deps || [],
      agentId: args.step.agentId,
      role: args.step.role,
      config: args.step.config,
      // Conditional step fields
      condition: args.step.condition,
      trueBranch: args.step.trueBranch,
      falseBranch: args.step.falseBranch,
    }

    // Add to workflow
    args.workflow.steps.push(newStep)

    return {
      type: 'text',
      text: `✅ Added step '${stepId}' to workflow '${args.workflow.name}'\n\nStep details:\n\`\`\`json\n${JSON.stringify(newStep, null, 2)}\n\`\`\`\n\nWorkflow now has ${args.workflow.steps.length} steps.\n\nNext: Use validate_workflow to check for issues.`,
    }
  } catch (error) {
    console.error('MCP add_workflow_step error:', error)
    return {
      type: 'text',
      text: `Failed to add step: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Tool: set_workflow_dependencies
 * Set dependencies for a workflow step
 */
export async function handleSetWorkflowDependencies(args: {
  workflow: WorkflowDefinition
  stepId: string
  dependencies: string[]
}): Promise<TextContent> {
  try {
    const step = args.workflow.steps.find((s) => s.id === args.stepId)

    if (!step) {
      const availableSteps = args.workflow.steps.map((s) => s.id).join(', ')
      return {
        type: 'text',
        text: `❌ Step '${args.stepId}' not found in workflow. Available steps: ${availableSteps}`,
      }
    }

    // Validate dependencies exist
    const invalidDeps = args.dependencies.filter(
      (dep) => !args.workflow.steps.some((s) => s.id === dep)
    )

    if (invalidDeps.length > 0) {
      return {
        type: 'text',
        text: `❌ Invalid dependencies: ${invalidDeps.join(', ')}\nThese step IDs don't exist in the workflow.`,
      }
    }

    // Check for circular dependencies
    if (args.dependencies.includes(args.stepId)) {
      return {
        type: 'text',
        text: `❌ Circular dependency detected: Step '${args.stepId}' cannot depend on itself.`,
      }
    }

    // Set dependencies
    step.deps = args.dependencies

    return {
      type: 'text',
      text: `✅ Set dependencies for step '${args.stepId}': [${args.dependencies.join(', ')}]\n\nStep will now wait for: ${args.dependencies.join(', ') || 'no dependencies'}\n\nNext: Use validate_workflow to check for circular dependencies.`,
    }
  } catch (error) {
    console.error('MCP set_workflow_dependencies error:', error)
    return {
      type: 'text',
      text: `Failed to set dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Tool: save_workflow
 * Save a workflow definition to persistent storage
 */
export async function handleSaveWorkflow(args: {
  workflow: WorkflowDefinition
  scope?: 'project' | 'global' | 'cross-project'
  projectId?: string
  isTemplate?: boolean
}): Promise<TextContent> {
  try {
    // Prepare save request
    const saveRequest = {
      name: args.workflow.name,
      description: args.workflow.description,
      definition: args.workflow,
      scope: args.scope || 'project',
      projectId: args.projectId || args.workflow.metadata.projectId,
      source: 'mcp' as const,
      isTemplate: args.isTemplate || false,
    }

    // Validate required fields for project scope
    if (saveRequest.scope === 'project' && !saveRequest.projectId) {
      return {
        type: 'text',
        text: '❌ projectId is required for project-scoped workflows. Either provide projectId or use scope: "global"',
      }
    }

    // Call save API
    interface SaveResponse {
      workflow: {
        id: string
        name: string
        createdAt: string
      }
    }
    const response = await ky
      .post(`${API_URL}/workflows/saved`, { json: saveRequest })
      .json<SaveResponse>()

    return {
      type: 'text',
      text: `✅ Workflow '${args.workflow.name}' saved successfully!\n\n**ID**: ${response.workflow.id}\n**Scope**: ${saveRequest.scope}\n**Project**: ${saveRequest.projectId || 'N/A'}\n**Template**: ${saveRequest.isTemplate ? 'Yes' : 'No'}\n**Created**: ${new Date(response.workflow.createdAt).toLocaleString()}\n\nWorkflow can now be loaded and executed from the UI or via load_workflow.`,
    }
  } catch (error) {
    console.error('MCP save_workflow error:', error)
    return {
      type: 'text',
      text: `Failed to save workflow: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Tool: load_workflow
 * Load a saved workflow by ID
 */
export async function handleLoadWorkflow(args: { workflowId: string }): Promise<TextContent> {
  try {
    interface LoadResponse {
      workflow: {
        id: string
        name: string
        description?: string
        definition: WorkflowDefinition
        updatedAt: string
        scope: string
        projectId?: string
        isTemplate?: boolean
      }
    }
    const response = await ky
      .get(`${API_URL}/workflows/saved/${args.workflowId}`)
      .json<LoadResponse>()

    const workflow = response.workflow

    return {
      type: 'text',
      text: `✅ Workflow loaded successfully!\n\n**Name**: ${workflow.name}\n**Description**: ${workflow.description || 'N/A'}\n**Scope**: ${workflow.scope}\n**Steps**: ${workflow.definition.steps.length}\n**Updated**: ${new Date(workflow.updatedAt).toLocaleString()}\n\n**Workflow Definition**:\n\`\`\`json\n${JSON.stringify(workflow.definition, null, 2)}\n\`\`\`\n\nYou can now execute this workflow or modify it.`,
    }
  } catch (error) {
    console.error('MCP load_workflow error:', error)
    return {
      type: 'text',
      text: `Failed to load workflow: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Tool: list_saved_workflows
 * List all saved workflows with filters
 */
export async function handleListSavedWorkflows(args: {
  projectId?: string
  scope?: 'project' | 'global' | 'cross-project'
  global?: boolean
}): Promise<TextContent> {
  try {
    // Build query params
    const params = new URLSearchParams()
    if (args.projectId) params.append('projectId', args.projectId)
    if (args.scope) params.append('scope', args.scope)
    if (args.global) params.append('global', 'true')

    const url = params.toString()
      ? `${API_URL}/workflows/saved?${params}`
      : `${API_URL}/workflows/saved`

    interface ListResponse {
      workflows: Array<{
        id: string
        name: string
        description?: string
        definition: WorkflowDefinition
        updatedAt: string
        scope: string
        projectId?: string
        isTemplate?: boolean
      }>
    }
    const response = await ky.get(url).json<ListResponse>()

    if (response.workflows.length === 0) {
      return {
        type: 'text',
        text: 'No saved workflows found with the specified filters.\n\nTry:\n- Creating a workflow with create_workflow\n- Adding steps with add_workflow_step\n- Saving with save_workflow',
      }
    }

    const workflowList = response.workflows
      .map(
        (wf) =>
          `• **${wf.name}** (${wf.id})\n  ${wf.description || 'No description'}\n  Scope: ${wf.scope} | Steps: ${wf.definition.steps.length} | Updated: ${new Date(
            wf.updatedAt
          ).toLocaleDateString()}`
      )
      .join('\n\n')

    return {
      type: 'text',
      text: `Found ${response.workflows.length} saved workflow(s):\n\n${workflowList}\n\nUse load_workflow with the ID to load a specific workflow.`,
    }
  } catch (error) {
    console.error('MCP list_saved_workflows error:', error)
    return {
      type: 'text',
      text: `Failed to list workflows: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Tool: delete_workflow
 * Delete a saved workflow by ID
 */
export async function handleDeleteWorkflow(args: { workflowId: string }): Promise<TextContent> {
  try {
    await ky.delete(`${API_URL}/workflows/saved/${args.workflowId}`)

    return {
      type: 'text',
      text: `✅ Workflow '${args.workflowId}' deleted successfully!`,
    }
  } catch (error) {
    console.error('MCP delete_workflow error:', error)
    return {
      type: 'text',
      text: `Failed to delete workflow: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}
