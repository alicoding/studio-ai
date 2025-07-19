import { ClaudeAgent, type Role, type AgentConfig, type MCPServerConfig } from './claude-agent.js'
import { SessionService } from './SessionService.js'
import { AbortEventSystem } from './AbortEventSystem.js'
import type { Server } from 'socket.io'

// SOLID: Single Responsibility - Handle Claude interactions
// DRY: Reuse existing ClaudeAgent instead of duplicating query logic
export class ClaudeService {
  private agents: Map<string, ClaudeAgent> = new Map()
  private sessionService = SessionService.getInstance()
  private abortEventSystem = AbortEventSystem.getInstance()
  private abortSubscriptions: Map<string, () => void> = new Map()
  private workflowAbortControllers: Map<string, AbortController> = new Map()

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
      // Get agent configuration if not provided
      let config = agentConfig
      if (!config) {
        try {
          // Use server-side config service
          const { UnifiedAgentConfigService } = await import('./UnifiedAgentConfigService')
          const configService = UnifiedAgentConfigService.getInstance()

          // Use the full agentId as passed (should be the agentConfigId)
          const storedConfig = await configService.getConfig(agentId)

          // Always load MCP servers, even if no stored config
          const defaultMcpServers = await this.getDefaultMcpServers()

          if (storedConfig) {
            config = {
              systemPrompt: storedConfig.systemPrompt,
              tools: storedConfig.tools,
              model: storedConfig.model,
              maxTokens: storedConfig.maxTokens,
              temperature: storedConfig.temperature,
              mcpServers: defaultMcpServers,
            }
          } else {
            // No stored config, but still provide MCP servers
            config = {
              mcpServers: defaultMcpServers,
            }
          }
        } catch (error) {
          console.error('Failed to load agent configuration:', error)
          // Continue without configuration
        }
      }

      // Project path is required - if not provided, throw error
      if (!projectPath) {
        throw new Error(
          `Cannot create agent ${agentId} without project path. Project path determines where messages are stored.`
        )
      }

      const agent = new ClaudeAgent(agentId, role, projectPath, projectId, config)

      this.agents.set(agentKey, agent)

      // Subscribe to abort events for this agent
      this.subscribeAgentToAbortEvents(agent, agentKey, projectId, agentId)
    }

    // Always set session update callback, even for cached agents
    // This ensures SessionService stays in sync when Claude SDK creates new sessions
    const agent = this.agents.get(agentKey)!
    agent.setSessionUpdateCallback(async (newSessionId: string) => {
      await this.sessionService.updateSession(projectId, agentId, newSessionId)
    })

    return agent
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
    agentConfig?: AgentConfig,
    threadId?: string
  ): Promise<{ response: string; sessionId: string | null }> {
    const agent = await this.getOrCreateAgent(projectId, agentId, role, projectPath, agentConfig)

    // Set up streaming callback if provided
    if (onStream) {
      agent.setStreamCallback(onStream)
    }

    try {
      // Get workflow abort controller if available
      const externalAbortController = threadId
        ? this.getWorkflowAbortController(threadId)
        : undefined

      // Pass the agentId as the sessionId parameter for UI compatibility
      const response = await agent.sendMessage(
        content,
        projectPath,
        io,
        agentId,
        forceNewSession,
        externalAbortController
      )

      return {
        response,
        sessionId: agentId, // Return stable agent ID for UI consistency
      }
    } catch (error) {
      console.error('Error sending message via Claude:', error)
      throw error
    }
  }

  /**
   * Set workflow abort controller for proper abort handling
   * CRITICAL FIX: Allows WorkflowOrchestrator to pass its AbortController to agents
   */
  setWorkflowAbortController(threadId: string, abortController: AbortController): void {
    this.workflowAbortControllers.set(threadId, abortController)
  }

  /**
   * Get workflow abort controller for a specific thread
   */
  getWorkflowAbortController(threadId: string): AbortController | undefined {
    return this.workflowAbortControllers.get(threadId)
  }

  /**
   * Subscribe agent to abort events using event-driven pattern
   * SOLID: Single responsibility for event subscription
   * DRY: Reuses AbortEventSystem for all abort scenarios
   * CRITICAL FIX: Enhanced with debug logging for abort signal flow
   */
  private subscribeAgentToAbortEvents(
    agent: ClaudeAgent,
    agentKey: string,
    projectId: string,
    agentId: string
  ): void {
    const unsubscribe = this.abortEventSystem.subscribeToAborts((event) => {
      // Check if this agent should be aborted by this event
      const shouldAbort = AbortEventSystem.shouldAbortAgent(event, agentId, projectId)

      if (shouldAbort) {
        agent.abort()
      }
    })

    // Store the unsubscribe function for cleanup
    this.abortSubscriptions.set(agentKey, unsubscribe)
  }

  // Clean up agents - updated to use project+agent key
  async removeAgent(projectId: string, agentId: string): Promise<void> {
    const agentKey = `${projectId}:${agentId}`
    const agent = this.agents.get(agentKey)
    if (agent) {
      agent.abort()
      this.agents.delete(agentKey)

      // Unsubscribe from abort events
      const unsubscribe = this.abortSubscriptions.get(agentKey)
      if (unsubscribe) {
        unsubscribe()
        this.abortSubscriptions.delete(agentKey)
      }

      // Clear session tracking
      await this.sessionService.clearSession(projectId, agentId)
    }
  }

  /**
   * Clean up workflow abort controllers
   */
  cleanupWorkflowAbortController(threadId: string): void {
    this.workflowAbortControllers.delete(threadId)
  }

  // Get existing agent without creating new one - for abort operations
  getExistingAgent(projectId: string, agentId: string) {
    const agentKey = `${projectId}:${agentId}`
    return this.agents.get(agentKey)
  }

  // Get agent info - updated to use project+agent key
  getAgentInfo(projectId: string, agentId: string) {
    const agentKey = `${projectId}:${agentId}`
    const agent = this.agents.get(agentKey)
    return agent ? agent.getInfo() : null
  }

  // Get default MCP server configuration for agents
  private async getDefaultMcpServers(): Promise<Record<string, MCPServerConfig>> {
    // Load the default MCP configuration that Studio AI provides
    try {
      const path = await import('path')
      const fs = await import('fs/promises')
      const configPath = path.join(process.cwd(), 'web/server/mcp/studio-ai/claude-mcp-config.json')

      const configData = await fs.readFile(configPath, 'utf-8')
      const config = JSON.parse(configData)

      // Convert the configuration format to match MCPServerConfig
      const mcpServers: Record<string, MCPServerConfig> = {}

      if (config.mcpServers) {
        for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
          const server = serverConfig as Record<string, unknown>
          const serverCwd =
            typeof server.cwd === 'string' ? path.resolve(server.cwd) : process.cwd()
          mcpServers[name] = {
            command: String(server.command || 'node'),
            args: Array.isArray(server.args)
              ? server.args.map((arg) => path.resolve(serverCwd, String(arg)))
              : [],
            env:
              server.env && typeof server.env === 'object'
                ? (server.env as Record<string, string>)
                : {},
            cwd: serverCwd,
          }
        }
      }

      return mcpServers
    } catch (error) {
      console.warn('Failed to load MCP configuration, using empty config:', error)
      return {}
    }
  }
}
