/**
 * CleanupCommand - Clean up legacy agents and respawn with readable names
 *
 * SOLID: Single Responsibility - Only handles agent cleanup/respawn
 * KISS: Simple cleanup workflow
 */

import type { CommandHandler, CommandContext, CommandResult } from './types'

// Extract Agent type from CommandContext for local use
type Agent = CommandContext['agents'][0]

export class CleanupCommand implements CommandHandler {
  name = '#cleanup'
  description = 'Remove legacy agents and recreate with readable names'
  usage = '#cleanup [confirm]'

  async execute(args: string, context: CommandContext): Promise<CommandResult> {
    const confirm = args.trim().toLowerCase()

    // Find legacy agents (those with long IDs)
    const legacyAgents = context.agents.filter((a) => !a.id.match(/^[a-z]+\d+$/))

    if (legacyAgents.length === 0) {
      return {
        type: 'message',
        content: '✅ **No legacy agents found!** All agents already have readable names.',
      }
    }

    if (confirm !== 'yes') {
      let message = `⚠️ **Found ${legacyAgents.length} legacy agents:**\n\n`

      legacyAgents.forEach((agent) => {
        message += `• ${agent.name || agent.role} (${agent.status})\n`
      })

      message += `\n**This will:**\n`
      message += `• Delete all legacy agents\n`
      message += `• Recreate them with readable names (dev1, ux1, etc.)\n`
      message += `• **⚠️ All agent chat history will be lost**\n\n`
      message += `**To proceed:** \`#cleanup yes\``

      return {
        type: 'message',
        content: message,
      }
    }

    return {
      type: 'action',
      content: `🧹 **Cleaning up ${legacyAgents.length} legacy agents...**`,
      action: async () => {
        try {
          // Group agents by role for recreation
          const roleGroups: Record<string, Agent[]> = {}
          legacyAgents.forEach((agent) => {
            if (!roleGroups[agent.role]) {
              roleGroups[agent.role] = []
            }
            roleGroups[agent.role].push(agent)
          })

          // Delete legacy agents
          for (const agent of legacyAgents) {
            await fetch(`/api/agents/${agent.id}`, {
              method: 'DELETE',
            })
          }

          // Wait a moment for cleanup
          await new Promise((resolve) => setTimeout(resolve, 1000))

          // Recreate agents with readable names
          for (const [role, agents] of Object.entries(roleGroups)) {
            for (let i = 0; i < agents.length; i++) {
              const agentNumber = i + 1
              const readableId = `${role}${agentNumber}`

              // Create agent config
              const response = await fetch('/api/agents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: readableId,
                  name: `${role.charAt(0).toUpperCase() + role.slice(1)} ${agentNumber}`,
                  role: role,
                  systemPrompt: `You are a ${role} agent.`,
                  tools: ['read', 'write', 'bash'],
                  model: 'claude-3-opus',
                  maxTokens: 200000,
                }),
              })

              if (response.ok) {
                // Spawn the agent
                await fetch(`/api/agents/${readableId}/spawn`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    projectId: context.projectId,
                    config: {
                      role: role,
                      name: `${role.charAt(0).toUpperCase() + role.slice(1)} ${agentNumber}`,
                    },
                  }),
                })
              }
            }
          }

          console.log(
            `Cleanup complete: ${legacyAgents.length} agents recreated with readable names`
          )
        } catch (error) {
          console.error('Error during cleanup:', error)
          throw error
        }
      },
    }
  }
}
