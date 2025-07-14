/**
 * Approval API Integration Tests
 *
 * SOLID: Single responsibility - testing API endpoints
 * DRY: Reusable test utilities
 * KISS: Simple, focused test cases
 * Library-First: Uses supertest for HTTP testing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import { ApprovalOrchestrator } from '../../services/ApprovalOrchestrator'
import type {
  CreateApprovalRequest,
  ApprovalDecisionRequest,
  WorkflowApproval,
  ApprovalListResponse,
} from '../../schemas/approval-types'

// Create test express app
const createTestApp = async () => {
  const app = express()
  app.use(express.json())

  // Import approval routes
  const { default: approvalRouter } = await import('../approvals.js')
  app.use('/api/approvals', approvalRouter)

  return app
}

// Mock ApprovalOrchestrator
vi.mock('../../services/ApprovalOrchestrator', () => {
  const mockOrchestrator = {
    createApproval: vi.fn(),
    getApproval: vi.fn(),
    processDecision: vi.fn(),
    listApprovals: vi.fn(),
    cancelApproval: vi.fn(),
    getPendingApprovalsForProject: vi.fn(),
    processExpiredApprovals: vi.fn(),
  }

  return {
    ApprovalOrchestrator: vi.fn(() => mockOrchestrator),
  }
})

describe('Approval API Endpoints', () => {
  let app: express.Application
  let mockOrchestrator: Partial<ApprovalOrchestrator>

  beforeEach(async () => {
    vi.clearAllMocks()

    // Get reference to the mock before creating app
    const { ApprovalOrchestrator: MockApprovalOrchestrator } = await import(
      '../../services/ApprovalOrchestrator'
    )
    mockOrchestrator = new MockApprovalOrchestrator() as unknown as Partial<ApprovalOrchestrator>

    // Now create app which will use the mocked ApprovalOrchestrator
    app = await createTestApp()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('POST /api/approvals', () => {
    it('should create approval with valid data', async () => {
      const requestData: CreateApprovalRequest = {
        threadId: 'thread-123',
        stepId: 'step-1',
        projectId: 'project-1',
        workflowName: 'Test Workflow',
        prompt: 'Please approve this action',
        riskLevel: 'medium',
        timeoutSeconds: 3600,
      }

      const mockApproval: WorkflowApproval = {
        id: 'approval-123',
        ...requestData,
        requestedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        status: 'pending',
        resolvedAt: null,
        resolvedBy: null,
        approvalRequired: true,
        autoApproveAfterTimeout: false,
        escalationUserId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      vi.mocked(mockOrchestrator.createApproval!).mockResolvedValue(mockApproval)

      const response = await request(app).post('/api/approvals').send(requestData).expect(201)

      expect(response.body).toMatchObject({
        success: true,
        message: 'Approval request created successfully',
        data: {
          id: 'approval-123',
          threadId: 'thread-123',
          stepId: 'step-1',
          status: 'pending',
        },
      })

      expect(mockOrchestrator.createApproval).toHaveBeenCalledWith({
        ...requestData,
        approvalRequired: true,
        autoApproveAfterTimeout: false,
      })
    })

    it('should return 400 for invalid data', async () => {
      const invalidRequest = {
        threadId: 'thread-123',
        // Missing required fields
      }

      const response = await request(app).post('/api/approvals').send(invalidRequest).expect(400)

      expect(response.body).toHaveProperty('error')
      expect(mockOrchestrator.createApproval).not.toHaveBeenCalled()
    })
  })

  describe('GET /api/approvals/:id', () => {
    it('should return approval when found', async () => {
      const mockApproval: WorkflowApproval = {
        id: 'approval-123',
        threadId: 'thread-123',
        stepId: 'step-1',
        projectId: 'project-1',
        workflowName: 'Test Workflow',
        prompt: 'Please approve',
        contextData: null,
        riskLevel: 'medium',
        requestedAt: new Date().toISOString(),
        timeoutSeconds: 3600,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        status: 'pending',
        resolvedAt: null,
        resolvedBy: null,
        approvalRequired: true,
        autoApproveAfterTimeout: false,
        escalationUserId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      vi.mocked(mockOrchestrator.getApproval!).mockResolvedValue(mockApproval)

      const response = await request(app).get('/api/approvals/approval-123').expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: 'approval-123',
          threadId: 'thread-123',
          status: 'pending',
        },
      })

      expect(mockOrchestrator.getApproval).toHaveBeenCalledWith('approval-123', false)
    })

    it('should return enriched approval when requested', async () => {
      const mockEnrichedApproval: WorkflowApproval & {
        timeRemaining: number
        isOverdue: boolean
        notificationsSent: number
        lastNotificationAt: string
      } = {
        id: 'approval-123',
        threadId: 'thread-123',
        stepId: 'step-1',
        projectId: 'project-1',
        workflowName: 'Test Workflow',
        prompt: 'Please approve',
        contextData: null,
        riskLevel: 'medium',
        requestedAt: new Date().toISOString(),
        timeoutSeconds: 3600,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        status: 'pending',
        resolvedAt: null,
        resolvedBy: null,
        approvalRequired: true,
        autoApproveAfterTimeout: false,
        escalationUserId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timeRemaining: 3500,
        isOverdue: false,
        notificationsSent: 2,
        lastNotificationAt: new Date().toISOString(),
      }

      vi.mocked(mockOrchestrator.getApproval!).mockResolvedValue(mockEnrichedApproval)

      const response = await request(app)
        .get('/api/approvals/approval-123?enriched=true')
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: 'approval-123',
          timeRemaining: 3500,
          notificationsSent: 2,
        },
      })

      expect(mockOrchestrator.getApproval).toHaveBeenCalledWith('approval-123', true)
    })

    it('should return 404 when approval not found', async () => {
      vi.mocked(mockOrchestrator.getApproval!).mockResolvedValue(null)

      const response = await request(app).get('/api/approvals/nonexistent').expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Approval not found',
      })
    })
  })

  describe('POST /api/approvals/:id/decide', () => {
    it('should process approval decision', async () => {
      const decisionRequest: ApprovalDecisionRequest = {
        decision: 'approved',
        comment: 'Looks good',
        reasoning: 'All checks passed',
        confidenceLevel: 5,
        decidedBy: 'user-123',
      }

      const mockDecision = {
        id: 'decision-123',
        approvalId: 'approval-123',
        ...decisionRequest,
        decidedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }

      vi.mocked(mockOrchestrator.processDecision!).mockResolvedValue(mockDecision)

      const response = await request(app)
        .post('/api/approvals/approval-123/decide')
        .send(decisionRequest)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'Approval approved successfully',
        data: {
          id: 'decision-123',
          decision: 'approved',
          decidedBy: 'user-123',
        },
      })

      expect(mockOrchestrator.processDecision).toHaveBeenCalledWith('approval-123', decisionRequest)
    })

    it('should return 400 for invalid decision', async () => {
      const invalidDecision = {
        decision: 'maybe', // Invalid decision
        decidedBy: 'user-123',
      }

      const response = await request(app)
        .post('/api/approvals/approval-123/decide')
        .send(invalidDecision)
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(mockOrchestrator.processDecision).not.toHaveBeenCalled()
    })
  })

  describe('GET /api/approvals', () => {
    it('should list approvals with pagination', async () => {
      const mockListResponse: ApprovalListResponse = {
        approvals: [
          {
            id: 'approval-1',
            threadId: 'thread-1',
            stepId: 'step-1',
            projectId: 'project-1',
            workflowName: 'Workflow 1',
            prompt: 'Approve action 1',
            contextData: null,
            riskLevel: 'medium',
            requestedAt: new Date().toISOString(),
            timeoutSeconds: 3600,
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
            status: 'pending',
            resolvedAt: null,
            resolvedBy: null,
            approvalRequired: true,
            autoApproveAfterTimeout: false,
            escalationUserId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'approval-2',
            threadId: 'thread-2',
            stepId: 'step-2',
            projectId: 'project-1',
            workflowName: 'Workflow 2',
            prompt: 'Approve action 2',
            contextData: null,
            riskLevel: 'low',
            requestedAt: new Date().toISOString(),
            timeoutSeconds: 3600,
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
            status: 'approved',
            resolvedAt: new Date().toISOString(),
            resolvedBy: 'user-123',
            approvalRequired: true,
            autoApproveAfterTimeout: false,
            escalationUserId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        pagination: {
          total: 10,
          page: 1,
          pageSize: 20,
          totalPages: 1,
        },
        summary: {
          pendingCount: 3,
          overdueCount: 1,
          approvedToday: 5,
          rejectedToday: 2,
        },
      }

      vi.mocked(mockOrchestrator.listApprovals!).mockResolvedValue(mockListResponse)

      const response = await request(app).get('/api/approvals?page=1&pageSize=20').expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: {
          approvals: expect.arrayContaining([expect.objectContaining({ id: 'approval-1' })]),
          pagination: expect.objectContaining({ total: 10 }),
        },
      })

      expect(mockOrchestrator.listApprovals).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
        enriched: false,
      })
    })

    it('should filter by project and status', async () => {
      vi.mocked(mockOrchestrator.listApprovals!).mockResolvedValue({
        approvals: [],
        pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
        summary: { pendingCount: 0, overdueCount: 0, approvedToday: 0, rejectedToday: 0 },
      })

      await request(app)
        .get('/api/approvals?projectId=project-1&status=pending,approved')
        .expect(200)

      expect(mockOrchestrator.listApprovals).toHaveBeenCalledWith({
        projectId: 'project-1',
        status: ['pending', 'approved'],
        page: 1,
        pageSize: 20,
        enriched: false,
      })
    })
  })

  describe('POST /api/approvals/:id/cancel', () => {
    it('should cancel approval', async () => {
      vi.mocked(mockOrchestrator.cancelApproval!).mockResolvedValue(undefined)

      const response = await request(app)
        .post('/api/approvals/approval-123/cancel')
        .send({ cancelledBy: 'user-456' })
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        message: 'Approval cancelled successfully',
      })
      expect(mockOrchestrator.cancelApproval).toHaveBeenCalledWith('approval-123', 'user-456')
    })

    it('should return 400 when cancelledBy is missing', async () => {
      const response = await request(app)
        .post('/api/approvals/approval-123/cancel')
        .send({})
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(mockOrchestrator.cancelApproval).not.toHaveBeenCalled()
    })
  })

  describe('GET /api/approvals/projects/:projectId/pending', () => {
    it('should return pending approvals for project', async () => {
      const mockApprovals: WorkflowApproval[] = [
        {
          id: 'approval-1',
          threadId: 'thread-1',
          stepId: 'step-1',
          projectId: 'project-1',
          workflowName: 'Workflow 1',
          prompt: 'Approve action 1',
          contextData: null,
          riskLevel: 'medium',
          requestedAt: new Date().toISOString(),
          timeoutSeconds: 3600,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          status: 'pending',
          resolvedAt: null,
          resolvedBy: null,
          approvalRequired: true,
          autoApproveAfterTimeout: false,
          escalationUserId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'approval-2',
          threadId: 'thread-2',
          stepId: 'step-2',
          projectId: 'project-1',
          workflowName: 'Workflow 2',
          prompt: 'Approve action 2',
          contextData: null,
          riskLevel: 'high',
          requestedAt: new Date().toISOString(),
          timeoutSeconds: 3600,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          status: 'pending',
          resolvedAt: null,
          resolvedBy: null,
          approvalRequired: true,
          autoApproveAfterTimeout: false,
          escalationUserId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]

      vi.mocked(mockOrchestrator.getPendingApprovalsForProject!).mockResolvedValue(mockApprovals)

      const response = await request(app)
        .get('/api/approvals/projects/project-1/pending')
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ id: 'approval-1' }),
          expect.objectContaining({ id: 'approval-2' }),
        ]),
        count: 2,
      })

      expect(mockOrchestrator.getPendingApprovalsForProject).toHaveBeenCalledWith('project-1')
    })
  })

  describe('POST /api/approvals/process-expired', () => {
    it('should process expired approvals', async () => {
      vi.mocked(mockOrchestrator.processExpiredApprovals!).mockResolvedValue(5)

      const response = await request(app).post('/api/approvals/process-expired').expect(200)

      expect(response.body).toEqual({
        success: true,
        data: {
          expiredCount: 5,
        },
        message: 'Processed 5 expired approvals',
      })
      expect(mockOrchestrator.processExpiredApprovals).toHaveBeenCalled()
    })
  })
})
