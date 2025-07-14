/**
 * OverdueApprovalsAlert Component - Alert system for overdue approvals
 *
 * SOLID: Single responsibility - overdue approval alerting
 * DRY: Reusable alert component with configurable actions
 * KISS: Simple alert with clear messaging and actions
 * Library-First: Uses React hooks and existing UI patterns
 */

import React, { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Clock, X, Eye, CheckCircle, XCircle } from 'lucide-react'
import { useWebSocket } from '../../hooks/useWebSocket'
import type { WorkflowApproval } from '../../../web/server/schemas/approval-types'

interface OverdueApprovalsAlertProps {
  projectId?: string
  onViewApprovals?: () => void
  onDismiss?: () => void
  className?: string
  autoRefreshInterval?: number // milliseconds
}

interface AlertAction {
  label: string
  onClick: () => void
  variant: 'primary' | 'secondary' | 'danger'
  icon?: React.ReactNode
}

export const OverdueApprovalsAlert: React.FC<OverdueApprovalsAlertProps> = ({
  projectId,
  onViewApprovals,
  onDismiss,
  className = '',
  autoRefreshInterval = 60000, // 1 minute
}) => {
  const [overdueApprovals, setOverdueApprovals] = useState<WorkflowApproval[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date>(new Date())

  // WebSocket for real-time updates
  const { socket } = useWebSocket()

  /**
   * Check if approval is overdue
   * KISS: Simple time comparison
   */
  const isOverdue = useCallback((approval: WorkflowApproval): boolean => {
    if (approval.status !== 'pending') return false
    return new Date(approval.expiresAt) < new Date()
  }, [])

  /**
   * Fetch overdue approvals from API
   * Library-First: Standard fetch pattern
   */
  const fetchOverdueApprovals = useCallback(async () => {
    try {
      setError(null)

      const url = projectId
        ? `/api/approvals/projects/${projectId}/pending`
        : '/api/approvals?status=pending'

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch approvals: ${response.statusText}`)
      }

      const data = await response.json()
      const allApprovals = data.approvals || []

      // Filter for overdue approvals
      const overdue = allApprovals.filter(isOverdue)
      setOverdueApprovals(overdue)
      setLastChecked(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch approvals')
      console.error('Error fetching overdue approvals:', err)
    } finally {
      setIsLoading(false)
    }
  }, [projectId, isOverdue])

  /**
   * Handle quick approve action
   * DRY: Centralized approval handling
   */
  const handleQuickApprove = useCallback(async (approvalId: string) => {
    try {
      const response = await fetch(`/api/approvals/${approvalId}/decide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decision: 'approved',
          comment: 'Quick approved from overdue alert',
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to approve: ${response.statusText}`)
      }

      // Remove from overdue list
      setOverdueApprovals((prev) => prev.filter((a) => a.id !== approvalId))
    } catch (err) {
      console.error('Error quick approving:', err)
      // Could add toast notification here
    }
  }, [])

  /**
   * Handle quick reject action
   * DRY: Centralized rejection handling
   */
  const handleQuickReject = useCallback(async (approvalId: string) => {
    try {
      const response = await fetch(`/api/approvals/${approvalId}/decide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decision: 'rejected',
          comment: 'Quick rejected from overdue alert',
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to reject: ${response.statusText}`)
      }

      // Remove from overdue list
      setOverdueApprovals((prev) => prev.filter((a) => a.id !== approvalId))
    } catch (err) {
      console.error('Error quick rejecting:', err)
      // Could add toast notification here
    }
  }, [])

  /**
   * Format overdue duration
   * KISS: Simple duration formatting
   */
  const formatOverdueDuration = useCallback((expiresAt: string): string => {
    const overdueMs = Date.now() - new Date(expiresAt).getTime()
    const hours = Math.floor(overdueMs / 3600000)
    const minutes = Math.floor((overdueMs % 3600000) / 60000)

    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h overdue`
    }
    if (hours > 0) return `${hours}h ${minutes}m overdue`
    return `${minutes}m overdue`
  }, [])

  /**
   * Get alert severity based on overdue duration
   * SOLID: Single purpose severity calculation
   */
  const getAlertSeverity = useCallback(
    (approval: WorkflowApproval): 'warning' | 'error' | 'critical' => {
      const overdueMs = Date.now() - new Date(approval.expiresAt).getTime()
      const hours = overdueMs / 3600000

      if (hours > 24 || approval.riskLevel === 'critical') return 'critical'
      if (hours > 4 || approval.riskLevel === 'high') return 'error'
      return 'warning'
    },
    []
  )

  /**
   * Generate alert actions based on context
   * DRY: Centralized action generation
   */
  const getAlertActions = useCallback((): AlertAction[] => {
    const actions: AlertAction[] = []

    if (onViewApprovals) {
      actions.push({
        label: 'View All',
        onClick: onViewApprovals,
        variant: 'primary',
        icon: <Eye className="w-4 h-4" />,
      })
    }

    // Quick actions for single approval
    if (overdueApprovals.length === 1) {
      const approval = overdueApprovals[0]
      actions.push({
        label: 'Quick Approve',
        onClick: () => handleQuickApprove(approval.id),
        variant: 'secondary',
        icon: <CheckCircle className="w-4 h-4" />,
      })
      actions.push({
        label: 'Quick Reject',
        onClick: () => handleQuickReject(approval.id),
        variant: 'danger',
        icon: <XCircle className="w-4 h-4" />,
      })
    }

    return actions
  }, [overdueApprovals, onViewApprovals, handleQuickApprove, handleQuickReject])

  /**
   * WebSocket event handlers for real-time updates
   * Library-First: Socket.io integration
   */
  useEffect(() => {
    if (!socket) return

    const handleApprovalUpdate = () => {
      // Refresh overdue list when approvals change
      fetchOverdueApprovals()
    }

    // Listen for real-time events
    socket.on('approval:created', handleApprovalUpdate)
    socket.on('approval:updated', handleApprovalUpdate)
    socket.on('approval:decided', handleApprovalUpdate)
    socket.on('approval:deleted', handleApprovalUpdate)

    return () => {
      socket.off('approval:created', handleApprovalUpdate)
      socket.off('approval:updated', handleApprovalUpdate)
      socket.off('approval:decided', handleApprovalUpdate)
      socket.off('approval:deleted', handleApprovalUpdate)
    }
  }, [socket, fetchOverdueApprovals])

  /**
   * Auto-refresh interval for checking overdue status
   * KISS: Simple polling mechanism
   */
  useEffect(() => {
    fetchOverdueApprovals()

    const interval = setInterval(fetchOverdueApprovals, autoRefreshInterval)
    return () => clearInterval(interval)
  }, [fetchOverdueApprovals, autoRefreshInterval])

  // Don't render if dismissed or no overdue approvals
  if (isDismissed || isLoading || overdueApprovals.length === 0) {
    return null
  }

  if (error) {
    return (
      <div className={`p-3 bg-yellow-50 border border-yellow-200 rounded-lg ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center text-yellow-700">
            <AlertTriangle className="w-4 h-4 mr-2" />
            <span className="text-sm">Unable to check for overdue approvals</span>
          </div>
          <button
            onClick={() => fetchOverdueApprovals()}
            className="text-yellow-700 hover:text-yellow-800 text-sm underline"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const mostSevere = overdueApprovals.reduce((prev, current) =>
    getAlertSeverity(current) === 'critical'
      ? current
      : getAlertSeverity(current) === 'error' && getAlertSeverity(prev) !== 'critical'
        ? current
        : prev
  )

  const severity = getAlertSeverity(mostSevere)
  const actions = getAlertActions()

  // Alert styling based on severity
  const alertStyles = {
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-orange-50 border-orange-200 text-orange-800',
    critical: 'bg-red-50 border-red-200 text-red-800',
  }

  const iconStyles = {
    warning: 'text-yellow-600',
    error: 'text-orange-600',
    critical: 'text-red-600',
  }

  const buttonStyles = {
    primary: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    secondary: 'bg-green-100 text-green-800 hover:bg-green-200',
    danger: 'bg-red-100 text-red-800 hover:bg-red-200',
  }

  return (
    <div className={`p-4 border rounded-lg ${alertStyles[severity]} ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className={`flex-shrink-0 ${iconStyles[severity]}`}>
            {severity === 'critical' ? (
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            ) : (
              <Clock className="w-5 h-5" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="text-sm font-semibold">
                {overdueApprovals.length === 1
                  ? 'Approval Overdue'
                  : `${overdueApprovals.length} Approvals Overdue`}
              </h4>
              {severity === 'critical' && (
                <span className="px-2 py-0.5 bg-red-200 text-red-800 rounded text-xs font-medium">
                  URGENT
                </span>
              )}
            </div>

            {overdueApprovals.length === 1 ? (
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {mostSevere.workflowName || `Workflow ${mostSevere.threadId.slice(-8)}`}
                </p>
                <p className="text-sm opacity-90">{formatOverdueDuration(mostSevere.expiresAt)}</p>
                {mostSevere.prompt && (
                  <p className="text-sm opacity-75 line-clamp-2">{mostSevere.prompt}</p>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm">Multiple workflows waiting for approval decisions</p>
                <p className="text-sm opacity-90">
                  Longest overdue: {formatOverdueDuration(mostSevere.expiresAt)}
                </p>
              </div>
            )}

            <div className="flex items-center mt-2 text-xs opacity-75">
              <Clock className="w-3 h-3 mr-1" />
              <span>Last checked: {lastChecked.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {/* Dismiss button */}
        <button
          onClick={() => {
            setIsDismissed(true)
            if (onDismiss) onDismiss()
          }}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 ml-2"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Action buttons */}
      {actions.length > 0 && (
        <div className="flex items-center space-x-2 mt-3 pt-2 border-t border-current border-opacity-20">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`
                flex items-center space-x-1 px-3 py-1.5 rounded text-xs font-medium
                transition-colors ${buttonStyles[action.variant]}
              `}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
