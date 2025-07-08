/**
 * ProjectSettingsTab - Project-specific settings including CLAUDE.md files
 *
 * SOLID: Single responsibility - project settings UI
 * DRY: Reuses ClaudeInstructionsEditor component
 * KISS: Simple layout with project and local instructions
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { FolderOpen, Info } from 'lucide-react'
import { ClaudeInstructionsEditor } from './ClaudeInstructionsEditor'
import { Alert, AlertDescription } from '../ui/alert'

interface Project {
  id: string
  name: string
  path: string
}

export function ProjectSettingsTab() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // Fetch available projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        // For now, use the current project as a stub
        // TODO: Replace with actual Studio projects API
        const stubProjects: Project[] = [
          {
            id: 'claude-studio',
            name: 'Claude Studio',
            path: '/Users/ali/claude-swarm/claude-team/claude-studio',
          },
        ]
        setProjects(stubProjects)

        // Auto-select first project if available
        if (stubProjects.length > 0 && !selectedProjectId) {
          setSelectedProjectId(stubProjects[0].id)
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [selectedProjectId])

  const selectedProject = projects.find((p) => p.id === selectedProjectId)

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading projects...</div>
        </CardContent>
      </Card>
    )
  }

  if (projects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Project Configuration
          </CardTitle>
          <CardDescription>Settings that apply to specific projects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No projects found. Start using Claude in a directory to create a project.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Project Configuration
          </CardTitle>
          <CardDescription>Select a project to configure its Claude instructions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Active Project</label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{project.name}</span>
                        <span className="text-xs text-muted-foreground">{project.path}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProject && (
              <div className="text-sm text-muted-foreground">
                <strong>Path:</strong> {selectedProject.path}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedProject && (
        <>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Project instructions are shared with your team via git. Local instructions are
              personal and not committed to the repository.
            </AlertDescription>
          </Alert>

          <ClaudeInstructionsEditor
            scope="project"
            projectPath={selectedProject.path}
            title="Project Claude Instructions"
            description="Shared instructions for this project (checked into git)"
          />

          <ClaudeInstructionsEditor
            scope="local"
            projectPath={selectedProject.path}
            title="Local Claude Instructions"
            description="Your personal instructions for this project (not shared)"
          />
        </>
      )}
    </div>
  )
}
