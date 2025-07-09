/**
 * Unified Agent Configuration Service
 *
 * SOLID: Single responsibility for agent config management
 * DRY: Eliminates duplicate agent config handling across services
 * KISS: Simple interface for agent config CRUD operations
 * Library-First: Uses Drizzle ORM for type-safe database operations
 */

import { getDb } from '../../../src/lib/storage/database'
import { agentConfigs, agentRoleAssignments } from '../../../src/lib/storage/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { ToolPermissionService } from './ToolPermissionService'
import type { ToolPermission } from '../../../src/types/tool-permissions'

export interface AgentConfig {
  id: string
  name: string
  role: string
  systemPrompt: string
  tools: string[] | ToolPermission[]
  model: string
  maxTokens?: number
  temperature?: number
  createdAt: string
  updatedAt: string
}

export interface AgentRoleAssignment {
  id: string
  projectId: string
  role: string
  agentConfigId: string
  customTools?: string[] | ToolPermission[]
  hasCustomTools: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateAgentConfigRequest {
  id?: string
  name: string
  role: string
  systemPrompt: string
  tools?: string[] | ToolPermission[]
  model?: string
  maxTokens?: number
  temperature?: number
}

export interface UpdateAgentConfigRequest {
  name?: string
  role?: string
  systemPrompt?: string
  tools?: string[] | ToolPermission[]
  model?: string
  maxTokens?: number
  temperature?: number
}

export interface AssignRoleRequest {
  projectId: string
  role: string
  agentConfigId: string
  customTools?: string[] | ToolPermission[]
  hasCustomTools?: boolean
}

/**
 * Service for managing agent configurations and role assignments in SQLite
 */
export class UnifiedAgentConfigService {
  private static instance: UnifiedAgentConfigService
  private cache = new Map<string, AgentConfig>()
  private roleCache = new Map<string, AgentRoleAssignment[]>()
  private cacheExpiry = 5 * 60 * 1000 // 5 minutes
  private toolPermissionService: ToolPermissionService

  private constructor() {
    // Database connection is handled per-operation
    try {
      this.toolPermissionService = ToolPermissionService.getInstance()
      console.log('ToolPermissionService initialized successfully:', !!this.toolPermissionService)
    } catch (error) {
      console.error('Failed to initialize ToolPermissionService:', error)
      throw error
    }
  }

  private getDatabase() {
    return getDb()
  }

  static getInstance(): UnifiedAgentConfigService {
    if (!UnifiedAgentConfigService.instance) {
      UnifiedAgentConfigService.instance = new UnifiedAgentConfigService()
    }
    return UnifiedAgentConfigService.instance
  }

  /**
   * Get all agent configurations
   */
  async getAllConfigs(): Promise<AgentConfig[]> {
    const db = this.getDatabase()
    const configs = await db.select().from(agentConfigs).orderBy(agentConfigs.updatedAt)

    return configs.map((config) => this.mapConfigFromDb(config))
  }

  /**
   * Get agent configuration by ID
   */
  async getConfig(id: string): Promise<AgentConfig | null> {
    // Check cache first
    const cached = this.cache.get(id)
    if (cached) {
      return cached
    }

    const db = this.getDatabase()
    const configs = await db.select().from(agentConfigs).where(eq(agentConfigs.id, id))

    if (configs.length === 0) {
      return null
    }

    const config = this.mapConfigFromDb(configs[0])

    // Cache the result
    this.cache.set(id, config)
    setTimeout(() => this.cache.delete(id), this.cacheExpiry)

    return config
  }

  /**
   * Get multiple agent configurations by IDs (batch operation)
   */
  async getBatchConfigs(ids: string[]): Promise<AgentConfig[]> {
    if (ids.length === 0) return []

    const db = this.getDatabase()
    // Use IN clause for efficient batch lookup
    const configs = await db.select().from(agentConfigs).where(inArray(agentConfigs.id, ids))

    return configs.map((config) => this.mapConfigFromDb(config))
  }

