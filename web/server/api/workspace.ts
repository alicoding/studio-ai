/**
 * Workspace API - Consolidated endpoint for workspace data loading
 *
 * SOLID: Single responsibility for workspace data aggregation
 * DRY: Eliminates duplicate API calls across workspace components
 * KISS: One endpoint to rule them all - simple and fast
 * Library-First: Uses services for consistent data access
 */

import { Router, Request, Response } from 'express'
import {
  UnifiedAgentConfigService,
  type AgentConfig,
  type AgentRoleAssignment,
} from '../services/UnifiedAgentConfigService'
import { StudioProjectService } from '../services/StudioProjectService'
import { StudioSessionService } from '../services/StudioSessionService'
import { SessionService } from '../services/SessionService'

interface ProjectAgent {
  id: string
  configId?: string
  name: string
  role: string
  status: 'online' | 'offline'
  sessionId: string | null
  messageCount: number
  totalTokens: number
  lastMessage: string
  hasSession: boolean
  customTools?: string[]
}

interface ProjectWithAgents {
  id: string
  name: string
  description?: string
  workspacePath?: string
  agents?: ProjectAgent[]
  agentInstances?: ProjectAgent[]
}

const router = Router()
const agentConfigService = UnifiedAgentConfigService.getInstance()
// Legacy agent service removed - using UnifiedAgentConfigService
const studioProjectService = new StudioProjectService()
const studioSessionService = StudioSessionService.getInstance()
const sessionService = SessionService.getInstance()

interface WorkspaceData {
  projects: ProjectWithAgents[]
  agentConfigs: AgentConfig[]
  roleAssignments: Record<string, AgentRoleAssignment[]>
  projectAgents: Record<string, ProjectAgent[]>
}

interface WorkspaceQuery {
  projectId?: string
  includeAgents?: string
  includeRoles?: string
}

// GET /api/workspace - Get consolidated workspace data
router.get('/', async (req: Request, res: Response) => {
  try {
    const { projectId, includeAgents = 'true', includeRoles = 'true' } = req.query as WorkspaceQuery

    console.time('workspace-data-load')

    const workspaceData: WorkspaceData = {
      projects: [],
      agentConfigs: [],
      roleAssignments: {},
      projectAgents: {},
    }

    // Load all projects from Studio Projects
    console.time('load-projects')
    const studioProjects = await studioProjectService.listProjects()
    // Convert Studio Projects to workspace format
    const projects = studioProjects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      workspacePath: p.workspacePath,
      agents: [], // Will be populated later
      agentInstances: [],
    }))
    workspaceData.projects = projects
    console.timeEnd('load-projects')

    // Load agent configurations if requested
    if (includeAgents === 'true') {
      console.time('load-agent-configs')
      try {
        // Try new unified service first
        workspaceData.agentConfigs = await agentConfigService.getAllConfigs()
      } catch (error) {
        console.log('Error loading agent configs:', error)
        workspaceData.agentConfigs = []
      }
      console.timeEnd('load-agent-configs')
    }

    // Load role assignments for all projects if requested
    if (includeRoles === 'true') {
      console.time('load-role-assignments')
      const projectIds = projects.map((p) => p.id)

      // For Studio Projects, we'll get role assignments with the agents
      projectIds.forEach((id) => {
        workspaceData.roleAssignments[id] = []
      })
      console.timeEnd('load-role-assignments')
    }

    // Load project agents for specific project or all projects
    console.time('load-project-agents')
    const targetProjects = projectId ? [projectId] : projects.map((p) => p.id)

    for (const pid of targetProjects) {
      try {
        // Get agents with short IDs from Studio Projects
        const agentsWithShortIds = await studioProjectService.getProjectAgentsWithShortIds(pid)

        // Get project to get workspace path
        const project = projects.find((p) => p.id === pid)
        if (!project) continue

        // Get sessions for the project
        const sessions = await studioSessionService.listProjectSessions(project.workspacePath)

        // Convert to ProjectAgent format with real session data
        const projectAgents: ProjectAgent[] = await Promise.all(
          agentsWithShortIds.map(async (a) => {
            // Get the tracked session ID for this agent
            const trackedSessionId = await sessionService.getSession(pid, a.shortId)

            // Find session using the tracked session ID
            const agentSession = trackedSessionId
              ? sessions.find((s) => s.sessionId === trackedSessionId)
              : undefined

            let messageCount = 0
            let lastMessage = ''
            let totalTokens = 0

            if (agentSession) {
              try {
                // Get last few messages to extract info
                const messages = await studioSessionService.getSessionMessages(
                  project.workspacePath,
                  agentSession.sessionId,
                  { limit: 10 }
                )

                messageCount = messages.messages.length

                // Find last user or assistant message
                const lastMsg = messages.messages
                  .reverse()
                  .find((m) => m.role === 'assistant' || m.role === 'user')

                if (lastMsg) {
                  lastMessage =
                    typeof lastMsg.content === 'string'
                      ? lastMsg.content.substring(0, 100)
                      : 'Complex message'

                  // Sum up token usage
                  messages.messages.forEach((m) => {
                    if (m.usage) {
                      totalTokens += (m.usage.input_tokens || 0) + (m.usage.output_tokens || 0)
                    }
                  })
                }
              } catch (err) {
                console.log(`Could not read session ${agentSession.sessionId}:`, err)
              }
            }

            return {
              id: a.shortId,
              configId: a.agentConfigId,
              name: a.agentConfig?.name || a.role,
              role: a.role,
              status: agentSession ? ('online' as const) : ('offline' as const),
              sessionId: agentSession?.sessionId || null,
              messageCount,
              totalTokens,
              lastMessage,
              hasSession: !!agentSession,
              customTools: a.customTools,
            }
          })
        )

        workspaceData.projectAgents[pid] = projectAgents
      } catch (error) {
        console.error(`Failed to load agents for project ${pid}:`, error)
        workspaceData.projectAgents[pid] = []
      }
    }
    console.timeEnd('load-project-agents')

    console.timeEnd('workspace-data-load')

    res.json(workspaceData)
  } catch (error) {
    console.error('Failed to load workspace data:', error)
    res.status(500).json({ error: 'Failed to load workspace data' })
  }
})

