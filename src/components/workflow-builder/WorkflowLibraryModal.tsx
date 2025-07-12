/**
 * Workflow Library Modal - Modal wrapper for WorkflowLibrary component
 *
 * SOLID: Single responsibility - modal integration for workflow library
 * DRY: Reuses existing ModalLayout and WorkflowLibrary components
 * KISS: Simple modal wrapper with consistent patterns
 * Library-First: Uses existing modal system
 */

import React, { useCallback } from 'react'
import { ModalLayout } from '../ui/modal-layout'
import { WorkflowLibrary } from './WorkflowLibrary'
import { useWorkflowBuilderStore } from '../../stores/workflowBuilder'
import type { WorkflowDefinition } from '../../../web/server/schemas/workflow-builder'

interface SavedWorkflow {
  id: string
  name: string
  description?: string
  definition: WorkflowDefinition
  updatedAt: string
  scope?: string
  projectId?: string
  isTemplate?: boolean
}

interface WorkflowLibraryModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectWorkflow?: (workflow: WorkflowDefinition) => void
  title?: string
  subtitle?: string
}

export const WorkflowLibraryModal: React.FC<WorkflowLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectWorkflow,
  title = 'Workflow Library',
  subtitle = 'Browse and load saved workflows',
}) => {
  const { loadWorkflow } = useWorkflowBuilderStore()

  const handleLoadWorkflow = useCallback(
    (workflow: WorkflowDefinition) => {
      loadWorkflow(workflow)
      onSelectWorkflow?.(workflow)
      onClose()
    },
    [loadWorkflow, onSelectWorkflow, onClose]
  )

  const handleEditWorkflow = useCallback(
    (workflow: SavedWorkflow) => {
      // Load workflow for editing
      loadWorkflow(workflow.definition)
      onSelectWorkflow?.(workflow.definition)
      onClose()
    },
    [loadWorkflow, onSelectWorkflow, onClose]
  )

  const handleExecuteWorkflow = useCallback(
    async (workflow: SavedWorkflow) => {
      try {
        // TODO: Implement workflow execution
        console.log('Execute workflow:', workflow.name)
        // For now, we'll just load it
        loadWorkflow(workflow.definition)
        onSelectWorkflow?.(workflow.definition)
        onClose()
      } catch (error) {
        console.error('Failed to execute workflow:', error)
      }
    },
    [loadWorkflow, onSelectWorkflow, onClose]
  )

  return (
    <ModalLayout
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
        </div>
      }
      size="xl"
      className="h-[80vh]"
    >
      <div className="flex flex-col h-full">
        <WorkflowLibrary
          onLoadWorkflow={handleLoadWorkflow}
          onEditWorkflow={handleEditWorkflow}
          onExecuteWorkflow={handleExecuteWorkflow}
          className="flex-1"
        />

        <div className="flex-none p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </ModalLayout>
  )
}

export default WorkflowLibraryModal
