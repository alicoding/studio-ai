/**
 * Unified Project Service - Bridges Claude Studio projects with native Claude projects
 * 
 * SOLID: Single responsibility - project management
 * DRY: Reuses ConfigService and existing ProjectService
 * KISS: Simple bridge pattern
 */

import { ConfigService, ProjectConfig } from './ConfigService.js'
import { ProjectService as ClaudeProjectService, EnrichedProject } from '../../web/server/services/ProjectService.js'

export interface UnifiedProject extends ProjectConfig {
  // Add Claude native project info if available
  claudeProject?: EnrichedProject
  // Combined status
  isNative: boolean
  hasStudioConfig: boolean
}

export class UnifiedProjectService {
  private static instance: UnifiedProjectService
  private configService: ConfigService
  private claudeProjectService: ClaudeProjectService

  private constructor() {
    this.configService = ConfigService.getInstance()
    this.claudeProjectService = new ClaudeProjectService()
  }

  static getInstance(): UnifiedProjectService {
    if (!UnifiedProjectService.instance) {
      UnifiedProjectService.instance = new UnifiedProjectService()
    }
    return UnifiedProjectService.instance
  }

  /**
   * Get all projects (both Studio-configured and native Claude projects)
   */
  async getAllProjects(): Promise<UnifiedProject[]> {
    // Get Studio projects
    const studioProjects = await this.configService.getAllProjects()
    
    // Get native Claude projects
    const claudeProjects = await this.claudeProjectService.getAllProjects()
    
    // Create a map for quick lookup
    const studioProjectMap = new Map(studioProjects.map(p => [p.workspacePath, p]))
    const unifiedProjects: UnifiedProject[] = []
    
    // First, add all Studio projects
    for (const studioProject of studioProjects) {
      // Find matching Claude project by path
      const claudeProject = claudeProjects.find(cp => 
        cp.path === studioProject.workspacePath
      )
      
      unifiedProjects.push({
        ...studioProject,
        claudeProject,
        isNative: !!claudeProject,
        hasStudioConfig: true
      })
    }
    
    // Then, add Claude projects that don't have Studio config
    for (const claudeProject of claudeProjects) {
      if (!studioProjectMap.has(claudeProject.path)) {
        // Create a minimal Studio project config for native Claude project
        const studioProject: UnifiedProject = {
          id: claudeProject.id,
          name: claudeProject.name,
          description: claudeProject.description || '',
          workspacePath: claudeProject.path,
          created: claudeProject.createdAt.toISOString(),
          lastModified: claudeProject.lastModified.toISOString(),
          activeAgents: [],
          settings: {
            envVars: {},
            disabledTools: [],
            mcpServers: []
          },
          claudeProject,
          isNative: true,
          hasStudioConfig: false
        }
        unifiedProjects.push(studioProject)
      }
    }
    
    // Sort by last modified
    return unifiedProjects.sort((a, b) => 
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    )
  }

  /**
   * Get a single project
   */
  async getProject(id: string): Promise<UnifiedProject | null> {
    // Try Studio config first
    const studioProject = await this.configService.getProject(id)
    if (studioProject) {
      const claudeProject = await this.claudeProjectService.getProject(id)
      return {
        ...studioProject,
        claudeProject: claudeProject || undefined,
        isNative: !!claudeProject,
        hasStudioConfig: true
      }
    }
    
    // Try native Claude project
    const claudeProject = await this.claudeProjectService.getProject(id)
    if (claudeProject) {
      return {
        id: claudeProject.id,
        name: claudeProject.name,
        description: claudeProject.description || '',
        workspacePath: claudeProject.path,
        created: claudeProject.createdAt.toISOString(),
        lastModified: claudeProject.lastModified.toISOString(),
        activeAgents: [],
        settings: {
          envVars: {},
          disabledTools: [],
          mcpServers: []
        },
        claudeProject,
        isNative: true,
        hasStudioConfig: false
      }
    }
    
    return null
  }

  /**
   * Create or update Studio config for a project
   */
  async createOrUpdateStudioConfig(
    projectId: string, 
    config: Partial<ProjectConfig>
  ): Promise<UnifiedProject> {
    // Check if it already has Studio config
    const existing = await this.configService.getProject(projectId)
    
    if (existing) {
      // Update existing
      await this.configService.updateProject(projectId, config)
    } else {
      // Create new Studio config
      const claudeProject = await this.claudeProjectService.getProject(projectId)
      if (!claudeProject) {
        throw new Error('Project not found')
      }
      
      await this.configService.createProject({
        id: projectId,
        name: config.name || claudeProject.name,
        description: config.description || claudeProject.description || '',
        workspacePath: config.workspacePath || claudeProject.path,
        activeAgents: config.activeAgents || [],
        settings: config.settings || {
          envVars: {},
          disabledTools: [],
          mcpServers: []
        }
      })
    }
    
    const updated = await this.getProject(projectId)
    if (!updated) {
      throw new Error('Failed to update project')
    }
    
    return updated
  }

  /**
   * Import a native Claude project into Studio
   */
  async importClaudeProject(projectId: string): Promise<UnifiedProject> {
    const claudeProject = await this.claudeProjectService.getProject(projectId)
    if (!claudeProject) {
      throw new Error('Claude project not found')
    }
    
    // Create Studio config for it
    await this.configService.createProject({
      id: projectId,
      name: claudeProject.name,
      description: claudeProject.description || '',
      workspacePath: claudeProject.path,
      activeAgents: [],
      settings: {
        envVars: {},
        disabledTools: [],
        mcpServers: []
      }
    })
    
    const unified = await this.getProject(projectId)
    if (!unified) {
      throw new Error('Failed to import project')
    }
    
    return unified
  }

  /**
   * Get project sessions (from Claude native)
   */
  async getProjectSessions(projectId: string): Promise<any[]> {
    return this.claudeProjectService.getProjectSessions(projectId)
  }

  /**
   * Get session messages (from Claude native)
   */
  async getSessionMessages(
    projectId: string,
    sessionId: string,
    options: { cursor?: string; limit?: number } = {}
  ): Promise<any> {
    return this.claudeProjectService.getSessionMessages(projectId, sessionId, options)
  }
}