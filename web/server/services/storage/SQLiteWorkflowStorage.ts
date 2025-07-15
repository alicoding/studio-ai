/**
 * SQLite Workflow Storage Implementation
 *
 * SOLID: Single responsibility for SQLite-based workflow storage
 * DRY: Follows patterns from UnifiedAgentConfigService
 * KISS: Simple Drizzle ORM operations, no custom SQL
 * Library-First: Uses Drizzle ORM, prepared for migration
 */

import { getDb } from '../../../../src/lib/storage/database'
import { savedWorkflows } from '../../../../src/lib/storage/schema'
import { eq, desc, inArray } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import type {
  IWorkflowStorage,
  SavedWorkflow,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
} from '../WorkflowStorageInterface'

/**
 * Current SQLite implementation - will be replaced by library when suitable one is found
 * Research scheduled for March 2025 to evaluate WorkflowKit, DAGX, and n8n-core
 */
export class SQLiteWorkflowStorage implements IWorkflowStorage {
  async create(request: CreateWorkflowRequest): Promise<SavedWorkflow> {
    const db = getDb()
    const id = uuidv4()

    // Determine scope:
    // - If scope is explicitly provided, use it
    // - If projectId is 'global' or not provided, use 'global' scope
    // - Otherwise, use 'project' scope
    const scope =
      request.scope || (request.projectId && request.projectId !== 'global' ? 'project' : 'global')

    console.log('[SQLiteWorkflowStorage] Creating workflow with definition:', request.definition)
    console.log('[SQLiteWorkflowStorage] Definition positions:', request.definition.positions)
    console.log('[SQLiteWorkflowStorage] Definition steps:', request.definition.steps)

    const workflow = {
      id,
      projectId: request.projectId, // Now optional
      name: request.name,
      description: request.description,
      definition: JSON.stringify(request.definition),
      createdBy: request.createdBy || 'system',
      tags: JSON.stringify(request.tags || []),
      isTemplate: request.isTemplate || false,
      source: request.source || 'ui',
      scope,
    }

    await db.insert(savedWorkflows).values(workflow)

    const created = await this.getById(id)
    if (!created) {
      throw new Error('Failed to create workflow')
    }
    return created
  }

  async getById(id: string): Promise<SavedWorkflow | null> {
    const db = getDb()
    const result = await db.select().from(savedWorkflows).where(eq(savedWorkflows.id, id)).limit(1)

    if (result.length === 0) return null

    return this.mapToSavedWorkflow(result[0])
  }

  async listByProject(projectId: string): Promise<SavedWorkflow[]> {
    const db = getDb()
    const results = await db
      .select()
      .from(savedWorkflows)
      .where(eq(savedWorkflows.projectId, projectId))
      .orderBy(desc(savedWorkflows.updatedAt))

    return results.map((row) => this.mapToSavedWorkflow(row))
  }

