/**
 * Modal for displaying workflow details with better visibility
 *
 * SOLID: Single responsibility - workflow display
 * DRY: Reuses existing UI components
 * KISS: Simple modal interface
 */

import { useState } from 'react'
import {
  X,
  Activity,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  GitBranch,
  List,
  Trash2,
} from 'lucide-react'
import { format } from 'date-fns'
import type { WorkflowInfo, WorkflowStep } from '../../stores/workflows'
import { WorkflowGraph } from './WorkflowGraph'
import { useWorkflowGraph } from '../../hooks/useWorkflowGraph'
import { useWorkflowStore } from '../../stores/workflows'

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
  const [activeTab, setActiveTab] = useState<'steps' | 'graph'>('steps')
  const [isDeleting, setIsDeleting] = useState(false)
  const {
    graphData,
    loading: graphLoading,
    error: graphError,
  } = useWorkflowGraph(workflow?.threadId || null)
  const { deleteWorkflow } = useWorkflowStore()

  const handleDelete = async () => {
    if (!workflow || isDeleting) return

    const confirmed = window.confirm(
      `Are you sure you want to delete workflow "${workflow.invocation}"?\n\nThis action cannot be undone.`
    )

    if (!confirmed) return

    setIsDeleting(true)
    try {
      const success = await deleteWorkflow(workflow.threadId)
      if (success) {
        onClose() // Close modal after successful deletion
      } else {
        alert('Failed to delete workflow. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting workflow:', error)
      alert('An error occurred while deleting the workflow.')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isOpen) return null

  // Handle empty state when no workflow is selected
  if (!workflow) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={onClose}
      >
        <div
          className="bg-background border border-border rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-primary" />
              <div>
                <h2 className="text-lg font-semibold">Workflow History</h2>
                <p className="text-sm text-muted-foreground">No workflows found</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-secondary rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Empty state content */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="text-center text-muted-foreground">
              <div className="flex flex-col items-center gap-4">
                <Activity className="w-16 h-16 text-muted-foreground/30" />
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-2">No Workflows Yet</h3>
                  <p className="text-sm">
                    Workflows will appear here when you use the invoke tool or create multi-agent
                    tasks.
                  </p>
                  <p className="text-sm mt-2">
                    This is expected behavior when no workflows have been created.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-secondary/20">
            <div className="flex justify-end">
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
    if (!dateString) return null
    try {
      return format(new Date(dateString), 'HH:mm:ss')
    } catch {
      return null
    }
  }

  const getDuration = (start?: string, end?: string) => {
    if (!start) return null
    const startTime = new Date(start).getTime()
    const endTime = end ? new Date(end).getTime() : Date.now()
    const duration = Math.floor((endTime - startTime) / 1000)

    if (duration < 60) return `${duration}s`
    const minutes = Math.floor(duration / 60)
    const seconds = duration % 60
    return `${minutes}m ${seconds}s`
  }

  const renderTimeInfo = (step: WorkflowStep) => {
    const startTime = formatTime(step.startTime)
    const endTime = formatTime(step.endTime)
    const duration = getDuration(step.startTime, step.endTime)

    // If no timing information available
    if (!startTime && !endTime && !duration) {
      return (
        <div className="text-xs text-muted-foreground">
          <span>No timing data available</span>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {startTime && <span>Start: {startTime}</span>}
        {endTime && <span>End: {endTime}</span>}
        {duration && <span>Duration: {duration}</span>}
        {!endTime && startTime && step.status === 'running' && (
          <span className="text-blue-500">In progress...</span>
        )}
      </div>
    )
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
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 hover:bg-red-100 hover:text-red-600 rounded-md transition-colors disabled:opacity-50"
              title="Delete workflow"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-secondary rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Workflow Info */}
          <div className="bg-secondary/30 rounded-lg p-4 m-4 mb-0">
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

          {/* Tabs */}
          <div className="px-4 pt-4">
            <div className="flex space-x-1 bg-secondary/30 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('steps')}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'steps'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <List className="w-4 h-4" />
                Steps List
              </button>
              <button
                onClick={() => setActiveTab('graph')}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'graph'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <GitBranch className="w-4 h-4" />
                Graph View
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'steps' && (
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

                      {renderTimeInfo(step)}

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
            )}

            {activeTab === 'graph' && (
              <div className="h-full min-h-[500px] flex flex-col">
                {graphLoading && (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading workflow graph...</span>
                  </div>
                )}

                {graphError && !graphLoading && (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                      <p className="text-red-500 mb-2">Failed to load workflow graph</p>
                      <p className="text-sm text-muted-foreground">{graphError}</p>
                    </div>
                  </div>
                )}

                {graphData && !graphLoading && !graphError && (
                  <div
                    className="flex-1 h-full border border-border rounded-lg overflow-hidden"
                    style={{ minHeight: '500px' }}
                  >
                    <WorkflowGraph
                      data={graphData.graph}
                      threadId={workflow.threadId}
                      className="w-full h-full"
                    />
                  </div>
                )}

                {!graphData && !graphLoading && !graphError && (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <GitBranch className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No graph data available</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Graph visualization requires workflow execution data
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
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
