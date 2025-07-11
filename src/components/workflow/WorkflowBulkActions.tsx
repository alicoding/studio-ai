/**
 * Workflow Bulk Actions Component
 *
 * SOLID: Single responsibility - bulk workflow operations
 * DRY: Reuses existing store methods
 * KISS: Simple UI for batch operations
 */

import React, { useState } from 'react'
import { Trash2, Calendar, CheckSquare, Square, Loader2 } from 'lucide-react'
import { useWorkflowStore } from '../../stores/workflows'

interface WorkflowBulkActionsProps {
  className?: string
  isVisible: boolean
}

export const WorkflowBulkActions: React.FC<WorkflowBulkActionsProps> = ({
  className = '',
  isVisible,
}) => {
  const selectedWorkflows = useWorkflowStore((state) => state.selectedWorkflows)
  const totalCount = useWorkflowStore((state) => state.totalCount)
  const workflowList = useWorkflowStore((state) => state.workflowList)
  const selectAllWorkflows = useWorkflowStore((state) => state.selectAllWorkflows)
  const clearSelection = useWorkflowStore((state) => state.clearSelection)
  const deleteSelected = useWorkflowStore((state) => state.deleteSelected)
  const cleanupOldWorkflows = useWorkflowStore((state) => state.cleanupOldWorkflows)

  const [isDeleting, setIsDeleting] = useState(false)
  const [isCleaning, setIsCleaning] = useState(false)

  if (!isVisible) return null

  const selectedCount = selectedWorkflows.size
  const isAllSelected = selectedCount === workflowList.length && workflowList.length > 0

  const handleSelectAll = () => {
    if (isAllSelected) {
      clearSelection()
    } else {
      selectAllWorkflows()
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedCount === 0) return

    if (!confirm(`Delete ${selectedCount} selected workflows? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    try {
      const deletedCount = await deleteSelected()
      console.log(`Successfully deleted ${deletedCount} workflows`)
    } catch (error) {
      console.error('Failed to delete workflows:', error)
      alert('Failed to delete workflows. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCleanupOld = async () => {
    const daysOld = prompt('Delete workflows older than how many days?', '30')
    if (!daysOld || isNaN(Number(daysOld))) return

    const days = Number(daysOld)
    if (days < 1) {
      alert('Please enter a valid number of days (minimum 1)')
      return
    }

    if (!confirm(`Delete all workflows older than ${days} days? This action cannot be undone.`)) {
      return
    }

    setIsCleaning(true)
    try {
      const deletedCount = await cleanupOldWorkflows(days)
      console.log(`Successfully cleaned up ${deletedCount} old workflows`)
      alert(`Deleted ${deletedCount} workflows older than ${days} days`)
    } catch (error) {
      console.error('Failed to cleanup old workflows:', error)
      alert('Failed to cleanup old workflows. Please try again.')
    } finally {
      setIsCleaning(false)
    }
  }

  return (
    <div className={`flex items-center gap-2 p-2 border-b border-border ${className}`}>
      {/* Select All Toggle */}
      <button
        onClick={handleSelectAll}
        className="flex items-center gap-2 px-2 py-1 text-xs hover:bg-secondary/50 rounded transition-colors"
        title={isAllSelected ? 'Deselect all' : 'Select all visible'}
      >
        {isAllSelected ? (
          <CheckSquare className="w-3 h-3 text-primary" />
        ) : (
          <Square className="w-3 h-3 text-muted-foreground" />
        )}
        <span>
          {selectedCount > 0 ? `${selectedCount} selected` : `Select all (${workflowList.length})`}
        </span>
      </button>

      {/* Total Count Info */}
      <div className="text-xs text-muted-foreground">
        Showing {workflowList.length} of {totalCount} total
      </div>

      <div className="flex-1" />

      {/* Action Buttons */}
      {selectedCount > 0 && (
        <button
          onClick={handleDeleteSelected}
          disabled={isDeleting}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded transition-colors disabled:opacity-50"
        >
          {isDeleting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Trash2 className="w-3 h-3" />
          )}
          Delete {selectedCount}
        </button>
      )}

      <button
        onClick={handleCleanupOld}
        disabled={isCleaning}
        className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 rounded transition-colors disabled:opacity-50"
        title="Delete workflows older than specified days"
      >
        {isCleaning ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Calendar className="w-3 h-3" />
        )}
        Cleanup Old
      </button>
    </div>
  )
}
