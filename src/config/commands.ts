/**
 * Centralized command configuration
 * 
 * SOLID: Single source of truth for command availability
 * DRY: Reusable command definitions
 * KISS: Simple configuration structure
 */

export interface CommandConfig {
  command: string
  isInteractiveOnly: boolean
  errorMessage?: string
  description?: string
}

/**
 * Slash commands configuration
 * Can be easily updated when Anthropic enables commands for programmatic use
 */
export const SLASH_COMMANDS: CommandConfig[] = [
  {
    command: '/clear',
    isInteractiveOnly: true,
    errorMessage: 'Use the trash can button to clear the session. /clear is only available in interactive mode.',
    description: 'Clears the conversation history'
  },
  {
    command: '/compact',
    isInteractiveOnly: true,
    errorMessage: '/compact is only available in interactive mode and cannot be triggered programmatically.',
    description: 'Compacts the conversation to reduce token usage'
  },
  // Add more commands here as needed
  // When Anthropic enables a command, just set isInteractiveOnly: false
]

/**
 * Hash commands configuration (#team, #broadcast, etc.)
 */
export const HASH_COMMANDS: CommandConfig[] = [
  {
    command: '#team',
    isInteractiveOnly: false,
    description: 'Execute team command'
  },
  {
    command: '#broadcast',
    isInteractiveOnly: false,
    description: 'Broadcast message to all agents'
  },
  {
    command: '#spawn',
    isInteractiveOnly: false,
    description: 'Spawn a new agent'
  },
]

/**
 * Check if a slash command is interactive-only
 */
export function isInteractiveOnlyCommand(command: string): boolean {
  const cmd = SLASH_COMMANDS.find(c => c.command === command.toLowerCase())
  return cmd?.isInteractiveOnly ?? false
}

/**
 * Get error message for interactive-only command
 */
export function getCommandErrorMessage(command: string): string | undefined {
  const cmd = SLASH_COMMANDS.find(c => c.command === command.toLowerCase())
  return cmd?.errorMessage
}