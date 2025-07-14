/**
 * Human Approval Service - Manages human-in-the-loop workflow approvals
 *
 * SOLID: Single responsibility - human approval state management
 * DRY: Centralized approval logic across workflows
 * KISS: Simple approval tracking with timeouts
 * Library-First: Uses native Promise patterns for async approval
 */

import { FlowLogger } from '../utils/FlowLogger'

export interface PendingApproval {
  threadId: string
  stepId: string
  prompt: string
  timeoutSeconds: number
  requestedAt: string
  workflowName?: string
  resolve: (approved: boolean) => void
  reject: (error: Error) => void
}

export interface ApprovalMetadata {
  comment?: string
  userId?: string
  timestamp?: string
}

export interface ApprovalStatus {
  status: 'pending' | 'approved' | 'rejected' | 'not_found'
  prompt?: string
  requestedAt?: string
  timeoutSeconds?: number
  completedAt?: string
}

export class HumanApprovalService {
  private static instance: HumanApprovalService
  private pendingApprovals = new Map<string, PendingApproval>()

  static getInstance(): HumanApprovalService {
    if (!HumanApprovalService.instance) {
      HumanApprovalService.instance = new HumanApprovalService()
    }
    return HumanApprovalService.instance
  }

  /**
   * Get all pending approvals across workflows
   */
  async getPendingApprovals(threadId?: string) {
    const approvals = Array.from(this.pendingApprovals.values())

    if (threadId) {
      return approvals.filter((approval) => approval.threadId === threadId)
    }

    return approvals.map((approval) => ({
      threadId: approval.threadId,
      stepId: approval.stepId,
      prompt: approval.prompt,
      timeoutSeconds: approval.timeoutSeconds,
      requestedAt: approval.requestedAt,
      workflowName: approval.workflowName,
    }))
  }

  /**
   * Process human approval/rejection
   */
  async processHumanApproval(
    threadId: string,
    stepId: string,
    approved: boolean,
    metadata?: ApprovalMetadata
  ) {
    const approvalKey = `${threadId}:${stepId}`
    const pendingApproval = this.pendingApprovals.get(approvalKey)

    if (!pendingApproval) {
      throw new Error(`No pending approval found for ${threadId}:${stepId}`)
    }

    FlowLogger.log(
      'human-approval',
      `Processing approval for ${threadId}:${stepId} - ${approved ? 'APPROVED' : 'REJECTED'}`
    )

    // Remove from pending list
    this.pendingApprovals.delete(approvalKey)

    // Resolve the promise to continue workflow
    pendingApproval.resolve(approved)

    // Return result summary
    return {
      threadId,
      stepId,
      approved,
      processedAt: new Date().toISOString(),
      metadata,
    }
  }

  /**
   * Get approval status for a specific step
   */
  async getApprovalStatus(threadId: string, stepId: string): Promise<ApprovalStatus> {
    const approvalKey = `${threadId}:${stepId}`
    const pendingApproval = this.pendingApprovals.get(approvalKey)

    if (pendingApproval) {
      return {
        status: 'pending',
        prompt: pendingApproval.prompt,
        requestedAt: pendingApproval.requestedAt,
        timeoutSeconds: pendingApproval.timeoutSeconds,
      }
    }

    return {
      status: 'not_found',
    }
  }

  /**
   * Cancel a pending approval
   */
  async cancelPendingApproval(threadId: string, stepId: string) {
    const approvalKey = `${threadId}:${stepId}`
    const pendingApproval = this.pendingApprovals.get(approvalKey)

    if (pendingApproval) {
      this.pendingApprovals.delete(approvalKey)
      pendingApproval.reject(new Error('Approval cancelled'))

      FlowLogger.log('human-approval', `Cancelled pending approval for ${threadId}:${stepId}`)
    }
  }

  /**
   * Wait for human approval (used by workflow orchestrator)
   */
  async waitForHumanApproval(
    threadId: string,
    stepId: string,
    prompt: string,
    timeoutSeconds: number = 3600,
    workflowName?: string
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const approvalKey = `${threadId}:${stepId}`

      // Store pending approval
      this.pendingApprovals.set(approvalKey, {
        threadId,
        stepId,
        prompt,
        timeoutSeconds,
        requestedAt: new Date().toISOString(),
        workflowName,
        resolve,
        reject,
      })

      // Set timeout
      if (timeoutSeconds > 0) {
        setTimeout(() => {
          if (this.pendingApprovals.has(approvalKey)) {
            this.pendingApprovals.delete(approvalKey)
            reject(new Error(`Human approval timeout after ${timeoutSeconds} seconds`))
          }
        }, timeoutSeconds * 1000)
      }

      FlowLogger.log(
        'human-approval',
        `Waiting for human approval: ${threadId}:${stepId} (timeout: ${timeoutSeconds}s)`
      )
    })
  }

  /**
   * Get count of pending approvals
   */
  getPendingCount(): number {
    return this.pendingApprovals.size
  }

  /**
   * Clear all pending approvals (for testing/cleanup)
   */
  clearAllPendingApprovals(): void {
    for (const approval of this.pendingApprovals.values()) {
      approval.reject(new Error('System shutdown - all approvals cancelled'))
    }
    this.pendingApprovals.clear()
    FlowLogger.log('human-approval', 'Cleared all pending approvals')
  }
}
