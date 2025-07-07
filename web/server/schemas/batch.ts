/**
 * Batch Request Schema
 * 
 * SOLID: Single responsibility - batch validation
 * Configuration: Uses orchestration schema for defaults
 * KISS: Simple validation using Zod
 */

import { z } from 'zod'
import { WaitStrategySchema } from './orchestration'

// Single message in a batch
export const BatchMessageSchema = z.object({
  id: z.string().min(1),
  targetAgentId: z.string().min(1),
  content: z.string().min(1),
  projectId: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  timeout: z.number().min(100).max(600000).optional() // 100ms to 10 minutes
})

export type BatchMessage = z.infer<typeof BatchMessageSchema>

// Batch request
export const BatchRequestSchema = z.object({
  messages: z.array(BatchMessageSchema).min(1).max(100), // At least 1, max 100 messages
  fromAgentId: z.string().min(1),
  projectId: z.string().min(1),
  waitStrategy: WaitStrategySchema,
  concurrency: z.number().min(1).max(50).optional(),
  timeout: z.number().min(100).max(600000).optional(), // Global timeout
  format: z.enum(['json', 'text']).default('json').optional() // Response format
})

export type BatchRequest = z.infer<typeof BatchRequestSchema>

// Batch result
export const BatchResultSchema = z.object({
  id: z.string(),
  status: z.enum(['success', 'error', 'timeout']),
  response: z.unknown().optional(),
  error: z.string().optional(),
  duration: z.number()
})

export type BatchResult = z.infer<typeof BatchResultSchema>

// Batch response
export const BatchResponseSchema = z.object({
  batchId: z.string(),
  waitStrategy: WaitStrategySchema,
  results: z.record(z.string(), BatchResultSchema),
  summary: z.object({
    total: z.number(),
    successful: z.number(),
    failed: z.number(),
    timedOut: z.number(),
    duration: z.number()
  })
})

export type BatchResponse = z.infer<typeof BatchResponseSchema>

// Validate dependencies don't have cycles
export function validateDependencies(messages: BatchMessage[]): string | null {
  const messageIds = new Set(messages.map(m => m.id))
  const visited = new Set<string>()
  const recursionStack = new Set<string>()
  
  function hasCycle(id: string): boolean {
    if (recursionStack.has(id)) return true
    if (visited.has(id)) return false
    
    visited.add(id)
    recursionStack.add(id)
    
    const message = messages.find(m => m.id === id)
    if (message?.dependencies) {
      for (const dep of message.dependencies) {
        if (!messageIds.has(dep)) {
          return false // Invalid dependency, but not a cycle
        }
        if (hasCycle(dep)) return true
      }
    }
    
    recursionStack.delete(id)
    return false
  }
  
  for (const message of messages) {
    if (hasCycle(message.id)) {
      return `Circular dependency detected involving message ${message.id}`
    }
  }
  
  // Check for invalid dependencies
  for (const message of messages) {
    if (message.dependencies) {
      for (const dep of message.dependencies) {
        if (!messageIds.has(dep)) {
          return `Message ${message.id} depends on non-existent message ${dep}`
        }
      }
    }
  }
  
  return null
}