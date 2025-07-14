/**
 * Rich approval detail display component
 *
 * SOLID: Single responsibility - approval detail display and actions
 * DRY: Reusable approval card across all views
 * KISS: Clear layout without overengineering
 * Library-First: Uses established UI components and patterns
 */

import { useState } from 'react'
import { Card, CardHeader, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Textarea } from '../ui/textarea'
import { Separator } from '../ui/separator'
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Workflow,
  MessageSquare,
  Shield,
  Calendar,
} from 'lucide-react'
import { useApprovalColors } from '../../hooks/useTheme'
import type { EnrichedApproval } from '../../hooks/useApprovals'

// Define the approval decision request type locally for now
interface ApprovalDecisionRequest {
  decision: 'approved' | 'rejected'
  comment?: string
  decidedBy: string
  confidenceLevel?: number
}

export interface ApprovalDetailCardProps {
  approval: EnrichedApproval
  onProcessApproval: (approvalId: string, decision: ApprovalDecisionRequest) => Promise<void>
  onRefresh: () => void
  className?: string
}

export function ApprovalDetailCard({
  approval,
  onProcessApproval,
  onRefresh,
  className = '',
}: ApprovalDetailCardProps) {
  const [comment, setComment] = useState('')
  const [processing, setProcessing] = useState(false)

  // Theme-aware colors
  const colors = useApprovalColors()

  const getRiskColorStyle = (riskLevel: string) => {
    const riskColors = colors.getRiskColor(riskLevel as 'critical' | 'high' | 'medium' | 'low')
    return {
      color: riskColors.text,
      backgroundColor: riskColors.bg,
      borderColor: riskColors.border,
    }
  }

  const getStatusDisplay = () => {
    if (approval.isOverdue) {
      return {
        icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
        text: 'Overdue',
        variant: 'destructive' as const,
      }
    }

    switch (approval.status) {
      case 'approved':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          text: 'Approved',
          variant: 'default' as const,
        }
      case 'rejected':
        return {
          icon: <XCircle className="h-5 w-5 text-red-500" />,
          text: 'Rejected',
          variant: 'destructive' as const,
        }
      case 'pending':
      default:
        return {
          icon: <Clock className="h-5 w-5 text-orange-500" />,
          text: 'Pending',
          variant: 'secondary' as const,
        }
    }
  }

  const formatTimeRemaining = (seconds: number | undefined) => {
    if (!seconds || seconds <= 0) return 'Expired'

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`
    }
    return `${minutes}m remaining`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const handleProcessApproval = async (decision: 'approved' | 'rejected') => {
    if (processing) return

    try {
      setProcessing(true)

      const decisionRequest: ApprovalDecisionRequest = {
        decision,
        comment: comment.trim() || undefined,
        decidedBy: 'current-user', // TODO: Get from auth context
        confidenceLevel: 5, // Default high confidence
      }

      await onProcessApproval(approval.id, decisionRequest)
      setComment('')
      onRefresh()
    } catch (error) {
      console.error('Failed to process approval:', error)
      // TODO: Show error toast
    } finally {
      setProcessing(false)
    }
  }

  const statusDisplay = getStatusDisplay()
  const canProcess = approval.status === 'pending' && !approval.isOverdue

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Header with status and metadata */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              {statusDisplay.icon}
              <Badge variant={statusDisplay.variant} className="font-medium">
                {statusDisplay.text}
              </Badge>
              <Badge
                className="border"
                style={getRiskColorStyle(approval.riskLevel)}
                variant="outline"
              >
                <Shield className="h-3 w-3 mr-1" />
                {approval.riskLevel.toUpperCase()} RISK
              </Badge>
            </div>

            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>Requested {formatDate(approval.requestedAt)}</span>
              </div>
              {approval.timeRemaining !== undefined && (
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatTimeRemaining(approval.timeRemaining)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Workflow context */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Workflow className="h-4 w-4" />
              <h3 className="font-medium">Workflow Context</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium">Workflow:</span>
                <span className="text-sm text-muted-foreground ml-2">
                  {approval.workflowName || 'Unnamed Workflow'}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium">Step:</span>
                <span className="text-sm text-muted-foreground ml-2">{approval.stepId}</span>
              </div>
              {approval.projectId && (
                <div>
                  <span className="text-sm font-medium">Project:</span>
                  <span className="text-sm text-muted-foreground ml-2">{approval.projectId}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Approval prompt */}
      <div className="space-y-3">
        <h3 className="font-medium flex items-center">
          <MessageSquare className="h-4 w-4 mr-2" />
          Approval Request
        </h3>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm leading-relaxed">{approval.prompt}</p>
          </CardContent>
        </Card>
      </div>

      {/* Context data if available */}
      {approval.contextData && Object.keys(approval.contextData).length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className="font-medium">Additional Context</h3>
            <Card>
              <CardContent className="p-4">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {JSON.stringify(approval.contextData, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Resolution info if already processed */}
      {approval.resolvedAt && (
        <>
          <Separator />
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-medium flex items-center">
                <User className="h-4 w-4 mr-2" />
                Resolution Details
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Resolved by:</span>
                  <span className="ml-2 text-muted-foreground">
                    {approval.resolvedBy || 'Unknown'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Resolved at:</span>
                  <span className="ml-2 text-muted-foreground">
                    {formatDate(approval.resolvedAt)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Action area for pending approvals */}
      {canProcess && (
        <>
          <Separator />
          <div className="space-y-4">
            <h3 className="font-medium">Your Decision</h3>

            <div className="space-y-3">
              <Textarea
                placeholder="Add a comment (optional)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="resize-none"
              />

              <div className="flex space-x-3">
                <Button
                  onClick={() => handleProcessApproval('approved')}
                  disabled={processing}
                  className="flex-1"
                  style={{ backgroundColor: colors.actions.approve, color: 'white' }}
                  size="lg"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {processing ? 'Processing...' : 'Approve'}
                </Button>

                <Button
                  onClick={() => handleProcessApproval('rejected')}
                  disabled={processing}
                  className="flex-1"
                  style={{ backgroundColor: colors.actions.reject, color: 'white' }}
                  size="lg"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {processing ? 'Processing...' : 'Reject'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
