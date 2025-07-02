/**
 * Hook System Types - Multi-tier hook architecture
 *
 * SOLID: Clear interfaces for different hook levels
 * DRY: Shared base types with extensions
 */

// Base hook event types from Claude Code
export type ClaudeCodeEvent = 'PreToolUse' | 'PostToolUse' | 'Notification' | 'Stop'

// Studio-specific events for multi-agent coordination
export type StudioEvent =
  | 'AgentMessage' // When agents communicate
  | 'TypeCheckFailed' // Real-time type errors
  | 'LintError' // Real-time lint errors
  | 'FileConflict' // Multiple agents editing same file
  | 'ToolValidation' // Validate tool usage
  | 'SessionCompaction' // When session needs compaction
  | 'AgentHandoff' // When switching between agents

// All possible hook events
export type HookEvent = ClaudeCodeEvent | StudioEvent

// Hook scopes for multi-tier system
export type HookScope = 'studio' | 'project' | 'system'

// Base hook configuration
export interface BaseHook {
  id: string
  event: HookEvent
  matcher?: string // Tool/pattern matcher
  scope: HookScope
  enabled: boolean
  description?: string
  source?: string // Where this hook comes from (e.g., 'Studio Intelligence')
}

// Command hook - executes shell command
export interface CommandHook extends BaseHook {
  type: 'command'
  command: string
  timeout?: number // Command timeout in ms
}

// Validation hook - prevents action if validation fails
export interface ValidationHook extends BaseHook {
  type: 'validation'
  validator: string // Name of built-in validator
  config?: Record<string, any> // Validator configuration
}

// Notification hook - sends notifications
export interface NotificationHook extends BaseHook {
  type: 'notification'
  channel: 'desktop' | 'console' | 'file'
  template: string
}

// Studio internal hook - triggers studio actions
export interface StudioHook extends BaseHook {
  type: 'studio'
  action: 'type-check' | 'lint' | 'format' | 'test' | 'agent-handoff'
  config?: Record<string, any>
}

export type Hook = CommandHook | ValidationHook | NotificationHook | StudioHook

// Hook execution context
export interface HookContext {
  event: HookEvent
  tool?: string
  agentId?: string
  projectId?: string
  sessionId?: string
  data: Record<string, any>
}

// Hook execution result
export interface HookResult {
  success: boolean
  output?: string
  error?: string
  shouldContinue: boolean // For validation hooks
  metadata?: Record<string, any>
}

// Built-in validators for common cases
export const BUILT_IN_VALIDATORS = {
  'file-exists': 'Verify file exists before reading',
  'command-exists': 'Check if command is available',
  'no-rm-rf': 'Prevent dangerous rm -rf commands',
  'no-force-push': 'Prevent git force push',
  'type-check-clean': 'Ensure no TypeScript errors',
  'lint-clean': 'Ensure no lint errors',
  'test-pass': 'Ensure tests pass',
  'no-secrets': 'Prevent committing secrets',
  'max-file-size': 'Limit file size for operations',
  'allowed-tools': 'Restrict tool usage',
} as const

// Studio-specific actions
export const STUDIO_ACTIONS = {
  'type-check': {
    description: 'Run TypeScript type checking',
    configSchema: { fix: 'boolean' },
  },
  lint: {
    description: 'Run linter',
    configSchema: { fix: 'boolean' },
  },
  format: {
    description: 'Format code',
    configSchema: { tool: 'prettier|eslint' },
  },
  test: {
    description: 'Run tests',
    configSchema: { pattern: 'string (optional)' },
  },
  'agent-handoff': {
    description: 'Hand off task to specialized agent',
    configSchema: { targetRole: 'string', reason: 'string' },
  },
} as const
