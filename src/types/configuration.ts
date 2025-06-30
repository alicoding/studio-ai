/**
 * Configuration Types for Claude Studio
 * 
 * Hierarchical configuration system:
 * System > Project > Team > Agent
 * More specific configurations override broader ones
 */

// System-wide configuration (stored in ~/claude-studio/config.json)
export interface SystemConfig {
  defaultModel?: string
  defaultTools?: string[]
  globalMcpServers?: string[]
  theme?: 'light' | 'dark'
  telemetry?: boolean
  defaultMaxTokens?: number
}

// Project-level configuration (stored in our DB)
export interface ProjectConfig {
  projectId: string
  defaultAgentRole?: string
  projectPromptPrefix?: string
  mcpServers?: string[]
  disabledTools?: string[]
  environmentVariables?: Record<string, string>
  maxConcurrentAgents?: number
}

// Team configuration (template/preset for groups of agents)
export interface TeamConfig {
  teamId: string
  name: string
  description?: string
  roles: string[]
  sharedTools?: string[]
  sharedMcpServers?: string[]
  teamPromptPrefix?: string
  communicationProtocol?: 'broadcast' | 'direct' | 'hierarchical'
}

// Agent-specific configuration
export interface AgentConfig {
  agentId: string
  name: string
  role: string
  systemPrompt: string
  tools: string[]
  mcpServers?: string[]
  model: string
  maxTokens?: number
  temperature?: number
  teamId?: string // Optional team membership
}

// Merged configuration (result of applying hierarchy)
export interface ResolvedConfig {
  model: string
  tools: string[]
  mcpServers: string[]
  systemPrompt: string
  maxTokens: number
  environmentVariables: Record<string, string>
}

// Configuration resolver
export class ConfigResolver {
  static resolve(
    agent: AgentConfig,
    team?: TeamConfig,
    project?: ProjectConfig,
    system?: SystemConfig
  ): ResolvedConfig {
    // Start with system defaults
    const resolved: ResolvedConfig = {
      model: agent.model || system?.defaultModel || 'claude-3-opus',
      tools: [],
      mcpServers: [],
      systemPrompt: '',
      maxTokens: agent.maxTokens || system?.defaultMaxTokens || 200000,
      environmentVariables: {}
    }

    // Apply tools hierarchy (most specific wins)
    const toolSet = new Set<string>()
    
    // Start with system defaults
    system?.defaultTools?.forEach(t => toolSet.add(t))
    
    // Add team tools
    team?.sharedTools?.forEach(t => toolSet.add(t))
    
    // Agent tools are explicit (not additive)
    if (agent.tools.length > 0) {
      toolSet.clear()
      agent.tools.forEach(t => toolSet.add(t))
    }
    
    // Remove project-disabled tools
    project?.disabledTools?.forEach(t => toolSet.delete(t))
    
    resolved.tools = Array.from(toolSet)

    // Apply MCP servers (additive)
    const mcpSet = new Set<string>()
    system?.globalMcpServers?.forEach(s => mcpSet.add(s))
    project?.mcpServers?.forEach(s => mcpSet.add(s))
    team?.sharedMcpServers?.forEach(s => mcpSet.add(s))
    agent.mcpServers?.forEach(s => mcpSet.add(s))
    resolved.mcpServers = Array.from(mcpSet)

    // Build system prompt (concatenate prefixes)
    const promptParts: string[] = []
    if (project?.projectPromptPrefix) promptParts.push(project.projectPromptPrefix)
    if (team?.teamPromptPrefix) promptParts.push(team.teamPromptPrefix)
    promptParts.push(agent.systemPrompt)
    resolved.systemPrompt = promptParts.join('\n\n')

    // Environment variables
    if (project?.environmentVariables) {
      resolved.environmentVariables = { ...project.environmentVariables }
    }

    return resolved
  }
}