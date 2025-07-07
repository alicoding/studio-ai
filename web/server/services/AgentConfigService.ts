import { ServerConfigService } from './ServerConfigService'
import type { AgentConfig } from '../../../src/services/ConfigService'

/**
 * Service that reads agent configurations from ConfigService
 */
export class AgentConfigService {
  private static instance: AgentConfigService
  private configService: ServerConfigService

  private constructor() {
    this.configService = ServerConfigService.getInstance()
  }

  static getInstance(): AgentConfigService {
    if (!AgentConfigService.instance) {
      AgentConfigService.instance = new AgentConfigService()
    }
    return AgentConfigService.instance
  }

  /**
   * Get agent by ID from ConfigService
   */
  async getAgent(id: string): Promise<AgentConfig | null> {
    return await this.configService.getAgent(id)
  }

  /**
   * Get all agents from ConfigService
   */
  async getAllAgents(): Promise<AgentConfig[]> {
    try {
      return await this.configService.listAgents()
    } catch (error) {
      console.error('Error getting agents from ConfigService:', error)
      return []
    }
  }
}
