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
  const { reset, initWorkflow } = useWorkflowBuilderStore()

  // Always create a fresh project workflow when this route loads
  useEffect(() => {
    console.log('[NewWorkflowInProject] Component mounted, creating fresh project workflow')
    console.log('[NewWorkflowInProject] Project ID:', projectId)

    // Always reset and create new workflow for proper state isolation
    reset() // Clear any existing workflow state
    initWorkflow('Untitled Workflow', 'Project workflow', projectId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]) // Zustand store functions are stable

  const handleClose = () => {
    navigate({ to: `/workspace/${projectId}` })
  }

  const handleSaveSuccess = (workflowId: string) => {
    // Navigate to the workspace edit URL after first save
    navigate({ to: `/workspace/${projectId}/workflows/${workflowId}/edit` })
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
      <VisualWorkflowBuilder
        onClose={handleClose}
        scope="project"
        onSaveSuccess={handleSaveSuccess}
      />
    </div>
  )
}
