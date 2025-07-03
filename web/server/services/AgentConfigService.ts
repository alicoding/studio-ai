import { ConfigService } from '../../../src/services/ConfigService.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface LegacyAgentConfig {
  id: string
  name: string
  role: string
  systemPrompt: string
  tools: string[]
  model: string
  createdAt: string
  updatedAt: string
  usedInProjects: string[]
}

/**
 * Service that reads agent configurations from both ConfigService and legacy data directory
 * This provides backward compatibility with existing agent configurations
 */
export class AgentConfigService {
  private static instance: AgentConfigService
  private configService: ConfigService
  private legacyConfigPath: string

  private constructor() {
    this.configService = ConfigService.getInstance()
    // Path to legacy configurations
    this.legacyConfigPath = path.join(__dirname, '../../../data/agents/configurations.json')
  }

  static getInstance(): AgentConfigService {
    if (!AgentConfigService.instance) {
      AgentConfigService.instance = new AgentConfigService()
    }
    return AgentConfigService.instance
  }

  /**
   * Get agent by ID, checking both ConfigService and legacy storage
   */
  async getAgent(id: string): Promise<any> {
    // First try ConfigService
    const agent = await this.configService.getAgent(id)
    if (agent) {
      return agent
    }

    // Fallback to legacy storage
    try {
      const data = await fs.readFile(this.legacyConfigPath, 'utf-8')
      const configs: LegacyAgentConfig[] = JSON.parse(data)
      const legacyAgent = configs.find(c => c.id === id)
      
      if (legacyAgent) {
        // Convert to ConfigService format
        return {
          id: legacyAgent.id,
          name: legacyAgent.name,
          role: legacyAgent.role,
          model: legacyAgent.model,
          systemPrompt: legacyAgent.systemPrompt,
          tools: legacyAgent.tools,
          maxTokens: 200000, // Default
          temperature: 0.7, // Default
          created: legacyAgent.createdAt,
        }
      }
    } catch (error) {
      console.error('Error reading legacy agent configs:', error)
    }

    return null
  }

  /**
   * Get all agents from both sources
   */
  async getAllAgents(): Promise<any[]> {
    const agents: any[] = []
    const seenIds = new Set<string>()

    // Get from ConfigService
    try {
      const configAgents = await this.configService.getAllAgents()
      for (const agent of configAgents) {
        agents.push(agent)
        seenIds.add(agent.id)
      }
    } catch (error) {
      console.error('Error getting agents from ConfigService:', error)
    }

    // Get from legacy storage
    try {
      const data = await fs.readFile(this.legacyConfigPath, 'utf-8')
      const legacyConfigs: LegacyAgentConfig[] = JSON.parse(data)
      
      for (const legacyAgent of legacyConfigs) {
        if (!seenIds.has(legacyAgent.id)) {
          agents.push({
            id: legacyAgent.id,
            name: legacyAgent.name,
            role: legacyAgent.role,
            model: legacyAgent.model,
            systemPrompt: legacyAgent.systemPrompt,
            tools: legacyAgent.tools,
            maxTokens: 200000,
            temperature: 0.7,
            created: legacyAgent.createdAt,
          })
        }
      }
    } catch (error) {
      console.error('Error reading legacy agent configs:', error)
    }

    return agents
  }
}