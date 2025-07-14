/**
 * Hook for handling real-time approval events
 *
 * SOLID: Single responsibility - approval event handling
 * DRY: Centralized approval event logic
 * KISS: Simple WebSocket event listening
 * Library-First: Uses React hooks patterns
 */

import { useEffect, useState, useCallback } from 'react'
import { useWebSocket } from './useWebSocket'
import ky from 'ky'

export interface PendingApproval {
  threadId: string
  stepId: string
  prompt: string
  timeoutSeconds: number
  requestedAt: string
  workflowName?: string
  approvalId?: string
}

export function useApprovalEvents(_projectId?: string) {
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { socket } = useWebSocket()

  // Handle approval requested events
  useEffect(() => {
    if (!socket) return

    const handleApprovalRequested = async (data: {
      threadId: string
      stepId: string
      prompt: string
      timeoutSeconds: number
      approvalId?: string
    }) => {
      console.log('[ApprovalEvents] Approval requested:', data)

      // Fetch workflow details to get the name
      try {
        const workflowsResponse = await ky
          .get(`/api/invoke-status/workflows`)
          .json<{ workflows: Array<{ threadId: string; name?: string }> }>()

        const workflow = workflowsResponse.workflows.find((w) => w.threadId === data.threadId)

        const approval: PendingApproval = {
          threadId: data.threadId,
          stepId: data.stepId,
          prompt: data.prompt,
          timeoutSeconds: data.timeoutSeconds,
          requestedAt: new Date().toISOString(),
          workflowName: workflow?.name,
          approvalId: data.approvalId,
        }

        setPendingApproval(approval)
        setIsModalOpen(true)
      } catch (error) {
        console.error('[ApprovalEvents] Failed to fetch workflow details:', error)

        // Still show the approval modal even if we can't get the workflow name
        const approval: PendingApproval = {
          threadId: data.threadId,
          stepId: data.stepId,
          prompt: data.prompt,
          timeoutSeconds: data.timeoutSeconds,
          requestedAt: new Date().toISOString(),
          approvalId: data.approvalId,
        }

        setPendingApproval(approval)
        setIsModalOpen(true)
      }
    }

    const handleApprovalProcessed = (data: {
      threadId: string
      stepId: string
      approved: boolean
    }) => {
      console.log('[ApprovalEvents] Approval processed:', data)

      // Close modal if it's for the current approval
      if (pendingApproval?.threadId === data.threadId && pendingApproval?.stepId === data.stepId) {
        setIsModalOpen(false)
        setPendingApproval(null)
      }
    }

    // Listen for approval events
    socket.on('approval_requested', handleApprovalRequested)
    socket.on('approval_processed', handleApprovalProcessed)
    socket.on('human_input_received', handleApprovalProcessed)

    return () => {
      socket.off('approval_requested', handleApprovalRequested)
      socket.off('approval_processed', handleApprovalProcessed)
      socket.off('human_input_received', handleApprovalProcessed)
    }
  }, [socket, pendingApproval])

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
    // Don't clear pendingApproval immediately in case user reopens
  }, [])

  const onApprovalProcessed = useCallback(() => {
    setIsModalOpen(false)
    setPendingApproval(null)
  }, [])

  return {
    pendingApproval,
    isModalOpen,
    closeModal,
    onApprovalProcessed,
  }
}
