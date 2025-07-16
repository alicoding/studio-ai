/**
 * Invoke API Schema - Unified agent invocation
 *
 * SOLID: Single responsibility - invocation validation
 * DRY: Unified schema for single/multi agent workflows
 * KISS: Simple step structure with optional fields
 * Configuration: All fields configurable, no hardcoded values
 */

import { z } from 'zod'

// Define WorkflowCondition schema to support both structured and legacy conditions
const WorkflowConditionSchema = z.union([
  // Structured condition (v2.0)
  z.object({
    version: z.literal('2.0'),
    rootGroup: z.object({
      id: z.string(),
      combinator: z.enum(['AND', 'OR']),
      rules: z
        .array(
          z.object({
            id: z.string(),
            leftValue: z.union([
              // Template variable
              z.object({
                stepId: z.string(),
                field: z.enum(['output', 'status', 'response']),
              }),
              // Static value
              z.object({
                type: z.enum(['string', 'number', 'boolean', 'array', 'object', 'dateTime']),
                value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
              }),
            ]),
            operation: z.string(), // ConditionOperation enum values
            rightValue: z
              .union([
                // Template variable
                z.object({
                  stepId: z.string(),
                  field: z.enum(['output', 'status', 'response']),
                }),
                // Static value
                z.object({
                  type: z.enum(['string', 'number', 'boolean', 'array', 'object', 'dateTime']),
                  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
                }),
              ])
              .optional(),
            dataType: z.enum(['string', 'number', 'boolean', 'array', 'object', 'dateTime']),
          })
        )
        .optional(),
      groups: z.array(z.any()).optional(), // Recursive groups handled by WorkflowCondition type
    }),
  }),
  // Legacy condition (v1.0 or undefined)
  z.object({
    version: z.union([z.literal('1.0'), z.undefined()]).optional(),
    expression: z.string(),
  }),
  // Backward compatibility: plain string conditions
  z.string(),
])

// Single workflow step
export const WorkflowStepSchema = z
  .object({
    id: z.string().optional(), // Auto-generated if not provided
    role: z.string().min(1).optional(), // Legacy: Role name from agent configs
    agentId: z.string().min(1).optional(), // New: Short agent ID (e.g., dev_01)
    task: z.string().min(1), // Task with template variables
    sessionId: z.string().optional(), // Resume specific session
    deps: z.array(z.string()).optional(), // Dependencies on other steps
    // Step type
    type: z.enum(['task', 'conditional', 'parallel', 'loop', 'human']).optional().default('task'),
    // Conditional step fields
    condition: WorkflowConditionSchema.optional(), // Structured condition or legacy JavaScript expression
    trueBranch: z.string().optional(), // Step ID to execute if condition is true
    falseBranch: z.string().optional(), // Step ID to execute if condition is false
    // Loop-specific fields
    items: z.array(z.string()).optional(), // Array of items to loop over
    loopVar: z.string().optional(), // Variable name for current item (default: 'item')
    maxIterations: z.number().optional(), // Maximum number of iterations
    loopSteps: z.array(z.string()).optional(), // IDs of steps to execute for each iteration
    // Human input fields
    prompt: z.string().optional(), // Prompt for human input
    approvalRequired: z.boolean().optional(), // Whether approval is required (legacy)
    interactionType: z.enum(['approval', 'notification', 'input']).optional(), // Type of human interaction
    timeoutBehavior: z.enum(['fail', 'auto-approve', 'infinite']).optional(), // Behavior when timeout occurs
    timeoutSeconds: z.number().optional(), // Timeout for human input
    // Parallel fields
    parallelSteps: z.array(z.string()).optional(), // IDs of steps to run in parallel
  })
  .refine(
    (data) => {
      // Some node types don't require agents
      const noAgentTypes = ['conditional', 'loop', 'parallel', 'human']
      return data.role || data.agentId || noAgentTypes.includes(data.type || 'task')
    },
    {
      message:
        "Either 'role' or 'agentId' must be provided (except for conditional, loop, parallel, and human steps)",
    }
  )
  .refine(
    (data) => {
      // Conditional steps must have condition and at least one branch
      if (data.type === 'conditional') {
        return data.condition && (data.trueBranch || data.falseBranch)
      }
      return true
    },
    {
      message:
        'Conditional steps must have a condition and at least one branch (trueBranch or falseBranch)',
    }
  )
  .refine(
    (data) => {
      // Loop steps must have items to loop over
      if (data.type === 'loop') {
        return data.items && data.items.length > 0
      }
      return true
    },
    {
      message: 'Loop steps must have items array with at least one item',
    }
  )
  .refine(
    (data) => {
      // Parallel steps must have parallelSteps array
      if (data.type === 'parallel') {
        return data.parallelSteps && data.parallelSteps.length > 0
      }
      return true
    },
    {
      message: 'Parallel steps must have parallelSteps array with at least one step ID',
    }
  )
  .refine(
    (data) => {
      // Human steps must have a prompt
      if (data.type === 'human') {
        return data.prompt && data.prompt.length > 0
      }
      return true
    },
    {
      message: 'Human input steps must have a prompt',
    }
  )

export type WorkflowStep = z.infer<typeof WorkflowStepSchema>

// Main invoke request
export const InvokeRequestSchema = z.object({
  workflow: z.union([
    WorkflowStepSchema, // Single agent
    z.array(WorkflowStepSchema).min(1), // Multi-agent workflow
  ]),
  threadId: z.string().optional(), // Group related work
  startNewConversation: z.boolean().default(false).optional(),
  projectId: z.string().min(1).optional(), // Optional for global-only resolution
  format: z.enum(['json', 'text']).default('json').optional(),
  savedWorkflowId: z.string().optional(), // Link to saved workflow definition
})

export type InvokeRequest = z.infer<typeof InvokeRequestSchema>

// Step result after execution
export const StepResultSchema = z.object({
  id: z.string(),
  status: z.enum(['success', 'blocked', 'failed', 'not_executed', 'skipped', 'aborted']),
  response: z.string(),
  sessionId: z.string(),
  duration: z.number(),
  abortedAt: z.string().optional(),
})

export type StepResult = z.infer<typeof StepResultSchema>

// Invoke response
export const InvokeResponseSchema = z.object({
  threadId: z.string(),
  sessionIds: z.record(z.string(), z.string()), // stepId -> sessionId
  results: z.record(z.string(), z.string()), // stepId -> response
  status: z.enum(['completed', 'partial', 'failed']),
  summary: z
    .object({
      total: z.number(),
      successful: z.number(),
      failed: z.number(),
      blocked: z.number(),
      duration: z.number(),
    })
    .optional(),
})

export type InvokeResponse = z.infer<typeof InvokeResponseSchema>

// Operator analysis result
export const OperatorAnalysisSchema = z.object({
  status: z.enum(['success', 'blocked', 'failed']),
  reason: z.string().optional(),
})

export type OperatorAnalysis = z.infer<typeof OperatorAnalysisSchema>
