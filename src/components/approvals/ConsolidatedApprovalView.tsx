/**
 * Consolidated approval view with project grouping
 *
 * SOLID: Single responsibility - multi-project approval display
 * DRY: Reuses ApprovalDetailCard and other components
 * KISS: Simple grouped layout without overengineering
 * Library-First: Uses established UI components and patterns
 */

import { Card, CardHeader, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import { Folder, Globe, Users, AlertTriangle } from 'lucide-react'
import { useApprovalColors } from '../../hooks/useTheme'
import type { EnrichedApproval } from '../../hooks/useApprovals'

// Define the approval decision request type locally for now
interface ApprovalDecisionRequest {
  decision: 'approved' | 'rejected'
  comment?: string
  decidedBy: string
  confidenceLevel?: number
}

export interface ConsolidatedApprovalViewProps {
  groupedApprovals: Record<string, EnrichedApproval[]>
  onSelectApproval: (id: string) => void
  onProcessApproval: (approvalId: string, decision: ApprovalDecisionRequest) => Promise<void>
  className?: string
}

export function ConsolidatedApprovalView({
  groupedApprovals,
  onSelectApproval,
  onProcessApproval,
  className = '',
}: ConsolidatedApprovalViewProps) {
  // Theme-aware colors
  const colors = useApprovalColors()

  const getRiskColorStyle = (riskLevel: string) => {
    const riskColors = colors.getRiskColor(riskLevel as 'critical' | 'high' | 'medium' | 'low')
    return {
      borderLeftColor: riskColors.text,
      backgroundColor: riskColors.bg,
    }
  }

  const formatTimeRemaining = (seconds: number | undefined) => {
    if (!seconds || seconds <= 0) return 'Overdue'

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const getProjectIcon = (projectId: string) => {
    return projectId === 'global' ? <Globe className="h-4 w-4" /> : <Folder className="h-4 w-4" />
  }

  const getProjectName = (projectId: string) => {
    return projectId === 'global' ? 'Global Approvals' : `Project: ${projectId}`
  }

  // Sort groups: global first, then by project name
  const sortedGroupKeys = Object.keys(groupedApprovals).sort((a, b) => {
    if (a === 'global') return -1
    if (b === 'global') return 1
    return a.localeCompare(b)
  })

  if (sortedGroupKeys.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <Card className="max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <Users className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">No approvals found</h3>
              <p className="text-muted-foreground mt-2">
                No approvals pending across all projects and global scope
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <ScrollArea className={`h-full ${className}`}>
      <div className="p-6 space-y-6">
        {sortedGroupKeys.map((projectId) => {
          const approvals = groupedApprovals[projectId]
          const pendingCount = approvals.filter((a) => a.status === 'pending').length
          const overdueCount = approvals.filter((a) => a.isOverdue).length

          return (
            <Card key={projectId} className="overflow-hidden">
              <CardHeader className="bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getProjectIcon(projectId)}
                    <div>
                      <h3 className="font-semibold">{getProjectName(projectId)}</h3>
                      <p className="text-sm text-muted-foreground">
                        {approvals.length} approval{approvals.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {pendingCount > 0 && <Badge variant="secondary">{pendingCount} pending</Badge>}
                    {overdueCount > 0 && (
                      <Badge variant="destructive">{overdueCount} overdue</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="divide-y">
                  {approvals.map((approval) => (
                    <div
                      key={approval.id}
                      className="p-4 border-l-4 hover:bg-muted/30 cursor-pointer transition-colors"
                      style={getRiskColorStyle(approval.riskLevel)}
                      onClick={() => onSelectApproval(approval.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          {/* Header with status and timing */}
                          <div className="flex items-center space-x-3">
                            <Badge
                              variant={approval.isOverdue ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {approval.status.toUpperCase()}
                            </Badge>

                            <Badge variant="outline" className="text-xs">
                              {approval.riskLevel.toUpperCase()} RISK
                            </Badge>

                            {approval.isOverdue && (
                              <div
                                className="flex items-center space-x-1"
                                style={{ color: 'var(--color-approval-overdue)' }}
                              >
                                <AlertTriangle className="h-3 w-3" />
                                <span className="text-xs font-medium">OVERDUE</span>
                              </div>
                            )}

                            <span className="text-xs text-foreground/70">
                              {formatTimeRemaining(approval.timeRemaining)}
                            </span>
                          </div>

                          {/* Workflow and prompt */}
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-sm font-medium">
                                {approval.workflowName || 'Unnamed Workflow'}
                              </span>
                              <span className="text-xs text-foreground/70">
                                Step: {approval.stepId}
                              </span>
                            </div>
                            <p className="text-sm text-foreground/80 line-clamp-2">
                              {approval.prompt}
                            </p>
                          </div>

                          {/* Quick actions for pending approvals */}
                          {approval.status === 'pending' && !approval.isOverdue && (
                            <div className="flex space-x-2 pt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                style={{
                                  color: colors.actions.approve,
                                  borderColor: colors.actions.approve,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onProcessApproval(approval.id, {
                                    decision: 'approved',
                                    decidedBy: 'current-user',
                                  })
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                style={{
                                  color: 'var(--color-approval-rejected)',
                                  borderColor: 'var(--color-approval-rejected)',
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onProcessApproval(approval.id, {
                                    decision: 'rejected',
                                    decidedBy: 'current-user',
                                  })
                                }}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Timestamp */}
                        <div className="text-xs text-foreground/60 text-right ml-4">
                          <div>Requested</div>
                          <div>{new Date(approval.requestedAt).toLocaleDateString()}</div>
                          <div>{new Date(approval.requestedAt).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </ScrollArea>
  )
}
