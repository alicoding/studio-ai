import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { useEffect } from 'react'
import VisualWorkflowBuilder from '../../../../components/workflow-builder/VisualWorkflowBuilder'
import { useWorkflowBuilderStore } from '../../../../stores/workflowBuilder'
import { useWorkflowLoader } from '../../../../hooks/useWorkflowLoader'

export const Route = createFileRoute('/workspace/$projectId/workflows/$workflowId/edit')({
  component: EditWorkflowInProject,
})

function EditWorkflowInProject() {
  const navigate = useNavigate()
  const { workflowId, projectId } = useParams({
    from: '/workspace/$projectId/workflows/$workflowId/edit',
  })
  const { loadWorkflow: loadWorkflowDefinition, reset } = useWorkflowBuilderStore()
  const { loadWorkflow } = useWorkflowLoader()

  useEffect(() => {
    // Load the workflow when component mounts
    const loadWorkflowData = async () => {
      try {
        console.log(
          `[EditWorkflowInProject] Loading workflow ${workflowId} for project ${projectId}`
        )

        const workflow = await loadWorkflow(workflowId)
        loadWorkflowDefinition(workflow.definition)
      } catch (error) {
        console.error('[EditWorkflowInProject] Failed to load workflow:', error)
        // Return to workspace instead of global workflows page
        navigate({ to: `/workspace/${projectId}` })
      }
    }

    loadWorkflowData()

    // Clear workflow when leaving the page
    return () => {
      reset()
    }
  }, [workflowId, projectId, loadWorkflow, loadWorkflowDefinition, reset, navigate])

  const handleClose = () => {
    // Return to the workspace with workflow mode active
    navigate({ to: `/workspace/${projectId}` })
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000000,
        backgroundColor: 'var(--background)',
      }}
    >
      <VisualWorkflowBuilder onClose={handleClose} />
    </div>
  )
}
