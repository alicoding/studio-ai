/**
 * Human Approval Modal - Real-time workflow approval interface
 *
 * SOLID: Single responsibility - human approval UI
 * DRY: Reuses standard modal patterns and API service
 * KISS: Simple approve/reject actions with optional comment
 * Library-First: Uses React Hook Form for validation
 */

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import ky from 'ky'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CheckCircle, XCircle, Clock, Users } from 'lucide-react'

interface PendingApproval {
  threadId: string
  stepId: string
  prompt: string
  timeoutSeconds: number
  requestedAt: string
  workflowName?: string
}

interface HumanApprovalModalProps {
  approval: PendingApproval | null
  isOpen: boolean
  onClose: () => void
  onApprovalProcessed: () => void
}

const ApprovalFormSchema = z.object({
  comment: z.string().optional(),
})

type ApprovalFormData = z.infer<typeof ApprovalFormSchema>

export default function HumanApprovalModal({
  approval,
  isOpen,
  onClose,
  onApprovalProcessed,
}: HumanApprovalModalProps) {
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ApprovalFormData>({
    resolver: zodResolver(ApprovalFormSchema),
  })

  const handleApproval = async (approved: boolean, data: ApprovalFormData) => {
    if (!approval) return

    setLoading(true)
    try {
      await ky.post(`/api/workflows/human-approval/${approval.threadId}/${approval.stepId}`, {
        json: {
          approved,
          comment: data.comment,
          userId: 'current-user', // TODO: Get from auth context
        },
      })

      onApprovalProcessed()
      handleClose()
    } catch (error) {
      console.error('Error processing approval:', error)
      alert('Failed to process approval. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const formatTimeRemaining = (requestedAt: string, timeoutSeconds: number) => {
    const requestTime = new Date(requestedAt).getTime()
    const now = Date.now()
    const elapsed = (now - requestTime) / 1000
    const remaining = timeoutSeconds - elapsed

    if (remaining <= 0) return 'Expired'

    const hours = Math.floor(remaining / 3600)
    const minutes = Math.floor((remaining % 3600) / 60)
    const seconds = Math.floor(remaining % 60)

    if (hours > 0) return `${hours}h ${minutes}m remaining`
    if (minutes > 0) return `${minutes}m ${seconds}s remaining`
    return `${seconds}s remaining`
  }

  if (!approval) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 dark:bg-amber-900 p-2 rounded-full">
              <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <DialogTitle>Human Approval Required</DialogTitle>
              <DialogDescription>
                {approval.workflowName && (
                  <span className="font-medium">{approval.workflowName} • </span>
                )}
                Step {approval.stepId}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Approval Prompt */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium text-sm mb-2">Request:</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{approval.prompt}</p>
          </div>

          {/* Timeout Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{formatTimeRemaining(approval.requestedAt, approval.timeoutSeconds)}</span>
          </div>

          {/* Comment Field */}
          <form onSubmit={handleSubmit((_data) => {})}>
            <div className="space-y-2">
              <Label htmlFor="comment" className="text-sm">
                Comment (optional)
              </Label>
              <Textarea
                id="comment"
                {...register('comment')}
                placeholder="Add a comment about your decision..."
                className="min-h-[80px]"
                disabled={loading}
              />
              {errors.comment && (
                <p className="text-sm text-destructive">{errors.comment.message}</p>
              )}
            </div>
          </form>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit((data) => handleApproval(false, data))}
            disabled={loading}
            className="flex-1"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Reject
          </Button>
          <Button
            onClick={handleSubmit((data) => handleApproval(true, data))}
            disabled={loading}
            className="flex-1"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
