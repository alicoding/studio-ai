/**
 * SpawnCommand - Spawn new agents
 * 
 * SOLID: Single Responsibility - Only handles agent spawning
 * DRY: Reuses role configuration logic
 */

import type { CommandHandler, CommandContext, CommandResult } from './types'

export class SpawnCommand implements CommandHandler {
  name = '#spawn'
  description = 'Add a new agent with specified role'
  usage = '#spawn [role]'

  private roleConfigs = {
    dev: {
      systemPrompt: 'You are a software developer agent focused on implementing features and fixing bugs.',
      tools: ['read', 'write', 'bash'],
    },
    ux: {
      systemPrompt: 'You are a UX/UI designer agent focused on user experience and interface design.',
      tools: ['read', 'write'],
    },
    test: {
      systemPrompt: 'You are a QA engineer agent focused on testing and quality assurance.',
      tools: ['read', 'bash'],
    },
    pm: {
      systemPrompt: 'You are a project manager agent focused on coordination and planning.',
      tools: ['read'],
    },
    devops: {
      systemPrompt: 'You are a DevOps engineer agent focused on deployment and infrastructure.',
      tools: ['read', 'write', 'bash'],
    },
    security: {
      systemPrompt: 'You are a security engineer agent focused on security audits and vulnerability assessment.',
      tools: ['read', 'bash'],
    },
  }

  async execute(args: string, context: CommandContext): Promise<CommandResult> {
    const role = args.trim().toLowerCase()
    
    if (!role) {
      return {
        type: 'error',
        content: 'Please specify a role. Usage: #spawn [role]',
      }
    }

    // Find the next available number for this role
    const existingAgentsWithRole = context.agents.filter(a => a.role === role)
    const nextNumber = existingAgentsWithRole.length + 1
    
    // Generate readable agent ID: role + number (e.g., dev1, dev2, ux1)
    const readableAgentId = `${role}${nextNumber}`
    
    // Check if this exact ID already exists (shouldn't happen, but safety check)
    const existingWithId = context.agents.find(a => a.id === readableAgentId)
    if (existingWithId) {
      return {
        type: 'error',
        content: `Agent @${readableAgentId} already exists. Try a different role or wait for agent cleanup.`,
      }
    }

    return {
      type: 'action',
      content: `🚀 **Spawning ${role} agent...**`,
      action: async () => {
        try {
          // Use the readable agent ID
          const agentId = readableAgentId
          
          // Get role configuration or use defaults
          const roleConfig = this.roleConfigs[role as keyof typeof this.roleConfigs] || {
            systemPrompt: `You are a ${role} agent.`,
            tools: ['read', 'write'],
          }

          const config = {
            role,
            name: `${role.charAt(0).toUpperCase() + role.slice(1)} ${nextNumber}`,
            model: 'claude-3-opus',
            maxTokens: 200000,
            ...roleConfig,
          }

          // Create agent configuration first
          const createResponse = await fetch('/api/agents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: agentId,
              ...config,
            }),
          })

          if (!createResponse.ok) {
            throw new Error(`Failed to create agent config: ${createResponse.statusText}`)
          }

          // Then spawn the agent
          const spawnResponse = await fetch(`/api/agents/${agentId}/spawn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: context.projectId,
              config,
            }),
          })

          if (!spawnResponse.ok) {
            throw new Error(`Failed to spawn agent: ${spawnResponse.statusText}`)
          }

          console.log(`Successfully spawned ${role} agent with ID ${agentId}`)
        } catch (error) {
          console.error('Error spawning agent:', error)
          throw error
        }
      },
    }
  }
}