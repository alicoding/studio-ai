import { createFileRoute, useParams } from '@tanstack/react-router'
import { WorkflowRouteWrapper } from '../../components/workflow-builder/WorkflowRouteWrapper'

export const Route = createFileRoute('/workflows/$workflowId/edit')({
  component: EditWorkflow,
})

function EditWorkflow() {
  const { workflowId } = useParams({ from: '/workflows/$workflowId/edit' })
  return <WorkflowRouteWrapper mode="edit" scope="global" workflowId={workflowId} />
}
