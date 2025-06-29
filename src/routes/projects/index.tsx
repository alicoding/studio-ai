import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ProjectCard } from '../../components/projects/ProjectCard'
import { CreateProjectModal } from '../../components/projects/CreateProjectModal'
import { PageLayout } from '../../components/layout/PageLayout'
import { useProjectStore } from '../../stores'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Search, Plus, FolderOpen } from 'lucide-react'

export const Route = createFileRoute('/projects/')({
  component: ProjectsListingPage,
})

function ProjectsListingPage() {
  const { projects, addProject, removeProject } = useProjectStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreateProject = (projectData: any) => {
    const newProject = {
      ...projectData,
      id: `project-${Date.now()}`,
      lastModified: new Date().toISOString(),
      agentCount: 0,
    }
    addProject(newProject)
    setShowCreateModal(false)
  }

  const handleDeleteProject = (id: string) => {
    const project = projects.find((p) => p.id === id)
    if (project && confirm(`Delete "${project.name}"? This cannot be undone.`)) {
      removeProject(id)
    }
  }

  const handleCloneProject = (id: string) => {
    const project = projects.find((p) => p.id === id)
    if (project) {
      const cloned = {
        ...project,
        id: `project-${Date.now()}`,
        name: `${project.name} (Copy)`,
        lastModified: new Date().toISOString(),
        agentCount: 0,
      }
      addProject(cloned)
    }
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={(id) => (window.location.href = `/#/?project=${id}`)}
              onEdit={(id) => console.log('Edit project:', id)}
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

        <CreateProjectModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateProject}
        />
      </div>
    </PageLayout>
  )
}
