/**
 * ClearCommand - Clear conversation
 * 
 * SOLID: Single Responsibility - Only handles clearing
 * KISS: Simple action that UI will handle
 */

import type { CommandHandler, CommandContext, CommandResult } from './types'

export class ClearCommand implements CommandHandler {
  name = '#clear'
  description = 'Clear the conversation'
  usage = '#clear [history|session|all]'

  async execute(args: string, context: CommandContext): Promise<CommandResult> {
    // Check if user provided specific parameters for clearing
    const options = args.trim().toLowerCase()
    
    let clearType = 'all'
    if (options === 'history') {
      clearType = 'history'
    } else if (options === 'session') {
      clearType = 'session'
    }

    return {
      type: 'message',
      content: `🧹 **Conversation cleared** (${clearType})`,
      action: () => {
        // Emit clear event that UI can listen to
        const event = new CustomEvent('chat:clear', {
          detail: { 
            sessionId: context.sessionId,
            clearType: clearType
          }
        })
        window.dispatchEvent(event)
      },
    }
  }
}