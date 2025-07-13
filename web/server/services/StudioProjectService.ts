/**
 * StudioProjectService - Native Studio Project Management
 *
 * SOLID: Single responsibility - Studio project operations
 * DRY: Reuses database service and agent config service
 * KISS: Clean separation from Claude Desktop projects
 * Library-First: Uses Drizzle ORM through database service
 */

import { randomUUID } from 'crypto'
import { getDb } from '../../../src/lib/storage/database'
import { projects, agentRoleAssignments, teamTemplates } from '../../../src/lib/storage/schema'
import { eq, and, desc } from 'drizzle-orm'
import { UnifiedAgentConfigService } from './UnifiedAgentConfigService'
import type { AgentConfig } from './UnifiedAgentConfigService'
import fs from 'fs/promises'
import path from 'path'
// Safety utilities
import { validateProjectPath, expandPath, safeDeleteDirectory } from '../utils/pathSafety'

// Get database instance
const db = getDb()

// expandPath is now imported from pathSafety utilities

export interface CreateProjectInput {
  name: string
  description?: string
  workspacePath: string
  template?: string
  claudeInstructions?: string
  agents?: AgentAssignment[]
  teamTemplateId?: string
  settings?: ProjectSettings
}

export interface AgentAssignment {
  role: string
  agentConfigId: string
  customName?: string
  customTools?: string[]
}

export interface ProjectSettings {
  envVars?: Record<string, string>
  disabledTools?: string[]
  mcpServers?: string[]
  defaultModel?: string
}

export interface StudioProject {
  id: string
  name: string
  description?: string
  workspacePath: string
  settings?: ProjectSettings
  createdAt: Date
  updatedAt: Date
  lastActivityAt?: Date | null
}

export interface ProjectWithAgents extends StudioProject {
  agents: Array<{
    role: string
    agentConfigId: string
    customTools?: string[]
    agentConfig?: AgentConfig | null
  }>
}

export class StudioProjectService {
  private agentConfigService: UnifiedAgentConfigService

  constructor() {
    this.agentConfigService = UnifiedAgentConfigService.getInstance()
  }

  /**
   * Create a new Studio project with optional agent assignments
   */
  async createProject(input: CreateProjectInput): Promise<ProjectWithAgents> {
    const projectId = randomUUID()

    // Validate workspace path for safety
    const pathValidation = validateProjectPath(input.workspacePath)
    if (!pathValidation.isValid) {
      throw new Error(`Invalid workspace path: ${pathValidation.error}`)
    }

    const expandedWorkspacePath = pathValidation.expandedPath!

    // Check for duplicate workspace path
    const existing = await db
      .select()
      .from(projects)
      .where(eq(projects.workspacePath, input.workspacePath))
      .get()

    if (existing) {
      throw new Error(`A project already exists at workspace path: ${input.workspacePath}`)
    }

    // Create project directory if it doesn't exist
    try {
      await fs.mkdir(expandedWorkspacePath, { recursive: true })
      console.log(`Created project directory: ${expandedWorkspacePath}`)
    } catch (error) {
      console.error('Failed to create project directory:', error)
    }

    // Create CLAUDE.md file if provided
    if (input.claudeInstructions) {
      const claudeMdPath = path.join(expandedWorkspacePath, 'CLAUDE.md')
      try {
        await fs.writeFile(claudeMdPath, input.claudeInstructions, 'utf-8')
        console.log(`Created CLAUDE.md: ${claudeMdPath}`)
      } catch (error) {
        console.error('Failed to create CLAUDE.md:', error)
      }
    }

    // Insert project
    await db.insert(projects).values({
      id: projectId,
      name: input.name,
      description: input.description,
      workspacePath: input.workspacePath,
      settings: input.settings ? JSON.stringify(input.settings) : null,
    })

    // Validate agent assignments exist
    if (input.agents) {
      for (const assignment of input.agents) {
        const agent = await this.agentConfigService.getConfig(assignment.agentConfigId)
        if (!agent) {
          throw new Error(`Agent ${assignment.agentConfigId} not found`)
        }
      }
    }

    // Assign agents if provided
    const assignments: AgentAssignment[] = []

    // If team template is specified, load its agent assignments
    if (input.teamTemplateId) {
      const template = await this.getTeamTemplate(input.teamTemplateId)
      if (template) {
        const roleAssignments = JSON.parse(template.agentRoles)
        for (const [role, configId] of Object.entries(roleAssignments)) {
          assignments.push({
            role,
            agentConfigId: configId as string,
          })
        }
      }
    }

    // Add any additional agent assignments
    if (input.agents) {
      assignments.push(...input.agents)
    }

    // Create agent role assignments
    for (const assignment of assignments) {
      const assignmentId = `${projectId}_${assignment.role}_${Date.now()}`
      await db.insert(agentRoleAssignments).values({
        id: assignmentId,
        projectId,
        role: assignment.role,
        agentConfigId: assignment.agentConfigId,
        customTools: assignment.customTools ? JSON.stringify(assignment.customTools) : null,
        hasCustomTools: assignment.customTools ? assignment.customTools.length > 0 : false,
      })
    }

    // Return the created project with agents
    return this.getProjectWithAgents(projectId)
  }

