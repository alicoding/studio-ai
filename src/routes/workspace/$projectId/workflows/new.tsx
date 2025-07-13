import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { useEffect } from 'react'
import VisualWorkflowBuilder from '../../../../components/workflow-builder/VisualWorkflowBuilder'
import { useWorkflowBuilderStore } from '../../../../stores/workflowBuilder'

export const Route = createFileRoute('/workspace/$projectId/workflows/new')({
  component: NewWorkflowInProject,
})

function NewWorkflowInProject() {
  const navigate = useNavigate()
  const { projectId } = useParams({ from: '/workspace/$projectId/workflows/new' })
  const { initWorkflow, workflow } = useWorkflowBuilderStore()

  // Only create a fresh workflow if one isn't already loaded
  useEffect(() => {
    console.log('[NewWorkflowInProject] Component mounted, checking workflow state')
    console.log('[NewWorkflowInProject] Current workflow:', workflow)

    // Check if we have a workflow loaded
    if (!workflow) {
      console.log('[NewWorkflowInProject] No workflow loaded, creating new one')
      initWorkflow('Untitled Workflow', 'Project workflow', projectId)
    } else {
      console.log(
        '[NewWorkflowInProject] Using existing workflow:',
        workflow.name,
        'with',
        workflow.steps.length,
        'steps'
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount to preserve loaded workflows

  const handleClose = () => {
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
