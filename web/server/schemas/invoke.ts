/**
 * Invoke API Schema - Unified agent invocation
 *
 * SOLID: Single responsibility - invocation validation
 * DRY: Unified schema for single/multi agent workflows
 * KISS: Simple step structure with optional fields
 * Configuration: All fields configurable, no hardcoded values
 */

import { z } from 'zod'

// Single workflow step
export const WorkflowStepSchema = z
  .object({
    id: z.string().optional(), // Auto-generated if not provided
    role: z.string().min(1).optional(), // Legacy: Role name from agent configs
    agentId: z.string().min(1).optional(), // New: Short agent ID (e.g., dev_01)
    task: z.string().min(1), // Task with template variables
    sessionId: z.string().optional(), // Resume specific session
    deps: z.array(z.string()).optional(), // Dependencies on other steps
  })
  .refine((data) => data.role || data.agentId, {
    message: "Either 'role' or 'agentId' must be provided",
  })

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
