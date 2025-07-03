/**
 * InterruptCommand - Interrupt agent execution
 * 
 * SOLID: Single Responsibility - Only handles interruption
 * KISS: Simple abort API call
 */

import type { CommandHandler, CommandContext, CommandResult } from './types'

export class InterruptCommand implements CommandHandler {
  name = '#interrupt'
  description = 'Interrupt agent for priority change'
  usage = '#interrupt @agent'

  async execute(args: string, context: CommandContext): Promise<CommandResult> {
    const agentMention = args.trim()
    
    if (!agentMention || !agentMention.startsWith('@')) {
      return {
        type: 'error',
        content: 'Please specify an agent. Usage: #interrupt @agent',
      }
    }

    const agentId = agentMention.substring(1)
    const agent = context.agents.find((a) => a.id === agentId)

    if (!agent) {
      return {
        type: 'error',
        content: `Agent @${agentId} not found in this project`,
      }
    }

    if (agent.status === 'offline') {
      return {
        type: 'error',
        content: `Cannot interrupt @${agentId} - agent is offline`,
      }
    }

    if (agent.status !== 'busy') {
      return {
        type: 'message',
        content: `⚡ Agent @${agentId} is not busy, no need to interrupt`,
      }
    }

    return {
      type: 'action',
      content: `⚡ **Interrupting @${agentId}...**`,
      action: async () => {
        try {
          const response = await fetch('/api/messages/abort', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: context.projectId,
              agentId: agentId,
            }),
          })

          if (!response.ok) {
            throw new Error(`Failed to interrupt agent: ${response.statusText}`)
          }

          console.log(`Successfully interrupted agent ${agentId}`)
        } catch (error) {
          console.error('Error interrupting agent:', error)
          throw error
        }
      },
    }
  }
}