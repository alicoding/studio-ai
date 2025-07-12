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
const API_URL = process.env.CLAUDE_STUDIO_API || 'http://localhost:3456/api'

// Type definitions (copying to avoid complex import paths in MCP build)
interface WorkflowDefinition {
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

interface WorkflowStepDefinition {
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
    description: 'Task with conditional execution (future feature)',
    required: ['task'],
    optional: ['agentId', 'role', 'deps', 'config'],
    schema: {
      id: 'string (auto-generated)',
      type: '"conditional"',
      agentId: 'string - specific agent ID',
      role: 'string - role-based assignment',
      task: 'string - task description',
      deps: 'string[] - dependencies',
      config: {
        timeout: 'number - timeout in milliseconds',
        retries: 'number - retry attempts',
        continueOnError: 'boolean',
        condition: 'string - condition expression (future)',
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
        text: `✅ Workflow '${args.workflow.name}' is valid!\n\nWarnings (${response.warnings.length}):\n${response.warnings
          .map((w) => `• ${w.message}`)
          .join('\n') || 'None'}\n\nReady for execution.`,
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
    const stepId =
      args.step.id || `step${args.workflow.steps.length + 1}`

    // Create full step definition
    const newStep: WorkflowStepDefinition = {
      id: stepId,
      type: args.step.type || 'task',
      task: args.step.task || '',
      deps: args.step.deps || [],
      agentId: args.step.agentId,
      role: args.step.role,
      config: args.step.config,
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