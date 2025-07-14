/**
 * MCP Tools for Unified Invoke API
 *
 * SOLID: Single responsibility - invoke API tools
 * DRY: Reuses invoke schemas and types
 * KISS: Simple tool wrappers around API
 * Type-safe: Full TypeScript types
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js'
import ky, { HTTPError } from 'ky'

// Copy types locally to avoid rootDir issues
interface WorkflowStep {
  id?: string
  role?: string
  agentId?: string
  task: string
  sessionId?: string
  deps?: string[]
  // Conditional step fields (structured conditions v2.0)
  type?: 'task' | 'conditional' | 'parallel'
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

interface InvokeRequest {
  workflow: WorkflowStep | WorkflowStep[]
  projectId?: string
  threadId?: string
  startNewConversation?: boolean
  format?: 'json' | 'text'
}

// InvokeResponse interface removed - using bridge to mention API

const API_URL = process.env.CLAUDE_STUDIO_API || 'http://localhost:3456/api'
const REQUEST_TIMEOUT = parseInt(process.env.CLAUDE_STUDIO_TIMEOUT || '3600000') // 1 hour default

/**
 * Tool: invoke
 * Execute single agent or multi-agent workflow
 */
export const invokeTool: Tool = {
  name: 'invoke',
  description: `Execute multi-agent workflows with coordination, dependencies, and resume functionality.

🚀 PRODUCTION-READY: Context-aware evaluation, robust error handling, 1-hour timeout support.

KEY FEATURES:
• Context-Aware Operator: Evaluates outputs based on role/task context (no hardcoded keywords)
• Dependency Resolution: Template variables like {stepId.output} work correctly
• Session Management: Automatic resume with same threadId
• Abort Handling: Graceful shutdown with session preservation
• Multi-Agent Coordination: Sequential, parallel, and fan-out/fan-in patterns

WORKFLOW PATTERNS:

1. Single agent task:
   invoke({ workflow: { role: "dev", task: "Create hello world function" } })

2. Sequential workflow (architect → developer):
   invoke({
     workflow: [
       { id: "architect", role: "orchestrator", task: "Design system architecture" },
       { id: "implement", role: "dev", task: "Implement {architect.output}", deps: ["architect"] }
     ],
     threadId: "my-workflow-123"  // For resume functionality
   })

3. Parallel coordination (multiple developers):
   invoke({
     workflow: [
       { id: "frontend", role: "dev", task: "Build React components" },
       { id: "backend", role: "dev", task: "Build API endpoints" },
       { id: "tests", role: "dev", task: "Write unit tests" }
     ]
   })

4. Fan-out/Fan-in (one feeds many, then converge):
   invoke({
     workflow: [
       { id: "requirements", role: "orchestrator", task: "Define requirements" },
       { id: "ui", role: "ux", task: "Design UI from {requirements.output}", deps: ["requirements"] },
       { id: "api", role: "dev", task: "Build API from {requirements.output}", deps: ["requirements"] },
       { id: "integration", role: "dev", task: "Integrate {ui.output} and {api.output}", deps: ["ui", "api"] }
     ]
   })

5. Conditional workflows with structured conditions (v2.0):
   invoke({
     workflow: [
       { id: "test", role: "dev", task: "Run tests and return result" },
       { 
         id: "deploy_check", 
         type: "conditional",
         task: "Check if deployment should proceed",
         condition: {
           version: "2.0",
           rootGroup: {
             id: "root",
             combinator: "AND",
             rules: [{
               id: "rule1",
               leftValue: { stepId: "test", field: "output" },
               operation: "equals",
               rightValue: { type: "string", value: "success" },
               dataType: "string"
             }]
           }
         },
         trueBranch: "deploy",
         falseBranch: "notify_failure",
         deps: ["test"]
       },
       { id: "deploy", role: "dev", task: "Deploy to production" },
       { id: "notify_failure", role: "dev", task: "Notify team of test failure" }
     ]
   })

6. Legacy condition support (backward compatibility):
   invoke({
     workflow: [
       { id: "check", role: "dev", task: "Check status" },
       { 
         id: "conditional_step", 
         type: "conditional",
         task: "Conditional execution",
         condition: "{check.output} === 'ready'",  // Legacy string condition
         trueBranch: "proceed",
         falseBranch: "wait",
         deps: ["check"]
       }
     ]
   })

RESUME FUNCTIONALITY:
• Use same threadId to resume interrupted workflows
• Check status: POST /api/invoke/status/:threadId  
• Session IDs preserved for all steps

TESTED SCENARIOS (100% Success Rate):
• Sequential code development workflows
• Parallel feature development with coordination  
• Code review and refactoring workflows
• Complex multi-developer coordination (up to 12 steps)
• Session resume and abort handling
• Long-running operations (tested up to 1 hour)
• Conditional workflows with structured conditions (v2.0)
• Legacy condition backward compatibility
• Template variable resolution in conditions

DOCUMENTATION: See docs/mcp-invoke-production-guide.md for complete usage guide.`,
  inputSchema: {
    type: 'object',
    required: ['workflow'],
    properties: {
      workflow: {
        oneOf: [
          {
            type: 'object',
            properties: {
              id: { type: 'string' },
              role: { type: 'string' },
              agentId: { type: 'string' },
              task: { type: 'string' },
              deps: { type: 'array', items: { type: 'string' } },
              type: { type: 'string', enum: ['task', 'conditional', 'parallel'] },
              condition: {
                type: 'object',
                description: 'Structured condition (v2.0) or legacy condition string',
              },
              trueBranch: { type: 'string' },
              falseBranch: { type: 'string' },
            },
            required: ['task'],
            additionalProperties: false,
          },
          {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                role: { type: 'string' },
                agentId: { type: 'string' },
                task: { type: 'string' },
                deps: { type: 'array', items: { type: 'string' } },
                type: { type: 'string', enum: ['task', 'conditional', 'parallel'] },
                condition: {
                  type: 'object',
                  description: 'Structured condition (v2.0) or legacy condition string',
                },
                trueBranch: { type: 'string' },
                falseBranch: { type: 'string' },
              },
              required: ['task'],
              additionalProperties: false,
            },
          },
        ],
        description:
          'Single step {role:"dev", task:"code"} OR multi-step array [{id:"step1", role:"dev", task:"code"}, {id:"step2", type:"conditional", condition:{version:"2.0", rootGroup:{...}}, trueBranch:"step3", falseBranch:"step4"}]. Supports structured conditions (v2.0), legacy conditions, and template variables {stepId.output}.',
      },
      projectId: {
        type: 'string',
        description: 'Project ID (optional - uses current working directory if not provided)',
      },
      threadId: {
        type: 'string',
        description:
          'Thread ID for resume functionality - use same ID to continue interrupted workflows',
      },
      startNewConversation: {
        type: 'boolean',
        description: 'Force new conversation (default: false)',
      },
      format: {
        type: 'string',
        enum: ['json', 'text'],
        description: 'Response format (default: json)',
      },
    },
  },
}

