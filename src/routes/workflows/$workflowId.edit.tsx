import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { useEffect } from 'react'
import VisualWorkflowBuilder from '../../components/workflow-builder/VisualWorkflowBuilder'
import { useWorkflowBuilderStore } from '../../stores/workflowBuilder'
import { useProjectStore } from '../../stores/projects'
import { useWorkflowLoader } from '../../hooks/useWorkflowLoader'

export const Route = createFileRoute('/workflows/$workflowId/edit')({
  component: EditWorkflow,
})

function EditWorkflow() {
  const navigate = useNavigate()
  const { workflowId } = useParams({ from: '/workflows/$workflowId/edit' })
  const { loadWorkflow: loadWorkflowDefinition, reset } = useWorkflowBuilderStore()
  const { activeProjectId } = useProjectStore()
  const { loadWorkflow } = useWorkflowLoader()

  useEffect(() => {
    // Load the workflow when component mounts
    const loadWorkflowData = async () => {
      try {
        const savedWorkflow = await loadWorkflow(workflowId)
        // Preserve all workflow data including positions
        // The definition already contains the saved name and description
        loadWorkflowDefinition(savedWorkflow.definition)
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
  }, [workflowId, loadWorkflow, loadWorkflowDefinition, reset, navigate])

  const handleClose = () => {
    // If we have an active project, return to the project workspace
    // Otherwise, return to the global workflows page
    if (activeProjectId) {
      navigate({ to: `/workspace/${activeProjectId}` })
    } else {
      navigate({ to: '/workflows' })
    }
  }

  return <VisualWorkflowBuilder onClose={handleClose} scope="global" />
}
