/**
 * Tool Types - Type-safe definitions for all Claude tools
 * 
 * SOLID: Single Responsibility - Each interface for specific tool
 * DRY: Shared base types
 * KISS: Simple, clear interfaces
 * Library-First: Compatible with Claude's tool system
 */

// Base types
export interface BaseToolInput {
  [key: string]: unknown
}

export interface ToolResult<T = unknown> {
  success?: boolean
  data?: T
  error?: string
  text?: string
  type?: string
}

// Bash tool
export interface BashToolInput extends BaseToolInput {
  command: string
  description?: string
  timeout?: number
}

// File operations
export interface ReadToolInput extends BaseToolInput {
  file_path: string
  offset?: number
  limit?: number
}

export interface WriteToolInput extends BaseToolInput {
  file_path: string
  content: string
}

export interface EditToolInput extends BaseToolInput {
  file_path: string
  old_string: string
  new_string: string
  replace_all?: boolean
}

// Directory operations
export interface LSToolInput extends BaseToolInput {
  path: string
  ignore?: string[]
}

// Search operations
export interface GlobToolInput extends BaseToolInput {
  pattern: string
  path?: string
}

export interface GrepToolInput extends BaseToolInput {
  pattern: string
  path?: string
  include?: string
}

// Task management
export interface TaskToolInput extends BaseToolInput {
  description: string
  prompt: string
}

// Todo management
export interface TodoItem {
  content: string
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'high' | 'medium' | 'low'
  id: string
}

export interface TodoWriteInput extends BaseToolInput {
  todos: TodoItem[]
}

// Web operations
export interface WebFetchInput extends BaseToolInput {
  url: string
  prompt?: string
}

export interface WebSearchInput extends BaseToolInput {
  query: string
  allowed_domains?: string[]
  blocked_domains?: string[]
}

// Type guards
export function isBashInput(input: BaseToolInput): input is BashToolInput {
  return 'command' in input && typeof input.command === 'string'
}

export function isReadInput(input: BaseToolInput): input is ReadToolInput {
  return 'file_path' in input && typeof input.file_path === 'string'
}

export function isTodoWriteInput(input: BaseToolInput): input is TodoWriteInput {
  return 'todos' in input && Array.isArray(input.todos)
}

export function isWebFetchInput(input: BaseToolInput): input is WebFetchInput {
  return 'url' in input && typeof input.url === 'string'
}

export function isWebSearchInput(input: BaseToolInput): input is WebSearchInput {
  return 'query' in input && typeof input.query === 'string'
}

// Tool name to input type mapping
export type ToolInputMap = {
  Bash: BashToolInput
  Read: ReadToolInput
  Write: WriteToolInput
  Edit: EditToolInput
  LS: LSToolInput
  Glob: GlobToolInput
  Grep: GrepToolInput
  Task: TaskToolInput
  TodoWrite: TodoWriteInput
  TodoRead: BaseToolInput
  WebFetch: WebFetchInput
  WebSearch: WebSearchInput
}

// Helper type to get input type by tool name
export type ToolInputType<T extends keyof ToolInputMap> = ToolInputMap[T]