/**
 * Workflow History Component - Timeline-based checkpoint visualization
 *
 * SOLID: Single responsibility - display workflow checkpoint history
 * DRY: Reuses existing UI components and services
 * KISS: Simple timeline interface with clear actions
 * Library-First: Uses existing dialog and button components
 */

import React, { useState, useEffect, useCallback } from 'react'
import { WorkflowStateService, CheckpointData } from '../../services/workflowStateService'
import { useProjectStore } from '../../stores/projects'
import { useWorkflowStore } from '../../stores/workflows'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import { Button } from '../ui/button'
import {
  Clock,
  History,
  CheckCircle,
  XCircle,
  AlertCircle,
  PlayCircle,
  Loader2,
  Calendar,
  GitBranch,
} from 'lucide-react'

interface WorkflowHistoryProps {
  threadId: string
  workflowSteps: Array<{
    id: string
    role?: string
    agentId?: string
    task: string
    deps?: string[]
  }>
  className?: string
}

export const WorkflowHistory: React.FC<WorkflowHistoryProps> = ({
  threadId,
  workflowSteps,
  className = '',
}) => {
  const [open, setOpen] = useState(false)
  const [checkpoints, setCheckpoints] = useState<CheckpointData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resumingFromCheckpoint, setResumingFromCheckpoint] = useState<string | null>(null)

  const { activeProjectId } = useProjectStore()
  const fetchWorkflows = useWorkflowStore((state) => state.fetchWorkflows)

  const fetchCheckpointHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await WorkflowStateService.getHistory(threadId, workflowSteps)
      setCheckpoints(response.checkpoints || [])
    } catch (err) {
      console.error('Failed to fetch checkpoint history:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch checkpoint history')
    } finally {
      setLoading(false)
    }
  }, [threadId, workflowSteps])

  // Fetch checkpoint history when dialog opens
  useEffect(() => {
    if (open && threadId) {
      fetchCheckpointHistory()
    }
  }, [open, threadId, fetchCheckpointHistory])

  const handleResumeFromCheckpoint = async (checkpointId: string) => {
    setResumingFromCheckpoint(checkpointId)
    try {
      const result = await WorkflowStateService.resumeFromCheckpoint(
        threadId,
        checkpointId,
        workflowSteps,
        activeProjectId || undefined
      )

      // Show success message
      alert(
        `Workflow resumed from checkpoint successfully!\n\nThread ID: ${result.threadId}\nResumed: ${result.resumed ? 'Yes' : 'No'}`
      )

      // Close dialog and refresh workflow data
      setOpen(false)
      await fetchWorkflows()
    } catch (err) {
      console.error('Failed to resume from checkpoint:', err)
      alert(
        `Failed to resume from checkpoint: ${err instanceof Error ? err.message : 'Unknown error'}`
      )
    } finally {
      setResumingFromCheckpoint(null)
    }
  }

  const getStatusIcon = (status: string | undefined) => {
    if (!status) {
      return <Clock className="w-4 h-4 text-gray-500" />
    }

    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500" />
      case 'aborted':
        return <XCircle className="w-4 h-4 text-orange-500" />
      case 'paused':
        return <AlertCircle className="w-4 h-4 text-purple-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'border-gray-500 bg-gray-50' // Default for undefined status
    switch (status.toLowerCase()) {
      case 'completed':
        return 'border-green-500 bg-green-50'
      case 'failed':
        return 'border-red-500 bg-red-50'
      case 'pending':
        return 'border-yellow-500 bg-yellow-50'
      case 'running':
        return 'border-blue-500 bg-blue-50'
      case 'paused':
        return 'border-orange-500 bg-orange-50'
      case 'aborted':
        return 'border-gray-500 bg-gray-50'
      default:
        return 'border-gray-500 bg-gray-50'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const renderCheckpointTimeline = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading checkpoint history...</p>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-medium mb-2 text-red-600">Error Loading History</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchCheckpointHistory} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </div>
      )
    }

    if (checkpoints.length === 0) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">No Checkpoints Found</h3>
            <p className="text-sm text-muted-foreground">
              This workflow doesn't have any checkpoint history yet.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Checkpoints are created automatically as workflows progress.
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {checkpoints.map((checkpoint, index) => (
          <div
            key={checkpoint.id || `checkpoint-${index}`}
            className={`relative flex items-start gap-4 p-4 border rounded-lg transition-colors ${getStatusColor(checkpoint.status)}`}
          >
            {/* Timeline line */}
            {index < checkpoints.length - 1 && (
              <div className="absolute left-6 top-12 w-0.5 h-8 bg-border" />
            )}

            {/* Status icon */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-background border-2 flex items-center justify-center">
              {getStatusIcon(checkpoint.status)}
            </div>

            {/* Checkpoint details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">
                  Checkpoint {index + 1} - Step: {checkpoint.stepId}
                </h4>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    checkpoint.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : checkpoint.status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {checkpoint.status}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <Calendar className="w-3 h-3" />
                <span>{formatTimestamp(checkpoint.timestamp)}</span>
                <GitBranch className="w-3 h-3 ml-2" />
                <span>ID: {checkpoint.id ? checkpoint.id.substring(0, 8) : 'unknown'}...</span>
              </div>

              {/* Checkpoint data preview */}
              {checkpoint.data && Object.keys(checkpoint.data).length > 0 && (
                <div className="mb-3">
                  <details className="cursor-pointer">
                    <summary className="text-xs font-medium text-muted-foreground mb-1">
                      Checkpoint Data ({Object.keys(checkpoint.data).length} keys)
                    </summary>
                    <div className="text-xs bg-background/50 p-2 rounded border mt-1 max-h-32 overflow-y-auto">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(checkpoint.data, null, 2)}
                      </pre>
                    </div>
                  </details>
                </div>
              )}

              {/* Resume button */}
              <Button
                onClick={() => checkpoint.id && handleResumeFromCheckpoint(checkpoint.id)}
                disabled={resumingFromCheckpoint !== null || !checkpoint.id}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                {resumingFromCheckpoint &&
                checkpoint.id &&
                resumingFromCheckpoint === checkpoint.id ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Resuming...
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-3 h-3 mr-1" />
                    Resume from here
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <History className="w-4 h-4 mr-2" />
          History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Workflow Checkpoint History
          </DialogTitle>
          <DialogDescription>
            View and resume from specific checkpoints in your workflow execution.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-2">{renderCheckpointTimeline()}</div>
      </DialogContent>
    </Dialog>
  )
}
