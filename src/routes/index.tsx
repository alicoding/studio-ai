import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo } from 'react'
import { Button } from '../components/ui/button'
import { Plus, FolderOpen, Activity } from 'lucide-react'
import { useWorkspaceData } from '../hooks/useWorkspaceData'
import { CreateProjectModal } from '../components/projects/CreateProjectModal'
import { useModalOperations } from '../hooks/useModalOperations'
import { useProjectOperations } from '../hooks/useProjectOperations'
import { ConnectionStatusBanner } from '../components/ui/ConnectionStatusBanner'
import { useWorkflowStore } from '../stores/workflows'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

interface ProjectData {
  name: string
  description?: string
  workspacePath?: string
}

function LandingPage() {
  const navigate = useNavigate()
  const modalOps = useModalOperations()
  const projectOps = useProjectOperations()
  const workflows = useWorkflowStore((state) => state.workflowList)

  // Get workspace data
  const { data: workspaceData, loading: workspaceLoading } = useWorkspaceData({
    includeAgents: false,
    includeRoles: false,
    autoRefresh: false,
  })

  // Extract projects from workspace data
  const projects = useMemo(() => workspaceData?.projects || [], [workspaceData?.projects])

  // Get recent workflows (last 5)
  const recentWorkflows = useMemo(() => {
    return workflows
      .sort((a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime())
      .slice(0, 5)
  }, [workflows])

  const handleCreateProject = async (projectData: ProjectData) => {
    const result = await projectOps.createProject(projectData)
    if (result.success) {
      modalOps.closeModal('createProject')
    }
  }

  if (workspaceLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Loading workspace...</h2>
          <p className="text-muted-foreground">Setting up your projects</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <ConnectionStatusBanner />
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Studio AI</h1>
          <p className="text-muted-foreground">Manage your AI projects and workflows</p>
        </div>

        {/* Projects Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Projects</h2>
            <Button onClick={() => modalOps.openModal('createProject')}>
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg border">
              <FolderOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-4">Create your first project to get started</p>
              <Button onClick={() => modalOps.openModal('createProject')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-card p-6 rounded-lg border hover:border-primary transition-colors cursor-pointer"
                  onClick={() => navigate({ to: `/workspace/${project.id}` })}
                >
                  <h3 className="text-lg font-semibold mb-2">{project.name}</h3>
                  {project.description && (
                    <p className="text-sm text-muted-foreground mb-4">{project.description}</p>
                  )}
                  <Button variant="ghost" size="sm" className="w-full">
                    Open Project
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Workflows Section */}
        {recentWorkflows.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Recent Workflows</h2>
              <Button variant="outline" size="sm" onClick={() => navigate({ to: '/workflows' })}>
                View All
              </Button>
            </div>

            <div className="space-y-2">
              {recentWorkflows.map((workflow) => (
                <div
                  key={workflow.threadId}
                  className="flex items-center justify-between p-4 bg-card rounded-lg border hover:border-primary transition-colors cursor-pointer"
                  onClick={() => navigate({ to: `/workflows/${workflow.threadId}` })}
                >
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-primary" />
                    <div>
                      <p className="font-medium">{workflow.projectName || 'Unknown Project'}</p>
                      <p className="text-sm text-muted-foreground">
                        {workflow.steps.length} steps • {workflow.status}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(workflow.lastUpdate).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <CreateProjectModal
        isOpen={modalOps.isCreateProjectOpen}
        onClose={() => modalOps.closeModal('createProject')}
        onCreate={handleCreateProject}
      />
    </>
  )
}