// GET /api/workspace/:projectId - Get workspace data for specific project
router.get('/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const { includeAgents = 'true', includeRoles = 'true' } = req.query as Omit<
      WorkspaceQuery,
      'projectId'
    >

    console.time(`workspace-data-load-${projectId}`)

    const workspaceData: WorkspaceData = {
      projects: [],
      agentConfigs: [],
      roleAssignments: {},
      projectAgents: {},
    }

    // Load specific project from Studio Projects
    console.time('load-single-project')
    try {
      const studioProject = await studioProjectService.getProjectWithAgents(projectId)
      const project = {
        id: studioProject.id,
        name: studioProject.name,
        description: studioProject.description,
        workspacePath: studioProject.workspacePath,
        agents: [],
        agentInstances: [],
      }
      workspaceData.projects = [project]
    } catch (_error) {
      return res.status(404).json({ error: 'Project not found' })
    }
    console.timeEnd('load-single-project')

    // Load agent configurations if requested
    if (includeAgents === 'true') {
      console.time('load-agent-configs-single')
      try {
        workspaceData.agentConfigs = await agentConfigService.getAllConfigs()
      } catch (error) {
        console.log('Error loading agent configs for single project:', error)
        workspaceData.agentConfigs = []
      }
      console.timeEnd('load-agent-configs-single')
    }

    // Load role assignments for this project if requested
    if (includeRoles === 'true') {
      console.time('load-role-assignments-single')
      // For Studio Projects, role assignments are handled with agents
      workspaceData.roleAssignments[projectId] = []
      console.timeEnd('load-role-assignments-single')
    }

    // Load project agents
    console.time('load-project-agents-single')
    try {
      // Get agents with short IDs from Studio Projects
      const agentsWithShortIds = await studioProjectService.getProjectAgentsWithShortIds(projectId)

      // Get project to get workspace path
      const project = workspaceData.projects[0]
      if (!project.workspacePath) {
        console.log('Project has no workspace path')
        workspaceData.projectAgents[projectId] = []
        console.timeEnd('load-project-agents-single')
        console.timeEnd(`workspace-data-load-${projectId}`)
        res.json(workspaceData)
        return
      }

      const workspacePath = project.workspacePath

      // Get sessions for the project
      const sessions = await studioSessionService.listProjectSessions(workspacePath)

      // Convert to ProjectAgent format with real session data
      const projectAgents: ProjectAgent[] = await Promise.all(
        agentsWithShortIds.map(async (a) => {
          // Get the tracked session ID for this agent
          const trackedSessionId = await sessionService.getSession(projectId, a.shortId)

          // Find session using the tracked session ID
          const agentSession = trackedSessionId
            ? sessions.find((s) => s.sessionId === trackedSessionId)
            : undefined

          let messageCount = 0
          let lastMessage = ''
          let totalTokens = 0

          if (agentSession) {
            try {
              // Get last few messages to extract info
              const messages = await studioSessionService.getSessionMessages(
                workspacePath,
                agentSession.sessionId,
                { limit: 10 }
              )

              messageCount = messages.messages.length

              // Find last user or assistant message
              const lastMsg = messages.messages
                .reverse()
                .find((m) => m.role === 'assistant' || m.role === 'user')

              if (lastMsg) {
                lastMessage =
                  typeof lastMsg.content === 'string'
                    ? lastMsg.content.substring(0, 100)
                    : 'Complex message'

                // Sum up token usage
                messages.messages.forEach((m) => {
                  if (m.usage) {
                    totalTokens += (m.usage.input_tokens || 0) + (m.usage.output_tokens || 0)
                  }
                })
              }
            } catch (err) {
              console.log(`Could not read session ${agentSession.sessionId}:`, err)
            }
          }

          return {
            id: a.shortId,
            configId: a.agentConfigId,
            name: a.agentConfig?.name || a.role,
            role: a.role,
            status: agentSession ? ('online' as const) : ('offline' as const),
            sessionId: agentSession?.sessionId || null,
            messageCount,
            totalTokens,
            lastMessage,
            hasSession: !!agentSession,
          }
        })
      )

      workspaceData.projectAgents[projectId] = projectAgents
    } catch (error) {
      console.error(`Failed to load agents for project ${projectId}:`, error)
      workspaceData.projectAgents[projectId] = []
    }
    console.timeEnd('load-project-agents-single')

    console.timeEnd(`workspace-data-load-${projectId}`)

    res.json(workspaceData)
  } catch (error) {
    console.error('Failed to load project workspace data:', error)
    res.status(500).json({ error: 'Failed to load project workspace data' })
  }
})

