/**
 * Approval API Endpoints - RESTful API for human approval system
 *
 * SOLID: Single responsibility - approval HTTP interface only
 * DRY: Reuses ApprovalOrchestrator service for business logic
 * KISS: Simple REST endpoints with clear validation
 * Library-First: Uses express Router and zod for validation
 */

import { Router } from 'express'
import { z } from 'zod'
import { ApprovalOrchestrator } from '../services/ApprovalOrchestrator'
import type {
  CreateApprovalRequest,
  ApprovalDecisionRequest,
  ApprovalStatus,
} from '../schemas/approval-types'

const router = Router()
const approvalOrchestrator = new ApprovalOrchestrator()

// Validation schemas
const CreateApprovalSchema = z.object({
  threadId: z.string().min(1, 'Thread ID is required'),
  stepId: z.string().min(1, 'Step ID is required'),
  projectId: z.string().optional(),
  workflowName: z.string().optional(),
  prompt: z.string().min(1, 'Prompt is required'),
  contextData: z.record(z.unknown()).optional(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  timeoutSeconds: z.number().int().min(60).max(86400).default(3600), // 1 minute to 24 hours
  approvalRequired: z.boolean().default(true),
  autoApproveAfterTimeout: z.boolean().default(false),
  escalationUserId: z.string().optional(),
})

const ApprovalDecisionSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  comment: z.string().optional(),
  reasoning: z.string().optional(),
  confidenceLevel: z.number().int().min(1).max(5).optional(),
  decidedBy: z.string().min(1, 'Decided by user ID is required'),
})

const ListApprovalsQuerySchema = z.object({
  projectId: z.string().optional(),
  status: z
    .string()
    .optional()
    .transform((val) => (val ? (val.split(',') as ApprovalStatus[]) : undefined)),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  search: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  pageSize: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20)),
  enriched: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
})

/**
 * POST /api/approvals - Create new approval request
 * SOLID: Single responsibility - approval creation endpoint
 */
router.post('/', async (req, res) => {
  try {
    const validatedData = CreateApprovalSchema.parse(req.body)

    const approval = await approvalOrchestrator.createApproval(
      validatedData as CreateApprovalRequest
    )

    res.status(201).json({
      success: true,
      data: approval,
      message: 'Approval request created successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      })
    }

    console.error('Error creating approval:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create approval request',
    })
  }
})

/**
 * GET /api/approvals - List approvals with filtering and pagination
 * SOLID: Single responsibility - approval listing endpoint
 */
router.get('/', async (req, res) => {
  try {
    const query = ListApprovalsQuerySchema.parse(req.query)

    const result = await approvalOrchestrator.listApprovals({
      projectId: query.projectId,
      status: query.status,
      riskLevel: query.riskLevel,
      search: query.search,
      page: query.page,
      pageSize: query.pageSize,
      enriched: query.enriched,
    })

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors,
      })
    }

    console.error('Error listing approvals:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to list approvals',
    })
  }
})

/**
 * GET /api/approvals/:id - Get specific approval by ID
 * SOLID: Single responsibility - single approval retrieval
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const enriched = req.query.enriched === 'true'

    const approval = await approvalOrchestrator.getApproval(id, enriched)

    if (!approval) {
      return res.status(404).json({
        success: false,
        error: 'Approval not found',
      })
    }

    res.json({
      success: true,
      data: approval,
    })
  } catch (error) {
    console.error('Error getting approval:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get approval',
    })
  }
})

/**
 * POST /api/approvals/:id/decide - Process approval decision
 * SOLID: Single responsibility - decision processing endpoint
 */
router.post('/:id/decide', async (req, res) => {
  try {
    const { id } = req.params
    const validatedData = ApprovalDecisionSchema.parse(req.body)

    const decision = await approvalOrchestrator.processDecision(
      id,
      validatedData as ApprovalDecisionRequest
    )

    res.json({
      success: true,
      data: decision,
      message: `Approval ${validatedData.decision} successfully`,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      })
    }

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message,
        })
      }

      if (error.message.includes('already')) {
        return res.status(409).json({
          success: false,
          error: error.message,
        })
      }
    }

    console.error('Error processing decision:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to process approval decision',
    })
  }
})

/**
 * POST /api/approvals/:id/assign - Assign approval to a user
 * SOLID: Single responsibility - approval assignment endpoint
 */
router.post('/:id/assign', async (req, res) => {
  try {
    const { id } = req.params
    const { userId } = req.body

    // userId can be null to unassign
    if (userId !== null && typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'userId must be a string or null',
      })
    }

    // Update the approval record with the assignment
    await approvalOrchestrator.assignApproval(id, userId)

    res.json({
      success: true,
      message: userId ? `Approval assigned to user ${userId}` : 'Approval unassigned',
      data: {
        approvalId: id,
        assignedTo: userId,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cannot assign')) {
      return res.status(409).json({
        success: false,
        error: error.message,
      })
    }

    console.error('Error assigning approval:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to assign approval',
    })
  }
})

/**
 * POST /api/approvals/:id/cancel - Cancel approval request
 * SOLID: Single responsibility - approval cancellation endpoint
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params
    const { cancelledBy } = req.body

    if (!cancelledBy) {
      return res.status(400).json({
        success: false,
        error: 'cancelledBy user ID is required',
      })
    }

    await approvalOrchestrator.cancelApproval(id, cancelledBy)

    res.json({
      success: true,
      message: 'Approval cancelled successfully',
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cannot cancel')) {
      return res.status(409).json({
        success: false,
        error: error.message,
      })
    }

    console.error('Error cancelling approval:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to cancel approval',
    })
  }
})

/**
 * GET /api/approvals/projects/:projectId/pending - Get pending approvals for project
 * SOLID: Single responsibility - project-specific approval queries
 */
router.get('/projects/:projectId/pending', async (req, res) => {
  try {
    const { projectId } = req.params

    const approvals = await approvalOrchestrator.getPendingApprovalsForProject(projectId)

    res.json({
      success: true,
      data: approvals,
      count: approvals.length,
    })
  } catch (error) {
    console.error('Error getting pending approvals:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get pending approvals',
    })
  }
})

/**
 * POST /api/approvals/process-expired - Process expired approvals (cron job endpoint)
 * SOLID: Single responsibility - timeout processing endpoint
 */
router.post('/process-expired', async (req, res) => {
  try {
    const expiredCount = await approvalOrchestrator.processExpiredApprovals()

    res.json({
      success: true,
      data: {
        expiredCount,
      },
      message: `Processed ${expiredCount} expired approvals`,
    })
  } catch (error) {
    console.error('Error processing expired approvals:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to process expired approvals',
    })
  }
})

export default router
