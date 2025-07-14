/**
 * Approval Orchestrator - Core service for managing workflow approvals
 *
 * SOLID: Single responsibility - manages approval lifecycle
 * DRY: Centralized approval logic used across the system
 * KISS: Simple CRUD operations with clear business logic
 * Library-First: Uses existing database service and types
 */

import { DatabaseService } from '../lib/storage/DatabaseService'
import type {
  WorkflowApproval,
  ApprovalDecisionRecord,
  CreateApprovalRequest,
  ApprovalDecisionRequest,
  ApprovalStatus,
  EnrichedApproval,
  ApprovalListResponse,
} from '../schemas/approval-types'

// Database row types for better-sqlite3 results
interface ApprovalRow {
  id: string
  thread_id: string
  step_id: string
  project_id: string | null
  workflow_name: string | null
  prompt: string
  context_data: string | null
  risk_level: string
  requested_at: string
  timeout_seconds: number
  expires_at: string
  status: string
  resolved_at: string | null
  resolved_by: string | null
  approval_required: number
  auto_approve_after_timeout: number
  escalation_user_id: string | null
  created_at: string
  updated_at: string
}

interface DecisionRow {
  id: string
  approval_id: string
  decision: string
  comment: string | null
  reasoning: string | null
  confidence_level: number | null
  decided_by: string
  decided_at: string
  workflow_state: string | null
  user_agent: string | null
  ip_address: string | null
  created_at: string
}

interface CountResult {
  total: number
}

interface NotificationResult {
  count: number
  lastSent: string | null
}

interface SummaryRow {
  status: string
  count: number
  is_overdue: number
}

export class ApprovalOrchestrator {
  private db = DatabaseService.getInstance()

  /**
   * Create a new approval request
   * SOLID: Single responsibility - approval creation only
   */
  async createApproval(request: CreateApprovalRequest): Promise<WorkflowApproval> {
    const now = new Date().toISOString()
    const timeoutSeconds = request.timeoutSeconds || 3600 // 1 hour default
    const expiresAt = new Date(Date.now() + timeoutSeconds * 1000).toISOString()

    const approvalId = this.generateId()

    const approval: Omit<WorkflowApproval, 'id'> = {
      threadId: request.threadId,
      stepId: request.stepId,
      projectId: request.projectId,
      workflowName: request.workflowName,
      prompt: request.prompt,
      contextData: request.contextData ? JSON.stringify(request.contextData) : undefined,
      riskLevel: request.riskLevel || 'medium',
      requestedAt: now,
      timeoutSeconds,
      expiresAt,
      status: 'pending',
      approvalRequired: request.approvalRequired ?? true,
      autoApproveAfterTimeout: request.autoApproveAfterTimeout ?? false,
      escalationUserId: request.escalationUserId,
      createdAt: now,
      updatedAt: now,
    }

    const stmt = this.db.prepare(`
      INSERT INTO workflow_approvals (
        id, thread_id, step_id, project_id, workflow_name,
        prompt, context_data, risk_level, requested_at, timeout_seconds,
        expires_at, status, approval_required, auto_approve_after_timeout,
        escalation_user_id, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `)

    stmt.run(
      approvalId,
      approval.threadId,
      approval.stepId,
      approval.projectId,
      approval.workflowName,
      approval.prompt,
      approval.contextData,
      approval.riskLevel,
      approval.requestedAt,
      approval.timeoutSeconds,
      approval.expiresAt,
      approval.status,
      approval.approvalRequired ? 1 : 0,
      approval.autoApproveAfterTimeout ? 1 : 0,
      approval.escalationUserId,
      approval.createdAt,
      approval.updatedAt
    )

    return { id: approvalId, ...approval }
  }

