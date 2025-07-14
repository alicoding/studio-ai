/**
 * Horizontal approval queue navigation component
 *
 * SOLID: Single responsibility - approval queue navigation
 * DRY: Reusable queue component across all approval views
 * KISS: Simple horizontal scrollable queue with selection
 * Library-First: Uses established UI components and patterns
 */

import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import { AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react'
import { useApprovalColors } from '../../hooks/useTheme'
import type { EnrichedApproval } from '../../hooks/useApprovals'

export interface ApprovalQueueProps {
  approvals: EnrichedApproval[]
  selectedApprovalId: string | null
  onSelectApproval: (id: string) => void
  className?: string
}

export function ApprovalQueue({
  approvals,
  selectedApprovalId,
  onSelectApproval,
  className = '',
}: ApprovalQueueProps) {
  // Theme-aware colors
  const colors = useApprovalColors()

  if (approvals.length === 0) {
    return null
  }

  const getRiskColorStyle = (riskLevel: string) => {
    const riskColors = colors.getRiskColor(riskLevel as 'critical' | 'high' | 'medium' | 'low')
    return {
      backgroundColor: riskColors.text,
    }
  }

  const getStatusIcon = (approval: EnrichedApproval) => {
    if (approval.isOverdue) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    }
    if (approval.status === 'approved') {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    if (approval.status === 'rejected') {
      return <XCircle className="h-4 w-4 text-red-500" />
    }
    return <Clock className="h-4 w-4 text-orange-500" />
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

  return (
    <div className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Approval Queue ({approvals.length})
        </h3>
        <Badge variant="secondary" className="text-xs">
          {approvals.filter((a) => a.status === 'pending').length} pending
        </Badge>
      </div>

      <ScrollArea className="w-full">
        <div className="flex space-x-3 pb-2">
          {approvals.map((approval) => (
            <Button
              key={approval.id}
              variant={selectedApprovalId === approval.id ? 'default' : 'outline'}
              size="sm"
              className="flex-shrink-0 min-w-[200px] h-auto p-3 flex flex-col items-start space-y-2"
              onClick={() => onSelectApproval(approval.id)}
            >
              {/* Header with status and risk */}
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(approval)}
                  <div
                    className="w-2 h-2 rounded-full"
                    style={getRiskColorStyle(approval.riskLevel)}
                    title={`${approval.riskLevel} risk`}
                  />
                </div>
                <Badge
                  variant={approval.isOverdue ? 'destructive' : 'secondary'}
                  className="text-xs px-1 py-0"
                >
                  {formatTimeRemaining(approval.timeRemaining)}
                </Badge>
              </div>

              {/* Approval content */}
              <div className="text-left w-full">
                <p className="text-sm font-medium line-clamp-1">
                  {approval.workflowName || 'Workflow'}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{approval.prompt}</p>
              </div>

              {/* Project context if available */}
              {approval.projectId && (
                <Badge variant="outline" className="text-xs">
                  Project
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