  /**
   * Create new agent configuration
   */
  async createConfig(request: CreateAgentConfigRequest): Promise<AgentConfig> {
    const id = request.id || uuidv4()
    const now = new Date().toISOString()

    const newConfig = {
      id,
      name: request.name,
      role: request.role,
      systemPrompt: request.systemPrompt,
      tools: JSON.stringify(request.tools || ['read', 'write', 'bash']),
      model: request.model || 'claude-3-opus',
      maxTokens: request.maxTokens || 200000,
      temperature: String(request.temperature || 0.7),
      createdAt: new Date(now),
      updatedAt: new Date(now),
    }

    const db = this.getDatabase()
    await db.insert(agentConfigs).values(newConfig)

    // Clear cache
    this.cache.clear()

    return this.mapConfigFromDb(newConfig)
  }

  /**
   * Update agent configuration
   */
  async updateConfig(id: string, request: UpdateAgentConfigRequest): Promise<AgentConfig | null> {
    const existing = await this.getConfig(id)
    if (!existing) {
      return null
    }

    const updates: Partial<typeof agentConfigs.$inferInsert> = {
      updatedAt: new Date(),
    }

    if (request.name !== undefined) updates.name = request.name
    if (request.role !== undefined) updates.role = request.role
    if (request.systemPrompt !== undefined) updates.systemPrompt = request.systemPrompt
    if (request.tools !== undefined) {
      // Handle both string[] and ToolPermission[] formats
      if (Array.isArray(request.tools) && request.tools.length > 0) {
        if (typeof request.tools[0] === 'string') {
          // Already string array
          updates.tools = JSON.stringify(request.tools)
        } else {
          // ToolPermission array - serialize it
          updates.tools = this.toolPermissionService.serializePermissions(
            request.tools as ToolPermission[]
          )
        }
      } else {
        updates.tools = JSON.stringify([])
      }
    }
    if (request.model !== undefined) updates.model = request.model
    if (request.maxTokens !== undefined) updates.maxTokens = request.maxTokens
    if (request.temperature !== undefined) updates.temperature = String(request.temperature)

    const db = this.getDatabase()
    await db.update(agentConfigs).set(updates).where(eq(agentConfigs.id, id))

    // Clear cache
    this.cache.delete(id)

    return await this.getConfig(id)
  }

  /**
   * Delete agent configuration
   */
  async deleteConfig(id: string): Promise<boolean> {
    const db = this.getDatabase()

    // First remove any role assignments using this config
    await db.delete(agentRoleAssignments).where(eq(agentRoleAssignments.agentConfigId, id))

    // Then delete the config
    await db.delete(agentConfigs).where(eq(agentConfigs.id, id))

    // Clear cache
    this.cache.delete(id)
    this.roleCache.clear()

    return true
  }

  /**
   * Assign agent config to role in project
   */
  async assignRole(request: AssignRoleRequest): Promise<AgentRoleAssignment> {
    const id = uuidv4()
    const now = new Date().toISOString()

    const assignment = {
      id,
      projectId: request.projectId,
      role: request.role,
      agentConfigId: request.agentConfigId,
      customTools: request.customTools ? JSON.stringify(request.customTools) : null,
      hasCustomTools: request.hasCustomTools || false,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    }

    const db = this.getDatabase()

    // Use upsert pattern - delete existing and insert new
    await db
      .delete(agentRoleAssignments)
      .where(
        and(
          eq(agentRoleAssignments.projectId, request.projectId),
          eq(agentRoleAssignments.role, request.role)
        )
      )

    await db.insert(agentRoleAssignments).values(assignment)

    // Clear role cache
    this.roleCache.delete(request.projectId)

    return this.mapRoleAssignmentFromDb(assignment)
  }

