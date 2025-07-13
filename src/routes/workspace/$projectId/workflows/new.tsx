import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import VisualWorkflowBuilder from '../../../../components/workflow-builder/VisualWorkflowBuilder'

export const Route = createFileRoute('/workspace/$projectId/workflows/new')({
  component: NewWorkflowInProject,
})

function NewWorkflowInProject() {
  const navigate = useNavigate()
  const { projectId } = useParams({ from: '/workspace/$projectId/workflows/new' })

  const handleClose = () => {
    navigate({ to: `/workspace/${projectId}/workflows` })
  }

  return <VisualWorkflowBuilder onClose={handleClose} />
}