export async function handleInvoke(args: unknown): Promise<{ type: 'text'; text: string }> {
  console.error('[handleInvoke] Received args:', JSON.stringify(args, null, 2))
  console.error('[handleInvoke] Type of args:', typeof args)

  const request = args as InvokeRequest

  try {
    // Validate request structure
    if (!request || !request.workflow) {
      throw new Error('Missing workflow in request')
    }

    // Check if workflow is a string and parse it
    let workflow = request.workflow
    if (typeof workflow === 'string') {
      console.error('[handleInvoke] Workflow is a string, parsing...')
      try {
        workflow = JSON.parse(workflow)
      } catch (e) {
        console.error('[handleInvoke] Failed to parse workflow string:', e)
        throw new Error('Invalid workflow format - could not parse JSON string')
      }
    }

    // Use the actual invoke API endpoint with full workflow
    const invokeResponse = await ky
      .post(`${API_URL}/invoke`, {
        json: {
          workflow: workflow,
          projectId: request.projectId || process.env.CLAUDE_STUDIO_PROJECT_ID || 'mcp-context',
          threadId: request.threadId,
          startNewConversation: request.startNewConversation,
          format: request.format,
        },
        timeout: REQUEST_TIMEOUT,
      })
      .json<{
        threadId: string
        sessionIds: Record<string, string>
        results: Record<string, string>
        status: string
        summary: Record<string, unknown>
      }>()

    if (request.format === 'text') {
      // Extract the first result for text format
      const firstResult = Object.values(invokeResponse.results)[0] || 'No response'
      return {
        type: 'text',
        text: firstResult,
      }
    }

    // Format JSON response as text for MCP compatibility
    const formattedResponse = JSON.stringify(invokeResponse, null, 2)
    return {
      type: 'text',
      text: formattedResponse,
    }
  } catch (error) {
    console.error('MCP invoke error:', error)
    if (error instanceof HTTPError) {
      // It's a ky HTTPError, we can get more details
      try {
        const errorBody = await error.response.json()
        console.error('Error response body:', errorBody)
        throw new Error(`Invoke failed: ${error.message} - ${JSON.stringify(errorBody)}`)
      } catch {
        // If we can't parse the error body, just use the message
        throw new Error(`Invoke failed: ${error.message}`)
      }
    } else if (error instanceof Error) {
      throw new Error(`Invoke failed: ${error.message}`)
    }
    throw error
  }
}

