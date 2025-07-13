import { createFileRoute, Outlet } from '@tanstack/react-router'

function WorkflowsLayout() {
  return <Outlet />
}

export const Route = createFileRoute('/workflows')({
  component: WorkflowsLayout,
})
