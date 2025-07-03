/**
 * HelpCommand - Show available commands
 * 
 * SOLID: Single Responsibility - Only handles help display
 * DRY: Dynamically generates help from registry
 */

import type { CommandHandler, CommandContext, CommandResult } from './types'
import { CommandRegistry } from './CommandRegistry'

export class HelpCommand implements CommandHandler {
  name = '#help'
  description = 'Show available commands'
  usage = '#help [command]'

  async execute(args: string, context: CommandContext): Promise<CommandResult> {
    const registry = CommandRegistry.getInstance()
    const commands = registry.getCommands()
    
    // Check if user wants help for a specific command
    const specificCommand = args.trim().toLowerCase()
    if (specificCommand) {
      const command = commands.get(`#${specificCommand}`) || commands.get(specificCommand)
      if (command) {
        return {
          type: 'message',
          content: `📖 **${command.name}**\n\n${command.description}\n\n**Usage:** ${command.usage}`,
        }
      } else {
        return {
          type: 'error',
          content: `Command '${specificCommand}' not found. Use #help to see all commands.`,
        }
      }
    }

    let helpMessage = `📖 **Available Commands**\n\n`

    // Group commands by category
    const teamCommands: CommandHandler[] = []
    const commCommands: CommandHandler[] = []
    const utilCommands: CommandHandler[] = []

    commands.forEach(cmd => {
      if (cmd.name === '#team' || cmd.name === '#spawn' || cmd.name === '#interrupt') {
        teamCommands.push(cmd)
      } else if (cmd.name === '#broadcast' || cmd.name.includes('@')) {
        commCommands.push(cmd)
      } else {
        utilCommands.push(cmd)
      }
    })

    if (teamCommands.length > 0) {
      helpMessage += `**Team Management:**\n`
      teamCommands.forEach(cmd => {
        helpMessage += `• **${cmd.name}** - ${cmd.description}\n`
      })
      helpMessage += '\n'
    }

    if (commCommands.length > 0) {
      helpMessage += `**Communication:**\n`
      helpMessage += `• **@agent** [message] - Send a message to specific agent\n`
      commCommands.forEach(cmd => {
        if (!cmd.name.includes('@')) {
          helpMessage += `• **${cmd.name}** - ${cmd.description}\n`
        }
      })
      helpMessage += '\n'
    }

    if (utilCommands.length > 0) {
      helpMessage += `**Utilities:**\n`
      utilCommands.forEach(cmd => {
        helpMessage += `• **${cmd.name}** - ${cmd.description}\n`
      })
    }

    helpMessage += `\n**Tip:** Use \`#help [command]\` for detailed info about a specific command.`
    
    // Show agent count from context
    helpMessage += `\n\n**Current Project:** ${context.agents.length} agents available`

    return {
      type: 'message',
      content: helpMessage,
    }
  }
}