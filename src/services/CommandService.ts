/**
 * CommandService - SOLID Command Execution Service
 * 
 * SOLID: Single Responsibility - Only handles command delegation
 * DRY: Reuses CommandRegistry for all command logic
 * KISS: Simple facade over the command registry
 * Library First: Uses registry pattern for extensibility
 */

import { CommandRegistry, initializeCommands } from './commands'
import type { CommandContext, CommandResult } from './commands'

export { type CommandContext, type CommandResult } from './commands'

export class CommandService {
  private static instance: CommandService
  private registry: CommandRegistry

  private constructor() {
    this.registry = initializeCommands()
  }

  static getInstance(): CommandService {
    if (!CommandService.instance) {
      CommandService.instance = new CommandService()
    }
    return CommandService.instance
  }

  /**
   * Parse and execute command through registry
   */
  async executeCommand(message: string, context: CommandContext): Promise<CommandResult> {
    // Remove # prefix for registry lookup
    const normalizedMessage = message.startsWith('#') ? message : `#${message}`
    return await this.registry.execute(normalizedMessage, context)
  }

  /**
   * Get all available commands for UI display
   */
  getAvailableCommands() {
    return Array.from(this.registry.getCommands().values())
  }

  /**
   * Check if a command exists
   */
  hasCommand(name: string): boolean {
    return this.registry.hasCommand(name)
  }

  /**
   * Send command result as system message
   */
  async sendSystemMessage(sessionId: string, content: string): Promise<void> {
    await fetch('/api/messages/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        content,
        type: 'command-response',
      }),
    })
  }
}