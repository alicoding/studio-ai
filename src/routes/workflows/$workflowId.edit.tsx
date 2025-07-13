import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { useEffect } from 'react'
import VisualWorkflowBuilder from '../../components/workflow-builder/VisualWorkflowBuilder'
import { useWorkflowBuilderStore } from '../../stores/workflowBuilder'
import ky from 'ky'
import type { WorkflowDefinition } from '../../../web/server/schemas/workflow-builder'

export const Route = createFileRoute('/workflows/$workflowId/edit')({
  component: EditWorkflow,
})

function EditWorkflow() {
  const navigate = useNavigate()
  const { workflowId } = useParams({ from: '/workflows/$workflowId/edit' })
  const { loadWorkflow, reset } = useWorkflowBuilderStore()

  useEffect(() => {
    // Load the workflow when component mounts
    const loadWorkflowData = async () => {
      try {
        const response = await ky.get(`${window.location.origin}/api/workflows/saved/${workflowId}`).json<{
          id: string
          name: string
          description?: string
          definition: WorkflowDefinition
        }>()
        
        loadWorkflow(response.definition)
      } catch (error) {
        console.error('Failed to load workflow:', error)
        // TODO: Show error toast
        navigate({ to: '/workflows' })
      }
    }

    loadWorkflowData()

    // Clear workflow when leaving the page
    return () => {
      reset()
    }
  }, [workflowId, loadWorkflow, reset, navigate])

  const handleClose = () => {
    navigate({ to: '/workflows' })
  }

  return <VisualWorkflowBuilder onClose={handleClose} />
}