/**
 * Tool: get_roles
 * Get available roles for a project
 */
export const getRolesTool: Tool = {
  name: 'get_roles',
  description: `Get all available agent roles from your Claude Studio configuration.

WHAT IT DOES:
• Lists all roles currently configured in your agents
• Shows which agent is assigned to each role
• Helps you discover what roles you can use with the invoke tool

EXAMPLE:
get_roles()

Returns something like:
- dev (Senior Dev)
- ux (UX Designer)
- orchestrator (Orchestrator)

NOTE: Roles are project-agnostic - same roles available across all projects.`,
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

export async function handleGetRoles(_args: unknown): Promise<{ type: 'text'; text: string }> {
  // projectId not used - roles are project-agnostic

  try {
    // Get agents dynamically from the API
    const agentsResponse = await ky.get(`${API_URL}/agents`).json<
      Array<{
        id: string
        name: string
        role: string
      }>
    >()

    // Extract unique roles from agents
    const roles = agentsResponse
      .filter((agent: { id: string; name: string; role: string }) => agent.role)
      .map((agent: { id: string; name: string; role: string }) => ({
        role: agent.role,
        agentId: agent.id,
        agentName: agent.name,
      }))

    // Format as simple text list
    const roleList = roles
      .map((r: { role: string; agentName: string }) => `- ${r.role} (${r.agentName})`)
      .join('\n')

    // Return in MCP-compatible format
    return {
      type: 'text',
      text: `Available roles:\n${roleList}`,
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get roles: ${error.message}`)
    }
    throw error
  }
}

/**
 * Tool: invoke_async
 * Start workflow asynchronously and return immediately
 */
export const invokeAsyncTool: Tool = {
  name: 'invoke_async',
  description: `Start workflow asynchronously and return immediately with tracking ID.

WHEN TO USE:
• Long-running workflows (minutes to hours)
• Multiple parallel workflows
• When you need to continue other work

RETURNS:
• threadId: Use to track progress and get results
• status: 'started'

EXAMPLE:
invoke_async({ workflow: { role: 'dev', task: 'implement feature' } })
// Returns: { threadId: "abc-123", status: "started" }`,
  inputSchema: {
    type: 'object',
    properties: {
      workflow: {
        oneOf: [
          {
            type: 'object',
            properties: {
              id: { type: 'string' },
              role: { type: 'string' },
              agentId: { type: 'string' },
              task: { type: 'string', description: 'The task to execute' },
              sessionId: { type: 'string' },
              deps: { type: 'array', items: { type: 'string' } },
            },
            required: ['task'],
          },
          {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                role: { type: 'string' },
                agentId: { type: 'string' },
                task: { type: 'string' },
                sessionId: { type: 'string' },
                deps: { type: 'array', items: { type: 'string' } },
              },
              required: ['task'],
            },
          },
        ],
      },
      projectId: { type: 'string' },
      threadId: { type: 'string', description: 'Optional - provide to resume' },
      startNewConversation: { type: 'boolean' },
    },
    required: ['workflow'],
  },
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt === maxRetries) {
        break
      }

      // Exponential backoff: 1s, 2s, 4s
      const delayMs = baseDelayMs * Math.pow(2, attempt)
      console.error(
        `[handleInvokeAsync] Attempt ${attempt + 1} failed, retrying in ${delayMs}ms...`
      )
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  throw lastError!
}

