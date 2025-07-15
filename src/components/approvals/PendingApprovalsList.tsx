/**
 * PendingApprovalsList Component - Real-time pending approvals list
 *
 * SOLID: Single responsibility - pending approval management
 * DRY: Reusable approval items and filtering
 * KISS: Simple list with real-time updates
 * Library-First: Uses React Query for data fetching, Socket.io for real-time updates
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Clock, AlertTriangle, User, Calendar, Filter } from 'lucide-react'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useApprovalColors } from '../../hooks/useTheme'
import type { WorkflowApproval } from '../../../web/server/schemas/approval-types'
import { RiskAssessmentDisplay } from './RiskAssessmentDisplay'
import { ApprovalDecisionForm } from './ApprovalDecisionForm'

interface PendingApprovalsListProps {
  projectId?: string
  onApprovalUpdate?: () => void
  className?: string
}

type FilterType = 'all' | 'overdue' | 'high-risk' | 'recent'
type SortType = 'priority' | 'date' | 'deadline'

export const PendingApprovalsList: React.FC<PendingApprovalsListProps> = ({
  projectId,
  onApprovalUpdate,
  className = '',
}) => {
  const [approvals, setApprovals] = useState<WorkflowApproval[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<SortType>('priority')
  const [selectedApproval, setSelectedApproval] = useState<WorkflowApproval | null>(null)

  // Theme-aware colors
  const colors = useApprovalColors()

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
   * Get priority score for sorting
   * DRY: Centralized priority calculation
   */
  const getPriorityScore = useCallback(
    (approval: WorkflowApproval): number => {
      let score = 0

      // Risk level weight
      switch (approval.riskLevel) {
        case 'critical':
          score += 40
          break
        case 'high':
          score += 30
          break
        case 'medium':
          score += 20
          break
        case 'low':
          score += 10
          break
      }

      // Overdue weight
      if (isOverdue(approval)) score += 50

      // Time remaining weight
      const timeRemaining = new Date(approval.expiresAt).getTime() - Date.now()
      if (timeRemaining < 3600000)
        score += 20 // < 1 hour
      else if (timeRemaining < 14400000) score += 10 // < 4 hours

      return score
    },
    [isOverdue]
  )

  /**
   * Fetch pending approvals from API
   * Library-First: Using fetch pattern, could upgrade to React Query
   */
  const fetchApprovals = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const url = projectId
        ? `/api/approvals/projects/${projectId}/pending`
        : '/api/approvals?status=pending'

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch approvals: ${response.statusText}`)
      }

      const data = await response.json()
      setApprovals(data.approvals || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch approvals')
      console.error('Error fetching approvals:', err)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  /**
   * Handle approval decision
   * DRY: Centralized decision handling
   */
  const handleApprovalDecision = useCallback(
    async (
      approvalId: string,
      decision: 'approved' | 'rejected',
      comment?: string,
      reasoning?: string
    ) => {
      try {
        const response = await fetch(`/api/approvals/${approvalId}/decide`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            decision,
            comment: comment?.trim() || undefined,
            reasoning: reasoning?.trim() || undefined,
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to submit decision: ${response.statusText}`)
        }

        // Remove from pending list
        setApprovals((prev) => prev.filter((a) => a.id !== approvalId))
        setSelectedApproval(null)

        // Notify parent of update
        if (onApprovalUpdate) {
          onApprovalUpdate()
        }
      } catch (err) {
        console.error('Error submitting approval decision:', err)
        throw err // Re-throw for component error handling
      }
    },
    [onApprovalUpdate]
  )

  /**
   * Filter and sort approvals
   * DRY: Centralized approval processing
   */
  const processedApprovals = React.useMemo(() => {
    let filtered = approvals.filter((approval) => {
      switch (filter) {
        case 'overdue':
          return isOverdue(approval)
        case 'high-risk':
          return approval.riskLevel === 'critical' || approval.riskLevel === 'high'
        case 'recent':
          return new Date(approval.requestedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
        default:
          return true
      }
    })

    // Sort approvals
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return getPriorityScore(b) - getPriorityScore(a)
        case 'date':
          return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
        case 'deadline':
          return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
        default:
          return 0
      }
    })
  }, [approvals, filter, sortBy, getPriorityScore, isOverdue])

  /**
   * Format time remaining
   * KISS: Simple time formatting
   */
  const formatTimeRemaining = useCallback((expiresAt: string): string => {
    const remaining = new Date(expiresAt).getTime() - Date.now()

    if (remaining < 0) return 'Overdue'

    const hours = Math.floor(remaining / 3600000)
    const minutes = Math.floor((remaining % 3600000) / 60000)

    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h`
    }
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }, [])

  /**
   * WebSocket event handlers for real-time updates
   * Library-First: Socket.io integration
   */
  useEffect(() => {
    if (!socket) return

    const handleApprovalCreated = (approval: WorkflowApproval) => {
      // Only add if it matches our filter (pending and project)
      if (approval.status === 'pending' && (!projectId || approval.projectId === projectId)) {
        setApprovals((prev) => {
          // Avoid duplicates
          if (prev.some((a) => a.id === approval.id)) return prev
          return [...prev, approval]
        })
      }
    }

    const handleApprovalUpdated = (approval: WorkflowApproval) => {
      setApprovals((prev) => {
        if (approval.status !== 'pending') {
          // Remove from pending list if no longer pending
          return prev.filter((a) => a.id !== approval.id)
        }

        // Update existing approval
        return prev.map((a) => (a.id === approval.id ? approval : a))
      })
    }

    const handleApprovalDeleted = (approvalId: string) => {
      setApprovals((prev) => prev.filter((a) => a.id !== approvalId))
    }

    // Listen for real-time events
    socket.on('approval:created', handleApprovalCreated)
    socket.on('approval:updated', handleApprovalUpdated)
    socket.on('approval:decided', handleApprovalUpdated)
    socket.on('approval:deleted', handleApprovalDeleted)

    return () => {
      socket.off('approval:created', handleApprovalCreated)
      socket.off('approval:updated', handleApprovalUpdated)
      socket.off('approval:decided', handleApprovalUpdated)
      socket.off('approval:deleted', handleApprovalDeleted)
    }
  }, [socket, projectId])

  // Initial data fetch
  useEffect(() => {
    fetchApprovals()
  }, [fetchApprovals])

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderColor: colors.getStatusColor('pending').text }}
        />
        <span className="ml-3 text-muted-foreground">Loading approvals...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`p-4 bg-destructive/10 border border-destructive/20 rounded-lg ${className}`}>
        <div className="flex items-center text-destructive">
          <AlertTriangle className="w-5 h-5 mr-2" />
          <span className="font-medium">Error loading approvals</span>
        </div>
        <p className="text-destructive text-sm mt-1">{error}</p>
        <button
          onClick={() => fetchApprovals()}
          className="mt-2 px-3 py-1 bg-destructive/20 text-destructive rounded text-sm hover:bg-destructive/30 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-foreground">
            Pending Approvals ({processedApprovals.length})
          </h3>
          {processedApprovals.some(isOverdue) && (
            <span className="px-2 py-1 bg-destructive/10 text-destructive rounded text-xs font-medium">
              {processedApprovals.filter(isOverdue).length} overdue
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Filter buttons */}
          <div className="flex items-center space-x-1">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {(['all', 'overdue', 'high-risk', 'recent'] as FilterType[]).map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`
                  px-2 py-1 text-xs font-medium rounded transition-colors
                  ${
                    filter === filterType
                      ? 'bg-primary/10 text-primary'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }
                `}
              >
                {filterType.charAt(0).toUpperCase() + filterType.slice(1).replace('-', ' ')}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortType)}
            className="text-xs border border-input rounded px-2 py-1 bg-background text-foreground focus:ring-2 focus:ring-ring"
          >
            <option value="priority">Priority</option>
            <option value="date">Date Created</option>
            <option value="deadline">Deadline</option>
          </select>
        </div>
      </div>

      {/* Approvals list */}
      {processedApprovals.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h4 className="text-sm font-medium text-foreground mb-1">No pending approvals</h4>
          <p className="text-sm text-muted-foreground">
            {filter === 'all'
              ? 'All approvals have been resolved'
              : `No approvals match the "${filter}" filter`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {processedApprovals.map((approval) => {
            const overdue = isOverdue(approval)
            const isSelected = selectedApproval?.id === approval.id

            return (
              <div
                key={approval.id}
                className={`
                  border rounded-lg transition-all
                  ${overdue ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-card'}
                  ${isSelected ? 'ring-2 ring-ring' : ''}
                `}
              >
                <div
                  className="p-4 cursor-pointer hover:bg-opacity-50"
                  onClick={() => setSelectedApproval(isSelected ? null : approval)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-sm font-medium text-foreground truncate">
                          {approval.workflowName || `Workflow ${approval.threadId.slice(-8)}`}
                        </h4>
                        <RiskAssessmentDisplay
                          riskLevel={approval.riskLevel}
                          className="flex-shrink-0"
                        />
                        {overdue && (
                          <span className="flex items-center space-x-1 text-destructive">
                            <AlertTriangle className="w-3 h-3" />
                            <span className="text-xs font-medium">Overdue</span>
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {approval.prompt}
                      </p>

                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>Step: {approval.stepId}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(approval.requestedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span className={overdue ? 'text-destructive font-medium' : ''}>
                            {formatTimeRemaining(approval.expiresAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded decision form */}
                {isSelected && (
                  <div className="border-t border-border p-4 bg-muted/30">
                    <ApprovalDecisionForm
                      onDecision={(decision, comment, reasoning) =>
                        handleApprovalDecision(approval.id, decision, comment, reasoning)
                      }
                      className="max-w-md"
                    />
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
