/**
 * ProjectApprovalsView Component - Project-centric approval management dashboard
 *
 * SOLID: Single responsibility - project approval organization
 * DRY: Reusable approval grouping and filtering
 * KISS: Simple priority-based organization
 * Library-First: Uses React, React Query for data fetching
 */

import React, { useState, useMemo, useCallback } from 'react'
import { Clock, AlertTriangle, CheckCircle, Filter, Search } from 'lucide-react'
import type { WorkflowApproval } from '../../../web/server/schemas/approval-types'
import { RiskAssessmentDisplay } from './RiskAssessmentDisplay'

interface ProjectApprovalsViewProps {
  projectId: string
  approvals: WorkflowApproval[]
  onApprovalClick: (approval: WorkflowApproval) => void
  isLoading?: boolean
  className?: string
}

type FilterOption = 'all' | 'pending' | 'overdue' | 'high-risk'
type SortOption = 'priority' | 'date' | 'workflow'

export const ProjectApprovalsView: React.FC<ProjectApprovalsViewProps> = ({
  projectId: _projectId,
  approvals,
  onApprovalClick,
  isLoading = false,
  className = '',
}) => {
  const [filter, setFilter] = useState<FilterOption>('all')
  const [sortBy, setSortBy] = useState<SortOption>('priority')
  const [searchTerm, setSearchTerm] = useState('')

  /**
   * Determine if approval is overdue
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

      // Time remaining weight (less time = higher priority)
      const timeRemaining = new Date(approval.expiresAt).getTime() - Date.now()
      if (timeRemaining < 3600000)
        score += 20 // < 1 hour
      else if (timeRemaining < 14400000) score += 10 // < 4 hours

      return score
    },
    [isOverdue]
  )

  /**
   * Filter and sort approvals
   * DRY: Centralized approval processing
   */
  const processedApprovals = useMemo(() => {
    let filtered = approvals.filter((approval) => {
      // Filter by status/type
      switch (filter) {
        case 'pending':
          return approval.status === 'pending'
        case 'overdue':
          return isOverdue(approval)
        case 'high-risk':
          return approval.riskLevel === 'critical' || approval.riskLevel === 'high'
        default:
          return true
      }
    })

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (approval) =>
          approval.workflowName?.toLowerCase().includes(term) ||
          approval.prompt.toLowerCase().includes(term) ||
          approval.stepId.toLowerCase().includes(term)
      )
    }

    // Sort
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return getPriorityScore(b) - getPriorityScore(a)
        case 'date':
          return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
        case 'workflow':
          return (a.workflowName || '').localeCompare(b.workflowName || '')
        default:
          return 0
      }
    })
  }, [approvals, filter, sortBy, searchTerm, getPriorityScore, isOverdue])

  /**
   * Group approvals by priority
   * SOLID: Single purpose grouping function
   */
  const groupedApprovals = useMemo(() => {
    const groups = {
      critical: processedApprovals.filter((a) => isOverdue(a) || a.riskLevel === 'critical'),
      high: processedApprovals.filter((a) => !isOverdue(a) && a.riskLevel === 'high'),
      medium: processedApprovals.filter((a) => !isOverdue(a) && a.riskLevel === 'medium'),
      low: processedApprovals.filter((a) => !isOverdue(a) && a.riskLevel === 'low'),
    }

    // Remove duplicates (overdue critical items appear in critical group)
    groups.high = groups.high.filter((a) => a.riskLevel !== 'critical')
    groups.medium = groups.medium.filter(
      (a) => a.riskLevel !== 'critical' && a.riskLevel !== 'high'
    )
    groups.low = groups.low.filter(
      (a) => a.riskLevel !== 'critical' && a.riskLevel !== 'high' && a.riskLevel !== 'medium'
    )

    return groups
  }, [processedApprovals, isOverdue])

  /**
   * Get theme-aware color for priority groups
   * DRY: Centralized color mapping
   */
  const getGroupColor = (color: string): string => {
    switch (color) {
      case 'red':
        return 'var(--color-approval-critical)'
      case 'orange':
        return 'var(--color-approval-high)'
      case 'yellow':
        return 'var(--color-approval-medium)'
      case 'green':
        return 'var(--color-approval-low)'
      default:
        return 'var(--color-muted-foreground)'
    }
  }

  /**
   * Format time remaining
   * KISS: Simple time formatting
   */
  const formatTimeRemaining = (expiresAt: string): string => {
    const remaining = new Date(expiresAt).getTime() - Date.now()

    if (remaining < 0) return 'Overdue'

    const hours = Math.floor(remaining / 3600000)
    const minutes = Math.floor((remaining % 3600000) / 60000)

    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  /**
   * Render approval item
   * DRY: Reusable approval card
   */
  const renderApprovalItem = (approval: WorkflowApproval) => {
    const overdue = isOverdue(approval)

    return (
      <div
        key={approval.id}
        onClick={() => onApprovalClick(approval)}
        className={`
          p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md
          ${overdue ? 'border hover:bg-secondary' : 'border hover:bg-secondary'}
        `}
        style={{
          borderColor: overdue ? 'var(--color-approval-overdue)' : 'var(--color-border)',
          backgroundColor: overdue ? 'var(--color-approval-overdue-bg)' : 'var(--color-card)',
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="text-sm font-medium text-foreground truncate">
                {approval.workflowName || `Workflow ${approval.threadId.slice(-8)}`}
              </h4>
              <RiskAssessmentDisplay riskLevel={approval.riskLevel} className="flex-shrink-0" />
            </div>

            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{approval.prompt}</p>

            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              <span>Step: {approval.stepId}</span>
              <span>Requested: {new Date(approval.requestedAt).toLocaleString()}</span>
            </div>
          </div>

          <div className="flex flex-col items-end space-y-1 ml-4">
            <div
              className="flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium"
              style={{
                backgroundColor: overdue
                  ? 'var(--color-approval-overdue-bg)'
                  : 'var(--color-approval-pending-bg)',
                color: overdue ? 'var(--color-approval-overdue)' : 'var(--color-approval-pending)',
              }}
            >
              <Clock className="w-3 h-3" />
              <span>{formatTimeRemaining(approval.expiresAt)}</span>
            </div>

            {overdue && (
              <div
                className="flex items-center space-x-1"
                style={{ color: 'var(--color-approval-overdue)' }}
              >
                <AlertTriangle className="w-3 h-3" />
                <span className="text-xs font-medium">Overdue</span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  /**
   * Render priority group
   * DRY: Reusable group rendering
   */
  const renderPriorityGroup = (
    title: string,
    approvals: WorkflowApproval[],
    color: string,
    icon: React.ReactNode
  ) => {
    if (approvals.length === 0) return null

    return (
      <div className="mb-6">
        <div
          className="flex items-center space-x-2 mb-3 pb-2 border-b"
          style={{ borderBottomColor: 'var(--color-border)' }}
        >
          <span style={{ color: getGroupColor(color) }}>{icon}</span>
          <h3 className="text-sm font-medium" style={{ color: getGroupColor(color) }}>
            {title} ({approvals.length})
          </h3>
        </div>

        <div className="space-y-3">{approvals.map(renderApprovalItem)}</div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderBottomColor: 'var(--color-primary)' }}
        />
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Project Approvals</h2>

        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <span>{processedApprovals.length} approvals</span>
          {groupedApprovals.critical.length > 0 && (
            <span
              className="px-2 py-1 rounded text-xs font-medium"
              style={{
                backgroundColor: 'var(--color-approval-critical-bg)',
                color: 'var(--color-approval-critical)',
              }}
            >
              {groupedApprovals.critical.length} overdue/critical
            </span>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 sm:space-x-4">
        {/* Filter Buttons */}
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {(['all', 'pending', 'overdue', 'high-risk'] as FilterOption[]).map((option) => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              className={`
                px-3 py-1 text-xs font-medium rounded transition-colors
                ${
                  filter === option
                    ? 'bg-accent text-accent-foreground border border-border'
                    : 'bg-card text-foreground border border-border hover:bg-accent/50'
                }
              `}
            >
              {option
                .split('-')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search workflows..."
              className="pl-8 pr-4 py-1 text-sm border rounded focus:ring-2 focus:ring-primary focus:border-primary bg-input text-foreground"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="text-sm border rounded px-2 py-1 focus:ring-2 focus:ring-primary focus:border-primary bg-input text-foreground"
          >
            <option value="priority">Sort by Priority</option>
            <option value="date">Sort by Date</option>
            <option value="workflow">Sort by Workflow</option>
          </select>
        </div>
      </div>

      {/* Approval Groups */}
      <div>
        {processedApprovals.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-sm font-medium text-foreground mb-1">No approvals found</h3>
            <p className="text-sm text-muted-foreground">
              {filter === 'all'
                ? 'This project has no pending approvals'
                : `No approvals match the "${filter}" filter`}
            </p>
          </div>
        ) : (
          <>
            {renderPriorityGroup(
              'Critical & Overdue',
              groupedApprovals.critical,
              'red',
              <AlertTriangle className="w-4 h-4" />
            )}

            {renderPriorityGroup(
              'High Priority',
              groupedApprovals.high,
              'orange',
              <AlertTriangle className="w-4 h-4" />
            )}

            {renderPriorityGroup(
              'Medium Priority',
              groupedApprovals.medium,
              'yellow',
              <Clock className="w-4 h-4" />
            )}

            {renderPriorityGroup(
              'Low Priority',
              groupedApprovals.low,
              'green',
              <CheckCircle className="w-4 h-4" />
            )}
          </>
        )}
      </div>
    </div>
  )
}
