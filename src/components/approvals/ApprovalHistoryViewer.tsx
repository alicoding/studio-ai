/**
 * ApprovalHistoryViewer Component - View historical approval decisions and audit trail
 *
 * SOLID: Single responsibility - approval history display and audit trail
 * DRY: Reusable history viewer with configurable filtering and pagination
 * KISS: Simple chronological list with clear decision outcomes
 * Library-First: Uses React hooks, virtual scrolling for performance
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Clock,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  Search,
  Download,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import type { WorkflowApproval } from '../../../web/server/schemas/approval-types'
import { RiskAssessmentDisplay } from './RiskAssessmentDisplay'

interface ApprovalHistoryViewerProps {
  projectId?: string
  workflowId?: string
  userId?: string
  className?: string
  maxItems?: number
  showFilters?: boolean
  enableExport?: boolean
}

interface HistoryFilters {
  status: 'all' | 'approved' | 'rejected'
  riskLevel: 'all' | 'critical' | 'high' | 'medium' | 'low'
  timeRange: 'all' | 'today' | 'week' | 'month' | 'quarter'
  decisionBy: string // user filter
}

interface ExpandedDetails {
  [approvalId: string]: boolean
}

export const ApprovalHistoryViewer: React.FC<ApprovalHistoryViewerProps> = ({
  projectId,
  workflowId,
  userId,
  className = '',
  maxItems = 100,
  showFilters = true,
  enableExport = false,
}) => {
  const [approvals, setApprovals] = useState<WorkflowApproval[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedDetails, setExpandedDetails] = useState<ExpandedDetails>({})
  const [filters, setFilters] = useState<HistoryFilters>({
    status: 'all',
    riskLevel: 'all',
    timeRange: 'all',
    decisionBy: '',
  })

  /**
   * Fetch approval history from API
   * Library-First: Standard fetch pattern with query parameters
   */
  const fetchApprovalHistory = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (projectId) params.append('projectId', projectId)
      if (workflowId) params.append('workflowId', workflowId)
      if (userId) params.append('userId', userId)
      params.append('status', 'approved,rejected') // Only completed approvals
      params.append('limit', maxItems.toString())
      params.append('sort', 'updatedAt:desc') // Most recent first

      const url = `/api/approvals?${params.toString()}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Failed to fetch approval history: ${response.statusText}`)
      }

      const data = await response.json()
      setApprovals(data.approvals || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch approval history')
      console.error('Error fetching approval history:', err)
    } finally {
      setIsLoading(false)
    }
  }, [projectId, workflowId, userId, maxItems])

  /**
   * Filter and search approvals
   * DRY: Centralized filtering logic
   */
  const filteredApprovals = useMemo(() => {
    let filtered = approvals

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter((a) => a.status === filters.status)
    }

    // Risk level filter
    if (filters.riskLevel !== 'all') {
      filtered = filtered.filter((a) => a.riskLevel === filters.riskLevel)
    }

    // Time range filter
    if (filters.timeRange !== 'all') {
      const now = new Date()
      let cutoffDate: Date

      switch (filters.timeRange) {
        case 'today':
          cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3)
          cutoffDate = new Date(now.getFullYear(), quarter * 3, 1)
          break
        default:
          cutoffDate = new Date(0)
      }

      filtered = filtered.filter((a) => new Date(a.updatedAt) >= cutoffDate)
    }

    // Decision by filter
    if (filters.decisionBy) {
      filtered = filtered.filter((a) =>
        a.resolvedBy?.toLowerCase().includes(filters.decisionBy.toLowerCase())
      )
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (a) =>
          a.workflowName?.toLowerCase().includes(term) ||
          a.prompt.toLowerCase().includes(term) ||
          a.stepId.toLowerCase().includes(term)
      )
    }

    return filtered
  }, [approvals, filters, searchTerm])

  /**
   * Toggle expanded details for an approval
   * KISS: Simple state toggle
   */
  const toggleExpanded = useCallback((approvalId: string) => {
    setExpandedDetails((prev) => ({
      ...prev,
      [approvalId]: !prev[approvalId],
    }))
  }, [])

  /**
   * Export approval history to CSV
   * Library-First: Use browser's download capability
   */
  const exportToCSV = useCallback(() => {
    const headers = [
      'Date',
      'Workflow',
      'Step',
      'Decision',
      'Risk Level',
      'Decided By',
      'Comment',
      'Response Time (hours)',
    ]

    const rows = filteredApprovals.map((approval) => {
      const responseTime =
        approval.updatedAt && approval.requestedAt
          ? (
              (new Date(approval.updatedAt).getTime() - new Date(approval.requestedAt).getTime()) /
              3600000
            ).toFixed(1)
          : 'N/A'

      return [
        new Date(approval.updatedAt).toLocaleDateString(),
        approval.workflowName || approval.threadId.slice(-8),
        approval.stepId,
        approval.status,
        approval.riskLevel,
        approval.resolvedBy || 'Unknown',
        '', // Comment field not available in WorkflowApproval
        responseTime,
      ]
    })

    const csvContent = [headers, ...rows]
      .map((row) => row.map((field) => `"${field}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `approval-history-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [filteredApprovals])

  /**
   * Format relative time
   * KISS: Simple relative time formatting
   */
  const formatRelativeTime = useCallback((date: string): string => {
    const now = new Date()
    const then = new Date(date)
    const diffMs = now.getTime() - then.getTime()
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000))
    const diffMinutes = Math.floor(diffMs / (60 * 1000))

    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    if (diffMinutes > 0) return `${diffMinutes}m ago`
    return 'Just now'
  }, [])

  /**
   * Calculate response time in hours
   * SOLID: Single purpose time calculation
   */
  const calculateResponseTime = useCallback((approval: WorkflowApproval): string => {
    if (!approval.updatedAt || !approval.requestedAt) return 'N/A'

    const responseMs =
      new Date(approval.updatedAt).getTime() - new Date(approval.requestedAt).getTime()
    const responseHours = responseMs / 3600000

    if (responseHours < 1) {
      const minutes = Math.floor(responseMs / 60000)
      return `${minutes}m`
    }

    return `${responseHours.toFixed(1)}h`
  }, [])

  // Initial data fetch
  useEffect(() => {
    fetchApprovalHistory()
  }, [fetchApprovalHistory])

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderBottomColor: 'var(--color-primary)' }}
        />
        <span className="ml-3 text-muted-foreground">Loading approval history...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={`p-4 border rounded-lg ${className}`}
        style={{
          backgroundColor: 'var(--color-destructive-bg)',
          borderColor: 'var(--color-destructive)',
        }}
      >
        <div className="flex items-center" style={{ color: 'var(--color-destructive)' }}>
          <XCircle className="w-5 h-5 mr-2" />
          <span className="font-medium">Error loading approval history</span>
        </div>
        <p className="text-sm mt-1" style={{ color: 'var(--color-destructive)' }}>
          {error}
        </p>
        <button
          onClick={() => fetchApprovalHistory()}
          className="mt-2 px-3 py-1 rounded text-sm transition-colors hover:opacity-80"
          style={{
            backgroundColor: 'var(--color-destructive-bg)',
            color: 'var(--color-destructive)',
            border: '1px solid var(--color-destructive)',
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Approval History ({filteredApprovals.length})
        </h3>

        {enableExport && filteredApprovals.length > 0 && (
          <button
            onClick={exportToCSV}
            className="flex items-center space-x-2 px-3 py-1.5 rounded text-sm transition-colors hover:opacity-80"
            style={{
              backgroundColor: 'var(--color-primary-bg)',
              color: 'var(--color-primary)',
              border: '1px solid var(--color-primary)',
            }}
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {/* Filters and Search */}
      {showFilters && (
        <div className="space-y-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-muted)' }}>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search workflows, steps, comments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 bg-input text-foreground"
              style={{
                borderColor: 'var(--color-border)',
              }}
            />
          </div>

          {/* Filter controls */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  status: e.target.value as HistoryFilters['status'],
                }))
              }
              className="border rounded px-3 py-1.5 text-sm focus:ring-2 bg-input text-foreground"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <option value="all">All Decisions</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={filters.riskLevel}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  riskLevel: e.target.value as HistoryFilters['riskLevel'],
                }))
              }
              className="border rounded px-3 py-1.5 text-sm focus:ring-2 bg-input text-foreground"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={filters.timeRange}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  timeRange: e.target.value as HistoryFilters['timeRange'],
                }))
              }
              className="border rounded px-3 py-1.5 text-sm focus:ring-2 bg-input text-foreground"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>

            <input
              type="text"
              placeholder="Decision by..."
              value={filters.decisionBy}
              onChange={(e) => setFilters((prev) => ({ ...prev, decisionBy: e.target.value }))}
              className="border rounded px-3 py-1.5 text-sm focus:ring-2 bg-input text-foreground"
              style={{ borderColor: 'var(--color-border)' }}
            />
          </div>
        </div>
      )}

      {/* History List */}
      {filteredApprovals.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h4 className="text-sm font-medium text-foreground mb-1">No approval history found</h4>
          <p className="text-sm text-muted-foreground">
            {searchTerm || filters.status !== 'all' || filters.riskLevel !== 'all'
              ? 'Try adjusting your filters or search terms'
              : 'No approvals have been completed yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredApprovals.map((approval) => {
            const isExpanded = expandedDetails[approval.id]
            const isApproved = approval.status === 'approved'

            return (
              <div
                key={approval.id}
                className="border rounded-lg transition-all"
                style={{
                  borderColor: isApproved
                    ? 'var(--color-approval-approved)'
                    : 'var(--color-approval-rejected)',
                  backgroundColor: isApproved
                    ? 'var(--color-approval-approved-bg)'
                    : 'var(--color-approval-rejected-bg)',
                }}
              >
                <div
                  className="p-4 cursor-pointer hover:bg-opacity-50"
                  onClick={() => toggleExpanded(approval.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <div
                        className="flex-shrink-0"
                        style={{
                          color: isApproved
                            ? 'var(--color-approval-approved)'
                            : 'var(--color-approval-rejected)',
                        }}
                      >
                        {isApproved ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <XCircle className="w-5 h-5" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-sm font-medium text-foreground truncate">
                            {approval.workflowName || `Workflow ${approval.threadId.slice(-8)}`}
                          </h4>
                          <RiskAssessmentDisplay
                            riskLevel={approval.riskLevel}
                            className="flex-shrink-0"
                          />
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{
                              backgroundColor: isApproved
                                ? 'var(--color-approval-approved-bg)'
                                : 'var(--color-approval-rejected-bg)',
                              color: isApproved
                                ? 'var(--color-approval-approved)'
                                : 'var(--color-approval-rejected)',
                            }}
                          >
                            {isApproved ? 'Approved' : 'Rejected'}
                          </span>
                        </div>

                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          Step: {approval.stepId}
                        </p>

                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <User className="w-3 h-3" />
                            <span>{approval.resolvedBy || 'Unknown'}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatRelativeTime(approval.updatedAt)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{calculateResponseTime(approval)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0 text-muted-foreground ml-2">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div
                    className="border-t p-4"
                    style={{
                      borderTopColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-card)',
                    }}
                  >
                    <div className="space-y-3">
                      <div>
                        <h5 className="text-sm font-medium text-foreground mb-1">
                          Original Request
                        </h5>
                        <p className="text-sm text-muted-foreground">{approval.prompt}</p>
                      </div>

                      <div>
                        <h5 className="text-sm font-medium text-foreground mb-1">Status</h5>
                        <p className="text-sm text-muted-foreground capitalize">
                          {approval.status}
                        </p>
                      </div>

                      <div
                        className="grid grid-cols-2 gap-4 pt-2 border-t text-xs text-muted-foreground"
                        style={{ borderTopColor: 'var(--color-border)' }}
                      >
                        <div>
                          <span className="font-medium">Requested:</span>{' '}
                          {new Date(approval.requestedAt).toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Decided:</span>{' '}
                          {new Date(approval.updatedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