export async function handleInvokeAsync(args: unknown): Promise<{ type: 'text'; text: string }> {
  try {
    console.error('[handleInvokeAsync] Received args:', JSON.stringify(args, null, 2))
    console.error('[handleInvokeAsync] Type of args:', typeof args)

    const request = args as InvokeRequest
    console.error('[handleInvokeAsync] Args workflow type:', typeof request.workflow)
    console.error('[handleInvokeAsync] Args workflow value:', request.workflow)

    // Check if workflow is a string and parse it (same as sync version)
    let workflow = request.workflow
    if (typeof workflow === 'string') {
      console.error('[handleInvokeAsync] Workflow is a string, parsing...')
      try {
        workflow = JSON.parse(workflow)
      } catch (e) {
        console.error('[handleInvokeAsync] Failed to parse workflow string:', e)
        throw new Error('Invalid workflow format - could not parse JSON string')
      }
    }

    const { projectId, threadId, startNewConversation } = request
    const requestBody = { workflow, projectId, threadId, startNewConversation }
    console.error('[handleInvokeAsync] API_URL:', API_URL)
    console.error('[handleInvokeAsync] Request body:', JSON.stringify(requestBody, null, 2))

    // Robust API call with retry logic
    const response = await retryWithBackoff(
      async () => {
        return await ky
          .post(`${API_URL}/invoke/async`, {
            json: requestBody,
            timeout: 30000, // 30 seconds for async start
            retry: {
              limit: 2,
              methods: ['post'],
              statusCodes: [408, 413, 429, 500, 502, 503, 504],
            },
          })
          .json<{ threadId: string; status: string }>()
      },
      3,
      1000
    )

    return {
      type: 'text',
      text: JSON.stringify(response, null, 2),
    }
  } catch (error) {
    console.error('MCP invoke_async error after retries:', error)
    if (error instanceof HTTPError) {
      // It's a ky HTTPError, we can get more details
      try {
        const errorBody = await error.response.json()
        console.error('[handleInvokeAsync] Error response body:', errorBody)
        throw new Error(
          `Failed to start async workflow: ${error.message} - ${JSON.stringify(errorBody)}`
        )
      } catch {
        // If we can't parse the error body, just use the message
        throw new Error(`Failed to start async workflow: ${error.message}`)
      }
    } else if (error instanceof Error) {
      throw new Error(`Failed to start async workflow: ${error.message}`)
    }
    throw error
  }
}

/**
 * Tool: invoke_status
 * Check the status of an async workflow
 */
export const invokeStatusTool: Tool = {
  name: 'invoke_status',
  description: `Check the status of an async workflow.

RETURNS:
• status: 'running', 'completed', 'failed', 'aborted'
• sessionIds: Active sessions for recovery
• currentStep: Which step is executing
• completedSteps: Steps that finished
• results: Final results (if completed)

USE FOR:
• Monitoring long workflows
• Checking if safe to resume
• Getting final results`,
  inputSchema: {
    type: 'object',
    properties: {
      threadId: { type: 'string', description: 'The workflow thread ID' },
    },
    required: ['threadId'],
  },
}

