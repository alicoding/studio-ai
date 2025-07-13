import { createFileRoute, useNavigate } from '@tanstack/react-router'
import VisualWorkflowBuilder from '../../components/workflow-builder/VisualWorkflowBuilder'

export const Route = createFileRoute('/workflows/new')({
  component: NewWorkflow,
})

function NewWorkflow() {
  const navigate = useNavigate()

  const handleClose = () => {
    navigate({ to: '/workflows' })
  }

  return <VisualWorkflowBuilder onClose={handleClose} />
}