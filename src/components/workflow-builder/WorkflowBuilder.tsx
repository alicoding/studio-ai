/**
 * WorkflowBuilder Container Component
 *
 * SOLID: Single responsibility - orchestrates workflow building UI
 * DRY: Reuses existing UI components
 * KISS: Simple modal-based interface
 * Library-First: Uses existing Modal and Button components
 */

import { useEffect, useState } from 'react'
import { useWorkflowBuilderStore } from '@/stores/workflowBuilder'
import { useProjectStore } from '@/stores'
import { ModalLayout } from '@/components/ui/modal-layout'
import { Button } from '@/components/ui/button'
import StepList from './StepList'
import StepEditor from './StepEditor'
import WorkflowPreview from './WorkflowPreview'

interface WorkflowBuilderProps {
  isOpen: boolean
  onClose: () => void
  projectId?: string
}

export default function WorkflowBuilder({ isOpen, onClose, projectId }: WorkflowBuilderProps) {
  const {
    workflow,
    isDirty,
    selectedStepId,
    validationErrors,
    isValidating,
    isExecuting,
    initWorkflow,
    validateWorkflow,
    executeWorkflow,
    reset,
  } = useWorkflowBuilderStore()

  const currentProject = useProjectStore((state) =>
    state.projects.find((p) => p.id === useProjectStore.getState().activeProjectId)
  )
  const [showPreview, setShowPreview] = useState(false)
  const [workflowName, setWorkflowName] = useState('')
  const [workflowDescription, setWorkflowDescription] = useState('')

  // Initialize workflow on mount
  useEffect(() => {
    if (isOpen && !workflow) {
      const effectiveProjectId = projectId || currentProject?.id
      if (effectiveProjectId) {
        initWorkflow('New Workflow', '', effectiveProjectId)
      }
    }
  }, [isOpen, workflow, projectId, currentProject, initWorkflow])

  // Update workflow name/description when changed
  useEffect(() => {
    if (workflow) {
      setWorkflowName(workflow.name)
      setWorkflowDescription(workflow.description || '')
    }
  }, [workflow])

  const handleClose = () => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to close?')
      if (!confirmed) return
    }
    reset()
    setShowPreview(false)
    onClose()
  }

  const handleExecute = async () => {
    // Validate first
    const isValid = await validateWorkflow()
    if (!isValid) {
      alert('Please fix validation errors before executing')
      return
    }

    try {
      const result = await executeWorkflow()
      if (result.threadId) {
        // Success - close modal and show workflow in activity
        reset()
        onClose()
        // Workflow will appear in activity via SSE events
      }
    } catch (error) {
      console.error('Failed to execute workflow:', error)
      alert('Failed to execute workflow. Please try again.')
    }
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWorkflowName(e.target.value)
    if (workflow) {
      useWorkflowBuilderStore.setState({
        workflow: { ...workflow, name: e.target.value },
        isDirty: true,
      })
    }
  }

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setWorkflowDescription(e.target.value)
    if (workflow) {
      useWorkflowBuilderStore.setState({
        workflow: { ...workflow, description: e.target.value },
        isDirty: true,
      })
    }
  }

  if (!workflow) return null

  const title = (
    <div className="flex-1">
      <input
        type="text"
        value={workflowName}
        onChange={handleNameChange}
        className="text-xl font-bold bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 -mx-2"
        placeholder="Workflow Name"
      />
      <textarea
        value={workflowDescription}
        onChange={handleDescriptionChange}
        className="mt-1 w-full text-sm text-gray-600 bg-transparent border-none outline-none resize-none focus:ring-2 focus:ring-blue-500 rounded px-2 -mx-2"
        placeholder="Add a description..."
        rows={1}
      />
    </div>
  )

  const footer = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center space-x-2">
        {Object.keys(validationErrors).length > 0 && (
          <span className="text-red-600 text-sm">
            {Object.keys(validationErrors).length} validation error(s)
          </span>
        )}
      </div>
      <div className="flex items-center space-x-3">
        <Button variant="ghost" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={() => setShowPreview(!showPreview)}>
          {showPreview ? 'Edit' : 'Preview'}
        </Button>
        <Button
          variant="default"
          onClick={handleExecute}
          disabled={isExecuting || isValidating || !workflow.steps || workflow.steps.length === 0}
        >
          {isExecuting || isValidating ? 'Processing...' : 'Execute Workflow'}
        </Button>
      </div>
    </div>
  )

  return (
    <ModalLayout isOpen={isOpen} onClose={handleClose} title={title} footer={footer} size="2xl">
      <div className="flex h-[60vh]">
        {/* Left Panel - Step List */}
        <div className="w-1/3 border-r overflow-y-auto">
          <StepList />
        </div>

        {/* Right Panel - Step Editor or Preview */}
        <div className="flex-1 overflow-y-auto">
          {showPreview ? (
            <WorkflowPreview />
          ) : selectedStepId ? (
            <StepEditor stepId={selectedStepId} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Select a step to edit or add a new step</p>
            </div>
          )}
        </div>
      </div>
    </ModalLayout>
  )
}
