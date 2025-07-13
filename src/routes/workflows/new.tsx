import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import VisualWorkflowBuilder from '../../components/workflow-builder/VisualWorkflowBuilder'
import { useWorkflowBuilderStore } from '../../stores/workflowBuilder'

export const Route = createFileRoute('/workflows/new')({
  component: NewWorkflow,
})

function NewWorkflow() {
  const navigate = useNavigate()
  const { reset, initWorkflow } = useWorkflowBuilderStore()

  // Always create a fresh global workflow when this route loads
  useEffect(() => {
    reset() // Clear any existing workflow
    initWorkflow('Untitled Workflow', 'Global workflow') // No projectId for global workflows
  }, [reset, initWorkflow])

  const handleClose = () => {
    navigate({ to: '/workflows' })
  }

  return <VisualWorkflowBuilder onClose={handleClose} />
}
