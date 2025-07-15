import { createFileRoute, useParams } from '@tanstack/react-router'
import { WorkflowRouteWrapper } from '../../../../components/workflow-builder/WorkflowRouteWrapper'

export const Route = createFileRoute('/workspace/$projectId/workflows/$workflowId/edit')({
  component: EditWorkflowInProject,
})

function EditWorkflowInProject() {
  const { workflowId, projectId } = useParams({
    from: '/workspace/$projectId/workflows/$workflowId/edit',
  })
  return (
    <WorkflowRouteWrapper
      mode="edit"
      scope="project"
      projectId={projectId}
      workflowId={workflowId}
      fullscreen
    />
  )
}
