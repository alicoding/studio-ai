import { ClaudeAgent, type Role } from './claude-agent.js'

// SOLID: Single Responsibility - Handle Claude interactions
// DRY: Reuse existing ClaudeAgent instead of duplicating query logic
export class ClaudeService {
  private agents: Map<string, ClaudeAgent> = new Map()

  // KISS: Simple method to get or create an agent
  getOrCreateAgent(sessionId: string, role: Role = 'dev', projectPath?: string): ClaudeAgent {
    const agentKey = sessionId || 'default'
    
    if (!this.agents.has(agentKey)) {
      const agent = new ClaudeAgent(
        agentKey,
        role,
        sessionId,
        projectPath ? { projectRoot: projectPath, workingDirectory: projectPath } : undefined
      )
      this.agents.set(agentKey, agent)
    }
    
    return this.agents.get(agentKey)!
  }

  // KISS: Simple wrapper around sendMessage with streaming support
  async sendMessage(
    content: string,
    sessionId?: string,
    projectPath?: string,
    role: Role = 'dev',
    onStream?: (data: any) => void,
    io?: any,
    forceNewSession?: boolean
  ): Promise<{ response: string; sessionId: string | null }> {
    const agent = this.getOrCreateAgent(sessionId || 'default', role, projectPath)
    
    // Set up streaming callback if provided
    if (onStream) {
      agent.setStreamCallback(onStream)
    }

    try {
      const response = await agent.sendMessage(content, projectPath, io, sessionId || 'default', forceNewSession)
      const agentInfo = agent.getInfo()
      
      return {
        response,
        sessionId: agentInfo.sessionId
      }
    } catch (error) {
      console.error('Error sending message via Claude:', error)
      throw error
    }
  }

  // Clean up agents
  removeAgent(sessionId: string): void {
    const agentKey = sessionId || 'default'
    const agent = this.agents.get(agentKey)
    if (agent) {
      agent.abort()
      this.agents.delete(agentKey)
    }
  }

  // Get agent info
  getAgentInfo(sessionId: string) {
    const agent = this.agents.get(sessionId || 'default')
    return agent ? agent.getInfo() : null
  }
}