import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ProjectCard } from '../../components/projects/ProjectCard'
import { CreateProjectModal } from '../../components/projects/CreateProjectModal'
import { EditProjectModal } from '../../components/projects/EditProjectModal'
import { PageLayout } from '../../components/layout/PageLayout'
import { useProjectStore } from '../../stores'
import { useProjects } from '../../hooks/useProjects'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Search, Plus, FolderOpen } from 'lucide-react'

export const Route = createFileRoute('/projects/')({
  component: ProjectsListingPage,
})

function ProjectsListingPage() {
  const navigate = useNavigate()
  
  // DRY: Use shared hook for fetching projects
  const { projects, isLoading, error } = useProjects()
  const { addProject, removeProject, updateProjectMetadata, openProjectInWorkspace } = useProjectStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProject, setEditingProject] = useState<any>(null)

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      project.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleCreateProject = (projectData: { name: string; description: string; path?: string; template?: string; gitInit?: boolean }) => {
    const newProject = {
      id: `project-${Date.now()}`,
      name: projectData.name,
      description: projectData.description,
      path: projectData.path || `~/projects/${projectData.name.toLowerCase().replace(/\s+/g, '-')}`,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      sessionCount: 0,
      lastSessionAt: undefined,
      status: 'active' as const,
      tags: projectData.template ? [projectData.template] : [],
      favorite: false,
    }
    addProject(newProject)
    setShowCreateModal(false)
  }

  const isSystemProject = (project: any) => {
    // Check if it's a system-level project that shouldn't be deleted
    if (!project.path) return false
    
    // Projects at root level or system paths should be read-only
    const path = project.path.toLowerCase()
    return (
      path === '/' ||
      path.startsWith('/users/') ||
      path.startsWith('/home/') ||
      path.startsWith('/system/') ||
      path.startsWith('/library/') ||
      path.includes('/.claude/') ||
      project.id.startsWith('-Users-ali-') // Claude Code managed projects
    )
  }

  const handleDeleteProject = (id: string) => {
    const project = projects.find((p) => p.id === id)
    if (!project) return

    // Prevent deletion of system projects and Claude Code managed projects
    if (isSystemProject(project)) {
      alert(`Cannot delete "${project.name}". This is a Claude Code managed project. You can only archive it from the project details page.`)
      return
    }

    // Show warning for any deletion
    const confirmMessage = `Are you sure you want to delete "${project.name}"?\n\nThis will:\n- Remove the project from Claude Studio\n- NOT delete the actual files on disk\n- NOT affect Claude Code session history\n\nThis action cannot be undone.`
    
    if (confirm(confirmMessage)) {
      removeProject(id)
    }
  }

  const handleCloneProject = (id: string) => {
    const project = projects.find((p) => p.id === id)
    if (!project) return

    // For Claude Code managed projects, cloning doesn't make sense since they're tied to file system locations
    if (isSystemProject(project)) {
      alert(`Cannot clone "${project.name}". Claude Code managed projects are tied to specific file system locations and cannot be cloned. Consider creating a new project instead.`)
      return
    }

    // For custom projects, create a copy with the same metadata but new ID
    const cloned = {
      id: `project-${Date.now()}`,
      name: `${project.name} (Copy)`,
      description: project.description,
      path: `~/projects/${project.name.toLowerCase().replace(/\s+/g, '-')}-copy`,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      sessionCount: 0,
      lastSessionAt: undefined,
      status: 'draft' as const,
      tags: [...project.tags],
      favorite: false,
    }
    addProject(cloned)
  }

  const handleEditProject = (id: string) => {
    const project = projects.find((p) => p.id === id)
    if (project) {
      setEditingProject(project)
      setShowEditModal(true)
    }
  }

  const handleSaveProjectMetadata = async (projectId: string, metadata: any) => {
    await updateProjectMetadata(projectId, metadata)
    // Projects will be refreshed automatically by the shared hook
  }

  const handleOpenProject = (projectId: string) => {
    // Open project in workspace (will activate existing tab or create new one)
    openProjectInWorkspace(projectId)
    // Navigate to workspace
    navigate({ to: '/' })
  }

  return (
    <PageLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Projects</h1>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create New Project
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-muted-foreground">Loading projects...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-destructive mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Failed to load projects</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={handleOpenProject}
                onEdit={handleEditProject}
                onDelete={handleDeleteProject}
                onClone={handleCloneProject}
              />
            ))}

            {filteredProjects.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                <FolderOpen className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No projects found</h3>
                <p className="text-muted-foreground mb-4 max-w-sm">
                  {searchQuery
                    ? 'Try adjusting your search terms'
                    : 'Create your first project to get started'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Project
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        <CreateProjectModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateProject}
        />

        <EditProjectModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingProject(null)
          }}
          project={editingProject}
          onSave={handleSaveProjectMetadata}
        />
      </div>
    </PageLayout>
  )
}