// POST /api/workspace/refresh - Refresh workspace cache
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    // Clear caches in services
    agentConfigService.clearCache()

    // Could also clear other service caches here

    res.json({ success: true, message: 'Workspace cache refreshed' })
  } catch (error) {
    console.error('Failed to refresh workspace cache:', error)
    res.status(500).json({ error: 'Failed to refresh workspace cache' })
  }
})

// GET /api/workspace/health - Health check for workspace services
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = {
      status: 'healthy',
      services: {
        projects: 'unknown',
        agentConfigs: 'unknown',
        projectAgents: 'unknown',
      },
      timestamp: new Date().toISOString(),
    }

    // Test project service
    try {
      await studioProjectService.listProjects()
      health.services.projects = 'healthy'
    } catch (_error) {
      health.services.projects = 'unhealthy'
      health.status = 'degraded'
    }

    // Test agent config service
    try {
      await agentConfigService.getAllConfigs()
      health.services.agentConfigs = 'healthy'
    } catch (_error) {
      health.services.agentConfigs = 'unhealthy'
      health.status = 'degraded'
    }

    // Test project agents
    try {
      const projects = await studioProjectService.listProjects()
      if (projects.length > 0) {
        await studioProjectService.getProjectAgentsWithShortIds(projects[0].id)
      }
      health.services.projectAgents = 'healthy'
    } catch (_error) {
      health.services.projectAgents = 'unhealthy'
      health.status = 'degraded'
    }

    res.json(health)
  } catch (error) {
    console.error('Health check failed:', error)
    res.status(500).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
    })
  }
})

export default router
