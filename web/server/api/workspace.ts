/**
 * Workspace API - Consolidated endpoint for workspace data loading
 * 
 * SOLID: Single responsibility for workspace data aggregation
 * DRY: Eliminates duplicate API calls across workspace components
 * KISS: One endpoint to rule them all - simple and fast
 * Library-First: Uses services for consistent data access
 */

import { Router, Request, Response } from 'express'
import { UnifiedAgentConfigService, type AgentConfig, type AgentRoleAssignment } from '../services/UnifiedAgentConfigService'
import { ProjectService } from '../services/ProjectService'
import { AgentConfigService } from '../services/AgentConfigService'

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
const projectService = new ProjectService()
const legacyAgentService = AgentConfigService.getInstance()

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
      projectAgents: {}
    }

    // Load all projects
    console.time('load-projects')
    const projects = await projectService.getAllProjects()
    workspaceData.projects = projects
    console.timeEnd('load-projects')

    // Load agent configurations if requested
    if (includeAgents === 'true') {
      console.time('load-agent-configs')
      try {
        // Try new unified service first
        workspaceData.agentConfigs = await agentConfigService.getAllConfigs()
      } catch (error) {
        console.log('Falling back to legacy agent service:', error)
        // Fallback to legacy service
        const legacyAgents = await legacyAgentService.getAllAgents()
        workspaceData.agentConfigs = legacyAgents.map(agent => ({
          id: agent.id,
          name: agent.name,
          role: agent.role,
          systemPrompt: agent.systemPrompt,
          tools: agent.tools,
          model: agent.model,
          maxTokens: agent.maxTokens || 200000,
          temperature: agent.temperature || 0.7,
          createdAt: agent.created || new Date().toISOString(),
          updatedAt: agent.created || new Date().toISOString()
        }))
      }
      console.timeEnd('load-agent-configs')
    }

    // Load role assignments for all projects if requested
    if (includeRoles === 'true') {
      console.time('load-role-assignments')
      const projectIds = projects.map(p => p.id)
      
      try {
        // Try batch loading with new service
        const roleMap = await agentConfigService.getBatchProjectRoleAssignments(projectIds)
        workspaceData.roleAssignments = Object.fromEntries(roleMap)
      } catch (error) {
        console.log('Role assignments not available in new service:', error)
        // Initialize empty role assignments
        projectIds.forEach(id => {
          workspaceData.roleAssignments[id] = []
        })
      }
      console.timeEnd('load-role-assignments')
    }

    // Load project agents for specific project or all projects
    console.time('load-project-agents')
    const targetProjects = projectId ? [projectId] : projects.map(p => p.id)
    
    for (const pid of targetProjects) {
      try {
        const agents = await projectService.getProjectAgents(pid)
        workspaceData.projectAgents[pid] = agents as ProjectAgent[]
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
    const { includeAgents = 'true', includeRoles = 'true' } = req.query as Omit<WorkspaceQuery, 'projectId'>
    
    console.time(`workspace-data-load-${projectId}`)
    
    const workspaceData: WorkspaceData = {
      projects: [],
      agentConfigs: [],
      roleAssignments: {},
      projectAgents: {}
    }

    // Load specific project
    console.time('load-single-project')
    const projects = await projectService.getAllProjects()
    const project = projects.find(p => p.id === projectId)
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }
    
    workspaceData.projects = [project]
    console.timeEnd('load-single-project')

    // Load agent configurations if requested
    if (includeAgents === 'true') {
      console.time('load-agent-configs-single')
      try {
        workspaceData.agentConfigs = await agentConfigService.getAllConfigs()
      } catch (error) {
        console.log('Falling back to legacy agent service for single project:', error)
        const legacyAgents = await legacyAgentService.getAllAgents()
        workspaceData.agentConfigs = legacyAgents.map(agent => ({
          id: agent.id,
          name: agent.name,
          role: agent.role,
          systemPrompt: agent.systemPrompt,
          tools: agent.tools,
          model: agent.model,
          maxTokens: agent.maxTokens || 200000,
          temperature: agent.temperature || 0.7,
          createdAt: agent.created || new Date().toISOString(),
          updatedAt: agent.created || new Date().toISOString()
        }))
      }
      console.timeEnd('load-agent-configs-single')
    }

    // Load role assignments for this project if requested
    if (includeRoles === 'true') {
      console.time('load-role-assignments-single')
      try {
        const assignments = await agentConfigService.getProjectRoleAssignments(projectId)
        workspaceData.roleAssignments[projectId] = assignments
      } catch (error) {
        console.log('Role assignments not available for project:', error)
        workspaceData.roleAssignments[projectId] = []
      }
      console.timeEnd('load-role-assignments-single')
    }

    // Load project agents
    console.time('load-project-agents-single')
    try {
      const agents = await projectService.getProjectAgents(projectId)
      workspaceData.projectAgents[projectId] = agents as ProjectAgent[]
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
        projectAgents: 'unknown'
      },
      timestamp: new Date().toISOString()
    }

    // Test project service
    try {
      await projectService.getAllProjects()
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
      const projects = await projectService.getAllProjects()
      if (projects.length > 0) {
        await projectService.getProjectAgents(projects[0].id)
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
      timestamp: new Date().toISOString()
    })
  }
})

export default router