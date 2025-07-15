import { createFileRoute } from '@tanstack/react-router'
import { WorkflowRouteWrapper } from '../../components/workflow-builder/WorkflowRouteWrapper'

export const Route = createFileRoute('/workflows/new')({
  component: NewWorkflow,
})

function NewWorkflow() {
  return <WorkflowRouteWrapper mode="new" scope="global" />
}
