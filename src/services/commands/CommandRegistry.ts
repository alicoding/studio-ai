/**
 * CommandRegistry - SOLID Command Registration System
 * 
 * SOLID: Open/Closed - New commands can be added without modifying existing code
 * DRY: Centralized command registration and execution
 * KISS: Simple interface for command management
 * Library First: Uses Map for efficient command lookup
 */

import type { CommandHandler, CommandContext, CommandResult } from './types'

export class CommandRegistry {
  private static instance: CommandRegistry
  private commands: Map<string, CommandHandler> = new Map()

  private constructor() {}

  static getInstance(): CommandRegistry {
    if (!CommandRegistry.instance) {
      CommandRegistry.instance = new CommandRegistry()
    }
    return CommandRegistry.instance
  }

  /**
   * Register a command handler
   */
  register(name: string, handler: CommandHandler): void {
    if (this.commands.has(name)) {
      console.warn(`Command ${name} is already registered, overwriting...`)
    }
    this.commands.set(name.toLowerCase(), handler)
  }

  /**
   * Execute a command
   */
  async execute(commandLine: string, context: CommandContext): Promise<CommandResult> {
    const [commandName, ...args] = commandLine.split(' ')
    const normalizedName = commandName.toLowerCase()

    const handler = this.commands.get(normalizedName)
    if (!handler) {
      return {
        type: 'error',
        content: `Unknown command: ${commandName}. Type #help for available commands.`,
      }
    }

    try {
      return await handler.execute(args.join(' '), context)
    } catch (error) {
      console.error(`Error executing command ${commandName}:`, error)
      return {
        type: 'error',
        content: `Command failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Get all registered commands
   */
  getCommands(): Map<string, CommandHandler> {
    return new Map(this.commands)
  }

  /**
   * Check if a command exists
   */
  hasCommand(name: string): boolean {
    return this.commands.has(name.toLowerCase())
  }
}