  /**
   * Get a project with its agent assignments
   */
  async getProjectWithAgents(projectId: string): Promise<ProjectWithAgents> {
    const project = await db.select().from(projects).where(eq(projects.id, projectId)).get()

    if (!project) {
      throw new Error(`Project ${projectId} not found`)
    }

    const assignments = await db
      .select()
      .from(agentRoleAssignments)
      .where(eq(agentRoleAssignments.projectId, projectId))
      .all()

    // Load agent configs
    const agentsWithConfigs = await Promise.all(
      assignments.map(async (assignment) => {
        const agentConfig = await this.agentConfigService.getConfig(assignment.agentConfigId || '')
        return {
          role: assignment.role,
          agentConfigId: assignment.agentConfigId || '',
          customTools: assignment.customTools ? JSON.parse(assignment.customTools) : undefined,
          agentConfig,
        }
      })
    )

    return {
      id: project.id,
      name: project.name,
      description: project.description || undefined,
      workspacePath: project.workspacePath || '',
      settings: project.settings ? JSON.parse(project.settings) : undefined,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      lastActivityAt: project.lastActivityAt || null,
      agents: agentsWithConfigs,
    }
  }

  /**
   * List all Studio projects
   */
  async listProjects(): Promise<StudioProject[]> {
    const projectList = await db.select().from(projects).orderBy(desc(projects.updatedAt)).all()

    return projectList.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || undefined,
      workspacePath: p.workspacePath || '',
      settings: p.settings ? JSON.parse(p.settings) : undefined,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      lastActivityAt: p.lastActivityAt || null,
    }))
  }

  /**
   * Update project settings
   */
  async updateProject(
    projectId: string,
    updates: Partial<CreateProjectInput>
  ): Promise<StudioProject> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.workspacePath !== undefined) updateData.workspacePath = updates.workspacePath
    if (updates.settings !== undefined) updateData.settings = JSON.stringify(updates.settings)

    await db.update(projects).set(updateData).where(eq(projects.id, projectId))

    const updated = await db.select().from(projects).where(eq(projects.id, projectId)).get()
    if (!updated) {
      throw new Error(`Project ${projectId} not found`)
    }

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description || undefined,
      workspacePath: updated.workspacePath || '',
      settings: updated.settings ? JSON.parse(updated.settings) : undefined,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      lastActivityAt: updated.lastActivityAt || null,
    }
  }

  /**
   * Update project's last activity timestamp
   */
  async updateLastActivity(projectId: string): Promise<void> {
    await db.update(projects).set({ lastActivityAt: new Date() }).where(eq(projects.id, projectId))
  }

  /**
   * Delete a project and its assignments
   */
  async deleteProject(projectId: string, options?: { deleteWorkspace?: boolean }): Promise<void> {
    // Get project info before deletion
    const project = await db.select().from(projects).where(eq(projects.id, projectId)).get()
    if (!project) {
      throw new Error('Project not found')
    }

    // Delete agent assignments first
    await db.delete(agentRoleAssignments).where(eq(agentRoleAssignments.projectId, projectId))

    // Delete the project record
    await db.delete(projects).where(eq(projects.id, projectId))

    // Optionally delete workspace directory (moved to trash for safety)
    if (options?.deleteWorkspace && project.workspacePath) {
      try {
        await safeDeleteDirectory(expandPath(project.workspacePath))
      } catch (error) {
        console.error('Failed to delete workspace directory:', error)
        // Don't fail the entire operation if workspace deletion fails
        throw new Error(
          `Project deleted but failed to remove workspace: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  }

  /**
   * Add an agent to a project
   */
  async addAgentToProject(projectId: string, assignment: AgentAssignment): Promise<void> {
    const assignmentId = `${projectId}_${assignment.role}_${Date.now()}`

    // Check if role already assigned
    const existing = await db
      .select()
      .from(agentRoleAssignments)
      .where(
        and(
          eq(agentRoleAssignments.projectId, projectId),
          eq(agentRoleAssignments.role, assignment.role)
        )
      )
      .get()

    if (existing) {
      throw new Error(`Role ${assignment.role} is already assigned in this project`)
    }

    await db.insert(agentRoleAssignments).values({
      id: assignmentId,
      projectId,
      role: assignment.role,
      agentConfigId: assignment.agentConfigId,
      customTools: assignment.customTools ? JSON.stringify(assignment.customTools) : null,
      hasCustomTools: assignment.customTools ? assignment.customTools.length > 0 : false,
    })
  }

  /**
   * Remove an agent from a project
   */
  async removeAgentFromProject(projectId: string, role: string): Promise<void> {
    await db
      .delete(agentRoleAssignments)
      .where(
        and(eq(agentRoleAssignments.projectId, projectId), eq(agentRoleAssignments.role, role))
      )
  }

  /**
   * Get project agents with short IDs
   */
  async getProjectAgentsWithShortIds(projectId: string): Promise<
    Array<{
      shortId: string
      role: string
      agentConfigId: string
      customTools?: string[]
      agentConfig?: AgentConfig | null
    }>
  > {
    const assignments = await db
      .select()
      .from(agentRoleAssignments)
      .where(eq(agentRoleAssignments.projectId, projectId))
      .all()

    // Group by role and add numeric suffixes
    const roleCounts: Record<string, number> = {}

    const agentsWithShortIds = await Promise.all(
      assignments.map(async (assignment) => {
        const role = assignment.role
        roleCounts[role] = (roleCounts[role] || 0) + 1
        const shortId = `${role}_${String(roleCounts[role]).padStart(2, '0')}`

        const agentConfig = await this.agentConfigService.getConfig(assignment.agentConfigId || '')

        return {
          shortId,
          role: assignment.role,
          agentConfigId: assignment.agentConfigId || '',
          customTools: assignment.customTools ? JSON.parse(assignment.customTools) : undefined,
          agentConfig,
        }
      })
    )

    return agentsWithShortIds
  }

  /**
   * Get team template
   */
  private async getTeamTemplate(templateId: string) {
    return db.select().from(teamTemplates).where(eq(teamTemplates.id, templateId)).get()
  }

  /**
   * Get project agents in format expected by WorkflowOrchestrator
   * Returns agents with short IDs as the main ID
   */
  async getProjectAgents(projectId: string): Promise<
    Array<{
      id: string // This will be the short ID
      configId?: string
      name: string
      role: string
      status: 'online' | 'offline'
      sessionId: string | null
      messageCount: number
      totalTokens: number
      lastMessage: string
      hasSession: boolean
    }>
  > {
    const agentsWithShortIds = await this.getProjectAgentsWithShortIds(projectId)

    return agentsWithShortIds.map((agent) => ({
      id: agent.shortId, // Use short ID as the main ID
      configId: agent.agentConfigId,
      name: agent.agentConfig?.name || agent.role,
      role: agent.role,
      status: 'offline' as const,
      sessionId: null,
      messageCount: 0,
      totalTokens: 0,
      lastMessage: '',
      hasSession: false,
    }))
  }

  /**
   * Create a team template from a project
   */
  async createTeamTemplateFromProject(
    projectId: string,
    templateName: string,
    description?: string
  ): Promise<string> {
    const assignments = await db
      .select()
      .from(agentRoleAssignments)
      .where(eq(agentRoleAssignments.projectId, projectId))
      .all()

    const roleMap: Record<string, string> = {}
    assignments.forEach((a) => {
      if (a.agentConfigId) {
        roleMap[a.role] = a.agentConfigId
      }
    })

    const templateId = randomUUID()
    await db.insert(teamTemplates).values({
      id: templateId,
      name: templateName,
      description,
      agentRoles: JSON.stringify(roleMap),
    })

    return templateId
  }
}
