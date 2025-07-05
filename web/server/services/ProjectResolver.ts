/**
 * Project Resolution Service
 * 
 * SOLID: Single responsibility - resolve and validate cross-project contexts
 * KISS: Simple validation logic using existing config
 * DRY: Reuses existing project service and config
 * Library First: Uses existing Zod schemas for validation
 */

import { ProjectService } from './ProjectService'
import { 
  OrchestrationConfig, 
  canMentionCrossProject,
  getProjectConfig 
} from '../schemas/orchestration'

export interface ProjectContext {
  projectId: string
  name: string
  isActive: boolean
  config: ReturnType<typeof getProjectConfig>
}

export interface CrossProjectRequest {
  sourceProjectId: string
  targetProjectId: string
  userId: string
  action: 'mention' | 'batch'
}

export class ProjectResolver {
  constructor(
    private projectService: ProjectService,
    private orchestrationConfig: OrchestrationConfig
  ) {}

  /**
   * Resolve project context and validate permissions
   * SOLID: Single method, single purpose
   */
  async resolveProjectContext(
    request: CrossProjectRequest
  ): Promise<ProjectContext> {
    // 1. Check if orchestration is enabled globally
    if (!this.orchestrationConfig.enabled) {
      throw new Error('Orchestration features are disabled')
    }

    // 2. Get source project config
    const sourceConfig = getProjectConfig(
      this.orchestrationConfig, 
      request.sourceProjectId
    )
    
    if (sourceConfig.disabled) {
      throw new Error('Orchestration disabled for source project')
    }

    // 3. Validate cross-project permission
    if (request.sourceProjectId !== request.targetProjectId) {
      const canAccess = canMentionCrossProject(
        this.orchestrationConfig,
        request.sourceProjectId,
        request.targetProjectId
      )
      
      if (!canAccess) {
        throw new Error(
          `Cross-project access denied from ${request.sourceProjectId} to ${request.targetProjectId}`
        )
      }
    }

    // 4. Get target project from ProjectService
    const targetProject = await this.projectService.getProject(request.targetProjectId)
    
    if (!targetProject) {
      throw new Error(`Target project ${request.targetProjectId} not found`)
    }

    // 5. Check if target project is active
    const isActive = targetProject.status === 'active'
    
    if (!isActive && request.action === 'mention') {
      throw new Error(`Target project ${request.targetProjectId} is not active`)
    }

    // 6. Get target project config
    const targetConfig = getProjectConfig(
      this.orchestrationConfig,
      request.targetProjectId
    )

    if (targetConfig.disabled) {
      throw new Error('Orchestration disabled for target project')
    }

    // 7. Return validated context
    return {
      projectId: targetProject.id,
      name: targetProject.name,
      isActive,
      config: targetConfig
    }
  }

  /**
   * Validate batch operations across projects
   * DRY: Reuses resolveProjectContext for each target
   */
  async validateBatchTargets(
    sourceProjectId: string,
    targetProjectIds: string[],
    userId: string
  ): Promise<Map<string, ProjectContext>> {
    const contexts = new Map<string, ProjectContext>()
    const errors: string[] = []

    // Check rate limits for cross-project operations
    const uniqueTargets = [...new Set(targetProjectIds)]
    const crossProjectCount = uniqueTargets.filter(id => id !== sourceProjectId).length
    
    if (crossProjectCount > 0) {
      const sourceConfig = getProjectConfig(this.orchestrationConfig, sourceProjectId)
      const maxCrossProject = sourceConfig.defaults.maxConcurrentBatches || 5
      
      if (crossProjectCount > maxCrossProject) {
        throw new Error(
          `Too many cross-project targets: ${crossProjectCount} (max: ${maxCrossProject})`
        )
      }
    }

    // Validate each target
    for (const targetId of uniqueTargets) {
      try {
        const context = await this.resolveProjectContext({
          sourceProjectId,
          targetProjectId: targetId,
          userId,
          action: 'batch'
        })
        contexts.set(targetId, context)
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        errors.push(`${targetId}: ${errorMessage}`)
      }
    }

    if (errors.length > 0) {
      throw new Error(`Batch validation failed:\n${errors.join('\n')}`)
    }

    return contexts
  }

  /**
   * Get all projects accessible from a source project
   * KISS: Simple list based on config
   */
  async getAccessibleProjects(sourceProjectId: string): Promise<string[]> {
    const config = getProjectConfig(this.orchestrationConfig, sourceProjectId)
    
    if (!config.allowCrossProject) {
      return [sourceProjectId]
    }

    // Return source + allowed targets
    return [sourceProjectId, ...config.allowedTargets]
  }

  /**
   * Update orchestration config
   * Configuration: Allow runtime config updates
   */
  updateConfig(config: OrchestrationConfig): void {
    this.orchestrationConfig = config
  }
}