/**
 * Unified approval canvas component for project, global, and consolidated views
 *
 * SOLID: Single responsibility - approval canvas display and management
 * DRY: Reusable across all approval scopes via props
 * KISS: Simple scope-based rendering without overengineering
 * Library-First: Uses established canvas patterns from workspace
 */

import React, { useMemo, useState, useCallback } from 'react'
import { Card, CardHeader, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { AlertCircle, Clock, Users, Filter, ArrowRight } from 'lucide-react'
import { useApprovals, type ApprovalScope, type ApprovalFilters } from '../../hooks/useApprovals'
import { useApprovalColors } from '../../hooks/useTheme'
import { ApprovalDetailCard } from './ApprovalDetailCard'
import { ApprovalQueue } from './ApprovalQueue'
import { ConsolidatedApprovalView } from './ConsolidatedApprovalView'
import { GlobalApprovalLink } from './GlobalApprovalLink'
import { ApprovalFiltersComponent } from './ApprovalFilters'
import ky from 'ky'

export interface ApprovalCanvasContentProps {
  scope: ApprovalScope
  projectId?: string
  filters?: ApprovalFilters
  className?: string
}

export function ApprovalCanvasContent({
  scope,
  projectId,
  filters: initialFilters = {},
  className = '',
}: ApprovalCanvasContentProps) {
  const [localFilters, setLocalFilters] = useState<ApprovalFilters>(initialFilters)

  // Combine filters with search query
  const effectiveFilters = useMemo(
    () => ({
      ...localFilters,
      search: localFilters.search || undefined,
    }),
    [localFilters]
  )

  const {
    approvals,
    loading,
    error,
    summary,
    refetch,
    processApproval,
    selectedApprovalId,
    setSelectedApprovalId,
    groupedApprovals,
  } = useApprovals({ scope, projectId, filters: effectiveFilters })

  // Theme-aware colors
  const colors = useApprovalColors()

  // Get currently selected approval
  const selectedApproval = useMemo(
    () => approvals.find((a) => a.id === selectedApprovalId) || approvals[0] || null,
    [approvals, selectedApprovalId]
  )

  // Auto-select first approval if none selected
  React.useEffect(() => {
    if (!selectedApprovalId && approvals.length > 0) {
      setSelectedApprovalId(approvals[0].id)
    }
  }, [approvals, selectedApprovalId, setSelectedApprovalId])

  // Handle user assignment
  const handleUserAssignment = useCallback(
    async (approvalId: string, userId: string | null) => {
      try {
        await ky.post(`/api/approvals/${approvalId}/assign`, {
          json: { userId },
        })

        // Refresh approvals to get updated assignment
        await refetch()
      } catch (error) {
        console.error('Failed to assign user:', error)
        throw error
      }
    },
    [refetch]
  )

  // Scope-specific header content
  const getHeaderContent = () => {
    switch (scope) {
      case 'project':
        return {
          title: 'Project Approvals',
          subtitle: projectId ? `Approvals for this project` : 'Project-specific approvals',
          icon: <Users className="h-5 w-5" />,
        }
      case 'global':
        return {
          title: 'Global Approvals',
          subtitle: 'System-wide approvals across all projects',
          icon: <AlertCircle className="h-5 w-5" />,
        }
      case 'consolidated':
        return {
          title: 'All Approvals',
          subtitle: 'Consolidated view across projects and global',
          icon: <Filter className="h-5 w-5" />,
        }
    }
  }

  const headerContent = getHeaderContent()

  // Loading state
  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center space-y-4">
          <Clock className="h-12 w-12 animate-spin mx-auto text-muted-foreground" />
          <p className="text-lg font-medium">Loading approvals...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    const copyError = () => {
      const errorDetails = {
        message: error.message,
        scope,
        projectId,
        endpoint: `/api/approvals`,
        timestamp: new Date().toISOString(),
        stack: error.stack,
      }
      navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
    }

    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <Card className="max-w-2xl">
          <CardContent className="p-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <div>
              <h3 className="text-lg font-semibold">Failed to load approvals</h3>
              <p className="text-muted-foreground mt-2">{error.message}</p>
              {error.stack && (
                <div className="mt-4 p-3 bg-muted rounded-lg text-left">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={refetch} variant="outline">
                Try Again
              </Button>
              <Button onClick={copyError} variant="outline" size="sm">
                Copy Error Details
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Empty state
  if (approvals.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <Card className="max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <Users className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">No approvals found</h3>
              <p className="text-muted-foreground mt-2">
                {scope === 'project'
                  ? 'This project has no pending approvals'
                  : scope === 'global'
                    ? 'No global approvals pending'
                    : 'No approvals found across all scopes'}
              </p>
            </div>
            {scope === 'project' && <GlobalApprovalLink />}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Consolidated view uses different layout
  if (scope === 'consolidated') {
    return (
      <div
        className={`h-full flex flex-col ${className}`}
        style={{ backgroundColor: colors.canvas.bg }}
      >
        <ApprovalCanvasHeader {...headerContent} summary={summary} onRefresh={refetch} />
        <div className="flex-1 overflow-hidden">
          <ConsolidatedApprovalView
            groupedApprovals={groupedApprovals}
            onSelectApproval={setSelectedApprovalId}
            onProcessApproval={processApproval}
          />
        </div>
      </div>
    )
  }

  // Standard project/global layout
  return (
    <div
      className={`h-full flex flex-col ${className}`}
      style={{ backgroundColor: colors.canvas.bg }}
    >
      {/* Header with summary and actions */}
      <ApprovalCanvasHeader {...headerContent} summary={summary} onRefresh={refetch} />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main approval detail panel */}
        <div className="flex-1 flex flex-col">
          {/* Approval queue navigation */}
          <div className="border-b" style={{ backgroundColor: colors.canvas.queueBg }}>
            <ApprovalQueue
              approvals={approvals}
              selectedApprovalId={selectedApprovalId}
              onSelectApproval={setSelectedApprovalId}
            />
          </div>

          {/* Selected approval details */}
          <div className="flex-1 overflow-auto">
            {selectedApproval ? (
              <ApprovalDetailCard
                approval={selectedApproval}
                onProcessApproval={processApproval}
                onRefresh={refetch}
                onAssignUser={handleUserAssignment}
                assignedUserId={selectedApproval.assignedTo}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Select an approval to view details</p>
              </div>
            )}
          </div>
        </div>

        {/* Context navigation sidebar */}
        <div
          className="w-80 border-l p-4 space-y-4"
          style={{
            backgroundColor: colors.canvas.queueBg,
            borderColor: colors.canvas.cardBorder,
          }}
        >
          {/* Navigation links */}
          {scope === 'project' && <GlobalApprovalLink />}

          {scope === 'global' && (
            <Card>
              <CardHeader className="pb-3">
                <h4 className="font-medium">Project Views</h4>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  View All Projects
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Summary statistics */}
          {summary && (
            <Card>
              <CardHeader className="pb-3">
                <h4 className="font-medium">Summary</h4>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Pending</span>
                  <Badge variant="secondary">{summary.pendingCount}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Overdue</span>
                  <Badge variant="destructive">{summary.overdueCount}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Approved Today</span>
                  <Badge variant="default">{summary.approvedToday}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Rejected Today</span>
                  <Badge variant="outline">{summary.rejectedToday}</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters and Search */}
          <ApprovalFiltersComponent
            filters={localFilters}
            onFiltersChange={setLocalFilters}
            searchQuery={localFilters.search || ''}
            onSearch={(query) => setLocalFilters({ ...localFilters, search: query || undefined })}
          />
        </div>
      </div>
    </div>
  )
}

interface ApprovalCanvasHeaderProps {
  title: string
  subtitle: string
  icon: React.ReactNode
  summary?: { pendingCount: number; overdueCount: number } | null
  onRefresh: () => void
}

function ApprovalCanvasHeader({
  title,
  subtitle,
  icon,
  summary,
  onRefresh,
}: ApprovalCanvasHeaderProps) {
  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {icon}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              <p className="text-muted-foreground">{subtitle}</p>
            </div>
          </div>

          {summary && (
            <div className="flex items-center space-x-3 ml-8">
              <Badge variant="secondary" className="font-medium">
                {summary.pendingCount} pending
              </Badge>
              {summary.overdueCount > 0 && (
                <Badge variant="destructive" className="font-medium">
                  {summary.overdueCount} overdue
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <Clock className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    </div>
  )
}
