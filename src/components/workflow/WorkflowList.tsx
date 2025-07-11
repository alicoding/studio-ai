/**
 * Workflow visibility component - displays active workflows
 *
 * SOLID: Single responsibility - workflow display
 * DRY: Reuses workflow store
 * KISS: Simple list interface with modal for details
 */

import { Activity, CheckSquare, Square, MoreHorizontal, Trash2 } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useWorkflowStore } from '../../stores/workflows'
import type { WorkflowInfo } from '../../stores/workflows'
import { useWorkspaceLayout } from '../../hooks/useWorkspaceLayout'
import { WorkflowBulkActions } from './WorkflowBulkActions'

const WorkflowItem: React.FC<{
  workflow: WorkflowInfo
  isSelected: boolean
  onToggleSelect: (e: React.MouseEvent) => void
  onClick: () => void
  isMultiSelectMode: boolean
  onDelete: (e: React.MouseEvent) => void
}> = ({ workflow, isSelected, onToggleSelect, onClick, isMultiSelectMode, onDelete }) => {
  return (
    <div className="w-full border-b border-border last:border-b-0">
      <div className="flex items-center gap-2 p-3 hover:bg-secondary/50 transition-colors">
        {/* Checkbox (only in multi-select mode) */}
        {isMultiSelectMode && (
          <button
            onClick={onToggleSelect}
            className="flex items-center justify-center w-4 h-4 rounded border border-border hover:border-primary transition-colors"
            title={isSelected ? 'Deselect workflow' : 'Select workflow'}
          >
            {isSelected ? (
              <CheckSquare className="w-3 h-3 text-primary" />
            ) : (
              <Square className="w-3 h-3 text-muted-foreground" />
            )}
          </button>
        )}

        {/* Workflow Content - Clickable */}
        <button className="flex-1 text-left" onClick={onClick}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 text-primary" />
              <span className="text-xs font-medium truncate">
                {workflow.threadId.substring(0, 8)}...
              </span>
            </div>
            <span
              className={`text-xs px-1.5 py-0.5 rounded ${
                workflow.status === 'running'
                  ? 'bg-blue-500/20 text-blue-500'
                  : workflow.status === 'completed'
                    ? 'bg-green-500/20 text-green-500'
                    : workflow.status === 'failed'
                      ? 'bg-red-500/20 text-red-500'
                      : workflow.status === 'aborted'
                        ? 'bg-orange-500/20 text-orange-500'
                        : 'bg-gray-500/20 text-gray-500'
              }`}
            >
              {workflow.status}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>{workflow.projectName || 'Unknown project'}</span>
            <span>•</span>
            <span>{workflow.steps.length} steps</span>
          </div>
        </button>

        {/* Delete button (only when NOT in multi-select mode) */}
        {!isMultiSelectMode && (
          <button
            onClick={onDelete}
            className="flex items-center justify-center w-6 h-6 rounded hover:bg-red-500/10 text-red-500 hover:text-red-600 transition-colors"
            title="Delete workflow"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}

interface WorkflowListProps {
  className?: string
}

export function WorkflowList({ className = '' }: WorkflowListProps) {
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)

  const workflows = useWorkflowStore((state) => state.workflowList)
  const selectedWorkflows = useWorkflowStore((state) => state.selectedWorkflows)
  const toggleWorkflowSelection = useWorkflowStore((state) => state.toggleWorkflowSelection)
  const clearSelection = useWorkflowStore((state) => state.clearSelection)
  const deleteWorkflow = useWorkflowStore((state) => state.deleteWorkflow)

  const { setSelectedWorkflow } = useWorkspaceLayout()

  // Memoize computed values to prevent infinite loops
  const { activeWorkflows, completedWorkflows, allWorkflows } = useMemo(() => {
    const active = workflows.filter((w) => w.status === 'running')
    const completed = workflows
      .filter((w) => w.status !== 'running')
      .sort((a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime())

    return {
      activeWorkflows: active,
      completedWorkflows: completed,
      allWorkflows: [...active, ...completed],
    }
  }, [workflows])

  const handleWorkflowClick = (workflow: WorkflowInfo) => {
    // Switch to workflow mode and set selected workflow in canvas
    setSelectedWorkflow(workflow.threadId)
  }

  const handleToggleSelect = (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    toggleWorkflowSelection(threadId)
  }

  const handleToggleMultiSelect = () => {
    if (isMultiSelectMode) {
      clearSelection()
    }
    setIsMultiSelectMode(!isMultiSelectMode)
  }

  const handleDeleteWorkflow = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm('Delete this workflow? This action cannot be undone.')) {
      return
    }

    try {
      const success = await deleteWorkflow(threadId)
      if (!success) {
        alert('Failed to delete workflow. Please try again.')
      }
    } catch (error) {
      console.error('Failed to delete workflow:', error)
      alert('Failed to delete workflow. Please try again.')
    }
  }

  if (allWorkflows.length === 0) {
    return (
      <div className={className}>
        <div className="p-8 text-center text-muted-foreground">
          <div className="flex flex-col items-center gap-3">
            <Activity className="w-8 h-8 text-muted-foreground/50" />
            <div>
              <p className="text-sm font-medium">No active workflows</p>
              <p className="text-xs mt-1">Workflows will appear here when created</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={className}>
        <div className="p-3 border-b border-border flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium">Workflows</h3>
          <button
            onClick={handleToggleMultiSelect}
            className="flex items-center justify-center w-6 h-6 rounded hover:bg-secondary/50 transition-colors"
            title={isMultiSelectMode ? 'Exit multi-select mode' : 'Enter multi-select mode'}
          >
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="text-xs text-muted-foreground ml-auto">{workflows.length} total</span>
        </div>

        {/* Bulk Actions */}
        <WorkflowBulkActions isVisible={isMultiSelectMode} />

        <div className="max-h-96 overflow-y-auto">
          {/* Active Workflows Section */}
          {activeWorkflows.length > 0 && (
            <>
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-secondary/30">
                Active ({activeWorkflows.length})
              </div>
              {activeWorkflows.map((workflow) => (
                <WorkflowItem
                  key={workflow.threadId}
                  workflow={workflow}
                  isSelected={selectedWorkflows.has(workflow.threadId)}
                  onToggleSelect={(e) => handleToggleSelect(workflow.threadId, e)}
                  onClick={() => handleWorkflowClick(workflow)}
                  isMultiSelectMode={isMultiSelectMode}
                  onDelete={(e) => handleDeleteWorkflow(workflow.threadId, e)}
                />
              ))}
            </>
          )}

          {/* Completed Workflows Section */}
          {completedWorkflows.length > 0 && (
            <>
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-secondary/30">
                History ({completedWorkflows.length})
              </div>
              {completedWorkflows.map((workflow) => (
                <WorkflowItem
                  key={workflow.threadId}
                  workflow={workflow}
                  isSelected={selectedWorkflows.has(workflow.threadId)}
                  onToggleSelect={(e) => handleToggleSelect(workflow.threadId, e)}
                  onClick={() => handleWorkflowClick(workflow)}
                  isMultiSelectMode={isMultiSelectMode}
                  onDelete={(e) => handleDeleteWorkflow(workflow.threadId, e)}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </>
  )
}
