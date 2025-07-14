/**
 * ApprovalContextBuilder Unit Tests
 *
 * SOLID: Single responsibility - testing context building logic
 * DRY: Reusable test fixtures and mocks
 * KISS: Simple, focused test cases
 * Library-First: Uses Vitest testing framework
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ApprovalContextBuilder } from '../ApprovalContextBuilder'
import type { WorkflowApproval, RiskLevel } from '../../schemas/approval-types'

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

describe('ApprovalContextBuilder', () => {
  let contextBuilder: ApprovalContextBuilder
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

    contextBuilder = new ApprovalContextBuilder()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('buildContext', () => {
    it('should build complete context for approval', async () => {
      const mockApproval: WorkflowApproval = {
        id: 'approval-123',
        threadId: 'thread-123',
        stepId: 'step-2',
        projectId: 'project-1',
        workflowName: 'Deploy to Production',
        prompt: 'Approve production deployment',
        riskLevel: 'high',
        requestedAt: new Date().toISOString(),
        timeoutSeconds: 3600,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        status: 'pending',
        approvalRequired: true,
        autoApproveAfterTimeout: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Mock workflow steps
      const mockWorkflowSteps = [
        {
          step_id: 'step-1',
          step_type: 'task',
          agent_id: 'dev_01',
          task: 'Build application',
          status: 'completed',
          result: 'Build successful',
          error: null,
          started_at: '2025-01-14T10:00:00Z',
          completed_at: '2025-01-14T10:05:00Z',
        },
        {
          step_id: 'step-2',
          step_type: 'human_approval',
          agent_id: 'human',
          task: 'Approve deployment',
          status: 'pending',
          result: null,
          error: null,
          started_at: '2025-01-14T10:05:00Z',
          completed_at: null,
        },
      ]

      // Mock previous outputs
      const mockPreviousOutputs = [{ step_id: 'step-1', result: 'Build successful' }]

      // Mock similar approvals
      const mockSimilarApprovals = [
        {
          prompt: 'Approve production deployment for v1.2',
          decision: 'approved',
          decided_at: '2025-01-13T15:00:00Z',
          outcome: 'Deployment completed successfully',
        },
      ]

      // Mock project info
      const mockProjectInfo = {
        name: 'My Project',
        description: 'Production application',
      }

      // Setup mock responses
      mockStmt.all
        .mockReturnValueOnce(mockWorkflowSteps) // getWorkflowSteps
        .mockReturnValueOnce(mockPreviousOutputs) // getPreviousStepOutputs
        .mockReturnValueOnce(mockSimilarApprovals) // findSimilarApprovals

      mockStmt.get
        .mockReturnValueOnce(mockProjectInfo) // getProjectName
        .mockReturnValueOnce(mockProjectInfo) // getProjectDescription

      const context = await contextBuilder.buildContext(mockApproval)

      expect(context).toMatchObject({
        workflowSteps: [
          {
            id: 'step-1',
            task: 'Build application',
            status: 'completed',
            output: 'Build successful',
            executedAt: '2025-01-14T10:00:00Z',
          },
          {
            id: 'step-2',
            task: 'Approve deployment',
            status: 'pending',
            executedAt: '2025-01-14T10:05:00Z',
          },
        ],
        previousStepOutputs: {
          'step-1': 'Build successful',
        },
        currentStepIndex: 1,
        projectName: 'My Project',
        projectDescription: 'Production application',
        impactAssessment: {
          nextStepsPreview: expect.any(Array),
          risksIfApproved: expect.arrayContaining([
            'Significant changes will be made to the system',
            'Rollback may be complex if issues arise',
          ]),
          risksIfRejected: expect.arrayContaining([
            'Important workflow will be stopped',
            'Dependent operations may be affected',
          ]),
          businessImpact: 'High impact - Production system deployment',
        },
        similarApprovals: [
          {
            prompt: 'Approve production deployment for v1.2',
            decision: 'approved',
            outcome: 'Deployment completed successfully',
            decidedAt: '2025-01-13T15:00:00Z',
          },
        ],
      })

      // Verify all queries were made
      expect(mockDb.prepare).toHaveBeenCalledTimes(5)
    })

    it('should handle missing project info gracefully', async () => {
      const mockApproval: WorkflowApproval = {
        id: 'approval-123',
        threadId: 'thread-123',
        stepId: 'step-1',
        workflowName: 'Test Workflow',
        prompt: 'Test approval',
        riskLevel: 'low',
        requestedAt: new Date().toISOString(),
        timeoutSeconds: 3600,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        status: 'pending',
        approvalRequired: true,
        autoApproveAfterTimeout: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Setup empty responses
      mockStmt.all.mockReturnValue([])
      mockStmt.get.mockReturnValue(undefined)

      const context = await contextBuilder.buildContext(mockApproval)

      expect(context).toMatchObject({
        workflowSteps: [],
        previousStepOutputs: {},
        currentStepIndex: 0,
        projectName: undefined,
        projectDescription: undefined,
        similarApprovals: [],
      })
    })
  })

  describe('risk analysis', () => {
    const testCases: Array<{
      riskLevel: RiskLevel
      workflowName: string
      expectedImpact: string
      expectedRisksCount: { approved: number; rejected: number }
    }> = [
      {
        riskLevel: 'critical',
        workflowName: 'Emergency Hotfix Deployment',
        expectedImpact: 'Critical impact - System-wide changes possible',
        expectedRisksCount: { approved: 2, rejected: 2 },
      },
      {
        riskLevel: 'high',
        workflowName: 'Database Migration',
        expectedImpact: 'High impact - Significant operational changes',
        expectedRisksCount: { approved: 2, rejected: 2 },
      },
      {
        riskLevel: 'medium',
        workflowName: 'Feature Release',
        expectedImpact: 'Medium impact - Standard operational procedure',
        expectedRisksCount: { approved: 2, rejected: 1 },
      },
      {
        riskLevel: 'low',
        workflowName: 'Run Tests',
        expectedImpact: 'Low impact - Testing/validation workflow',
        expectedRisksCount: { approved: 1, rejected: 1 },
      },
    ]

    testCases.forEach(({ riskLevel, workflowName, expectedImpact, expectedRisksCount }) => {
      it(`should analyze ${riskLevel} risk level correctly`, async () => {
        const mockApproval: WorkflowApproval = {
          id: 'approval-123',
          threadId: 'thread-123',
          stepId: 'step-1',
          workflowName,
          prompt: 'Test approval',
          riskLevel,
          requestedAt: new Date().toISOString(),
          timeoutSeconds: 3600,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          status: 'pending',
          approvalRequired: true,
          autoApproveAfterTimeout: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        // Setup empty responses for other queries
        mockStmt.all.mockReturnValue([])
        mockStmt.get.mockReturnValue(undefined)

        const context = await contextBuilder.buildContext(mockApproval)

        expect(context.impactAssessment?.businessImpact).toBe(expectedImpact)
        expect(context.impactAssessment?.risksIfApproved).toHaveLength(expectedRisksCount.approved)
        expect(context.impactAssessment?.risksIfRejected).toHaveLength(expectedRisksCount.rejected)
      })
    })
  })

  describe('enrichApproval', () => {
    it('should enrich approval with context data', async () => {
      const mockApproval: WorkflowApproval = {
        id: 'approval-123',
        threadId: 'thread-123',
        stepId: 'step-1',
        workflowName: 'Test Workflow',
        prompt: 'Test approval',
        riskLevel: 'medium',
        requestedAt: new Date().toISOString(),
        timeoutSeconds: 3600,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        status: 'pending',
        approvalRequired: true,
        autoApproveAfterTimeout: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Setup empty responses
      mockStmt.all.mockReturnValue([])
      mockStmt.get.mockReturnValue(undefined)

      const enrichedApproval = await contextBuilder.enrichApproval(mockApproval)

      expect(enrichedApproval).toMatchObject({
        ...mockApproval,
        contextData: expect.objectContaining({
          workflowSteps: expect.any(Array),
          previousStepOutputs: expect.any(Object),
          currentStepIndex: expect.any(Number),
          impactAssessment: expect.any(Object),
          similarApprovals: expect.any(Array),
        }),
      })
    })
  })

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockApproval: WorkflowApproval = {
        id: 'approval-123',
        threadId: 'thread-123',
        stepId: 'step-1',
        workflowName: 'Test Workflow',
        prompt: 'Test approval',
        riskLevel: 'medium',
        requestedAt: new Date().toISOString(),
        timeoutSeconds: 3600,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        status: 'pending',
        approvalRequired: true,
        autoApproveAfterTimeout: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Make database queries throw errors
      mockStmt.all.mockImplementation(() => {
        throw new Error('Database error')
      })
      mockStmt.get.mockImplementation(() => {
        throw new Error('Database error')
      })

      // Should not throw, but return empty data
      const context = await contextBuilder.buildContext(mockApproval)

      expect(context).toMatchObject({
        workflowSteps: [],
        previousStepOutputs: {},
        currentStepIndex: 0,
        projectName: undefined,
        projectDescription: undefined,
        similarApprovals: [],
      })
    })
  })
})
