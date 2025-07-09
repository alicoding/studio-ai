/**
 * Tool Permission System Types
 *
 * SOLID: Single responsibility - Only tool permission types
 * DRY: Reusable interfaces for tool permissions
 * Type Safety: No 'any' types, proper TypeScript interfaces
 */

export interface ToolRestrictions {
  // File system tools
  paths?: string[] // Allowed paths for read/write operations
  excludePaths?: string[] // Excluded paths
  readOnly?: boolean // For file operations

  // Bash tool
  commands?: string[] // Allowed commands (whitelist)
  blockedCommands?: string[] // Blocked commands (blacklist)
  sudo?: boolean // Allow sudo commands

  // Web tools
  domains?: string[] // Allowed domains for web operations
  blockedDomains?: string[] // Blocked domains

  // MCP tools
  servers?: string[] // Allowed MCP servers
  operations?: string[] // Allowed MCP operations
}

export interface ToolMetadata {
  description?: string // Why this permission exists
  addedBy?: string // Who added this permission
  addedAt?: string // When it was added
}

export interface ToolPermission {
  name: string // Tool identifier (e.g., 'bash', 'read')
  enabled: boolean // Whether tool is available
  restrictions?: ToolRestrictions
  metadata?: ToolMetadata
}

export enum ToolCategory {
  FILE_SYSTEM = 'file_system', // read, write, edit, multiedit
  SEARCH = 'search', // grep, glob, ls, semantic_search
  EXECUTION = 'execution', // bash, notebook operations
  WEB = 'web', // webfetch, websearch
  PLANNING = 'planning', // todoread, todowrite, exit_plan_mode
  MCP = 'mcp', // All MCP tools
  COLLABORATION = 'collaboration', // agent tool, messaging
}

export interface CategoryPermissions {
  category: ToolCategory
  enabled: boolean
  tools?: ToolPermission[]
}

export interface PermissionPreset {
  name: string
  description: string
  categories: Record<ToolCategory, Partial<CategoryPermissions>>
}

// Tool to category mapping
export const TOOL_CATEGORIES: Record<string, ToolCategory> = {
  // File system
  read: ToolCategory.FILE_SYSTEM,
  write: ToolCategory.FILE_SYSTEM,
  edit: ToolCategory.FILE_SYSTEM,
  multiedit: ToolCategory.FILE_SYSTEM,

  // Search
  grep: ToolCategory.SEARCH,
  glob: ToolCategory.SEARCH,
  ls: ToolCategory.SEARCH,
  semantic_search: ToolCategory.SEARCH,

  // Execution
  bash: ToolCategory.EXECUTION,
  notebookread: ToolCategory.EXECUTION,
  notebookedit: ToolCategory.EXECUTION,

  // Web
  webfetch: ToolCategory.WEB,
  websearch: ToolCategory.WEB,

  // Planning
  todoread: ToolCategory.PLANNING,
  todowrite: ToolCategory.PLANNING,
  exit_plan_mode: ToolCategory.PLANNING,

  // Collaboration
  agent: ToolCategory.COLLABORATION,

  // MCP tools (pattern matching)
  ListMcpResourcesTool: ToolCategory.MCP,
  ReadMcpResourceTool: ToolCategory.MCP,
}

// Helper function to categorize tools
export function getToolCategory(toolName: string): ToolCategory {
  // Direct mapping
  if (TOOL_CATEGORIES[toolName]) {
    return TOOL_CATEGORIES[toolName]
  }

  // Pattern matching for MCP tools
  if (toolName.startsWith('mcp__')) {
    return ToolCategory.MCP
  }

  // Default to collaboration for unknown tools
  return ToolCategory.COLLABORATION
}

