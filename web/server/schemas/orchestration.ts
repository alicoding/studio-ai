/**
 * Orchestration Configuration Schema
 * 
 * SOLID: Single responsibility - only defines orchestration config
 * Configuration: All features configurable via this schema
 * KISS: Simple, clear structure using Zod
 */

import { z } from 'zod'

// Wait strategies for batch operations
export const WaitStrategySchema = z.enum(['all', 'any', 'none'])
export type WaitStrategy = z.infer<typeof WaitStrategySchema>

// Cross-project permission modes
export const CrossProjectModeSchema = z.enum(['all', 'none', 'explicit'])
export type CrossProjectMode = z.infer<typeof CrossProjectModeSchema>

// Default configuration values
export const OrchestrationDefaultsSchema = z.object({
  mentionTimeout: z.number().min(1000).max(300000).default(30000), // 1s to 5m, default 30s
  batchTimeout: z.number().min(1000).max(600000).default(60000), // 1s to 10m, default 60s
  maxBatchSize: z.number().min(1).max(100).default(10),
  waitStrategy: WaitStrategySchema.default('all'),
  maxConcurrentBatches: z.number().min(1).max(50).default(5),
  responseCleanupInterval: z.number().min(30000).max(300000).default(60000), // 30s to 5m
  maxPendingResponses: z.number().min(10).max(1000).default(100)
})

export type OrchestrationDefaults = z.infer<typeof OrchestrationDefaultsSchema>

// Project-specific configuration
export const ProjectOrchestrationConfigSchema = z.object({
  allowCrossProject: z.boolean().default(false),
  allowedTargets: z.array(z.string()).default([]),
  customTimeout: z.number().min(1000).max(300000).optional(),
  maxBatchSize: z.number().min(1).max(100).optional(),
  waitStrategy: WaitStrategySchema.optional(),
  disabled: z.boolean().default(false)
})

export type ProjectOrchestrationConfig = z.infer<typeof ProjectOrchestrationConfigSchema>

// Global permissions
export const OrchestrationPermissionsSchema = z.object({
  crossProjectMentions: CrossProjectModeSchema.default('none'),
  batchOperations: z.boolean().default(true),
  maxGlobalConcurrency: z.number().min(1).max(100).default(20),
  requireExplicitWait: z.boolean().default(false), // If true, wait mode must be explicitly set
  allowTimeoutOverride: z.boolean().default(true)
})

export type OrchestrationPermissions = z.infer<typeof OrchestrationPermissionsSchema>

// Rate limiting configuration
export const RateLimitConfigSchema = z.object({
  enabled: z.boolean().default(false),
  messagesPerMinute: z.number().min(1).max(1000).default(60),
  messagesPerHour: z.number().min(1).max(10000).default(600),
  burstSize: z.number().min(1).max(100).default(10)
})

export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>

// Complete orchestration configuration
export const OrchestrationConfigSchema = z.object({
  defaults: OrchestrationDefaultsSchema.default({}),
  projects: z.record(z.string(), ProjectOrchestrationConfigSchema).default({}),
  permissions: OrchestrationPermissionsSchema.default({}),
  rateLimit: RateLimitConfigSchema.default({}),
  enabled: z.boolean().default(true)
})

export type OrchestrationConfig = z.infer<typeof OrchestrationConfigSchema>

// Helper function to get project-specific config with defaults
export function getProjectConfig(
  config: OrchestrationConfig,
  projectId: string
): Required<ProjectOrchestrationConfig> & { defaults: OrchestrationDefaults } {
  const projectConfig = config.projects[projectId] || {}
  
  return {
    allowCrossProject: projectConfig.allowCrossProject ?? false,
    allowedTargets: projectConfig.allowedTargets ?? [],
    customTimeout: projectConfig.customTimeout ?? config.defaults.mentionTimeout,
    maxBatchSize: projectConfig.maxBatchSize ?? config.defaults.maxBatchSize,
    waitStrategy: projectConfig.waitStrategy ?? config.defaults.waitStrategy,
    disabled: projectConfig.disabled ?? false,
    defaults: config.defaults
  }
}

// Validate cross-project permission
export function canMentionCrossProject(
  config: OrchestrationConfig,
  fromProjectId: string,
  toProjectId: string
): boolean {
  if (fromProjectId === toProjectId) return true
  
  const permissions = config.permissions
  
  switch (permissions.crossProjectMentions) {
    case 'all':
      return true
    case 'none':
      return false
    case 'explicit':
      const projectConfig = config.projects[fromProjectId]
      return projectConfig?.allowCrossProject === true &&
             projectConfig.allowedTargets.includes(toProjectId)
  }
}

// Default configuration factory
export function createDefaultConfig(): OrchestrationConfig {
  return OrchestrationConfigSchema.parse({})
}