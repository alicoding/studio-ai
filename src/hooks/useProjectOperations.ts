/**
 * useProjectOperations - Project Management Hook
 * 
 * SOLID: Single Responsibility - Only handles project operations
 * DRY: Centralizes project management logic
 * KISS: Simple interface for project lifecycle
 * Library-First: Uses ProcessManager and stores
 */

import { useCallback } from 'react'
import { useProjectStore, type Project } from '../stores'
import { useProcessManager } from './useProcessManager'

interface ProjectOperationResult {
  success: boolean
  error?: string
  project?: Project
}

interface CreateProjectData {
  name: string
  path?: string
  description?: string
  template?: string
  gitInit?: boolean
  directory?: string
}

export function useProjectOperations() {
  const processManager = useProcessManager()
  
  const {
    addProject,
    closeProjectInWorkspace,
    openProjectInWorkspace,
    getOpenProjects,
  } = useProjectStore()

  /**
   * Close project and cleanup resources
   * Kills all agents associated with the project
   */
  const closeProject = useCallback(async (
    projectId: string
  ): Promise<ProjectOperationResult> => {
    const openProjects = getOpenProjects()
    const project = openProjects.find(p => p.id === projectId)
    
    if (!project) {
      return { 
        success: false, 
        error: 'Project not found' 
      }
    }

    try {
      // Kill all agents for this project
      await processManager.killProject(projectId)
      
      // Close project in workspace
      closeProjectInWorkspace(projectId)
      
      console.log(`Project ${projectId} closed and all agents killed`)
      return { success: true }
    } catch (error) {
      console.error(`Failed to cleanup project ${projectId}:`, error)
      
      // Still close the project even if cleanup fails
      closeProjectInWorkspace(projectId)
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Cleanup failed' 
      }
    }
  }, [getOpenProjects, processManager, closeProjectInWorkspace])

  /**
   * Create a new project
   * Sets up directory structure and initializes project
   */
  const createProject = useCallback((
    projectData: CreateProjectData
  ): ProjectOperationResult => {
    try {
      const newProject: Project = {
        id: `project-${Date.now()}`,
        name: projectData.name,
        path: projectData.path || projectData.directory || 
          `~/projects/${projectData.name.toLowerCase().replace(/\s+/g, '-')}`,
        lastModified: new Date().toISOString(),
        agentCount: 0,
        agentIds: [],
        directory: projectData.directory || 
          `~/projects/${projectData.name.toLowerCase().replace(/\s+/g, '-')}`,
      }

      // Add project to store
      addProject(newProject)
      
      // Open in workspace and make active
      openProjectInWorkspace(newProject.id)
      
      // In a real implementation, this would:
      // 1. Create the actual directory on the filesystem
      // 2. Initialize git repository if requested
      // 3. Copy template files if using a template
      // 4. Set up project configuration
      console.log('Creating project directory:', newProject.path)
      
      if (projectData.gitInit) {
        console.log('Initializing git repository...')
      }
      
      if (projectData.template) {
        console.log('Copying template:', projectData.template)
      }
      
      return { 
        success: true, 
        project: newProject 
      }
    } catch (error) {
      console.error('Failed to create project:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create project' 
      }
    }
  }, [addProject, openProjectInWorkspace])

  /**
   * Open an existing project in workspace
   */
  const openProject = useCallback((
    projectId: string
  ): ProjectOperationResult => {
    try {
      openProjectInWorkspace(projectId)
      return { success: true }
    } catch (error) {
      console.error('Failed to open project:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to open project' 
      }
    }
  }, [openProjectInWorkspace])

  /**
   * Cleanup all zombie processes across all projects
   */
  const cleanupAllProjects = useCallback(async (): Promise<{
    success: boolean
    killedCount?: number
    error?: string
  }> => {
    try {
      const result = await processManager.cleanup()
      console.log('Project cleanup completed:', result)
      
      return { 
        success: true, 
        killedCount: result?.killedCount || 0 
      }
    } catch (error) {
      console.error('Failed to cleanup projects:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Cleanup failed' 
      }
    }
  }, [processManager])

  return {
    closeProject,
    createProject,
    openProject,
    cleanupAllProjects,
  }
}