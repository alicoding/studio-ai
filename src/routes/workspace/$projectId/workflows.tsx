import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/workspace/$projectId/workflows')({
  component: WorkspaceWorkflowsLayout,
})

function WorkspaceWorkflowsLayout() {
  return <Outlet />
}
