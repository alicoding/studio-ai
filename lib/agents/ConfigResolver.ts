// SOLID: Open/Closed - Easy to extend with new resolution strategies
// DRY: Centralized configuration logic

import { AgentConfig } from './AgentManager'

export class ConfigResolver {
  // Default configurations by role
  private static readonly DEFAULT_CONFIGS: Record<string, Partial<AgentConfig>> = {
    dev: {
      systemPrompt: 'You are a senior full-stack developer focused on clean, maintainable code.',
      tools: ['file_system', 'terminal', 'web_search'],
      model: 'claude-3-opus',
    },
    ux: {
      systemPrompt: 'You are a UX/UI designer focused on user experience and visual design.',
      tools: ['file_system', 'web_search'],
      model: 'claude-3-opus',
    },
    test: {
      systemPrompt: 'You are a QA engineer focused on testing and quality assurance.',
      tools: ['file_system', 'terminal'],
      model: 'claude-3-opus',
    },
    pm: {
      systemPrompt: 'You are a project manager focused on planning and coordination.',
      tools: ['file_system', 'web_search'],
      model: 'claude-3-opus',
    },
    default: {
      systemPrompt: 'You are a helpful AI assistant.',
      tools: ['file_system', 'terminal', 'web_search'],
      model: 'claude-3-opus',
    }
  }

  // Resolve configuration for an agent
  public static resolve(agent: {
    id: string
    name: string
    role: string
  }, existingConfig?: AgentConfig): AgentConfig {
    // If config exists, return it
    if (existingConfig) {
      return existingConfig
    }

    // Get defaults for role
    const roleDefaults = this.DEFAULT_CONFIGS[agent.role] || this.DEFAULT_CONFIGS.default

    // Build config
    return {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      systemPrompt: roleDefaults.systemPrompt!,
      tools: roleDefaults.tools!,
      model: roleDefaults.model!,
    }
  }

  // Extract role from agent name or session data
  public static inferRole(agentName: string, sessionPath?: string): string {
    const nameLower = agentName.toLowerCase()
    
    // Check common patterns
    if (nameLower.includes('dev') || nameLower.includes('developer')) return 'dev'
    if (nameLower.includes('ux') || nameLower.includes('design')) return 'ux'
    if (nameLower.includes('test') || nameLower.includes('qa')) return 'test'
    if (nameLower.includes('pm') || nameLower.includes('project')) return 'pm'
    
    // Check session path patterns
    if (sessionPath) {
      if (sessionPath.includes('/dev/') || sessionPath.includes('_dev_')) return 'dev'
      if (sessionPath.includes('/ux/') || sessionPath.includes('_ux_')) return 'ux'
      if (sessionPath.includes('/test/') || sessionPath.includes('_test_')) return 'test'
      if (sessionPath.includes('/pm/') || sessionPath.includes('_pm_')) return 'pm'
    }
    
    return 'dev' // Default to dev role
  }
}