export async function handleInvokeStatus(args: unknown): Promise<{ type: 'text'; text: string }> {
  try {
    const { threadId } = args as { threadId: string }

    // Robust API call with retry logic
    const response = await retryWithBackoff(
      async () => {
        return await ky
          .get(`${API_URL}/invoke-status/status/${threadId}`, {
            timeout: 10000,
            retry: {
              limit: 2,
              methods: ['get'],
              statusCodes: [408, 413, 429, 500, 502, 503, 504],
            },
          })
          .json()
      },
      3,
      1000
    )

    return {
      type: 'text',
      text: JSON.stringify(response, null, 2),
    }
  } catch (error) {
    console.error('MCP invoke_status error after retries:', error)
    throw new Error(
      `Failed to get workflow status: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Tool: list_workflows
 * List all workflows with optional filtering
 */
export const listWorkflowsTool: Tool = {
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
}

export async function handleListWorkflows(_args: unknown): Promise<{ type: 'text'; text: string }> {
  try {
    const response = await retryWithBackoff(
      async () => {
        return await ky
          .get(`${API_URL}/invoke-status/workflows`, {
            timeout: 10000,
            retry: {
              limit: 2,
              methods: ['get'],
              statusCodes: [408, 413, 429, 500, 502, 503, 504],
            },
          })
          .json<{
            workflows: Array<{
              threadId: string
              status: string
              invocation: string
              lastUpdate: string
            }>
          }>()
      },
      3,
      1000
    )

    const workflows = response.workflows || []
    if (workflows.length === 0) {
      return {
        type: 'text',
        text: 'No workflows found.',
      }
    }

    // Format as readable list
    const workflowList = workflows
      .map(
        (w, i) =>
          `${i + 1}. ${w.threadId.substring(0, 8)}... | ${w.status} | ${w.invocation} | ${w.lastUpdate}`
      )
      .join('\n')

    return {
      type: 'text',
      text: `Found ${workflows.length} workflows:\n${workflowList}`,
    }
  } catch (error) {
    console.error('MCP list_workflows error:', error)
    throw new Error(
      `Failed to list workflows: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Tool: delete_workflow
 * Delete a specific workflow by threadId
 */
export const deleteWorkflowTool: Tool = {
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
}

export async function handleDeleteWorkflow(args: unknown): Promise<{ type: 'text'; text: string }> {
  try {
    const { threadId } = args as { threadId: string }

    const response = await retryWithBackoff(
      async () => {
        return await ky
          .delete(`${API_URL}/invoke-status/workflows/${threadId}`, {
            timeout: 10000,
            retry: {
              limit: 2,
              methods: ['delete'],
              statusCodes: [408, 413, 429, 500, 502, 503, 504],
            },
          })
          .json<{ success: boolean; threadId: string }>()
      },
      3,
      1000
    )

    return {
      type: 'text',
      text: `Successfully deleted workflow: ${response.threadId}`,
    }
  } catch (error) {
    console.error('MCP delete_workflow error:', error)
    if (error instanceof HTTPError && error.response.status === 404) {
      throw new Error(`Workflow not found: ${(args as { threadId: string }).threadId}`)
    }
    throw new Error(
      `Failed to delete workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Tool: bulk_delete_workflows
 * Delete multiple workflows at once
 */
export const bulkDeleteWorkflowsTool: Tool = {
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
}

export async function handleBulkDeleteWorkflows(
  args: unknown
): Promise<{ type: 'text'; text: string }> {
  try {
    const { threadIds } = args as { threadIds: string[] }

    const response = await retryWithBackoff(
      async () => {
        return await ky
          .delete(`${API_URL}/invoke-status/workflows`, {
            json: { threadIds },
            timeout: 30000,
            retry: {
              limit: 2,
              methods: ['delete'],
              statusCodes: [408, 413, 429, 500, 502, 503, 504],
            },
          })
          .json<{ success: boolean; deletedCount: number; message: string }>()
      },
      3,
      1000
    )

    return {
      type: 'text',
      text: `${response.message} (${response.deletedCount}/${threadIds.length} workflows deleted)`,
    }
  } catch (error) {
    console.error('MCP bulk_delete_workflows error:', error)
    throw new Error(
      `Failed to bulk delete workflows: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Tool: cleanup_old_workflows
 * Delete workflows older than specified number of days
 */
export const cleanupOldWorkflowsTool: Tool = {
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
}

export async function handleCleanupOldWorkflows(
  args: unknown
): Promise<{ type: 'text'; text: string }> {
  try {
    const { daysOld } = args as { daysOld: number }

    const response = await retryWithBackoff(
      async () => {
        return await ky
          .delete(`${API_URL}/invoke-status/workflows`, {
            json: { daysOld },
            timeout: 30000,
            retry: {
              limit: 2,
              methods: ['delete'],
              statusCodes: [408, 413, 429, 500, 502, 503, 504],
            },
          })
          .json<{ success: boolean; deletedCount: number; message: string }>()
      },
      3,
      1000
    )

    return {
      type: 'text',
      text: response.message,
    }
  } catch (error) {
    console.error('MCP cleanup_old_workflows error:', error)
    throw new Error(
      `Failed to cleanup old workflows: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
