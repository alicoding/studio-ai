/**
 * ApprovalCounts Component - Display approval statistics for project dashboards
 *
 * SOLID: Single responsibility - approval count display
 * DRY: Reusable count component with configurable display modes
 * KISS: Simple counts with clear visual indicators
 * Library-First: Uses React hooks and existing UI patterns
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Clock, AlertTriangle, CheckCircle, XCircle, BarChart3, TrendingUp } from 'lucide-react'
import { useWebSocket } from '../../hooks/useWebSocket'
import type { WorkflowApproval } from '../../../web/server/schemas/approval-types'

interface ApprovalCountsProps {
  projectId?: string
  displayMode?: 'compact' | 'detailed' | 'badges'
  showTrends?: boolean
  onCountClick?: (status: string) => void
  className?: string
  refreshInterval?: number // milliseconds
}

interface ApprovalStats {
  pending: number
  overdue: number
  approved: number
  rejected: number
  total: number
  avgResponseTime?: number // hours
  riskBreakdown?: {
    critical: number
    high: number
    medium: number
    low: number
  }
}

export const ApprovalCounts: React.FC<ApprovalCountsProps> = ({
  projectId,
  displayMode = 'compact',
  showTrends = false,
  onCountClick,
  className = '',
  refreshInterval = 30000, // 30 seconds
}) => {
  const [stats, setStats] = useState<ApprovalStats>({
    pending: 0,
    overdue: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

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
   * Calculate approval statistics
   * SOLID: Single purpose stats calculation
   */
  const calculateStats = useCallback(
    (approvals: WorkflowApproval[]): ApprovalStats => {
      const pending = approvals.filter((a) => a.status === 'pending')
      const overdue = pending.filter(isOverdue)
      const approved = approvals.filter((a) => a.status === 'approved')
      const rejected = approvals.filter((a) => a.status === 'rejected')

      // Calculate average response time for completed approvals
      let avgResponseTime: number | undefined
      const completed = [...approved, ...rejected]
      if (completed.length > 0) {
        const totalResponseTime = completed.reduce((sum, approval) => {
          const responseTime =
            new Date(approval.updatedAt).getTime() - new Date(approval.requestedAt).getTime()
          return sum + responseTime
        }, 0)
        avgResponseTime = totalResponseTime / completed.length / 3600000 // Convert to hours
      }

      // Risk level breakdown for pending approvals
      const riskBreakdown = {
        critical: pending.filter((a) => a.riskLevel === 'critical').length,
        high: pending.filter((a) => a.riskLevel === 'high').length,
        medium: pending.filter((a) => a.riskLevel === 'medium').length,
        low: pending.filter((a) => a.riskLevel === 'low').length,
      }

      return {
        pending: pending.length,
        overdue: overdue.length,
        approved: approved.length,
        rejected: rejected.length,
        total: approvals.length,
        avgResponseTime,
        riskBreakdown,
      }
    },
    [isOverdue]
  )

  /**
   * Fetch approval data from API
   * Library-First: Standard fetch pattern
   */
  const fetchApprovalStats = useCallback(async () => {
    try {
      setError(null)

      const url = projectId ? `/api/projects/${projectId}/approvals` : '/api/approvals'

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch approvals: ${response.statusText}`)
      }

      const data = await response.json()
      const approvals = data.approvals || []
      const calculatedStats = calculateStats(approvals)

      setStats(calculatedStats)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch approval stats')
      console.error('Error fetching approval stats:', err)
    } finally {
      setIsLoading(false)
    }
  }, [projectId, calculateStats])

  /**
   * Handle count click with optional callback
   * DRY: Centralized click handling
   */
  const handleCountClick = useCallback(
    (status: string) => {
      if (onCountClick) {
        onCountClick(status)
      }
    },
    [onCountClick]
  )

  /**
   * WebSocket event handlers for real-time updates
   * Library-First: Socket.io integration
   */
  useEffect(() => {
    if (!socket) return

    const handleApprovalUpdate = () => {
      fetchApprovalStats()
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
  }, [socket, fetchApprovalStats])

  /**
   * Auto-refresh interval
   * KISS: Simple polling mechanism
   */
  useEffect(() => {
    fetchApprovalStats()

    const interval = setInterval(fetchApprovalStats, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchApprovalStats, refreshInterval])

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-sm text-red-600 ${className}`}>
        <span>Error loading approval counts</span>
      </div>
    )
  }

  // Compact mode - single line with key metrics
  if (displayMode === 'compact') {
    return (
      <div className={`flex items-center space-x-4 text-sm ${className}`}>
        <button
          onClick={() => handleCountClick('pending')}
          className={`
            flex items-center space-x-1 transition-colors
            ${onCountClick ? 'hover:text-blue-600 cursor-pointer' : ''}
            ${stats.pending > 0 ? 'text-orange-600' : 'text-gray-500'}
          `}
        >
          <Clock className="w-4 h-4" />
          <span>{stats.pending} pending</span>
        </button>

        {stats.overdue > 0 && (
          <button
            onClick={() => handleCountClick('overdue')}
            className={`
              flex items-center space-x-1 text-red-600 transition-colors
              ${onCountClick ? 'hover:text-red-700 cursor-pointer' : ''}
            `}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>{stats.overdue} overdue</span>
          </button>
        )}

        <button
          onClick={() => handleCountClick('approved')}
          className={`
            flex items-center space-x-1 text-green-600 transition-colors
            ${onCountClick ? 'hover:text-green-700 cursor-pointer' : ''}
          `}
        >
          <CheckCircle className="w-4 h-4" />
          <span>{stats.approved}</span>
        </button>

        <button
          onClick={() => handleCountClick('rejected')}
          className={`
            flex items-center space-x-1 text-red-600 transition-colors
            ${onCountClick ? 'hover:text-red-700 cursor-pointer' : ''}
          `}
        >
          <XCircle className="w-4 h-4" />
          <span>{stats.rejected}</span>
        </button>
      </div>
    )
  }

  // Badge mode - small badges for sidebar/header
  if (displayMode === 'badges') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {stats.pending > 0 && (
          <button
            onClick={() => handleCountClick('pending')}
            className={`
              px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium
              transition-colors
              ${onCountClick ? 'hover:bg-orange-200 cursor-pointer' : ''}
            `}
          >
            {stats.pending} pending
          </button>
        )}

        {stats.overdue > 0 && (
          <button
            onClick={() => handleCountClick('overdue')}
            className={`
              px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium
              transition-colors animate-pulse
              ${onCountClick ? 'hover:bg-red-200 cursor-pointer' : ''}
            `}
          >
            {stats.overdue} overdue
          </button>
        )}
      </div>
    )
  }

  // Detailed mode - full statistics panel
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-gray-600" />
          <h3 className="text-sm font-medium text-gray-900">Approval Statistics</h3>
        </div>
        {showTrends && stats.avgResponseTime !== undefined && (
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <TrendingUp className="w-3 h-3" />
            <span>Avg: {stats.avgResponseTime.toFixed(1)}h</span>
          </div>
        )}
      </div>

      {/* Main stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleCountClick('pending')}
          className={`
            p-3 border rounded-lg transition-all
            ${
              stats.pending > 0
                ? 'border-orange-200 bg-orange-50 hover:bg-orange-100'
                : 'border-gray-200 bg-gray-50'
            }
            ${onCountClick ? 'cursor-pointer' : ''}
          `}
        >
          <div className="flex items-center space-x-2">
            <Clock
              className={`w-4 h-4 ${stats.pending > 0 ? 'text-orange-600' : 'text-gray-400'}`}
            />
            <span className="text-xs text-gray-600">Pending</span>
          </div>
          <div
            className={`text-lg font-semibold ${stats.pending > 0 ? 'text-orange-600' : 'text-gray-400'}`}
          >
            {stats.pending}
          </div>
        </button>

        <button
          onClick={() => handleCountClick('overdue')}
          className={`
            p-3 border rounded-lg transition-all
            ${
              stats.overdue > 0
                ? 'border-red-200 bg-red-50 hover:bg-red-100'
                : 'border-gray-200 bg-gray-50'
            }
            ${onCountClick ? 'cursor-pointer' : ''}
          `}
        >
          <div className="flex items-center space-x-2">
            <AlertTriangle
              className={`w-4 h-4 ${stats.overdue > 0 ? 'text-red-600' : 'text-gray-400'}`}
            />
            <span className="text-xs text-gray-600">Overdue</span>
          </div>
          <div
            className={`text-lg font-semibold ${stats.overdue > 0 ? 'text-red-600' : 'text-gray-400'}`}
          >
            {stats.overdue}
          </div>
        </button>

        <button
          onClick={() => handleCountClick('approved')}
          className={`
            p-3 border border-green-200 bg-green-50 rounded-lg transition-all
            ${onCountClick ? 'hover:bg-green-100 cursor-pointer' : ''}
          `}
        >
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-600">Approved</span>
          </div>
          <div className="text-lg font-semibold text-green-600">{stats.approved}</div>
        </button>

        <button
          onClick={() => handleCountClick('rejected')}
          className={`
            p-3 border border-gray-200 bg-gray-50 rounded-lg transition-all
            ${onCountClick ? 'hover:bg-gray-100 cursor-pointer' : ''}
          `}
        >
          <div className="flex items-center space-x-2">
            <XCircle className="w-4 h-4 text-gray-600" />
            <span className="text-xs text-gray-600">Rejected</span>
          </div>
          <div className="text-lg font-semibold text-gray-600">{stats.rejected}</div>
        </button>
      </div>

      {/* Risk breakdown for pending approvals */}
      {stats.pending > 0 && stats.riskBreakdown && (
        <div className="border-t pt-3">
          <h4 className="text-xs font-medium text-gray-700 mb-2">Risk Levels</h4>
          <div className="grid grid-cols-4 gap-2 text-xs">
            {stats.riskBreakdown.critical > 0 && (
              <div className="text-center">
                <div className="text-red-600 font-semibold">{stats.riskBreakdown.critical}</div>
                <div className="text-gray-500">Critical</div>
              </div>
            )}
            {stats.riskBreakdown.high > 0 && (
              <div className="text-center">
                <div className="text-orange-600 font-semibold">{stats.riskBreakdown.high}</div>
                <div className="text-gray-500">High</div>
              </div>
            )}
            {stats.riskBreakdown.medium > 0 && (
              <div className="text-center">
                <div className="text-yellow-600 font-semibold">{stats.riskBreakdown.medium}</div>
                <div className="text-gray-500">Medium</div>
              </div>
            )}
            {stats.riskBreakdown.low > 0 && (
              <div className="text-center">
                <div className="text-green-600 font-semibold">{stats.riskBreakdown.low}</div>
                <div className="text-gray-500">Low</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Last updated */}
      <div className="text-xs text-gray-500 text-center">
        Last updated: {lastUpdated.toLocaleTimeString()}
      </div>
    </div>
  )
}
