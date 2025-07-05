/**
 * Configuration Service - Uses Unified Storage
 * 
 * SOLID: Single responsibility for configuration management
 * DRY: One service for all config needs
 * KISS: Simple interface, complex storage abstracted
 * Library-First: Uses unified storage instead of direct file access
 */

import { ClientStorage } from '../lib/storage/client'

// Configuration types
export interface SystemConfig {
  claudeCodePath: string
  defaultWorkspacePath: string
  apiEndpoint: string
  theme: 'light' | 'dark'
  telemetry: boolean
  enableTelemetry?: boolean
  defaultClearSessionPrompt: string
  hooks?: Record<string, unknown>
  studioHooks?: unknown[]
  mcpServers?: MCPServer[]
}

export interface MCPServer {
  id: string
  name: string
  command: string
  args?: string[]
  env?: Record<string, string>
  enabled: boolean
}

export interface MasterConfig {
  version: string
  systemConfig: SystemConfig
  projects: string[]
  agents: string[]
  teams: string[]
}

export interface ProjectConfig {
  id: string
  name: string
  description: string
  workspacePath: string
  created: string
  lastModified: string
  activeAgents: string[]
  settings: {
    envVars: Record<string, string>
    disabledTools: string[]
    mcpServers: string[]
  }
}

export interface AgentConfig {
  id: string
  name: string
  role: string
  model: string
  systemPrompt: string
  tools: string[]
  maxTokens: number
  temperature: number
  maxTurns?: number
  verbose?: boolean
  created: string
}

export interface TeamConfig {
  id: string
  name: string
  description: string
  agents: Array<{ role: string; count: number }>
  created: string
}

export interface AgentSession {
  projectId: string
  agentId: string
  sessionId: string
  claudeSessionPath?: string
}

/**
 * Centralized configuration management service
 * Now uses unified storage instead of JSON files
 */
export class ConfigService {
  private static instance: ConfigService
  
  // Storage instances
  private systemStorage: ClientStorage
  private projectStorage: ClientStorage
  private agentStorage: ClientStorage
  private teamStorage: ClientStorage
  private sessionStorage: ClientStorage
  
  private initialized = false

