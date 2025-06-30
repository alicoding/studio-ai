import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

// Configuration types
export interface SystemConfig {
  claudeCodePath: string
  defaultWorkspacePath: string
  apiEndpoint: string
  theme: 'light' | 'dark'
  telemetry: boolean
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
 * Single source of truth for all Claude Studio configurations
 */
export class ConfigService {
  private static instance: ConfigService
  private configDir: string
  private configPath: string

  private constructor() {
    this.configDir = path.join(os.homedir(), '.claude-studio')
    this.configPath = path.join(this.configDir, 'config.json')
  }

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService()
    }
    return ConfigService.instance
  }

  // Initialize config directory structure
  async initialize(): Promise<void> {
    try {
      // Create directory structure
      await fs.mkdir(this.configDir, { recursive: true })
      await fs.mkdir(path.join(this.configDir, 'projects'), { recursive: true })
      await fs.mkdir(path.join(this.configDir, 'agents'), { recursive: true })
      await fs.mkdir(path.join(this.configDir, 'teams'), { recursive: true })

      // Create default config if it doesn't exist
      try {
        await fs.access(this.configPath)
      } catch {
        const defaultConfig: MasterConfig = {
          version: '1.0.0',
          systemConfig: {
            claudeCodePath: '/usr/local/bin/claude',
            defaultWorkspacePath: path.join(os.homedir(), 'projects'),
            apiEndpoint: 'http://localhost:3000',
            theme: 'dark',
            telemetry: false
          },
          projects: [],
          agents: [],
          teams: []
        }
        await this.saveMasterConfig(defaultConfig)
      }
    } catch (error) {
      console.error('Failed to initialize config directory:', error)
      throw error
    }
  }

  // Master config operations
  async getConfig(): Promise<MasterConfig> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      console.error('Failed to read master config:', error)
      throw error
    }
  }

  async updateSystemConfig(systemConfig: Partial<SystemConfig>): Promise<void> {
    const config = await this.getConfig()
    config.systemConfig = { ...config.systemConfig, ...systemConfig }
    await this.saveMasterConfig(config)
  }

  private async saveMasterConfig(config: MasterConfig): Promise<void> {
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2))
  }

  // Project operations
  async createProject(project: Omit<ProjectConfig, 'created' | 'lastModified'>): Promise<ProjectConfig> {
    const now = new Date().toISOString()
    const fullProject: ProjectConfig = {
      ...project,
      created: now,
      lastModified: now
    }

    const projectDir = path.join(this.configDir, 'projects', project.id)
    await fs.mkdir(projectDir, { recursive: true })
    await fs.mkdir(path.join(projectDir, 'sessions'), { recursive: true })
    await fs.writeFile(
      path.join(projectDir, 'project.json'),
      JSON.stringify(fullProject, null, 2)
    )

    // Update master config
    const config = await this.getConfig()
    if (!config.projects.includes(project.id)) {
      config.projects.push(project.id)
      await this.saveMasterConfig(config)
    }

    return fullProject
  }

  async getProject(id: string): Promise<ProjectConfig | null> {
    try {
      const data = await fs.readFile(
        path.join(this.configDir, 'projects', id, 'project.json'),
        'utf-8'
      )
      return JSON.parse(data)
    } catch {
      return null
    }
  }

  async updateProject(id: string, updates: Partial<ProjectConfig>): Promise<void> {
    const project = await this.getProject(id)
    if (!project) throw new Error(`Project ${id} not found`)

    const updated = {
      ...project,
      ...updates,
      lastModified: new Date().toISOString()
    }
    await fs.writeFile(
      path.join(this.configDir, 'projects', id, 'project.json'),
      JSON.stringify(updated, null, 2)
    )
  }

  async deleteProject(id: string): Promise<void> {
    await fs.rm(path.join(this.configDir, 'projects', id), { recursive: true })
    
    const config = await this.getConfig()
    config.projects = config.projects.filter(p => p !== id)
    await this.saveMasterConfig(config)
  }

  async getAllProjects(): Promise<ProjectConfig[]> {
    const config = await this.getConfig()
    const projects = await Promise.all(
      config.projects.map(id => this.getProject(id))
    )
    return projects.filter((p): p is ProjectConfig => p !== null)
  }

  // Agent operations
  async createAgent(agent: Omit<AgentConfig, 'created'>): Promise<AgentConfig> {
    const fullAgent: AgentConfig = {
      ...agent,
      created: new Date().toISOString()
    }

    await fs.writeFile(
      path.join(this.configDir, 'agents', `${agent.id}.json`),
      JSON.stringify(fullAgent, null, 2)
    )

    const config = await this.getConfig()
    if (!config.agents.includes(agent.id)) {
      config.agents.push(agent.id)
      await this.saveMasterConfig(config)
    }

    return fullAgent
  }

  async getAgent(id: string): Promise<AgentConfig | null> {
    try {
      const data = await fs.readFile(
        path.join(this.configDir, 'agents', `${id}.json`),
        'utf-8'
      )
      return JSON.parse(data)
    } catch {
      return null
    }
  }

  async updateAgent(id: string, updates: Partial<AgentConfig>): Promise<void> {
    const agent = await this.getAgent(id)
    if (!agent) throw new Error(`Agent ${id} not found`)

    const updated = { ...agent, ...updates }
    await fs.writeFile(
      path.join(this.configDir, 'agents', `${id}.json`),
      JSON.stringify(updated, null, 2)
    )
  }

  async deleteAgent(id: string): Promise<void> {
    await fs.unlink(path.join(this.configDir, 'agents', `${id}.json`))
    
    const config = await this.getConfig()
    config.agents = config.agents.filter(a => a !== id)
    await this.saveMasterConfig(config)
  }

  async getAllAgents(): Promise<AgentConfig[]> {
    const config = await this.getConfig()
    const agents = await Promise.all(
      config.agents.map(id => this.getAgent(id))
    )
    return agents.filter((a): a is AgentConfig => a !== null)
  }

  // Team operations
  async createTeam(team: Omit<TeamConfig, 'created'>): Promise<TeamConfig> {
    const fullTeam: TeamConfig = {
      ...team,
      created: new Date().toISOString()
    }

    await fs.writeFile(
      path.join(this.configDir, 'teams', `${team.id}.json`),
      JSON.stringify(fullTeam, null, 2)
    )

    const config = await this.getConfig()
    if (!config.teams.includes(team.id)) {
      config.teams.push(team.id)
      await this.saveMasterConfig(config)
    }

    return fullTeam
  }

  async getTeam(id: string): Promise<TeamConfig | null> {
    try {
      const data = await fs.readFile(
        path.join(this.configDir, 'teams', `${id}.json`),
        'utf-8'
      )
      return JSON.parse(data)
    } catch {
      return null
    }
  }

  async getAllTeams(): Promise<TeamConfig[]> {
    const config = await this.getConfig()
    const teams = await Promise.all(
      config.teams.map(id => this.getTeam(id))
    )
    return teams.filter((t): t is TeamConfig => t !== null)
  }

  // Session management (links to Claude native sessions)
  async linkClaudeSession(projectId: string, agentId: string, sessionId: string): Promise<void> {
    const sessionPath = path.join(this.configDir, 'projects', projectId, 'sessions', `${agentId}.json`)
    const session: AgentSession = {
      projectId,
      agentId,
      sessionId,
      claudeSessionPath: path.join(os.homedir(), '.claude', sessionId)
    }
    await fs.writeFile(sessionPath, JSON.stringify(session, null, 2))
  }

  async getAgentSession(projectId: string, agentId: string): Promise<AgentSession | null> {
    try {
      const data = await fs.readFile(
        path.join(this.configDir, 'projects', projectId, 'sessions', `${agentId}.json`),
        'utf-8'
      )
      return JSON.parse(data)
    } catch {
      return null
    }
  }

  // Utility methods
  async exportConfig(): Promise<string> {
    const config = await this.getConfig()
    const projects = await this.getAllProjects()
    const agents = await this.getAllAgents()
    const teams = await this.getAllTeams()

    return JSON.stringify({
      config,
      projects,
      agents,
      teams
    }, null, 2)
  }

  async importConfig(data: string): Promise<void> {
    const imported = JSON.parse(data)
    
    // Validate structure
    if (!imported.config || !imported.projects || !imported.agents || !imported.teams) {
      throw new Error('Invalid config export format')
    }

    // Import in order
    await this.saveMasterConfig(imported.config)
    
    for (const agent of imported.agents) {
      await this.createAgent(agent)
    }
    
    for (const team of imported.teams) {
      await this.createTeam(team)
    }
    
    for (const project of imported.projects) {
      await this.createProject(project)
    }
  }
}