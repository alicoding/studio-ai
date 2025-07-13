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
    // If no workflow is loaded, create a new one
    if (!workflow) {
      initWorkflow('Untitled Workflow', 'Project workflow', projectId)
    }
  }, [workflow, initWorkflow, projectId])

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
