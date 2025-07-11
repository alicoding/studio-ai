/**
 * Workflow Registry - Persistent storage of workflow metadata
 *
 * SOLID: Single responsibility - workflow metadata persistence
 * DRY: Reuses database connection
 * KISS: Simple PostgreSQL table for workflow tracking
 * Library-First: Uses existing database infrastructure
 */

import { getPostgresPool } from './database/postgres'
import type { Pool } from 'pg'

export interface WorkflowMetadata {
  threadId: string
  status: 'running' | 'completed' | 'failed' | 'aborted'
  projectId?: string
  projectName?: string
  startedBy?: string
  invocation?: string
  webhook?: string
  webhookType?: string
  currentStep?: string
  lastUpdate: string
  sessionIds: Record<string, string>
  steps: Array<{
    id: string
    role?: string
    agentId?: string
    task: string
    status: 'pending' | 'running' | 'completed' | 'failed'
    startTime?: string
    endTime?: string
    error?: string
    dependencies?: string[]
  }>
  createdAt: string
}

export class WorkflowRegistry {
  private static instance: WorkflowRegistry
  private pool: Pool
  private initialized = false

  private constructor() {
    this.pool = getPostgresPool()
  }

  static getInstance(): WorkflowRegistry {
    if (!WorkflowRegistry.instance) {
      WorkflowRegistry.instance = new WorkflowRegistry()
    }
    return WorkflowRegistry.instance
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Create workflow registry table if it doesn't exist
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS workflow_registry (
          thread_id VARCHAR(255) PRIMARY KEY,
          status VARCHAR(50) NOT NULL,
          project_id VARCHAR(255),
          project_name VARCHAR(255),
          started_by VARCHAR(255),
          invocation TEXT,
          webhook TEXT,
          webhook_type VARCHAR(100),
          current_step VARCHAR(255),
          last_update TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          session_ids JSONB DEFAULT '{}',
          steps JSONB DEFAULT '[]',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Create index on status for filtering
      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_workflow_status ON workflow_registry(status)
      `)

      // Create index on project_id for filtering
      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_workflow_project ON workflow_registry(project_id)
      `)

      // Create index on last_update for sorting
      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_workflow_last_update ON workflow_registry(last_update DESC)
      `)

      this.initialized = true
      console.log('[WorkflowRegistry] Database tables initialized')
    } catch (error) {
      console.error('[WorkflowRegistry] Failed to initialize:', error)
      throw error
    }
  }

  async registerWorkflow(metadata: Omit<WorkflowMetadata, 'createdAt'>): Promise<void> {
    await this.initialize()

    try {
      await this.pool.query(
        `INSERT INTO workflow_registry 
         (thread_id, status, project_id, project_name, started_by, invocation, 
          webhook, webhook_type, current_step, last_update, session_ids, steps)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (thread_id) 
         DO UPDATE SET 
           status = EXCLUDED.status,
           current_step = EXCLUDED.current_step,
           last_update = EXCLUDED.last_update,
           session_ids = EXCLUDED.session_ids,
           steps = EXCLUDED.steps`,
        [
          metadata.threadId,
          metadata.status,
          metadata.projectId,
          metadata.projectName,
          metadata.startedBy,
          metadata.invocation,
          metadata.webhook,
          metadata.webhookType,
          metadata.currentStep,
          metadata.lastUpdate,
          JSON.stringify(metadata.sessionIds),
          JSON.stringify(metadata.steps),
        ]
      )
    } catch (error) {
      console.error('[WorkflowRegistry] Failed to register workflow:', error)
      throw error
    }
  }

  async updateWorkflow(
    threadId: string,
    updates: Partial<Omit<WorkflowMetadata, 'threadId' | 'createdAt'>>
  ): Promise<void> {
    await this.initialize()

    const setClauses: string[] = []
    const values: (string | Record<string, unknown>)[] = []
    let paramIndex = 1

    // Build dynamic UPDATE query
    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`)
      values.push(updates.status)
    }
    if (updates.currentStep !== undefined) {
      setClauses.push(`current_step = $${paramIndex++}`)
      values.push(updates.currentStep)
    }
    if (updates.sessionIds !== undefined) {
      setClauses.push(`session_ids = $${paramIndex++}`)
      values.push(JSON.stringify(updates.sessionIds))
    }
    if (updates.steps !== undefined) {
      setClauses.push(`steps = $${paramIndex++}`)
      values.push(JSON.stringify(updates.steps))
    }

    // Always update last_update
    setClauses.push(`last_update = CURRENT_TIMESTAMP`)

    if (setClauses.length === 0) return

    values.push(threadId)

    try {
      await this.pool.query(
        `UPDATE workflow_registry SET ${setClauses.join(', ')} WHERE thread_id = $${paramIndex}`,
        values
      )
    } catch (error) {
      console.error('[WorkflowRegistry] Failed to update workflow:', error)
      throw error
    }
  }

  async listWorkflows(filter?: {
    status?: string
    projectId?: string
    limit?: number
  }): Promise<WorkflowMetadata[]> {
    await this.initialize()

    const whereClauses: string[] = []
    const values: string[] = []
    let paramIndex = 1

    if (filter?.status) {
      whereClauses.push(`status = $${paramIndex++}`)
      values.push(filter.status)
    }
    if (filter?.projectId) {
      whereClauses.push(`project_id = $${paramIndex++}`)
      values.push(filter.projectId)
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''
    const limitClause = filter?.limit ? `LIMIT ${filter.limit}` : ''

    try {
      const result = await this.pool.query(
        `SELECT * FROM workflow_registry 
         ${whereClause} 
         ORDER BY last_update DESC 
         ${limitClause}`,
        values
      )

      return result.rows.map((row) => ({
        threadId: row.thread_id,
        status: row.status,
        projectId: row.project_id,
        projectName: row.project_name,
        startedBy: row.started_by,
        invocation: row.invocation,
        webhook: row.webhook,
        webhookType: row.webhook_type,
        currentStep: row.current_step,
        lastUpdate: row.last_update.toISOString(),
        sessionIds: row.session_ids || {},
        steps: row.steps || [],
        createdAt: row.created_at.toISOString(),
      }))
    } catch (error) {
      console.error('[WorkflowRegistry] Failed to list workflows:', error)
      throw error
    }
  }

  async getWorkflow(threadId: string): Promise<WorkflowMetadata | null> {
    await this.initialize()

    try {
      const result = await this.pool.query('SELECT * FROM workflow_registry WHERE thread_id = $1', [
        threadId,
      ])

      if (result.rows.length === 0) return null

      const row = result.rows[0]
      return {
        threadId: row.thread_id,
        status: row.status,
        projectId: row.project_id,
        projectName: row.project_name,
        startedBy: row.started_by,
        invocation: row.invocation,
        webhook: row.webhook,
        webhookType: row.webhook_type,
        currentStep: row.current_step,
        lastUpdate: row.last_update.toISOString(),
        sessionIds: row.session_ids || {},
        steps: row.steps || [],
        createdAt: row.created_at.toISOString(),
      }
    } catch (error) {
      console.error('[WorkflowRegistry] Failed to get workflow:', error)
      throw error
    }
  }

  async deleteWorkflow(threadId: string): Promise<void> {
    await this.initialize()

    try {
      console.log('[WorkflowRegistry] Attempting to delete workflow:', threadId)
      const result = await this.pool.query('DELETE FROM workflow_registry WHERE thread_id = $1', [
        threadId,
      ])
      console.log('[WorkflowRegistry] Delete result - rowCount:', result.rowCount)

      if (result.rowCount === 0) {
        console.warn('[WorkflowRegistry] No rows deleted - workflow may not exist:', threadId)
      } else {
        console.log('[WorkflowRegistry] Successfully deleted workflow:', threadId)
      }
    } catch (error) {
      console.error('[WorkflowRegistry] Failed to delete workflow:', error)
      throw error
    }
  }

  async cleanupOldWorkflows(daysOld = 30): Promise<number> {
    await this.initialize()

    try {
      const result = await this.pool.query(
        `DELETE FROM workflow_registry 
         WHERE last_update < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'
         AND status != 'running'`
      )
      return result.rowCount || 0
    } catch (error) {
      console.error('[WorkflowRegistry] Failed to cleanup old workflows:', error)
      throw error
    }
  }
}
