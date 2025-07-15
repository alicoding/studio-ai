import { createFileRoute, useParams } from '@tanstack/react-router'
import { WorkflowRouteWrapper } from '../../../../components/workflow-builder/WorkflowRouteWrapper'

export const Route = createFileRoute('/workspace/$projectId/workflows/new')({
  component: NewWorkflowInProject,
})

function NewWorkflowInProject() {
  const { projectId } = useParams({ from: '/workspace/$projectId/workflows/new' })
  return <WorkflowRouteWrapper mode="new" scope="project" projectId={projectId} fullscreen />
}
