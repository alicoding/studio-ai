/**
 * Unified Project Service - Manages Studio projects
 *
 * SOLID: Single responsibility - project management
 * DRY: Reuses ConfigService for Studio projects
 * KISS: Simple interface for project management
 */

import { ConfigService, ProjectConfig } from './ConfigService'

export interface UnifiedProject extends ProjectConfig {
  // Studio projects are the only projects now
  isNative: boolean
  hasStudioConfig: boolean
}

export class UnifiedProjectService {
  private static instance: UnifiedProjectService
  private configService: ConfigService

  private constructor() {
    this.configService = ConfigService.getInstance()
  }

  static getInstance(): UnifiedProjectService {
    if (!UnifiedProjectService.instance) {
      UnifiedProjectService.instance = new UnifiedProjectService()
    }
    return UnifiedProjectService.instance
  }

  /**
   * Get all Studio projects
   */
  async getAllProjects(): Promise<UnifiedProject[]> {
    // Get Studio projects
    const studioProjects = await this.configService.listProjects()

    const unifiedProjects: UnifiedProject[] = studioProjects.map((project: ProjectConfig) => ({
      ...project,
      isNative: true, // All Studio projects are native now
      hasStudioConfig: true,
    }))

    // Sort by last modified
    return unifiedProjects.sort(
      (a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    )
  }

  /**
   * Get a single project
   */
  async getProject(id: string): Promise<UnifiedProject | null> {
    const studioProject = await this.configService.getProject(id)
    if (studioProject) {
      return {
        ...studioProject,
        isNative: true,
        hasStudioConfig: true,
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
      await this.configService.createProject({
        id: projectId,
        name: config.name || 'Untitled Project',
        description: config.description || '',
        workspacePath: config.workspacePath || '',
        activeAgents: config.activeAgents || [],
        settings: config.settings || {
          envVars: {},
          disabledTools: [],
          mcpServers: [],
        },
      })
    }

    const updated = await this.getProject(projectId)
    if (!updated) {
      throw new Error('Failed to update project')
    }

    return updated
  }

  /**
   * Get project sessions - now delegated to API
   */
  async getProjectSessions(projectId: string): Promise<unknown[]> {
    // This should now call the Studio Projects API
    const response = await fetch(`/api/studio-projects/${projectId}/sessions`)
    if (!response.ok) {
      throw new Error('Failed to get project sessions')
    }
    const data = await response.json()
    return data.sessions || []
  }

  /**
   * Get session messages - now delegated to API
   */
  async getSessionMessages(
    projectId: string,
    sessionId: string,
    options: { cursor?: string; limit?: number } = {}
  ): Promise<unknown> {
    // This should now call the Studio Projects API
    const params = new URLSearchParams()
    if (options.cursor) params.append('cursor', options.cursor)
    if (options.limit) params.append('limit', options.limit.toString())

    const response = await fetch(
      `/api/studio-projects/${projectId}/sessions/${sessionId}/messages?${params}`
    )
    if (!response.ok) {
      throw new Error('Failed to get session messages')
    }
    return response.json()
  }
}
