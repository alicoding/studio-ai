import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useProjectStore } from '../../stores'

export const Route = createFileRoute('/projects/$projectId')({
  component: ProjectDetailsPage,
})

interface Agent {
  id: string
  name: string
  role: string
  status: 'online' | 'busy' | 'offline'
  addedAt: Date
}

interface Project {
  id: string
  name: string
  description: string
  template: string
  directory: string
  createdAt: Date
  lastModified: Date
  agents: Agent[]
}

// Mock project data - in real app this would come from backend
const MOCK_PROJECT: Project = {
  id: 'project-1',
  name: 'E-commerce Platform',
  description: 'Building a modern e-commerce platform with React and Node.js',
  template: 'webapp',
  directory: '~/projects/ecommerce-platform',
  createdAt: new Date('2024-01-15'),
  lastModified: new Date('2024-01-20'),
  agents: [
    {
      id: 'frontend-1',
      name: 'Frontend Developer',
      role: 'dev',
      status: 'online',
      addedAt: new Date('2024-01-15'),
    },
    {
      id: 'backend-1',
      name: 'Backend Developer',
      role: 'dev',
      status: 'busy',
      addedAt: new Date('2024-01-15'),
    },
    {
      id: 'ux-1',
      name: 'UX Designer',
      role: 'ux',
      status: 'offline',
      addedAt: new Date('2024-01-16'),
    },
  ],
}

function ProjectDetailsPage() {
  const { projectId } = Route.useParams()
  const navigate = useNavigate()
  const { projects, updateProject } = useProjectStore()
  const project = projects.find((p) => p.id === projectId) || MOCK_PROJECT
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: project.name,
    description: project.description,
    directory: project.directory,
  })

  const handleSave = () => {
    updateProject(projectId, {
      name: editForm.name,
      description: editForm.description,
      lastModified: new Date().toISOString(),
    })
    setIsEditing(false)
    console.log('Project updated:', editForm)
  }

  const handleCancel = () => {
    setEditForm({
      name: project.name,
      description: project.description,
      directory: project.directory,
    })
    setIsEditing(false)
  }

  const handleRemoveAgent = (agentId: string) => {
    if (confirm('Remove this agent from the project?')) {
      updateProject(projectId, {
        agents: project.agents?.filter((a: any) => a.id !== agentId) || [],
        lastModified: new Date().toISOString(),
      })
      console.log('Agent removed:', agentId)
    }
  }

  const handleOpenWorkspace = () => {
    navigate({ to: '/', search: { project: project.id } })
  }

  const handleDeleteProject = () => {
    if (confirm(`Delete "${project.name}"? This action cannot be undone.`)) {
      console.log('Project deleted:', project.id)
      navigate({ to: '/projects' })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return '#4ade80'
      case 'busy':
        return '#fbbf24'
      case 'offline':
        return '#ef4444'
      default:
        return '#999'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 border-b border-border flex items-start justify-between">
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                className="text-3xl font-bold bg-transparent border-b-2 border-primary focus:outline-none w-full"
                placeholder="Project name"
              />
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full bg-transparent border-b border-border focus:outline-none text-muted-foreground resize-none"
                placeholder="Project description"
                rows={2}
              />
            </div>
          ) : (
            <div>
              <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
              <p className="text-muted-foreground">{project.description}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 ml-4">
          {isEditing ? (
            <>
              <button
                className="px-4 py-2 text-foreground bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-primary-foreground bg-primary hover:bg-primary/90 rounded-md transition-colors"
                onClick={handleSave}
              >
                Save Changes
              </button>
            </>
          ) : (
            <>
              <button
                className="px-4 py-2 text-foreground bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
                onClick={() => setIsEditing(true)}
              >
                Edit Project
              </button>
              <button
                className="px-4 py-2 text-primary-foreground bg-primary hover:bg-primary/90 rounded-md transition-colors"
                onClick={handleOpenWorkspace}
              >
                Open Workspace
              </button>
            </>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Project Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm text-muted-foreground">Template</label>
                <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-sm">
                  {project.template}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <label className="text-sm text-muted-foreground">Directory</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.directory}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, directory: e.target.value }))
                    }
                    className="px-2 py-1 bg-input border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                ) : (
                  <code className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs">
                    {project.directory}
                  </code>
                )}
              </div>
              <div className="flex justify-between items-center">
                <label className="text-sm text-muted-foreground">Created</label>
                <span className="text-sm">
                  {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <label className="text-sm text-muted-foreground">Last Modified</label>
                <span className="text-sm">
                  {new Date(project.lastModified).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Team Agents ({project.agents?.length || 0})</h3>
              <button
                className="px-3 py-1 text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded transition-colors"
                onClick={() => alert('Add agent functionality coming soon')}
              >
                + Add Agent
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(project.agents?.length || 0) === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No agents assigned to this project</p>
                  <button className="px-4 py-2 text-sm text-primary-foreground bg-primary hover:bg-primary/90 rounded-md transition-colors">
                    Add First Agent
                  </button>
                </div>
              ) : (
                project.agents?.map((agent: any) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between p-3 bg-secondary/30 rounded-md"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getStatusColor(agent.status) }}
                      />
                      <div>
                        <div className="font-medium">{agent.name}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="px-2 py-0.5 bg-secondary rounded">{agent.role}</span>
                          <span>Added {agent.addedAt.toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        className="w-8 h-8 flex items-center justify-center hover:bg-secondary/60 rounded transition-colors"
                        onClick={() => alert('Configure agent coming soon')}
                      >
                        ⚙️
                      </button>
                      <button
                        className="w-8 h-8 flex items-center justify-center hover:bg-destructive/20 rounded transition-colors"
                        onClick={() => handleRemoveAgent(agent.id)}
                      >
                        ❌
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Project Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              className="p-4 bg-secondary/30 hover:bg-secondary/50 rounded-lg transition-colors text-left group"
              onClick={handleOpenWorkspace}
            >
              <div className="text-2xl mb-2">🚀</div>
              <h4 className="font-semibold mb-1 group-hover:text-primary">Open Workspace</h4>
              <p className="text-sm text-muted-foreground">Start working with your AI team</p>
            </button>

            <button
              className="p-4 bg-secondary/30 hover:bg-secondary/50 rounded-lg transition-colors text-left group"
              onClick={() => alert('Clone project coming soon')}
            >
              <div className="text-2xl mb-2">📋</div>
              <h4 className="font-semibold mb-1 group-hover:text-primary">Clone Project</h4>
              <p className="text-sm text-muted-foreground">Create a copy with same settings</p>
            </button>

            <button
              className="p-4 bg-secondary/30 hover:bg-secondary/50 rounded-lg transition-colors text-left group"
              onClick={() => alert('Export settings coming soon')}
            >
              <div className="text-2xl mb-2">📤</div>
              <h4 className="font-semibold mb-1 group-hover:text-primary">Export Settings</h4>
              <p className="text-sm text-muted-foreground">Save project configuration</p>
            </button>

            <button
              className="p-4 bg-destructive/10 hover:bg-destructive/20 rounded-lg transition-colors text-left group"
              onClick={handleDeleteProject}
            >
              <div className="text-2xl mb-2">🗑️</div>
              <h4 className="font-semibold mb-1 text-destructive">Delete Project</h4>
              <p className="text-sm text-muted-foreground">Permanently remove this project</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
