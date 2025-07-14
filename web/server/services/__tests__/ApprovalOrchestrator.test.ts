/**
 * ApprovalOrchestrator Unit Tests
 *
 * SOLID: Single responsibility - testing approval business logic
 * DRY: Reusable test utilities and fixtures
 * KISS: Simple, focused test cases
 * Library-First: Uses Vitest testing framework
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ApprovalOrchestrator } from '../ApprovalOrchestrator'
import type { CreateApprovalRequest, ApprovalDecisionRequest } from '../../schemas/approval-types'

// Mock database types
interface MockStatement {
  run: ReturnType<typeof vi.fn>
  get: ReturnType<typeof vi.fn>
  all: ReturnType<typeof vi.fn>
}

interface MockDatabase {
  prepare: ReturnType<typeof vi.fn>
  transaction: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
}

// Mock DatabaseService
vi.mock('../../lib/storage/DatabaseService', () => {
  const mockDb = {
    prepare: vi.fn(),
    transaction: vi.fn(),
    close: vi.fn(),
  }

  return {
    DatabaseService: {
      getInstance: vi.fn(() => mockDb),
    },
  }
})

describe('ApprovalOrchestrator', () => {
  let orchestrator: ApprovalOrchestrator
  let mockDb: MockDatabase
  let mockStmt: MockStatement

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks()

    // Setup mock statement
    mockStmt = {
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn(),
    }

    // Setup mock database
    mockDb = {
      prepare: vi.fn(() => mockStmt),
      transaction: vi.fn((fn) => fn),
      close: vi.fn(),
    }

    // Mock DatabaseService.getInstance to return our mock
    const { DatabaseService } = await import('../../lib/storage/DatabaseService')
    vi.mocked(DatabaseService.getInstance).mockReturnValue(mockDb)

    orchestrator = new ApprovalOrchestrator()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('createApproval', () => {
    it('should create approval with valid data', async () => {
      const request: CreateApprovalRequest = {
        threadId: 'test-thread-123',
        stepId: 'step-1',
        projectId: 'project-1',
        workflowName: 'Test Workflow',
        prompt: 'Please approve this action',
        riskLevel: 'medium',
        timeoutSeconds: 3600,
      }

      mockStmt.run.mockReturnValue({ changes: 1 })

      const result = await orchestrator.createApproval(request)

      expect(result).toMatchObject({
        threadId: request.threadId,
        stepId: request.stepId,
        projectId: request.projectId,
        workflowName: request.workflowName,
        prompt: request.prompt,
        riskLevel: request.riskLevel,
        timeoutSeconds: request.timeoutSeconds,
        status: 'pending',
        approvalRequired: true,
        autoApproveAfterTimeout: false,
      })

      expect(result.id).toBeDefined()
      expect(result.requestedAt).toBeDefined()
      expect(result.expiresAt).toBeDefined()
      expect(result.createdAt).toBeDefined()
      expect(result.updatedAt).toBeDefined()

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO workflow_approvals')
      )
      expect(mockStmt.run).toHaveBeenCalledWith(
        expect.any(String), // id
        request.threadId,
        request.stepId,
        request.projectId,
        request.workflowName,
        request.prompt,
        undefined, // contextData
        request.riskLevel,
        expect.any(String), // requestedAt
        request.timeoutSeconds,
        expect.any(String), // expiresAt
        'pending',
        1, // approvalRequired
        0, // autoApproveAfterTimeout
        undefined, // escalationUserId
        expect.any(String), // createdAt
        expect.any(String) // updatedAt
      )
    })

    it('should create approval with default values', async () => {
      const request: CreateApprovalRequest = {
        threadId: 'test-thread-123',
        stepId: 'step-1',
        prompt: 'Please approve this action',
      }

      mockStmt.run.mockReturnValue({ changes: 1 })

      const result = await orchestrator.createApproval(request)

      expect(result.riskLevel).toBe('medium')
      expect(result.timeoutSeconds).toBe(3600)
      expect(result.approvalRequired).toBe(true)
      expect(result.autoApproveAfterTimeout).toBe(false)
    })

    it('should handle contextData serialization', async () => {
      const request: CreateApprovalRequest = {
        threadId: 'test-thread-123',
        stepId: 'step-1',
        prompt: 'Please approve this action',
        contextData: {
          workflowSteps: [{ id: 'step1', status: 'completed' }],
          riskLevel: 'high',
        },
      }

      mockStmt.run.mockReturnValue({ changes: 1 })

      const result = await orchestrator.createApproval(request)

      expect(result).toBeDefined()
      expect(mockStmt.run).toHaveBeenCalledWith(
        expect.any(String), // id
        request.threadId,
        request.stepId,
        undefined, // projectId
        undefined, // workflowName
        request.prompt,
        JSON.stringify(request.contextData), // contextData serialized
        'medium', // default riskLevel
        expect.any(String), // requestedAt
        3600, // default timeoutSeconds
        expect.any(String), // expiresAt
        'pending',
        1, // approvalRequired
        0, // autoApproveAfterTimeout
        undefined, // escalationUserId
        expect.any(String), // createdAt
        expect.any(String) // updatedAt
      )
    })
  })

  describe('getApproval', () => {
    it('should return approval when found', async () => {
      const mockRow = {
        id: 'approval-123',
        thread_id: 'thread-123',
        step_id: 'step-1',
        project_id: 'project-1',
        workflow_name: 'Test Workflow',
        prompt: 'Please approve',
        context_data: null,
        risk_level: 'medium',
        requested_at: '2025-07-14T12:00:00.000Z',
        timeout_seconds: 3600,
        expires_at: '2025-07-14T13:00:00.000Z',
        status: 'pending',
        resolved_at: null,
        resolved_by: null,
        approval_required: 1,
        auto_approve_after_timeout: 0,
        escalation_user_id: null,
        created_at: '2025-07-14T12:00:00.000Z',
        updated_at: '2025-07-14T12:00:00.000Z',
      }

      mockStmt.get.mockReturnValue(mockRow)

      const result = await orchestrator.getApproval('approval-123')

      expect(result).toMatchObject({
        id: 'approval-123',
        threadId: 'thread-123',
        stepId: 'step-1',
        projectId: 'project-1',
        workflowName: 'Test Workflow',
        prompt: 'Please approve',
        contextData: null,
        riskLevel: 'medium',
        status: 'pending',
        approvalRequired: true,
        autoApproveAfterTimeout: false,
      })

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM workflow_approvals WHERE id = ?')
      )
      expect(mockStmt.get).toHaveBeenCalledWith('approval-123')
    })

    it('should return null when approval not found', async () => {
      mockStmt.get.mockReturnValue(undefined)

      const result = await orchestrator.getApproval('nonexistent')

      expect(result).toBeNull()
    })

    it('should return enriched approval when requested', async () => {
      const mockRow = {
        id: 'approval-123',
        thread_id: 'thread-123',
        step_id: 'step-1',
        project_id: 'project-1',
        workflow_name: 'Test Workflow',
        prompt: 'Please approve',
        context_data: '{"key": "value"}',
        risk_level: 'medium',
        requested_at: '2025-07-14T12:00:00.000Z',
        timeout_seconds: 3600,
        expires_at: '2025-07-14T13:00:00.000Z',
        status: 'pending',
        resolved_at: null,
        resolved_by: null,
        approval_required: 1,
        auto_approve_after_timeout: 0,
        escalation_user_id: null,
        created_at: '2025-07-14T12:00:00.000Z',
        updated_at: '2025-07-14T12:00:00.000Z',
      }

      const mockNotificationResult = { count: 2, lastSent: '2025-07-14T12:05:00.000Z' }
      const mockDecisionRow = null

      mockStmt.get
        .mockReturnValueOnce(mockRow) // First call for approval
        .mockReturnValueOnce(mockNotificationResult) // Second call for notifications
        .mockReturnValueOnce(mockDecisionRow) // Third call for decision

      // Mock Date.now to return a fixed timestamp for testing
      const mockNow = new Date('2025-07-14T12:30:00.000Z').getTime()
      vi.spyOn(Date, 'now').mockReturnValue(mockNow)

      const result = await orchestrator.getApproval('approval-123', true)

      expect(result).toMatchObject({
        id: 'approval-123',
        contextData: { key: 'value' },
        timeRemaining: 1800, // 30 minutes remaining
        isOverdue: false,
        notificationsSent: 2,
        lastNotificationAt: '2025-07-14T12:05:00.000Z',
      })

      expect(mockDb.prepare).toHaveBeenCalledTimes(3)
    })
  })

  describe('processDecision', () => {
    it('should process approval decision successfully', async () => {
      const mockApprovalRow = {
        id: 'approval-123',
        thread_id: 'thread-123',
        step_id: 'step-1',
        status: 'pending',
        // ... other fields
      }

      const decisionRequest: ApprovalDecisionRequest = {
        decision: 'approved',
        comment: 'Looks good',
        reasoning: 'All checks passed',
        confidenceLevel: 5,
        decidedBy: 'user-123',
      }

      // Mock getApproval to return pending approval
      mockStmt.get.mockReturnValue(mockApprovalRow)
      orchestrator.getApproval = vi.fn().mockResolvedValue({
        id: 'approval-123',
        status: 'pending',
      })

      // Mock transaction and statements
      mockDb.transaction.mockImplementation((fn) => fn)
      mockStmt.run.mockReturnValue({ changes: 1 })

      const result = await orchestrator.processDecision('approval-123', decisionRequest)

      expect(result).toMatchObject({
        approvalId: 'approval-123',
        decision: 'approved',
        comment: 'Looks good',
        reasoning: 'All checks passed',
        confidenceLevel: 5,
        decidedBy: 'user-123',
      })

      expect(result.id).toBeDefined()
      expect(result.decidedAt).toBeDefined()
      expect(result.createdAt).toBeDefined()

      expect(mockDb.transaction).toHaveBeenCalled()
    })

    it('should throw error when approval not found', async () => {
      orchestrator.getApproval = vi.fn().mockResolvedValue(null)

      const decisionRequest: ApprovalDecisionRequest = {
        decision: 'approved',
        decidedBy: 'user-123',
      }

      await expect(orchestrator.processDecision('nonexistent', decisionRequest)).rejects.toThrow(
        'Approval nonexistent not found'
      )
    })

    it('should throw error when approval already resolved', async () => {
      orchestrator.getApproval = vi.fn().mockResolvedValue({
        id: 'approval-123',
        status: 'approved',
      })

      const decisionRequest: ApprovalDecisionRequest = {
        decision: 'approved',
        decidedBy: 'user-123',
      }

      await expect(orchestrator.processDecision('approval-123', decisionRequest)).rejects.toThrow(
        'Approval approval-123 is already approved'
      )
    })
  })

  describe('listApprovals', () => {
    it('should list approvals with pagination', async () => {
      const mockApprovals = [
        {
          id: 'approval-1',
          thread_id: 'thread-1',
          step_id: 'step-1',
          status: 'pending',
          // ... other fields
        },
        {
          id: 'approval-2',
          thread_id: 'thread-2',
          step_id: 'step-2',
          status: 'approved',
          // ... other fields
        },
      ]

      const mockCountResult = { total: 10 }
      const mockSummaryRows = [
        { status: 'pending', count: 3, is_overdue: 0 },
        { status: 'approved', count: 7, is_overdue: 0 },
      ]

      mockStmt.get.mockReturnValue(mockCountResult)
      mockStmt.all
        .mockReturnValueOnce(mockApprovals) // For approvals query
        .mockReturnValueOnce(mockSummaryRows) // For summary query

      const result = await orchestrator.listApprovals({
        page: 1,
        pageSize: 20,
      })

      expect(result).toMatchObject({
        pagination: {
          total: 10,
          page: 1,
          pageSize: 20,
          totalPages: 1,
        },
        summary: {
          pendingCount: 3,
          overdueCount: 0,
          approvedToday: 0,
          rejectedToday: 0,
        },
      })

      expect(result.approvals).toHaveLength(2)
      expect(mockDb.prepare).toHaveBeenCalledTimes(3) // count, list, summary
    })

    it('should filter by project and status', async () => {
      const mockCountResult = { total: 5 }
      const mockApprovals = []
      const mockSummaryRows = []

      mockStmt.get.mockReturnValue(mockCountResult)
      mockStmt.all.mockReturnValueOnce(mockApprovals).mockReturnValueOnce(mockSummaryRows)

      await orchestrator.listApprovals({
        projectId: 'project-1',
        status: ['pending', 'approved'],
        page: 2,
        pageSize: 5,
      })

      // Verify WHERE clause and parameters
      expect(mockStmt.get).toHaveBeenCalledWith('project-1', 'pending', 'approved')
      expect(mockStmt.all).toHaveBeenCalledWith('project-1', 'pending', 'approved', 5, 5) // pageSize, offset
    })
  })

  describe('processExpiredApprovals', () => {
    it('should mark expired approvals', async () => {
      mockStmt.run.mockReturnValue({ changes: 3 })

      const result = await orchestrator.processExpiredApprovals()

      expect(result).toBe(3)
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE workflow_approvals')
      )
      expect(mockStmt.run).toHaveBeenCalledWith(
        expect.any(String), // now timestamp
        expect.any(String), // now timestamp
        expect.any(String) // now timestamp for WHERE clause
      )
    })
  })

  describe('cancelApproval', () => {
    it('should cancel pending approval', async () => {
      mockStmt.run.mockReturnValue({ changes: 1 })

      await orchestrator.cancelApproval('approval-123', 'user-456')

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE workflow_approvals')
      )
      expect(mockStmt.run).toHaveBeenCalledWith(
        expect.any(String), // now timestamp
        'user-456',
        expect.any(String), // now timestamp
        'approval-123'
      )
    })

    it('should throw error when approval cannot be cancelled', async () => {
      mockStmt.run.mockReturnValue({ changes: 0 })

      await expect(orchestrator.cancelApproval('approval-123', 'user-456')).rejects.toThrow(
        'Cannot cancel approval approval-123 - not found or not pending'
      )
    })
  })

  describe('getPendingApprovalsForProject', () => {
    it('should return pending approvals for project', async () => {
      const mockApprovals = [
        {
          id: 'approval-1',
          project_id: 'project-1',
          status: 'pending',
          // ... other fields
        },
      ]

      mockStmt.all.mockReturnValue(mockApprovals)

      const result = await orchestrator.getPendingApprovalsForProject('project-1')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('approval-1')
      expect(mockStmt.all).toHaveBeenCalledWith('project-1')
    })
  })
})
