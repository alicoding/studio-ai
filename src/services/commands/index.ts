/**
 * Command System Entry Point
 * 
 * SOLID: Single Responsibility - Only handles command registration
 * DRY: Centralized command imports and registration
 * Library First: Uses registry pattern for extensibility
 */

import { CommandRegistry } from './CommandRegistry'
import { TeamCommand } from './TeamCommand'
import { BroadcastCommand } from './BroadcastCommand'
import { SpawnCommand } from './SpawnCommand'
import { InterruptCommand } from './InterruptCommand'
import { HelpCommand } from './HelpCommand'
import { ClearCommand } from './ClearCommand'
import { CleanupCommand } from './CleanupCommand'

export { CommandRegistry } from './CommandRegistry'
export type { CommandHandler, CommandContext, CommandResult } from './types'

/**
 * Initialize and register all available commands
 */
export function initializeCommands(): CommandRegistry {
  const registry = CommandRegistry.getInstance()

  // Register all commands
  registry.register('#team', new TeamCommand())
  registry.register('#broadcast', new BroadcastCommand())
  registry.register('#spawn', new SpawnCommand())
  registry.register('#interrupt', new InterruptCommand())
  registry.register('#help', new HelpCommand())
  registry.register('#clear', new ClearCommand())
  registry.register('#cleanup', new CleanupCommand())

  return registry
}