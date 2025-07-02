import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useProjectStore } from '../../stores'
import { useProjects } from '../../hooks/useProjects'
import { SessionsViewer } from '../../components/sessions'

export const Route = createFileRoute('/projects/$projectId')({
  component: ProjectDetailsPage,
})

// Agent interface will be added back when agent functionality is implemented

interface Project {
  id: string
  name: string
  description?: string
  path: string
  createdAt: Date | string
  sessionCount: number
  lastSessionAt?: Date | string
  status: 'active' | 'archived' | 'draft'
  lastModified: Date | string
  tags: string[]
  favorite: boolean
  studioMetadata?: {
    projectId: string
    status: 'active' | 'archived' | 'draft'
    tags: string[]
    favorite: boolean
    notes: string
    lastModified: Date | string
  }
}

// Mock project data - in real app this would come from backend
const MOCK_PROJECT: Project = {
  id: 'project-1',
  name: 'E-commerce Platform',
  description: 'Building a modern e-commerce platform with React and Node.js',
  path: '~/projects/ecommerce-platform',
  createdAt: new Date('2024-01-15'),
  lastModified: new Date('2024-01-20'),
  sessionCount: 5,
  lastSessionAt: new Date('2024-01-20'),
  status: 'active',
  tags: ['react', 'nodejs', 'ecommerce'],
  favorite: false,
}

function ProjectDetailsPage() {
  const { projectId } = Route.useParams()
  const navigate = useNavigate()
  
  // DRY: Use shared hook for fetching projects
  const { projects, isLoading, error, refetch } = useProjects()
  const { updateProjectMetadata } = useProjectStore()
  
  const project = projects.find((p) => p.id === projectId) || MOCK_PROJECT
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    notes: project.studioMetadata?.notes || '',
    tags: project.tags.join(', '),
    status: project.status,
  })

  const handleSave = async () => {
    try {
      await updateProjectMetadata(projectId, {
        notes: editForm.notes,
        tags: editForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
        status: editForm.status,
      })
      setIsEditing(false)
      console.log('Project metadata updated:', editForm)
    } catch (error) {
      console.error('Failed to save project metadata:', error)
      alert('Failed to save changes. Please try again.')
    }
  }

  const handleCancel = () => {
    setEditForm({
      notes: project.studioMetadata?.notes || '',
      tags: project.tags.join(', '),
      status: project.status,
    })
    setIsEditing(false)
  }

  // Agent functionality will be implemented in later stages

  const handleOpenWorkspace = () => {
    navigate({ to: '/', search: { project: project.id } })
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

  const handleDeleteProject = () => {
    // Prevent deletion of system projects and Claude Code managed projects
    if (isSystemProject(project)) {
      alert(`Cannot delete "${project.name}". This is a Claude Code managed project that can only be archived, not deleted.`)
      return
    }

    const confirmMessage = `Are you sure you want to delete "${project.name}"?\n\nThis will:\n- Remove the project from Claude Studio\n- NOT delete the actual files on disk\n- NOT affect Claude Code session history\n\nThis action cannot be undone.`
    
    if (confirm(confirmMessage)) {
      console.log('Project deleted:', project.id)
      navigate({ to: '/projects' })
    }
  }

  // Removed getStatusColor since agents are not implemented yet

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">Loading project...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-destructive mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Failed to load project</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => navigate({ to: '/projects' })}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Back to Projects
          </button>
        </div>
      </div>
    )
  }

  if (!project || project === MOCK_PROJECT) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Project not found</h3>
          <button
            onClick={() => navigate({ to: '/projects' })}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Back to Projects
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 border-b border-border flex items-start justify-between">
        <div className="flex-1">
          <div>
            <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
            <p className="text-muted-foreground">{project.description}</p>
            <p className="text-xs text-muted-foreground mt-1">
              <strong>Note:</strong> Project name and description are managed by Claude Code and cannot be edited here.
            </p>
          </div>
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
                <label className="text-sm text-muted-foreground">Tags</label>
                <div className="flex flex-wrap gap-1">
                  {project.tags.map((tag) => (
                    <span key={tag} className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-sm">
                      {tag}
                    </span>
                  ))}
                  {project.tags.length === 0 && (
                    <span className="text-sm text-muted-foreground">No tags</span>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <label className="text-sm text-muted-foreground">Path</label>
                <code className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs">
                  {project.path}
                </code>
              </div>
              
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value as 'active' | 'archived' | 'draft' }))}
                      className="w-full px-2 py-1 bg-input border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={editForm.tags}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, tags: e.target.value }))}
                      className="w-full px-2 py-1 bg-input border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="react, nodejs, web-app"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Notes</label>
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-2 py-1 bg-input border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Add your notes about this project..."
                      rows={3}
                    />
                  </div>
                </>
              ) : null}
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
              <h3 className="text-lg font-semibold">Project Activity</h3>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Sessions</span>
                <span className="font-semibold">{project.sessionCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Last Session</span>
                <span className="text-sm text-muted-foreground">
                  {project.lastSessionAt ? new Date(project.lastSessionAt).toLocaleDateString() : 'Never'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  project.status === 'active' ? 'bg-green-500/20 text-green-400' :
                  project.status === 'archived' ? 'bg-gray-500/20 text-gray-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Project Agents</h3>
              <span className="text-sm text-muted-foreground">{project.sessionCount} agent{project.sessionCount !== 1 ? 's' : ''}</span>
            </div>
            <SessionsViewer 
              projectId={project.id}
              projectPath={project.path}
              sessionCount={project.sessionCount}
              onSessionDeleted={() => {
                // DRY: Refresh project data after session deletion
                refetch()
              }}
              onSessionOpen={(sessionId) => {
                // TODO: Open session details or activate agent
                console.log('Open session:', sessionId)
              }}
            />
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
              <h4 className="font-semibold mb-1 group-hover:text-primary">Open in Claude Code</h4>
              <p className="text-sm text-muted-foreground">Continue working on this project</p>
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

            {isSystemProject(project) ? (
              <div className="p-4 bg-muted border border-muted rounded-lg opacity-50 text-left">
                <div className="text-2xl mb-2">🔒</div>
                <h4 className="font-semibold mb-1 text-muted-foreground">Protected Project</h4>
                <p className="text-sm text-muted-foreground">Claude Code managed projects cannot be deleted</p>
              </div>
            ) : (
              <button
                className="p-4 bg-destructive/10 hover:bg-destructive/20 rounded-lg transition-colors text-left group"
                onClick={handleDeleteProject}
              >
                <div className="text-2xl mb-2">🗑️</div>
                <h4 className="font-semibold mb-1 text-destructive">Delete Project</h4>
                <p className="text-sm text-muted-foreground">Remove from Claude Studio only</p>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
