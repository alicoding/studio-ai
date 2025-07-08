/**
 * StudioProjectService - Native Studio Project Management
 *
 * SOLID: Single responsibility - Studio project operations
 * DRY: Reuses database service and agent config service
 * KISS: Clean separation from Claude Desktop projects
 * Library-First: Uses Drizzle ORM through database service
 */

import { randomUUID } from 'crypto'
import { getDb } from '../../../src/lib/storage/database.js'
import { projects, agentRoleAssignments, teamTemplates } from '../../../src/lib/storage/schema.js'
import { eq, and, desc } from 'drizzle-orm'
import { AgentConfigService } from './AgentConfigService.js'
import type { AgentConfig } from '../../../src/services/ConfigService.js'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

// Get database instance
const db = getDb()

// Helper function to expand ~ in paths
function expandPath(filePath: string): string {
  if (filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2))
  }
  return filePath
}

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
  private agentConfigService: AgentConfigService

  constructor() {
    this.agentConfigService = AgentConfigService.getInstance()
  }

  /**
   * Create a new Studio project with optional agent assignments
   */
  async createProject(input: CreateProjectInput): Promise<ProjectWithAgents> {
    const projectId = randomUUID()

    // Expand ~ in workspace path
    const expandedWorkspacePath = expandPath(input.workspacePath)

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
        const agent = await this.agentConfigService.getAgent(assignment.agentConfigId)
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
        const agentConfig = await this.agentConfigService.getAgent(assignment.agentConfigId || '')
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
    }
  }

  /**
   * Delete a project and its assignments
   */
  async deleteProject(projectId: string): Promise<void> {
    // Delete agent assignments first
    await db.delete(agentRoleAssignments).where(eq(agentRoleAssignments.projectId, projectId))

    // Delete the project
    await db.delete(projects).where(eq(projects.id, projectId))
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

        const agentConfig = await this.agentConfigService.getAgent(assignment.agentConfigId || '')

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