  /**
   * Get role assignments for project
   */
  async getProjectRoleAssignments(projectId: string): Promise<AgentRoleAssignment[]> {
    // Check cache first
    const cached = this.roleCache.get(projectId)
    if (cached) {
      return cached
    }

    const db = this.getDatabase()
    const assignments = await db
      .select()
      .from(agentRoleAssignments)
      .where(eq(agentRoleAssignments.projectId, projectId))
      .orderBy(agentRoleAssignments.role)

    const result = assignments.map(this.mapRoleAssignmentFromDb)

    // Cache the result
    this.roleCache.set(projectId, result)
    setTimeout(() => this.roleCache.delete(projectId), this.cacheExpiry)

    return result
  }

  /**
   * Get role assignments for multiple projects (batch operation)
   */
  async getBatchProjectRoleAssignments(
    projectIds: string[]
  ): Promise<Map<string, AgentRoleAssignment[]>> {
    const result = new Map<string, AgentRoleAssignment[]>()

    for (const projectId of projectIds) {
      const assignments = await this.getProjectRoleAssignments(projectId)
      result.set(projectId, assignments)
    }

    return result
  }

  /**
   * Get role assignment for specific role in project
   */
  async getRoleAssignment(projectId: string, role: string): Promise<AgentRoleAssignment | null> {
    const db = this.getDatabase()
    const assignments = await db
      .select()
      .from(agentRoleAssignments)
      .where(
        and(eq(agentRoleAssignments.projectId, projectId), eq(agentRoleAssignments.role, role))
      )

    if (assignments.length === 0) {
      return null
    }

    return this.mapRoleAssignmentFromDb(assignments[0])
  }

  /**
   * Remove role assignment
   */
  async removeRoleAssignment(projectId: string, role: string): Promise<boolean> {
    const db = this.getDatabase()
    await db
      .delete(agentRoleAssignments)
      .where(
        and(eq(agentRoleAssignments.projectId, projectId), eq(agentRoleAssignments.role, role))
      )

    // Clear role cache
    this.roleCache.delete(projectId)

    return true
  }

  /**
   * Clear all caches (for testing or manual refresh)
   */
  clearCache(): void {
    this.cache.clear()
    this.roleCache.clear()
  }

  /**
   * Map database record to AgentConfig interface
   */
  private mapConfigFromDb(dbRecord: typeof agentConfigs.$inferSelect): AgentConfig {
    // Parse tools with fallback
    let tools: string[] | ToolPermission[]
    try {
      if (this.toolPermissionService) {
        tools = this.toolPermissionService.parseTools(dbRecord.tools)
      } else {
        // Fallback parsing without service
        if (typeof dbRecord.tools === 'string') {
          tools = JSON.parse(dbRecord.tools)
        } else {
          tools = dbRecord.tools as string[] | ToolPermission[]
        }
      }
    } catch (error) {
      console.error('Error parsing tools:', error)
      tools = [] // Safe fallback
    }

    // Handle timestamp conversion safely
    const now = new Date().toISOString()
    let createdAt = now
    let updatedAt = now

    try {
      if (dbRecord.createdAt) {
        createdAt = new Date(dbRecord.createdAt).toISOString()
      }
    } catch (_error) {
      console.warn(`Invalid createdAt timestamp for agent ${dbRecord.id}, using current time`)
    }

    try {
      if (dbRecord.updatedAt) {
        updatedAt = new Date(dbRecord.updatedAt).toISOString()
      }
    } catch (_error) {
      console.warn(`Invalid updatedAt timestamp for agent ${dbRecord.id}, using current time`)
    }

    return {
      id: dbRecord.id,
      name: dbRecord.name,
      role: dbRecord.role,
      systemPrompt: dbRecord.systemPrompt,
      tools,
      model: dbRecord.model,
      maxTokens: dbRecord.maxTokens ?? 200000,
      temperature: parseFloat(dbRecord.temperature ?? '0.7'),
      createdAt,
      updatedAt,
    }
  }

