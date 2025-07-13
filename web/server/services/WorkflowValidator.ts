/**
 * Workflow Validator - Validates workflow configurations before execution
 * 
 * SOLID: Single responsibility - only validates workflows
 * DRY: Centralized validation logic
 * KISS: Simple validation rules with clear error messages
 * Library-First: Uses existing services for agent config validation
 */

import type { WorkflowStep } from '../schemas/invoke'
import { UnifiedAgentConfigService, type AgentConfig } from './UnifiedAgentConfigService'
import { StudioProjectService } from './StudioProjectService'

export class WorkflowValidator {
  private agentConfigService = UnifiedAgentConfigService.getInstance()
  private projectService = new StudioProjectService()

  /**
   * Validate agent configurations before starting workflow
   * Prevents stuck workflows by failing fast on invalid agents
   */
  async validateAgentConfigs(steps: WorkflowStep[], projectId?: string): Promise<void> {
    for (const step of steps) {
      // Must specify either agentId or role
      if (!step.agentId && !step.role) {
        throw new Error(
          'Agent configuration validation failed: Must specify either agentId or role for each step'
        )
      }

      // Validate agent exists
      if (step.agentId) {
        await this.validateAgentId(step, projectId)
      } else if (step.role) {
        await this.validateRole(step, projectId)
      }
    }
  }

  /**
   * Validate step dependencies
   */
  validateDependencies(steps: WorkflowStep[]): void {
    const stepIds = new Set(steps.map(s => s.id!))
    
    for (const step of steps) {
      if (step.deps) {
        for (const depId of step.deps) {
          if (!stepIds.has(depId)) {
            throw new Error(
              `Dependency validation failed: Step "${step.id}" depends on non-existent step "${depId}"`
            )
          }
        }
      }
    }
    
    // Check for circular dependencies
    this.validateNoCycles(steps)
  }

  /**
   * Validate agent ID exists
   */
  private async validateAgentId(step: WorkflowStep, projectId?: string): Promise<void> {
    // Check project agents first if projectId provided
    if (projectId) {
      try {
        const projectAgents = await this.projectService.getProjectAgentsWithShortIds(projectId)
        const projectAgent = projectAgents.find((a) => a.shortId === step.agentId)

        if (!projectAgent) {
          throw new Error(
            `Agent configuration validation failed: Agent with ID "${step.agentId}" not found in project`
          )
        }

        // Verify the agent config exists
        const agentConfig = await this.agentConfigService.getConfig(projectAgent.agentConfigId)
        if (!agentConfig) {
          throw new Error(
            `Agent configuration validation failed: Agent config "${projectAgent.agentConfigId}" not found for agent "${step.agentId}"`
          )
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('Agent configuration validation failed')
        ) {
          throw error
        }
        throw new Error(
          `Agent configuration validation failed: Could not validate agent "${step.agentId}" in project - ${error}`
        )
      }
    } else {
      // No project ID - agentId should be a global config ID
      const agentConfig = await this.agentConfigService.getConfig(step.agentId!)
      if (!agentConfig) {
        throw new Error(
          `Agent configuration validation failed: Agent config "${step.agentId}" not found`
        )
      }
    }
  }

  /**
   * Validate role exists
   */
  private async validateRole(step: WorkflowStep, projectId?: string): Promise<void> {
    let found = false

    // Check project agents first if projectId provided
    if (projectId) {
      try {
        const projectAgents = await this.projectService.getProjectAgentsWithShortIds(projectId)
        const projectAgent = projectAgents.find(
          (a) => a.role?.toLowerCase() === step.role!.toLowerCase()
        )
        if (projectAgent) {
          found = true
        }
      } catch (_error) {
        // Project not found or no agents - continue to check global
      }
    }

    // Check global agents if not found in project
    if (!found) {
      const agents = await this.agentConfigService.getAllConfigs()
      const globalAgent = agents.find(
        (a: AgentConfig) => a.role?.toLowerCase() === step.role!.toLowerCase()
      )
      if (!globalAgent) {
        throw new Error(
          `Agent configuration validation failed: No agent found for role "${step.role}"`
        )
      }
    }
  }

  /**
   * Validate no circular dependencies using DFS
   */
  private validateNoCycles(steps: WorkflowStep[]): void {
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    
    const stepMap = new Map(steps.map(s => [s.id!, s]))
    
    const hasCycle = (stepId: string): boolean => {
      if (recursionStack.has(stepId)) {
        return true // Back edge found - cycle detected
      }
      
      if (visited.has(stepId)) {
        return false // Already processed
      }
      
      visited.add(stepId)
      recursionStack.add(stepId)
      
      const step = stepMap.get(stepId)
      if (step?.deps) {
        for (const depId of step.deps) {
          if (hasCycle(depId)) {
            return true
          }
        }
      }
      
      recursionStack.delete(stepId)
      return false
    }
    
    for (const step of steps) {
      if (!visited.has(step.id!) && hasCycle(step.id!)) {
        throw new Error(
          `Dependency validation failed: Circular dependency detected involving step "${step.id}"`
        )
      }
    }
  }
}