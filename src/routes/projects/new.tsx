import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useProjectStore } from '../../stores'

export const Route = createFileRoute('/projects/new')({
  component: NewProjectPage,
})

const PROJECT_TEMPLATES = [
  {
    id: 'blank',
    name: 'Blank Project',
    description: 'Start with an empty project',
    thumbnail: '📄',
    agents: [],
  },
  {
    id: 'webapp',
    name: 'Web Application',
    description: 'Full-stack web app with frontend, backend, and database',
    thumbnail: '🌐',
    agents: ['frontend-dev', 'backend-dev', 'ux-designer'],
  },
  {
    id: 'mobile',
    name: 'Mobile App',
    description: 'React Native or Flutter mobile application',
    thumbnail: '📱',
    agents: ['mobile-dev', 'ux-designer', 'tester'],
  },
  {
    id: 'api',
    name: 'API Service',
    description: 'REST API or GraphQL service',
    thumbnail: '🔌',
    agents: ['backend-dev', 'architect', 'tester'],
  },
  {
    id: 'data',
    name: 'Data Pipeline',
    description: 'ETL pipeline or data processing service',
    thumbnail: '📊',
    agents: ['data-engineer', 'backend-dev'],
  },
  {
    id: 'ml',
    name: 'ML Project',
    description: 'Machine learning model development',
    thumbnail: '🤖',
    agents: ['ml-engineer', 'data-scientist', 'backend-dev'],
  },
]

function NewProjectPage() {
  const navigate = useNavigate()
  const { addProject } = useProjectStore()
  const [selectedTemplate, setSelectedTemplate] = useState<string>('blank')
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [projectDirectory, setProjectDirectory] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const selectedTemplateData = PROJECT_TEMPLATES.find((t) => t.id === selectedTemplate)

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      alert('Please enter a project name')
      return
    }

    setIsCreating(true)

    try {
      // Create project object
      const newProject = {
        id: `project-${Date.now()}`,
        name: projectName.trim(),
        description: projectDescription.trim(),
        template: selectedTemplate,
        lastModified: new Date().toISOString(),
        agentCount: 0,
        agentIds: [],
      }

      // Add to store
      addProject(newProject)
      console.log('Creating project:', newProject)

      // Simulate creation delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Navigate to project workspace
      navigate({ to: '/', search: { project: newProject.id } })
    } catch (error) {
      console.error('Failed to create project:', error)
      alert('Failed to create project. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCancel = () => {
    navigate({ to: '/projects' })
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="p-6 border-b border-border flex-shrink-0">
        <h1 className="text-3xl font-bold mb-2">Create New Project</h1>
        <p className="text-muted-foreground">Set up a new project workspace with AI agents</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Project Details</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="projectName" className="block text-sm font-medium mb-2">
                  Project Name *
                </label>
                <input
                  id="projectName"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="My Awesome Project"
                  maxLength={100}
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label htmlFor="projectDescription" className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  id="projectDescription"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Describe what you're building..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label htmlFor="projectDirectory" className="block text-sm font-medium mb-2">
                  Working Directory
                </label>
                <input
                  id="projectDirectory"
                  type="text"
                  value={projectDirectory}
                  onChange={(e) => setProjectDirectory(e.target.value)}
                  placeholder="~/projects/my-project (auto-generated if empty)"
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-2">Choose Template</h2>
            <p className="text-muted-foreground mb-4">
              Select a template to get started with the right team of AI agents
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {PROJECT_TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedTemplate === template.id
                      ? 'bg-primary/10 border-primary ring-2 ring-primary'
                      : 'bg-card border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <div className="text-4xl mb-3 text-center">{template.thumbnail}</div>
                  <div>
                    <h3 className="font-semibold mb-1">{template.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                    {template.agents.length > 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground">
                          {template.agents.length} agents
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {template.agents.map((agent) => (
                            <span
                              key={agent}
                              className="px-2 py-0.5 text-xs bg-secondary text-secondary-foreground rounded"
                            >
                              {agent}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedTemplateData && selectedTemplateData.agents.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-2">Team Preview</h2>
              <p className="text-muted-foreground mb-4">
                This template will create the following AI agents:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {selectedTemplateData.agents.map((agent) => (
                  <div
                    key={agent}
                    className="flex items-center gap-2 p-3 bg-card border border-border rounded-md"
                  >
                    <span className="text-2xl">🤖</span>
                    <span className="text-sm font-medium">{agent}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <button
              type="button"
              className="px-4 py-2 text-foreground bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
              onClick={handleCancel}
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-4 py-2 text-primary-foreground bg-primary hover:bg-primary/90 rounded-md transition-colors"
              onClick={handleCreateProject}
              disabled={isCreating || !projectName.trim()}
            >
              {isCreating ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
