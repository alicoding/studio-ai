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
    // Conditional step fields (only for type: 'conditional')
    type: z.enum(['task', 'conditional', 'parallel']).optional().default('task'),
    condition: WorkflowConditionSchema.optional(), // Structured condition or legacy JavaScript expression
    trueBranch: z.string().optional(), // Step ID to execute if condition is true
    falseBranch: z.string().optional(), // Step ID to execute if condition is false
  })
  .refine((data) => data.role || data.agentId || data.type === 'conditional', {
    message: "Either 'role' or 'agentId' must be provided (except for conditional steps)",
  })
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