  /**
   * Map database record to AgentRoleAssignment interface
   */
  private mapRoleAssignmentFromDb(
    dbRecord: typeof agentRoleAssignments.$inferSelect
  ): AgentRoleAssignment {
    return {
      id: dbRecord.id,
      projectId: dbRecord.projectId ?? '',
      role: dbRecord.role,
      agentConfigId: dbRecord.agentConfigId ?? '',
      customTools: dbRecord.customTools ? JSON.parse(dbRecord.customTools) : undefined,
      hasCustomTools: dbRecord.hasCustomTools ?? false,
      createdAt: dbRecord.createdAt ? dbRecord.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: dbRecord.updatedAt ? dbRecord.updatedAt.toISOString() : new Date().toISOString(),
    }
  }

  /**
   * Get effective tool permissions for an agent in a project
   */
  async getEffectiveToolPermissions(projectId: string, role: string): Promise<ToolPermission[]> {
    // Get role assignment
    const assignments = await this.getProjectRoleAssignments(projectId)
    const assignment = assignments.find((a: AgentRoleAssignment) => a.role === role)

    if (!assignment) {
      return []
    }

    // Get base agent config
    const agentConfig = await this.getConfig(assignment.agentConfigId)
    if (!agentConfig) {
      return []
    }

    // Parse base tools
    const baseTools = this.toolPermissionService.parseTools(agentConfig.tools)

    // Merge with custom tools if any
    if (assignment.hasCustomTools && assignment.customTools) {
      const customTools = this.toolPermissionService.parseTools(assignment.customTools)
      return this.toolPermissionService.mergeToolPermissions(baseTools, customTools)
    }

    return baseTools
  }

  /**
   * Update tool permissions for an agent config
   */
  async updateToolPermissions(
    agentConfigId: string,
    tools: ToolPermission[]
  ): Promise<AgentConfig | null> {
    // Convert ToolPermission[] to the format expected by updateConfig
    // We pass the ToolPermission[] directly - updateConfig will handle serialization
    const updates: UpdateAgentConfigRequest = {
      tools: tools,
    }

    return this.updateConfig(agentConfigId, updates)
  }

  /**
   * Apply a permission preset to an agent
   */
  async applyPermissionPreset(
    agentConfigId: string,
    presetName: string
  ): Promise<AgentConfig | null> {
    const config = await this.getConfig(agentConfigId)
    if (!config) {
      return null
    }

    // Get current tool names
    const currentTools = this.toolPermissionService.getEnabledToolNames(
      this.toolPermissionService.parseTools(config.tools)
    )

    // Apply preset
    const newPermissions = this.toolPermissionService.applyPresetToRole(presetName, currentTools)

    return this.updateToolPermissions(agentConfigId, newPermissions)
  }

  /**
   * Ensure all agent configurations have proper tool permissions
   * This method can be called manually to run the tool permissions migration
   */
  async ensureToolPermissions(): Promise<{
    updatedCount: number
    alreadyMigratedCount: number
    errorCount: number
    totalProcessed: number
  }> {
    const configs = await this.getAllConfigs()

    const stats = {
      updatedCount: 0,
      alreadyMigratedCount: 0,
      errorCount: 0,
      totalProcessed: configs.length,
    }

    for (const config of configs) {
      try {
        // Parse current tools using the service
        const currentTools = this.toolPermissionService.parseTools(config.tools)

        // Check if tools are in old string[] format or empty
        let needsUpdate = false
        if (Array.isArray(currentTools)) {
          // Check if first element is a string (old format) or already ToolPermission object
          if (currentTools.length === 0 || typeof currentTools[0] === 'string') {
            needsUpdate = true
          } else if (typeof currentTools[0] === 'object' && 'name' in currentTools[0]) {
            stats.alreadyMigratedCount++
          } else {
            needsUpdate = true
          }
        } else {
          needsUpdate = true
        }

        if (needsUpdate) {
          // Apply read-only preset as default
          const updatedConfig = await this.applyPermissionPreset(config.id, 'read_only')
          if (updatedConfig) {
            stats.updatedCount++
          } else {
            stats.errorCount++
          }
        }
      } catch (error) {
        console.error(`Error processing agent ${config.name}:`, error)
        stats.errorCount++
      }
    }

    return stats
  }
}
