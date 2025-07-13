/**
 * Command System Types - SOLID Type Definitions
 * 
 * SOLID: Interface Segregation - Small, focused interfaces
 * DRY: Shared types across all command implementations
 */

interface Agent {
  id: string
  name: string
  role: string
  status: string
  currentTask?: string
}

export interface CommandContext {
  sessionId: string
  projectId: string
  agents: Agent[]
  selectedAgentId?: string
}

export interface CommandResult {
  type: 'message' | 'action' | 'error'
  content: string
  action?: () => void | Promise<void>
  metadata?: Record<string, unknown>
}

export interface CommandHandler {
  name: string
  description: string
  usage: string
  execute(args: string, context: CommandContext): Promise<CommandResult>
}