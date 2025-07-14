/**
 * Human Approval API - Real-time workflow approval endpoints
 *
 * SOLID: Single responsibility - human approval operations
 * DRY: Reuses workflow state management and event system
 * KISS: Simple approve/reject operations with persistence
 * Library-First: Uses LangGraph checkpoints and Socket.io events
 */

import express from 'express'
import { z } from 'zod'
import { WorkflowEventEmitter } from '../../services/WorkflowEventEmitter'
import { FlowLogger } from '../../utils/FlowLogger'

const router = express.Router()

// Approval request schema
const ApprovalRequestSchema = z.object({
  approved: z.boolean(),
  comment: z.string().optional(),
  userId: z.string().optional(), // For tracking who approved
})

// Pending approval response type
export type PendingApproval = {
  threadId: string
  stepId: string
  prompt: string
  timeoutSeconds: number
  requestedAt: string
  workflowName?: string
}

/**
 * Get all pending approvals across all workflows
 * GET /api/workflows/human-approval/pending
 */
router.get('/pending', async (req, res) => {
  try {
    FlowLogger.log('human-approval', 'GET /pending - fetching pending approvals')

    const { HumanApprovalService } = await import('../../services/HumanApprovalService')
    const pendingApprovals = await HumanApprovalService.getInstance().getPendingApprovals()

    FlowLogger.log('human-approval', `Found ${pendingApprovals.length} pending approvals`)
    res.json({ pendingApprovals })
  } catch (error) {
    console.error('Error fetching pending approvals:', error)
    res.status(500).json({
      error: 'Failed to fetch pending approvals',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * Get pending approvals for a specific workflow
 * GET /api/workflows/human-approval/:threadId/pending
 */
router.get('/:threadId/pending', async (req, res) => {
  try {
    const { threadId } = req.params
    FlowLogger.log('human-approval', `GET /${threadId}/pending - fetching workflow approvals`)

    const { HumanApprovalService } = await import('../../services/HumanApprovalService')
    const pendingApprovals = await HumanApprovalService.getInstance().getPendingApprovals(threadId)

    FlowLogger.log(
      'human-approval',
      `Found ${pendingApprovals.length} pending approvals for workflow ${threadId}`
    )
    res.json({ pendingApprovals })
  } catch (error) {
    console.error(`Error fetching pending approvals for ${req.params.threadId}:`, error)
    res.status(500).json({
      error: 'Failed to fetch workflow approvals',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * Approve or reject a human input step
 * POST /api/workflows/human-approval/:threadId/:stepId
 */
router.post('/:threadId/:stepId', async (req, res) => {
  try {
    const { threadId, stepId } = req.params
    const approvalData = ApprovalRequestSchema.parse(req.body)

    FlowLogger.log(
      'human-approval',
      `POST /${threadId}/${stepId} - ${approvalData.approved ? 'APPROVE' : 'REJECT'}`
    )

    const { HumanApprovalService } = await import('../../services/HumanApprovalService')
    const result = await HumanApprovalService.getInstance().processHumanApproval(
      threadId,
      stepId,
      approvalData.approved,
      {
        comment: approvalData.comment,
        userId: approvalData.userId,
        timestamp: new Date().toISOString(),
      }
    )

    // Emit real-time event to all connected clients
    const eventEmitter = WorkflowEventEmitter.getInstance()
    eventEmitter.emit('human_approval_processed', {
      threadId,
      stepId,
      approved: approvalData.approved,
      comment: approvalData.comment,
      userId: approvalData.userId,
      timestamp: new Date().toISOString(),
    })

    FlowLogger.log(
      'human-approval',
      `Approval processed successfully: ${approvalData.approved ? 'APPROVED' : 'REJECTED'}`
    )

    res.json({
      success: true,
      approved: approvalData.approved,
      stepResult: result,
      message: approvalData.approved ? 'Step approved successfully' : 'Step rejected',
    })
  } catch (error) {
    console.error(
      `Error processing approval for ${req.params.threadId}/${req.params.stepId}:`,
      error
    )

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid approval data',
        details: error.errors,
      })
    }

    res.status(500).json({
      error: 'Failed to process approval',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * Check if a specific step is pending approval
 * GET /api/workflows/human-approval/:threadId/:stepId/status
 */
router.get('/:threadId/:stepId/status', async (req, res) => {
  try {
    const { threadId, stepId } = req.params
    FlowLogger.log('human-approval', `GET /${threadId}/${stepId}/status - checking approval status`)

    const { HumanApprovalService } = await import('../../services/HumanApprovalService')
    const approvalStatus = await HumanApprovalService.getInstance().getApprovalStatus(
      threadId,
      stepId
    )

    res.json(approvalStatus)
  } catch (error) {
    console.error(
      `Error checking approval status for ${req.params.threadId}/${req.params.stepId}:`,
      error
    )
    res.status(500).json({
      error: 'Failed to check approval status',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * Cancel a pending approval (timeout or workflow abort)
 * DELETE /api/workflows/human-approval/:threadId/:stepId
 */
router.delete('/:threadId/:stepId', async (req, res) => {
  try {
    const { threadId, stepId } = req.params
    FlowLogger.log('human-approval', `DELETE /${threadId}/${stepId} - canceling approval`)

    const { HumanApprovalService } = await import('../../services/HumanApprovalService')
    await HumanApprovalService.getInstance().cancelPendingApproval(threadId, stepId)

    // Emit cancellation event
    const eventEmitter = WorkflowEventEmitter.getInstance()
    eventEmitter.emit('human_approval_cancelled', {
      threadId,
      stepId,
      timestamp: new Date().toISOString(),
    })

    res.json({
      success: true,
      message: 'Pending approval cancelled',
    })
  } catch (error) {
    console.error(
      `Error canceling approval for ${req.params.threadId}/${req.params.stepId}:`,
      error
    )
    res.status(500).json({
      error: 'Failed to cancel approval',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

export default router
