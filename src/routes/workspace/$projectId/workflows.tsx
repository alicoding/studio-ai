import { createFileRoute } from '@tanstack/react-router'
import { WorkflowList } from '../../../components/workflow/WorkflowList'
import { Button } from '../../../components/ui/button'
import { Plus } from 'lucide-react'
import { useNavigate, useParams } from '@tanstack/react-router'

export const Route = createFileRoute('/workspace/$projectId/workflows')({
  component: WorkspaceWorkflows,
})

function WorkspaceWorkflows() {
  const navigate = useNavigate()
  const { projectId } = useParams({ from: '/workspace/$projectId/workflows' })

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-lg font-semibold">Project Workflows</h2>
        <Button onClick={() => navigate({ to: `/workspace/${projectId}/workflows/new` })} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Workflow
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <WorkflowList projectId={projectId} />
      </div>
    </div>
  )
}
