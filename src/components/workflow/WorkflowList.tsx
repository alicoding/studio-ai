/**
 * Workflow visibility component - displays active workflows
 *
 * SOLID: Single responsibility - workflow display
 * DRY: Reuses workflow store
 * KISS: Simple list interface with modal for details
 */

import { Activity, Trash2 } from 'lucide-react'
import { useState, useMemo, useRef } from 'react'
import { useWorkflowStore } from '../../stores/workflows'
import type { WorkflowInfo } from '../../stores/workflows'
import { useWorkspaceLayout } from '../../hooks/useWorkspaceLayout'
import { WorkflowBulkActions } from './WorkflowBulkActions'
import { DeleteWorkflowModal } from '../modals/DeleteWorkflowModal'

const WorkflowItem: React.FC<{
  workflow: WorkflowInfo
  isSelected: boolean
  isHighlighted: boolean
  onClick: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
}> = ({ workflow, isSelected, isHighlighted, onClick, onDelete }) => {
  return (
    <div
      className={`w-full border-b border-border last:border-b-0 ${
        isHighlighted ? 'bg-primary/8' : ''
      }${isSelected ? ' bg-primary/5' : ''}`}
    >
      <div
        className={`flex items-center gap-2 p-3 transition-colors ${
          isHighlighted ? 'border-l-2 border-l-primary' : 'hover:bg-secondary/50'
        }`}
      >
        {/* Workflow Content - Clickable */}
        <button className="flex-1 text-left" onClick={(e) => onClick(e)}>
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

        {/* Delete button */}
        <button
          onClick={onDelete}
          className="flex items-center justify-center w-6 h-6 rounded hover:bg-red-500/10 text-red-500 hover:text-red-600 transition-colors"
          title="Delete workflow"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

interface WorkflowListProps {
  className?: string
  projectId?: string
}

export function WorkflowList({ className = '' }: WorkflowListProps) {
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean
    workflows: WorkflowInfo[]
    isDeleting: boolean
  }>({
    isOpen: false,
    workflows: [],
    isDeleting: false,
  })
  const lastSelectedIndexRef = useRef<number>(-1)

  const workflows = useWorkflowStore((state) => state.workflowList)
  const selectedWorkflows = useWorkflowStore((state) => state.selectedWorkflows)
  const toggleWorkflowSelection = useWorkflowStore((state) => state.toggleWorkflowSelection)
  const clearSelection = useWorkflowStore((state) => state.clearSelection)
  const deleteWorkflow = useWorkflowStore((state) => state.deleteWorkflow)
  const bulkDeleteWorkflows = useWorkflowStore((state) => state.bulkDeleteWorkflows)

  const { selectedWorkflowId, setSelectedWorkflow } = useWorkspaceLayout()

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

  const handleWorkflowClick = (workflow: WorkflowInfo, e: React.MouseEvent) => {
    const currentIndex = allWorkflows.findIndex((w) => w.threadId === workflow.threadId)

    // Handle shift+click for range selection
    if (e.shiftKey && lastSelectedIndexRef.current !== -1) {
      const start = Math.min(lastSelectedIndexRef.current, currentIndex)
      const end = Math.max(lastSelectedIndexRef.current, currentIndex)

      // Clear existing selection if not cmd/ctrl key
      if (!e.metaKey && !e.ctrlKey) {
        clearSelection()
      }

      // Select range
      for (let i = start; i <= end; i++) {
        const w = allWorkflows[i]
        if (w && !selectedWorkflows.has(w.threadId)) {
          toggleWorkflowSelection(w.threadId)
        }
      }

      // Enable multi-select mode automatically
      if (!isMultiSelectMode) {
        setIsMultiSelectMode(true)
      }
    }
    // Handle cmd/ctrl+click for individual multi-selection
    else if (e.metaKey || e.ctrlKey) {
      toggleWorkflowSelection(workflow.threadId)
      lastSelectedIndexRef.current = currentIndex

      // Enable multi-select mode automatically
      if (!isMultiSelectMode) {
        setIsMultiSelectMode(true)
      }
    }
    // Normal click - select single workflow
    else {
      // Switch to workflow mode and set selected workflow in canvas
      setSelectedWorkflow(workflow.threadId)
      lastSelectedIndexRef.current = currentIndex

      // Clear multi-selection if any
      if (selectedWorkflows.size > 0) {
        clearSelection()
      }
    }
  }

  const handleDeleteWorkflow = async (workflow: WorkflowInfo, e: React.MouseEvent) => {
    e.stopPropagation()

    // If workflow is selected and there are multiple selections, delete all selected
    if (selectedWorkflows.has(workflow.threadId) && selectedWorkflows.size > 1) {
      const selected = allWorkflows.filter((w) => selectedWorkflows.has(w.threadId))
      setDeleteModalState({
        isOpen: true,
        workflows: selected,
        isDeleting: false,
      })
    } else {
      // Delete single workflow
      setDeleteModalState({
        isOpen: true,
        workflows: [workflow],
        isDeleting: false,
      })
    }
  }

  const handleConfirmDelete = async () => {
    setDeleteModalState((prev) => ({ ...prev, isDeleting: true }))

    try {
      if (deleteModalState.workflows.length === 1) {
        // Single delete
        const success = await deleteWorkflow(deleteModalState.workflows[0].threadId)
        if (!success) {
          alert('Failed to delete workflow. Please try again.')
        }
      } else {
        // Bulk delete
        const threadIds = deleteModalState.workflows.map((w) => w.threadId)
        const deletedCount = await bulkDeleteWorkflows(threadIds)
        if (deletedCount === 0) {
          alert('Failed to delete workflows. Please try again.')
        } else {
          clearSelection()
          setIsMultiSelectMode(false)
        }
      }
    } catch (error) {
      console.error('Failed to delete workflow(s):', error)
      alert('Failed to delete workflow(s). Please try again.')
    } finally {
      setDeleteModalState({
        isOpen: false,
        workflows: [],
        isDeleting: false,
      })
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
          <span className="text-xs text-muted-foreground ml-auto">
            {selectedWorkflows.size > 0 ? `${selectedWorkflows.size} selected • ` : ''}
            {workflows.length} total
          </span>
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
                  isHighlighted={workflow.threadId === selectedWorkflowId}
                  onClick={(e) => handleWorkflowClick(workflow, e)}
                  onDelete={(e) => handleDeleteWorkflow(workflow, e)}
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
                  isHighlighted={workflow.threadId === selectedWorkflowId}
                  onClick={(e) => handleWorkflowClick(workflow, e)}
                  onDelete={(e) => handleDeleteWorkflow(workflow, e)}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Delete Workflow Modal */}
      <DeleteWorkflowModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, workflows: [], isDeleting: false })}
        onConfirm={handleConfirmDelete}
        workflows={deleteModalState.workflows}
        isDeleting={deleteModalState.isDeleting}
      />
    </>
  )
}