  private constructor() {
    
    // Initialize storage instances using client API
    this.systemStorage = new ClientStorage({ namespace: 'system-config', type: 'config' })
    this.projectStorage = new ClientStorage({ namespace: 'projects', type: 'config' })
    this.agentStorage = new ClientStorage({ namespace: 'agents', type: 'config' })
    this.teamStorage = new ClientStorage({ namespace: 'teams', type: 'config' })
    this.sessionStorage = new ClientStorage({ namespace: 'sessions', type: 'session' })
  }

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService()
    }
    return ConfigService.instance
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
          defaultClearSessionPrompt: 'Session cleared. You are an AI assistant. Please stand by for instructions. Do not respond to this message.',
          hooks: {
            PreToolUse: [],
            PostToolUse: [],
            Notification: [],
            Stop: []
          },
          studioHooks: []
        }
        
        await this.systemStorage.set('config', defaultConfig)
        await this.systemStorage.set('version', '1.0.0')
        
        // Initialize empty arrays for refs
        await this.systemStorage.set('project-refs', [])
        await this.systemStorage.set('agent-refs', [])
        await this.systemStorage.set('team-refs', [])
      }
      
      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize config service:', error)
      throw error
    }
  }

  // Master config operations
  async getConfig(): Promise<MasterConfig> {
    await this.initialize()
    
    const [config, version, projectRefs, agentRefs, teamRefs] = await Promise.all([
      this.systemStorage.get<SystemConfig>('config'),
      this.systemStorage.get<string>('version'),
      this.systemStorage.get<string[]>('project-refs'),
      this.systemStorage.get<string[]>('agent-refs'),
      this.systemStorage.get<string[]>('team-refs')
    ])
    
    return {
      version: version || '1.0.0',
      systemConfig: config!,
      projects: projectRefs || [],
      agents: agentRefs || [],
      teams: teamRefs || []
    }
  }

  async updateSystemConfig(systemConfig: Partial<SystemConfig>): Promise<void> {
    await this.initialize()
    
    const currentConfig = await this.systemStorage.get<SystemConfig>('config')
    const updatedConfig = { ...currentConfig!, ...systemConfig }
    
    await this.systemStorage.set('config', updatedConfig)
  }

  // Project operations
  async createProject(
    project: Omit<ProjectConfig, 'created' | 'lastModified'>
  ): Promise<ProjectConfig> {
    await this.initialize()
    
    const now = new Date().toISOString()
    const fullProject: ProjectConfig = {
      ...project,
      created: now,
      lastModified: now,
    }
    
    // Store project
    await this.projectStorage.set(project.id, fullProject)
    
    // Update project refs
    const refs = await this.systemStorage.get<string[]>('project-refs') || []
    if (!refs.includes(project.id)) {
      refs.push(project.id)
      await this.systemStorage.set('project-refs', refs)
    }
    
    return fullProject
  }

  async getProject(projectId: string): Promise<ProjectConfig | null> {
    await this.initialize()
    return await this.projectStorage.get<ProjectConfig>(projectId)
  }

  async updateProject(
    projectId: string,
    updates: Partial<ProjectConfig>
  ): Promise<void> {
    await this.initialize()
    
    const project = await this.getProject(projectId)
    if (!project) throw new Error(`Project ${projectId} not found`)
    
    const updatedProject = {
      ...project,
      ...updates,
      lastModified: new Date().toISOString(),
    }
    
    await this.projectStorage.set(projectId, updatedProject)
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.initialize()
    
    // Delete project
    await this.projectStorage.delete(projectId)
    
    // Update refs
    const refs = await this.systemStorage.get<string[]>('project-refs') || []
    const filtered = refs.filter((id: string) => id !== projectId)
    await this.systemStorage.set('project-refs', filtered)
    
    // Delete associated sessions
    await this.sessionStorage.delete(`project-${projectId}`)
  }

  async listProjects(): Promise<ProjectConfig[]> {
    await this.initialize()
    
    const refs = await this.systemStorage.get<string[]>('project-refs') || []
    const projects = await Promise.all(
      refs.map((id: string) => this.getProject(id))
    )
    
    return projects.filter((p): p is ProjectConfig => p !== null)
  }

  // Agent operations
  async createAgent(agent: Omit<AgentConfig, 'created'>): Promise<AgentConfig> {
    await this.initialize()
    
    const fullAgent: AgentConfig = {
      ...agent,
      created: new Date().toISOString(),
    }
    
    // Store agent
    await this.agentStorage.set(agent.id, fullAgent)
    
    // Update refs
    const refs = await this.systemStorage.get<string[]>('agent-refs') || []
    if (!refs.includes(agent.id)) {
      refs.push(agent.id)
      await this.systemStorage.set('agent-refs', refs)
    }
    
    return fullAgent
  }

  async getAgent(agentId: string): Promise<AgentConfig | null> {
    await this.initialize()
    return await this.agentStorage.get<AgentConfig>(agentId)
  }

  async updateAgent(agentId: string, updates: Partial<AgentConfig>): Promise<void> {
    await this.initialize()
    
    const agent = await this.getAgent(agentId)
    if (!agent) throw new Error(`Agent ${agentId} not found`)
    
    await this.agentStorage.set(agentId, { ...agent, ...updates })
  }

  async deleteAgent(agentId: string): Promise<void> {
    await this.initialize()
    
    // Delete agent
    await this.agentStorage.delete(agentId)
    
    // Update refs
    const refs = await this.systemStorage.get<string[]>('agent-refs') || []
    const filtered = refs.filter((id: string) => id !== agentId)
    await this.systemStorage.set('agent-refs', filtered)
  }

  async listAgents(): Promise<AgentConfig[]> {
    await this.initialize()
    
    const refs = await this.systemStorage.get<string[]>('agent-refs') || []
    const agents = await Promise.all(
      refs.map((id: string) => this.getAgent(id))
    )
    
    return agents.filter((a): a is AgentConfig => a !== null)
  }

  // Team operations
  async createTeam(team: Omit<TeamConfig, 'created'>): Promise<TeamConfig> {
    await this.initialize()
    
    const fullTeam: TeamConfig = {
      ...team,
      created: new Date().toISOString(),
    }
    
    // Store team
    await this.teamStorage.set(team.id, fullTeam)
    
    // Update refs
    const refs = await this.systemStorage.get<string[]>('team-refs') || []
    if (!refs.includes(team.id)) {
      refs.push(team.id)
      await this.systemStorage.set('team-refs', refs)
    }
    
    return fullTeam
  }

  async getTeam(teamId: string): Promise<TeamConfig | null> {
    await this.initialize()
    return await this.teamStorage.get<TeamConfig>(teamId)
  }

  async deleteTeam(teamId: string): Promise<void> {
    await this.initialize()
    
    // Delete team
    await this.teamStorage.delete(teamId)
    
    // Update refs
    const refs = await this.systemStorage.get<string[]>('team-refs') || []
    const filtered = refs.filter((id: string) => id !== teamId)
    await this.systemStorage.set('team-refs', filtered)
  }

  async listTeams(): Promise<TeamConfig[]> {
    await this.initialize()
    
    const refs = await this.systemStorage.get<string[]>('team-refs') || []
    const teams = await Promise.all(
      refs.map((id: string) => this.getTeam(id))
    )
    
    return teams.filter((t): t is TeamConfig => t !== null)
  }

  // Session operations
  async saveSession(projectId: string, sessions: AgentSession[]): Promise<void> {
    await this.initialize()
    await this.sessionStorage.set(`project-${projectId}`, sessions)
  }

  async getProjectSessions(projectId: string): Promise<AgentSession[] | null> {
    await this.initialize()
    return await this.sessionStorage.get(`project-${projectId}`)
  }

  // Cleanup utilities
  async clearAll(): Promise<void> {
    await this.initialize()
    
    // Clear all storage namespaces
    await Promise.all([
      this.systemStorage.clear(),
      this.projectStorage.clear(),
      this.agentStorage.clear(),
      this.teamStorage.clear(),
      this.sessionStorage.clear()
    ])
    
    // Re-initialize with defaults
    this.initialized = false
    await this.initialize()
  }
}