  async update(id: string, updates: UpdateWorkflowRequest): Promise<SavedWorkflow | null> {
    const db = getDb()

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(), // Drizzle expects Date object for timestamp fields
    }

    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.definition !== undefined) {
      updateData.definition = JSON.stringify(updates.definition)
      // Increment version when definition changes
      const current = await this.getById(id)
      updateData.version = (current?.version || 0) + 1
    }
    if (updates.tags !== undefined) updateData.tags = JSON.stringify(updates.tags)
    if (updates.isTemplate !== undefined) updateData.isTemplate = updates.isTemplate

    await db.update(savedWorkflows).set(updateData).where(eq(savedWorkflows.id, id))

    return this.getById(id)
  }

  async delete(id: string): Promise<boolean> {
    const db = getDb()
    const result = await db.delete(savedWorkflows).where(eq(savedWorkflows.id, id))
    return result.changes > 0
  }

  // Optional features (basic implementations for current needs)

  async searchByTags(tags: string[]): Promise<SavedWorkflow[]> {
    if (tags.length === 0) return []

    const db = getDb()
    const results = await db.select().from(savedWorkflows)

    // Filter by tags in JavaScript (SQLite JSON support is limited)
    const filtered = results.filter((row) => {
      const workflowTags = JSON.parse(row.tags || '[]') as string[]
      return tags.some((tag) => workflowTags.includes(tag))
    })

    return filtered.map((row) => this.mapToSavedWorkflow(row))
  }

  async listTemplates(): Promise<SavedWorkflow[]> {
    const db = getDb()
    const results = await db
      .select()
      .from(savedWorkflows)
      .where(eq(savedWorkflows.isTemplate, true))
      .orderBy(desc(savedWorkflows.updatedAt))

    return results.map((row) => this.mapToSavedWorkflow(row))
  }

  async bulkCreate(requests: CreateWorkflowRequest[]): Promise<SavedWorkflow[]> {
    const created: SavedWorkflow[] = []

    // Simple implementation - could be optimized with batch insert
    for (const request of requests) {
      const workflow = await this.create(request)
      created.push(workflow)
    }

    return created
  }

  async bulkDelete(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0

    const db = getDb()
    const result = await db.delete(savedWorkflows).where(inArray(savedWorkflows.id, ids))
    return result.changes
  }

  async healthCheck(): Promise<boolean> {
    try {
      const db = getDb()
      await db.select().from(savedWorkflows).limit(1)
      return true
    } catch {
      return false
    }
  }

  // Scope-based query methods

  async listByScope(scope: 'project' | 'global' | 'cross-project'): Promise<SavedWorkflow[]> {
    const db = getDb()
    const results = await db
      .select()
      .from(savedWorkflows)
      .where(eq(savedWorkflows.scope, scope))
      .orderBy(desc(savedWorkflows.updatedAt))

    return results.map((row) => this.mapToSavedWorkflow(row))
  }

  async listGlobal(): Promise<SavedWorkflow[]> {
    return this.listByScope('global')
  }

  async listCrossProject(projectIds: string[]): Promise<SavedWorkflow[]> {
    if (projectIds.length === 0) return []

    const db = getDb()

    // Get cross-project workflows that belong to any of the specified projects
    const crossProjectResults = await db
      .select()
      .from(savedWorkflows)
      .where(eq(savedWorkflows.scope, 'cross-project'))
      .orderBy(desc(savedWorkflows.updatedAt))

    // Filter by projectIds that have access (could be stored in metadata in future)
    // For now, cross-project workflows are accessible by all projects
    return crossProjectResults.map((row) => this.mapToSavedWorkflow(row))
  }

  /**
   * Map database row to SavedWorkflow interface
   * Handles JSON parsing and type conversion
   */
  private mapToSavedWorkflow(row: Record<string, unknown>): SavedWorkflow {
    // Handle timestamp conversion - database stores Unix seconds, we need ISO strings
    const createdTimestamp = row.createdAt || row.created_at
    const updatedTimestamp = row.updatedAt || row.updated_at

    // Convert Unix seconds to milliseconds (multiply by 1000)
    // Check if timestamp is reasonable (after year 2000 and before year 2100)
    const isValidUnixSeconds = (ts: number) => ts > 946684800 && ts < 4102444800

    return {
      id: row.id as string,
      projectId: (row.projectId || row.project_id) as string | undefined, // Handle both camelCase and snake_case, now optional
      name: row.name as string,
      description: row.description as string | undefined,
      definition: JSON.parse(row.definition as string),
      createdBy: (row.createdBy || row.created_by || 'system') as string,
      createdAt: new Date(
        isValidUnixSeconds(createdTimestamp as number)
          ? (createdTimestamp as number) * 1000
          : (createdTimestamp as number)
      ).toISOString(),
      updatedAt: new Date(
        isValidUnixSeconds(updatedTimestamp as number)
          ? (updatedTimestamp as number) * 1000
          : (updatedTimestamp as number)
      ).toISOString(),
      version: (row.version as number) || 1,
      tags: JSON.parse((row.tags as string) || '[]'),
      isTemplate: Boolean(row.isTemplate || row.is_template),
      source: (row.source as 'ui' | 'mcp' | 'api') || 'ui',
      scope: (row.scope as 'project' | 'global' | 'cross-project') || 'project', // Default to 'project' for backward compatibility
    }
  }
}