  /**
   * Get approval by ID with optional context enrichment
   * SOLID: Single responsibility - approval retrieval
   */
  async getApproval(
    id: string,
    enriched = false
  ): Promise<EnrichedApproval | WorkflowApproval | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM workflow_approvals WHERE id = ?
    `)

    const row = stmt.get(id) as ApprovalRow | undefined
    if (!row) return null

    const approval = this.mapRowToApproval(row)

    if (!enriched) return approval

    // Enrich with additional context for UI
    const contextData = approval.contextData ? JSON.parse(approval.contextData) : {}
    const now = Date.now()
    const expiresAt = new Date(approval.expiresAt).getTime()
    const timeRemaining = Math.max(0, Math.floor((expiresAt - now) / 1000))
    const isOverdue = now > expiresAt && approval.status === 'pending'

    // Get notification count
    const notificationStmt = this.db.prepare(`
      SELECT COUNT(*) as count, MAX(created_at) as lastSent
      FROM approval_notifications WHERE approval_id = ?
    `)
    const notificationResult = notificationStmt.get(id) as NotificationResult | undefined

    // Get decision if exists
    const decisionStmt = this.db.prepare(`
      SELECT * FROM approval_decisions WHERE approval_id = ? ORDER BY decided_at DESC LIMIT 1
    `)
    const decisionRow = decisionStmt.get(id) as DecisionRow | undefined
    const decision = decisionRow ? this.mapRowToDecision(decisionRow) : undefined

    return {
      ...approval,
      contextData,
      timeRemaining,
      isOverdue,
      notificationsSent: notificationResult?.count || 0,
      lastNotificationAt: notificationResult?.lastSent,
      decision,
    } as EnrichedApproval
  }

  /**
   * Process approval decision and update status
   * SOLID: Single responsibility - decision processing
   */
  async processDecision(
    approvalId: string,
    decision: ApprovalDecisionRequest
  ): Promise<ApprovalDecisionRecord> {
    const approval = await this.getApproval(approvalId)
    if (!approval) {
      throw new Error(`Approval ${approvalId} not found`)
    }

    if (approval.status !== 'pending') {
      throw new Error(`Approval ${approvalId} is already ${approval.status}`)
    }

    const now = new Date().toISOString()
    const decisionId = this.generateId()

    // Create decision record
    const decisionRecord: Omit<ApprovalDecisionRecord, 'id'> = {
      approvalId,
      decision: decision.decision,
      comment: decision.comment,
      reasoning: decision.reasoning,
      confidenceLevel: decision.confidenceLevel,
      decidedBy: decision.decidedBy,
      decidedAt: now,
      workflowState: undefined, // TODO: Get from workflow state
      userAgent: undefined, // TODO: Get from request
      ipAddress: undefined, // TODO: Get from request
      createdAt: now,
    }

    // Start transaction
    const transaction = this.db.transaction(() => {
      // Insert decision record
      const decisionStmt = this.db.prepare(`
        INSERT INTO approval_decisions (
          id, approval_id, decision, comment, reasoning, confidence_level,
          decided_by, decided_at, workflow_state, user_agent, ip_address, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      decisionStmt.run(
        decisionId,
        decisionRecord.approvalId,
        decisionRecord.decision,
        decisionRecord.comment,
        decisionRecord.reasoning,
        decisionRecord.confidenceLevel,
        decisionRecord.decidedBy,
        decisionRecord.decidedAt,
        decisionRecord.workflowState,
        decisionRecord.userAgent,
        decisionRecord.ipAddress,
        decisionRecord.createdAt
      )

      // Update approval status
      const updateStmt = this.db.prepare(`
        UPDATE workflow_approvals 
        SET status = ?, resolved_at = ?, resolved_by = ?, updated_at = ?
        WHERE id = ?
      `)

      updateStmt.run(
        decision.decision === 'approved' ? 'approved' : 'rejected',
        now,
        decision.decidedBy,
        now,
        approvalId
      )
    })

    transaction()

    return { id: decisionId, ...decisionRecord }
  }

  /**
   * List approvals with filtering and pagination
   * SOLID: Single responsibility - approval listing
   */
  async listApprovals(
    options: {
      projectId?: string
      status?: ApprovalStatus[]
      page?: number
      pageSize?: number
      enriched?: boolean
    } = {}
  ): Promise<ApprovalListResponse> {
    const { projectId, status = [], page = 1, pageSize = 20 } = options

    let whereClause = ''
    const params: (string | number)[] = []

    if (projectId) {
      whereClause += 'WHERE project_id = ?'
      params.push(projectId)
    }

    if (status.length > 0) {
      const statusPlaceholders = status.map(() => '?').join(',')
      whereClause += whereClause ? ' AND ' : 'WHERE '
      whereClause += `status IN (${statusPlaceholders})`
      params.push(...status)
    }

    const offset = (page - 1) * pageSize

    // Get total count
    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as total FROM workflow_approvals ${whereClause}
    `)
    const { total } = countStmt.get(...params) as CountResult

    // Get approvals
    const stmt = this.db.prepare(`
      SELECT * FROM workflow_approvals ${whereClause}
      ORDER BY requested_at DESC
      LIMIT ? OFFSET ?
    `)

    const rows = stmt.all(...params, pageSize, offset) as ApprovalRow[]
    const approvals = rows.map((row) => this.mapRowToApproval(row))

    // Get summary statistics
    const summaryStmt = this.db.prepare(`
      SELECT 
        status,
        COUNT(*) as count,
        CASE WHEN status = 'pending' AND datetime('now') > expires_at THEN 1 ELSE 0 END as is_overdue
      FROM workflow_approvals 
      ${projectId ? 'WHERE project_id = ?' : ''}
      GROUP BY status, is_overdue
    `)

    const summaryRows = summaryStmt.all(projectId ? [projectId] : []) as SummaryRow[]

    const summary = {
      pendingCount: 0,
      overdueCount: 0,
      approvedToday: 0,
      rejectedToday: 0,
    }

    summaryRows.forEach((row) => {
      if (row.status === 'pending') {
        summary.pendingCount += row.count
        if (row.is_overdue) summary.overdueCount += row.count
      }
      // TODO: Add today filtering for approved/rejected counts
    })

    return {
      approvals,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      summary,
    }
  }

  /**
   * Mark expired approvals based on timeout
   * SOLID: Single responsibility - timeout handling
   */
  async processExpiredApprovals(): Promise<number> {
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      UPDATE workflow_approvals 
      SET status = 'expired', resolved_at = ?, updated_at = ?
      WHERE status = 'pending' AND expires_at < ?
    `)

    const result = stmt.run(now, now, now)
    return result.changes
  }

  /**
   * Cancel approval (workflow aborted/cancelled)
   * SOLID: Single responsibility - approval cancellation
   */
  async cancelApproval(approvalId: string, cancelledBy: string): Promise<void> {
    const now = new Date().toISOString()

    const stmt = this.db.prepare(`
      UPDATE workflow_approvals 
      SET status = 'cancelled', resolved_at = ?, resolved_by = ?, updated_at = ?
      WHERE id = ? AND status = 'pending'
    `)

    const result = stmt.run(now, cancelledBy, now, approvalId)

    if (result.changes === 0) {
      throw new Error(`Cannot cancel approval ${approvalId} - not found or not pending`)
    }
  }

  /**
   * Get pending approvals for a project
   * SOLID: Single responsibility - project approval queries
   */
  async getPendingApprovalsForProject(projectId: string): Promise<WorkflowApproval[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM workflow_approvals 
      WHERE project_id = ? AND status = 'pending'
      ORDER BY requested_at ASC
    `)

    const rows = stmt.all(projectId) as ApprovalRow[]
    return rows.map((row) => this.mapRowToApproval(row))
  }

  /**
   * Private helper methods
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }

  private mapRowToApproval(row: ApprovalRow): WorkflowApproval {
    return {
      id: row.id,
      threadId: row.thread_id,
      stepId: row.step_id,
      projectId: row.project_id,
      workflowName: row.workflow_name,
      prompt: row.prompt,
      contextData: row.context_data,
      riskLevel: row.risk_level,
      requestedAt: row.requested_at,
      timeoutSeconds: row.timeout_seconds,
      expiresAt: row.expires_at,
      status: row.status,
      resolvedAt: row.resolved_at,
      resolvedBy: row.resolved_by,
      approvalRequired: Boolean(row.approval_required),
      autoApproveAfterTimeout: Boolean(row.auto_approve_after_timeout),
      escalationUserId: row.escalation_user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  private mapRowToDecision(row: DecisionRow): ApprovalDecisionRecord {
    return {
      id: row.id,
      approvalId: row.approval_id,
      decision: row.decision,
      comment: row.comment,
      reasoning: row.reasoning,
      confidenceLevel: row.confidence_level,
      decidedBy: row.decided_by,
      decidedAt: row.decided_at,
      workflowState: row.workflow_state,
      userAgent: row.user_agent,
      ipAddress: row.ip_address,
      createdAt: row.created_at,
    }
  }
}
