/**
 * Server Configuration Service - Uses Unified Storage directly
 * 
 * SOLID: Server-side version of ConfigService
 * DRY: Shares types with client ConfigService
 * KISS: Direct database access, no HTTP
 */

import { createStorage } from '../../../src/lib/storage/UnifiedStorage'
import type { UnifiedStorage } from '../../../src/lib/storage/UnifiedStorage'
import type { 
  SystemConfig, 
  MasterConfig, 
  ProjectConfig, 
  AgentConfig, 
  TeamConfig 
} from '../../../src/services/ConfigService'

export class ServerConfigService {
  private static instance: ServerConfigService
  private systemStorage: UnifiedStorage
  private projectStorage: UnifiedStorage
  private agentStorage: UnifiedStorage
  private teamStorage: UnifiedStorage
  private sessionStorage: UnifiedStorage
  
  private initialized = false

  private constructor() {
    // Initialize storage instances - server uses UnifiedStorage directly
    this.systemStorage = createStorage({
      namespace: 'system-config',
      type: 'config'
    })
    
    this.projectStorage = createStorage({
      namespace: 'projects',
      type: 'config'
    })
    
    this.agentStorage = createStorage({
      namespace: 'agents',
      type: 'config'
    })
    
    this.teamStorage = createStorage({
      namespace: 'teams',
      type: 'config'
    })
    
    this.sessionStorage = createStorage({
      namespace: 'sessions',
      type: 'session',
      ttl: 90 * 24 * 60 * 60 // 90 days
    })
  }

  static getInstance(): ServerConfigService {
    if (!ServerConfigService.instance) {
      ServerConfigService.instance = new ServerConfigService()
    }
    return ServerConfigService.instance
  }

  // Initialize with default config if needed
  async initialize(): Promise<void> {
    if (this.initialized) return
    
    try {
      // Check if config exists
      const config = await this.systemStorage.get<SystemConfig>('config')
      
      if (!config) {
        // Create default config
        const defaultConfig: SystemConfig = {
          claudeCodePath: '/usr/local/bin/claude',
          defaultWorkspacePath: '~/projects',
          apiEndpoint: 'http://localhost:3456',
          theme: 'dark',
          telemetry: false,
          enableTelemetry: true,
          defaultClearSessionPrompt: '> new',
        }
        
        await this.systemStorage.set('config', defaultConfig)
      }
      
      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize ConfigService:', error)
      throw error
    }
  }

  // System config methods
  async getSystemConfig(): Promise<SystemConfig | null> {
    await this.initialize()
    return this.systemStorage.get<SystemConfig>('config')
  }

  async updateSystemConfig(updates: Partial<SystemConfig>): Promise<void> {
    await this.initialize()
    const current = await this.getSystemConfig()
    if (!current) throw new Error('System config not found')
    
    await this.systemStorage.set('config', { ...current, ...updates })
  }

  // Project methods
  async getProject(id: string): Promise<ProjectConfig | null> {
    return this.projectStorage.get<ProjectConfig>(id)
  }

  async createProject(project: ProjectConfig): Promise<ProjectConfig> {
    await this.projectStorage.set(project.id, project)
    return project
  }

  async updateProject(id: string, updates: Partial<ProjectConfig>): Promise<void> {
    const project = await this.getProject(id)
    if (!project) throw new Error('Project not found')
    
    await this.projectStorage.set(id, { ...project, ...updates })
  }

  async deleteProject(id: string): Promise<void> {
    await this.projectStorage.delete(id)
  }

  async listProjects(): Promise<ProjectConfig[]> {
    const keys = await this.projectStorage.keys()
    const projects: ProjectConfig[] = []
    
    for (const key of keys) {
      const project = await this.projectStorage.get<ProjectConfig>(key)
      if (project) projects.push(project)
    }
    
    return projects
  }

  // Agent methods
  async getAgent(id: string): Promise<AgentConfig | null> {
    return this.agentStorage.get<AgentConfig>(id)
  }

  async createAgent(agent: AgentConfig): Promise<AgentConfig> {
    await this.agentStorage.set(agent.id, agent)
    return agent
  }

  async updateAgent(id: string, updates: Partial<AgentConfig>): Promise<void> {
    const agent = await this.getAgent(id)
    if (!agent) throw new Error('Agent not found')
    
    await this.agentStorage.set(id, { ...agent, ...updates })
  }

  async deleteAgent(id: string): Promise<void> {
    await this.agentStorage.delete(id)
  }

  async listAgents(): Promise<AgentConfig[]> {
    const keys = await this.agentStorage.keys()
    const agents: AgentConfig[] = []
    
    for (const key of keys) {
      const agent = await this.agentStorage.get<AgentConfig>(key)
      if (agent) agents.push(agent)
    }
    
    return agents
  }

  // Team methods
  async getTeam(id: string): Promise<TeamConfig | null> {
    return this.teamStorage.get<TeamConfig>(id)
  }

  async createTeam(team: TeamConfig): Promise<TeamConfig> {
    await this.teamStorage.set(team.id, team)
    return team
  }

  async updateTeam(id: string, updates: Partial<TeamConfig>): Promise<void> {
    const team = await this.getTeam(id)
    if (!team) throw new Error('Team not found')
    
    await this.teamStorage.set(id, { ...team, ...updates })
  }

  async deleteTeam(id: string): Promise<void> {
    await this.teamStorage.delete(id)
  }

  async listTeams(): Promise<TeamConfig[]> {
    const keys = await this.teamStorage.keys()
    const teams: TeamConfig[] = []
    
    for (const key of keys) {
      const team = await this.teamStorage.get<TeamConfig>(key)
      if (team) teams.push(team)
    }
    
    return teams
  }

  // Session methods
  async getProjectSessions(projectId: string): Promise<Record<string, string> | null> {
    return this.sessionStorage.get<Record<string, string>>(`project-${projectId}`)
  }

  async saveSession(projectId: string, sessions: Record<string, string>): Promise<void> {
    await this.sessionStorage.set(`project-${projectId}`, sessions)
  }

  async clearProjectSessions(projectId: string): Promise<void> {
    await this.sessionStorage.delete(`project-${projectId}`)
  }

  // Master config compatibility
  async getMasterConfig(): Promise<MasterConfig> {
    const systemConfig = await this.getSystemConfig()
    const projects = await this.listProjects()
    const agents = await this.listAgents()
    const teams = await this.listTeams()
    
    return {
      version: '1.0.0',
      systemConfig: systemConfig || {
        claudeCodePath: '/usr/local/bin/claude',
        defaultWorkspacePath: '~/projects',
        apiEndpoint: 'http://localhost:3456',
        theme: 'dark',
        telemetry: false,
        enableTelemetry: true,
        defaultClearSessionPrompt: '> new',
      },
      projects: projects.map(p => p.id),
      agents: agents.map(a => a.id),
      teams: teams.map(t => t.id)
    }
  }
}