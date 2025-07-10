/**
 * Modal for displaying workflow details with better visibility
 *
 * SOLID: Single responsibility - workflow display
 * DRY: Reuses existing UI components
 * KISS: Simple modal interface
 */

import { X, Activity, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react'
import { format } from 'date-fns'
import type { WorkflowInfo, WorkflowStep } from '../../stores/workflows'

interface WorkflowModalProps {
  workflow: WorkflowInfo | null
  isOpen: boolean
  onClose: () => void
}

const statusIcons = {
  pending: Clock,
  running: Loader2,
  completed: CheckCircle,
  failed: XCircle,
}

const statusColors = {
  pending: 'text-gray-500',
  running: 'text-blue-500',
  completed: 'text-green-500',
  failed: 'text-red-500',
  aborted: 'text-orange-500',
}

export function WorkflowModal({ workflow, isOpen, onClose }: WorkflowModalProps) {
  if (!isOpen || !workflow) return null

  const getStepStatus = (step: WorkflowStep) => {
    const Icon = statusIcons[step.status as keyof typeof statusIcons]
    const colorClass = statusColors[step.status as keyof typeof statusColors]

    return (
      <div className={`flex items-center gap-2 ${colorClass}`}>
        <Icon className={`w-4 h-4 ${step.status === 'running' ? 'animate-spin' : ''}`} />
        <span className="capitalize">{step.status}</span>
      </div>
    )
  }

  const formatTime = (dateString?: string) => {
    if (!dateString) return '-'
    try {
      return format(new Date(dateString), 'HH:mm:ss')
    } catch {
      return '-'
    }
  }

  const getDuration = (start?: string, end?: string) => {
    if (!start) return '-'
    const startTime = new Date(start).getTime()
    const endTime = end ? new Date(end).getTime() : Date.now()
    const duration = Math.floor((endTime - startTime) / 1000)

    if (duration < 60) return `${duration}s`
    const minutes = Math.floor(duration / 60)
    const seconds = duration % 60
    return `${minutes}m ${seconds}s`
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-background border border-border rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Workflow Details</h2>
              <p className="text-sm text-muted-foreground">Thread ID: {workflow.threadId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-md transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Workflow Info */}
          <div className="bg-secondary/30 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Status:</span>
                <span className={`ml-2 font-medium capitalize ${statusColors[workflow.status]}`}>
                  {workflow.status}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Project:</span>
                <span className="ml-2 font-medium">{workflow.projectName || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Last Update:</span>
                <span className="ml-2 font-medium">{formatTime(workflow.lastUpdate)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Steps:</span>
                <span className="ml-2 font-medium">{workflow.steps.length}</span>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div>
            <h3 className="text-md font-semibold mb-3">Workflow Steps</h3>
            <div className="space-y-3">
              {workflow.steps.map((step, index) => (
                <div
                  key={step.id}
                  className="bg-card border border-border rounded-lg p-4 hover:bg-secondary/20 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Step {index + 1}
                      </span>
                      <span className="text-sm font-semibold">
                        {step.agentId || step.role || 'Unknown'}
                      </span>
                    </div>
                    {getStepStatus(step)}
                  </div>

                  <p className="text-sm mb-2 text-foreground/90">{step.task}</p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Start: {formatTime(step.startTime)}</span>
                    <span>End: {formatTime(step.endTime)}</span>
                    <span>Duration: {getDuration(step.startTime, step.endTime)}</span>
                  </div>

                  {step.dependencies && step.dependencies.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Dependencies: {step.dependencies.join(', ')}
                    </div>
                  )}

                  {step.error && (
                    <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-500">
                      Error: {step.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-secondary/20">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {workflow.steps.filter((s) => s.status === 'completed').length} of{' '}
              {workflow.steps.length} steps completed
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
