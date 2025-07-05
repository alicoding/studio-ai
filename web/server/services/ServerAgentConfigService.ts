/**
 * Server-side Agent Configuration Service
 * 
 * SOLID: Single responsibility - manage agent configurations on server
 * DRY: Reuses unified storage for consistency
 * KISS: Simple direct database access without HTTP
 * Library-First: Uses UnifiedStorage directly
 */

import { createStorage } from '../../../src/lib/storage/UnifiedStorage'

// Define AgentConfig type locally to avoid import issues
export interface AgentConfig {
  id: string
  name: string
  role: string
  systemPrompt?: string
  tools?: string[]
  model?: string
  maxTokens?: number
  temperature?: number
}

export class ServerAgentConfigService {
  private static instance: ServerAgentConfigService
  private agentStorage = createStorage({ namespace: 'agents', type: 'config' })
  
  static getInstance(): ServerAgentConfigService {
    if (!ServerAgentConfigService.instance) {
      ServerAgentConfigService.instance = new ServerAgentConfigService()
    }
    return ServerAgentConfigService.instance
  }
  
  async getAgent(agentId: string): Promise<AgentConfig | null> {
    try {
      console.log(`[ServerAgentConfigService] Loading agent config for ID: ${agentId}`)
      const config = await this.agentStorage.get<AgentConfig>(agentId)
      console.log(`[ServerAgentConfigService] Loaded config:`, config)
      return config
    } catch (error) {
      console.error(`[ServerAgentConfigService] Error loading agent ${agentId}:`, error)
      return null
    }
  }
  
  async getAllAgents(): Promise<AgentConfig[]> {
    try {
      const keys = await this.agentStorage.keys()
      const agents = await Promise.all(
        keys.map(key => this.agentStorage.get<AgentConfig>(key))
      )
      return agents.filter((agent): agent is AgentConfig => agent !== null)
    } catch (error) {
      console.error('[ServerAgentConfigService] Error loading all agents:', error)
      return []
    }
  }
}