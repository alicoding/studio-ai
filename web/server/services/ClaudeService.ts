import { ClaudeAgent, type Role, type AgentConfig } from './claude-agent.js'
import { SessionService } from './SessionService.js'
import type { Server } from 'socket.io'

// SOLID: Single Responsibility - Handle Claude interactions
// DRY: Reuse existing ClaudeAgent instead of duplicating query logic
export class ClaudeService {
  private agents: Map<string, ClaudeAgent> = new Map()
  private sessionService = SessionService.getInstance()

  // KISS: Simple method to get or create an agent
  // Updated to use project+agent based tracking instead of just sessionId
  async getOrCreateAgent(
    projectId: string,
    agentId: string,
    role: Role = 'dev',
    projectPath?: string,
    agentConfig?: AgentConfig
  ): Promise<ClaudeAgent> {
    const agentKey = `${projectId}:${agentId}`

    if (!this.agents.has(agentKey)) {
      // Get tracked sessionId for this project+agent
      const trackedSessionId = await this.sessionService.getSession(projectId, agentId)

      // Get agent configuration if not provided
      let config = agentConfig
      if (!config) {
        try {
          // Use server-side config service
          const { UnifiedAgentConfigService } = await import('./UnifiedAgentConfigService')
          const configService = UnifiedAgentConfigService.getInstance()

          // Use the full agentId as passed (should be the agentConfigId)
          const storedConfig = await configService.getConfig(agentId)
          console.log(`[SYSTEM PROMPT DEBUG] Loading config for configId: ${agentId}`)
          console.log(`[SYSTEM PROMPT DEBUG] Stored config:`, storedConfig)
          if (storedConfig) {
            config = {
              systemPrompt: storedConfig.systemPrompt,
              tools: storedConfig.tools,
              model: storedConfig.model,
              maxTokens: storedConfig.maxTokens,
              temperature: storedConfig.temperature,
            }
            console.log(`[SYSTEM PROMPT DEBUG] Final config with system prompt:`, config)
          }
        } catch (error) {
          console.error('Failed to load agent configuration:', error)
          // Continue without configuration
        }
      }

      const agent = new ClaudeAgent(agentId, role, trackedSessionId, config)

      // Set up session update callback
      agent.setSessionUpdateCallback(async (newSessionId: string) => {
        await this.sessionService.updateSession(projectId, agentId, newSessionId)
      })

      this.agents.set(agentKey, agent)
    }

    return this.agents.get(agentKey)!
  }

  // KISS: Simple wrapper around sendMessage with streaming support
  // Updated to use project+agent based tracking
  async sendMessage(
    content: string,
    projectId: string,
    agentId: string,
    projectPath?: string,
    role: Role = 'dev',
    onStream?: (data: string) => void,
    io?: Server,
    forceNewSession?: boolean,
    agentConfig?: AgentConfig
  ): Promise<{ response: string; sessionId: string | null }> {
    const agent = await this.getOrCreateAgent(projectId, agentId, role, projectPath, agentConfig)

    // Set up streaming callback if provided
    if (onStream) {
      agent.setStreamCallback(onStream)
    }

    try {
      // Pass the agentId as the sessionId parameter for UI compatibility
      const response = await agent.sendMessage(content, projectPath, io, agentId, forceNewSession)
      const agentInfo = agent.getInfo()

      return {
        response,
        sessionId: agentInfo.sessionId,
      }
    } catch (error) {
      console.error('Error sending message via Claude:', error)
      throw error
    }
  }

  // Clean up agents - updated to use project+agent key
  async removeAgent(projectId: string, agentId: string): Promise<void> {
    const agentKey = `${projectId}:${agentId}`
    const agent = this.agents.get(agentKey)
    if (agent) {
      agent.abort()
      this.agents.delete(agentKey)

      // Clear session tracking
      await this.sessionService.clearSession(projectId, agentId)
    }
  }

  // Get agent info - updated to use project+agent key
  getAgentInfo(projectId: string, agentId: string) {
    const agentKey = `${projectId}:${agentId}`
    const agent = this.agents.get(agentKey)
    return agent ? agent.getInfo() : null
  }
}
