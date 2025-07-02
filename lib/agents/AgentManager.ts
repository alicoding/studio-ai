// SOLID: Single Responsibility - Agent state and lifecycle management
// DRY: Reusable across all agent operations

import { EventEmitter } from 'events'
import { ProcessManager } from '../process/ProcessManager'

export interface AgentState {
  // Identity
  id: string
  name: string
  role: string
  
  // Session state
  hasSession: boolean      // Has a .jsonl file
  sessionId?: string        // Current session checkpoint
  sessionPath?: string      // Path to .jsonl file
  
  // Process state  
  hasProcess: boolean       // Has a running PID
  pid?: number              // Process ID if running
  
  // Activity state
  isResponding: boolean     // Currently processing a message
  lastActivity?: Date       // Last message timestamp
  
  // Usage metrics
  messageCount: number
  tokenCount: number
  maxTokens: number
}

export interface AgentConfig {
  id: string
  name: string
  role: string
  systemPrompt: string
  tools: string[]
  model: string
}

export class AgentManager extends EventEmitter {
  private static instance: AgentManager
  private agents: Map<string, AgentState> = new Map()
  private configs: Map<string, AgentConfig> = new Map()
  private processManager: ProcessManager

  private constructor() {
    super()
    this.processManager = ProcessManager.getInstance()
  }

  public static getInstance(): AgentManager {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager()
    }
    return AgentManager.instance
  }

  // Get agent state
  public getAgent(agentId: string): AgentState | undefined {
    return this.agents.get(agentId)
  }

  // Get all agents for a project
  public getProjectAgents(_projectId: string): AgentState[] {
    // In real implementation, filter by project
    return Array.from(this.agents.values())
  }

  // Update agent from session file (legacy agent discovery)
  public updateFromSession(sessionInfo: {
    sessionId: string
    agentName: string
    role: string
    messageCount: number
    tokenCount: number
    lastActivity: Date
    sessionPath: string
  }): AgentState {
    const agentId = sessionInfo.sessionId // Use sessionId as agentId for legacy
    
    const existing = this.agents.get(agentId)
    const agent: AgentState = {
      id: agentId,
      name: sessionInfo.agentName,
      role: sessionInfo.role,
      hasSession: true,
      sessionId: sessionInfo.sessionId,
      sessionPath: sessionInfo.sessionPath,
      hasProcess: existing?.hasProcess || false,
      pid: existing?.pid,
      isResponding: false,
      lastActivity: sessionInfo.lastActivity,
      messageCount: sessionInfo.messageCount,
      tokenCount: sessionInfo.tokenCount,
      maxTokens: 200000, // Default max
    }
    
    this.agents.set(agentId, agent)
    this.emit('agent:updated', agent)
    return agent
  }

  // Update agent process state
  public updateProcessState(agentId: string, pid?: number): void {
    const agent = this.agents.get(agentId)
    if (!agent) return
    
    agent.hasProcess = !!pid
    agent.pid = pid
    this.emit('agent:process-changed', agent)
  }

  // Update agent activity
  public setResponding(agentId: string, isResponding: boolean): void {
    const agent = this.agents.get(agentId)
    if (!agent) return
    
    agent.isResponding = isResponding
    if (isResponding) {
      agent.lastActivity = new Date()
    }
    this.emit('agent:activity-changed', agent)
  }

  // Get or create config for agent
  public getConfig(agentId: string): AgentConfig | undefined {
    return this.configs.get(agentId)
  }

  // Set config for agent (for conversions)
  public setConfig(agentId: string, config: AgentConfig): void {
    this.configs.set(agentId, config)
    this.emit('agent:config-set', { agentId, config })
  }

  // Check if agent needs spawning
  public needsSpawn(agentId: string): boolean {
    const agent = this.agents.get(agentId)
    return agent ? agent.hasSession && !agent.hasProcess : false
  }

  // Spawn agent process
  public async spawnAgent(agentId: string, projectPath: string): Promise<void> {
    const agent = this.agents.get(agentId)
    const config = this.configs.get(agentId)
    
    if (!agent || !config) {
      throw new Error('Agent or config not found')
    }

    await this.processManager.spawnAgent(agentId, projectPath, config)
  }

  // Kill agent process (but preserve session)
  public async killAgent(agentId: string): Promise<void> {
    await this.processManager.killAgent(agentId)
    this.updateProcessState(agentId, undefined)
  }
}