/**
 * Workflow State Modal Component - Detailed workflow state inspection
 *
 * SOLID: Single responsibility - display and export workflow state
 * DRY: Reuses existing UI components and services
 * KISS: Simple modal interface with copy/export functionality
 * Library-First: Uses existing dialog components, no external JSON viewer
 */

import React, { useState, useEffect, useCallback } from 'react'
import { WorkflowStateService, WorkflowStateInfo } from '../../services/workflowStateService'
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
  Eye,
  Copy,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileText,
  Database,
} from 'lucide-react'

interface WorkflowStateModalProps {
  threadId: string
  workflowSteps: Array<{
    id: string
    role?: string
    agentId?: string
    task: string
    deps?: string[]
  }>
  checkpointId?: string
  className?: string
  triggerLabel?: string
}

export const WorkflowStateModal: React.FC<WorkflowStateModalProps> = ({
  threadId,
  workflowSteps,
  checkpointId,
  className = '',
  triggerLabel = 'Inspect State',
}) => {
  const [open, setOpen] = useState(false)
  const [stateInfo, setStateInfo] = useState<WorkflowStateInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)

  const fetchWorkflowState = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await WorkflowStateService.getStateInfo(threadId, workflowSteps)
      setStateInfo(response.stateInfo)
    } catch (err) {
      console.error('Failed to fetch workflow state:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch workflow state')
    } finally {
      setLoading(false)
    }
  }, [threadId, workflowSteps])

  // Fetch workflow state when modal opens
  useEffect(() => {
    if (open && threadId) {
      fetchWorkflowState()
    }
  }, [open, threadId, checkpointId, fetchWorkflowState])

  const copyToClipboard = async () => {
    if (!stateInfo) return

    try {
      const stateData = JSON.stringify(stateInfo, null, 2)
      await navigator.clipboard.writeText(stateData)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      alert('Failed to copy to clipboard')
    }
  }

  const exportToFile = () => {
    if (!stateInfo) return

    setExporting(true)
    try {
      const stateData = JSON.stringify(stateInfo, null, 2)
      const blob = new Blob([stateData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `workflow-state-${threadId.substring(0, 8)}-${timestamp}.json`

      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to export file:', err)
      alert('Failed to export file')
    } finally {
      setExporting(false)
    }
  }

  const renderJsonSection = (title: string, data: unknown, icon: React.ReactNode) => {
    if (!data || (typeof data === 'object' && Object.keys(data as object).length === 0)) {
      return (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            {icon}
            <h3 className="text-sm font-medium">{title}</h3>
          </div>
          <div className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded">
            No data available
          </div>
        </div>
      )
    }

    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <h3 className="text-sm font-medium">{title}</h3>
        </div>
        <div className="bg-secondary/50 p-3 rounded-lg border max-h-64 overflow-y-auto">
          <pre className="text-xs whitespace-pre-wrap break-words">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    )
  }

  const renderStateContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading workflow state...</p>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-medium mb-2 text-red-600">Error Loading State</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchWorkflowState} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </div>
      )
    }

    if (!stateInfo) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <Database className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">No State Data</h3>
            <p className="text-sm text-muted-foreground">
              No state information available for this workflow.
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {/* Action buttons */}
        <div className="flex gap-2 pb-4 border-b">
          <Button onClick={copyToClipboard} variant="outline" size="sm">
            {copied ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy to Clipboard
              </>
            )}
          </Button>
          <Button onClick={exportToFile} variant="outline" size="sm" disabled={exporting}>
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export to File
              </>
            )}
          </Button>
        </div>

        {/* State sections */}
        {renderJsonSection(
          'Basic Information',
          {
            threadId: stateInfo.threadId,
            status: stateInfo.status,
            canResume: stateInfo.canResume,
            completedSteps: stateInfo.completedSteps,
            pendingSteps: stateInfo.pendingSteps,
          },
          <FileText className="w-4 h-4 text-blue-500" />
        )}

        {renderJsonSection(
          'Session IDs',
          stateInfo.sessionIds,
          <Database className="w-4 h-4 text-green-500" />
        )}

        {renderJsonSection(
          'Current State',
          stateInfo.currentState,
          <Eye className="w-4 h-4 text-purple-500" />
        )}

        {renderJsonSection(
          'Checkpoint History',
          stateInfo.checkpointHistory,
          <FileText className="w-4 h-4 text-orange-500" />
        )}

        {/* Complete state as fallback */}
        <div className="pt-4 border-t">
          <details className="cursor-pointer">
            <summary className="text-sm font-medium mb-2 flex items-center gap-2">
              <Database className="w-4 h-4" />
              Complete State Data (Advanced)
            </summary>
            <div className="bg-secondary/50 p-3 rounded-lg border max-h-96 overflow-y-auto">
              <pre className="text-xs whitespace-pre-wrap break-words">
                {JSON.stringify(stateInfo, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      </div>
    )
  }

  const getModalTitle = () => {
    if (checkpointId) {
      return `Workflow State - Checkpoint ${checkpointId.substring(0, 8)}...`
    }
    return 'Workflow State Inspection'
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Eye className="w-4 h-4 mr-2" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            {getModalTitle()}
          </DialogTitle>
          <DialogDescription>
            Detailed workflow state information for debugging and inspection.
            {checkpointId && (
              <span className="block mt-1 text-xs">
                Viewing state at checkpoint: {checkpointId}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-2">{renderStateContent()}</div>
      </DialogContent>
    </Dialog>
  )
}