// Permission presets for common agent roles
export const PERMISSION_PRESETS: Record<string, PermissionPreset> = {
  read_only: {
    name: 'Read Only',
    description: 'Can only read files and search, no modifications allowed',
    categories: {
      [ToolCategory.FILE_SYSTEM]: {
        enabled: true,
        tools: [{ name: 'read', enabled: true, restrictions: { readOnly: true } }],
      },
      [ToolCategory.SEARCH]: { enabled: true },
      [ToolCategory.EXECUTION]: { enabled: false },
      [ToolCategory.WEB]: { enabled: true },
      [ToolCategory.PLANNING]: {
        enabled: true,
        tools: [
          { name: 'todoread', enabled: true },
          { name: 'todowrite', enabled: false },
        ],
      },
      [ToolCategory.MCP]: { enabled: false },
      [ToolCategory.COLLABORATION]: { enabled: false },
    },
  },

  developer: {
    name: 'Developer',
    description: 'Full development capabilities with safety restrictions',
    categories: {
      [ToolCategory.FILE_SYSTEM]: {
        enabled: true,
        tools: [
          {
            name: 'write',
            enabled: true,
            restrictions: {
              excludePaths: ['/etc', '/sys', '~/.ssh', '*.env', '**/.git'],
            },
          },
        ],
      },
      [ToolCategory.SEARCH]: { enabled: true },
      [ToolCategory.EXECUTION]: {
        enabled: true,
        tools: [
          {
            name: 'bash',
            enabled: true,
            restrictions: {
              blockedCommands: ['rm -rf /', 'sudo', 'shutdown', 'reboot'],
              sudo: false,
            },
          },
        ],
      },
      [ToolCategory.WEB]: { enabled: true },
      [ToolCategory.PLANNING]: { enabled: true },
      [ToolCategory.MCP]: {
        enabled: true,
        tools: [
          {
            name: 'mcp__*',
            enabled: true,
            restrictions: {
              operations: ['read', 'list', 'get'],
            },
          },
        ],
      },
      [ToolCategory.COLLABORATION]: { enabled: true },
    },
  },

  architect: {
    name: 'Architect',
    description: 'Focus on design and documentation with limited execution',
    categories: {
      [ToolCategory.FILE_SYSTEM]: {
        enabled: true,
        tools: [
          {
            name: '*',
            enabled: true,
            restrictions: {
              paths: ['./docs', './architecture', './design', '*.md'],
            },
          },
        ],
      },
      [ToolCategory.SEARCH]: { enabled: true },
      [ToolCategory.EXECUTION]: { enabled: false },
      [ToolCategory.WEB]: { enabled: true },
      [ToolCategory.PLANNING]: { enabled: true },
      [ToolCategory.MCP]: { enabled: true },
      [ToolCategory.COLLABORATION]: { enabled: true },
    },
  },

  devops: {
    name: 'DevOps Engineer',
    description: 'Infrastructure and deployment capabilities',
    categories: {
      [ToolCategory.FILE_SYSTEM]: { enabled: true },
      [ToolCategory.SEARCH]: { enabled: true },
      [ToolCategory.EXECUTION]: {
        enabled: true,
        tools: [
          {
            name: 'bash',
            enabled: true,
            restrictions: {
              sudo: false,
              blockedCommands: ['rm -rf /', 'shutdown', 'reboot'],
            },
          },
        ],
      },
      [ToolCategory.WEB]: { enabled: true },
      [ToolCategory.PLANNING]: { enabled: true },
      [ToolCategory.MCP]: {
        enabled: true,
        tools: [
          {
            name: 'mcp__*',
            enabled: true,
            restrictions: {
              operations: ['*'], // Full MCP access
            },
          },
        ],
      },
      [ToolCategory.COLLABORATION]: { enabled: true },
    },
  },

  reviewer: {
    name: 'Code Reviewer',
    description: 'Read and analyze code without modification capabilities',
    categories: {
      [ToolCategory.FILE_SYSTEM]: {
        enabled: true,
        tools: [
          { name: 'read', enabled: true },
          { name: 'write', enabled: false },
          { name: 'edit', enabled: false },
        ],
      },
      [ToolCategory.SEARCH]: { enabled: true },
      [ToolCategory.EXECUTION]: {
        enabled: true,
        tools: [
          {
            name: 'bash',
            enabled: true,
            restrictions: {
              commands: ['git', 'npm test', 'npm run lint', 'grep', 'find'],
              sudo: false,
            },
          },
        ],
      },
      [ToolCategory.WEB]: { enabled: false },
      [ToolCategory.PLANNING]: {
        enabled: true,
        tools: [
          { name: 'todoread', enabled: true },
          { name: 'todowrite', enabled: true },
        ],
      },
      [ToolCategory.MCP]: { enabled: false },
      [ToolCategory.COLLABORATION]: { enabled: false },
    },
  },
}

// Convert simple tool array to permission objects
export function convertToolsToPermissions(tools: string[]): ToolPermission[] {
  return tools.map((tool) => ({
    name: tool,
    enabled: true,
  }))
}

// Apply preset to existing permissions
export function applyPreset(preset: PermissionPreset, existingTools?: string[]): ToolPermission[] {
  const permissions: ToolPermission[] = []

  // Convert preset categories to tool permissions
  Object.entries(preset.categories).forEach(([category, config]) => {
    if (!config.enabled) return

    // If specific tools are defined, use those
    if (config.tools) {
      permissions.push(...config.tools)
    } else {
      // Otherwise, enable all tools in the category
      Object.entries(TOOL_CATEGORIES).forEach(([toolName, toolCategory]) => {
        if (toolCategory === category) {
          permissions.push({ name: toolName, enabled: true })
        }
      })
    }
  })

  // If existing tools provided, merge them
  if (existingTools) {
    existingTools.forEach((tool) => {
      if (!permissions.find((p) => p.name === tool)) {
        permissions.push({ name: tool, enabled: true })
      }
    })
  }

  return permissions
}
