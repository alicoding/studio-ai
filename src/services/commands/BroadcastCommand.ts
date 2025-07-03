/**
 * BroadcastCommand - Send message to all agents
 * 
 * SOLID: Single Responsibility - Only handles broadcasting
 * Library First: Uses fetch API for communication
 */

import type { CommandHandler, CommandContext, CommandResult } from './types'

export class BroadcastCommand implements CommandHandler {
  name = '#broadcast'
  description = 'Send message to all agents in the project'
  usage = '#broadcast [message]'

  async execute(args: string, context: CommandContext): Promise<CommandResult> {
    const message = args.trim()
    
    if (!message) {
      return {
        type: 'error',
        content: 'Broadcast message cannot be empty. Usage: #broadcast [message]',
      }
    }

    const recipientCount = context.agents.filter((a) => a.id !== context.selectedAgentId).length

    return {
      type: 'message',
      content: `📢 **Broadcasting to ${recipientCount} agents:** ${message}`,
      action: async () => {
        try {
          // Send @all mention which will be routed to all agents
          const response = await fetch('/api/messages/mention', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `@all ${message}`,
              fromAgentId: context.selectedAgentId || 'system',
              projectId: context.projectId,
            }),
          })

          if (!response.ok) {
            throw new Error(`Failed to broadcast: ${response.statusText}`)
          }

          const result = await response.json()
          console.log(`Broadcast sent to ${result.targets.length} agents`)
        } catch (error) {
          console.error('Error broadcasting message:', error)
          throw error
        }
      },
    }
  }
}