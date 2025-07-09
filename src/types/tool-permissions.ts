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

// Tool to category mapping using patterns for dynamic tools from Claude SDK
export const TOOL_CATEGORY_PATTERNS: Array<{ pattern: RegExp; category: ToolCategory }> = [
  // File system tools
  { pattern: /^(Read|Write|Edit|MultiEdit)$/, category: ToolCategory.FILE_SYSTEM },

  // Search tools
  { pattern: /^(Grep|Glob|LS)$/, category: ToolCategory.SEARCH },

  // Execution tools
  { pattern: /^(Bash|NotebookRead|NotebookEdit|executeCode)$/, category: ToolCategory.EXECUTION },

  // Web tools
  { pattern: /^(WebFetch|WebSearch)$/, category: ToolCategory.WEB },

  // Planning tools
  { pattern: /^(TodoRead|TodoWrite|exit_plan_mode)$/, category: ToolCategory.PLANNING },

  // MCP tools (pattern matching)
  { pattern: /^(mcp__|ListMcpResourcesTool|ReadMcpResourceTool)/, category: ToolCategory.MCP },

  // Collaboration tools
  { pattern: /^(agent|messaging)/, category: ToolCategory.COLLABORATION },
]

// Helper function to categorize tools using pattern matching
export function getToolCategory(toolName: string): ToolCategory {
  // Check each pattern in order
  for (const { pattern, category } of TOOL_CATEGORY_PATTERNS) {
    if (pattern.test(toolName)) {
      return category
    }
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
      [ToolCategory.FILE_SYSTEM]: { enabled: true },
      [ToolCategory.SEARCH]: { enabled: true },
      [ToolCategory.EXECUTION]: { enabled: false },
      [ToolCategory.WEB]: { enabled: true },
      [ToolCategory.PLANNING]: { enabled: true },
      [ToolCategory.MCP]: { enabled: false },
      [ToolCategory.COLLABORATION]: { enabled: false },
    },
  },

  developer: {
    name: 'Developer',
    description: 'Full development capabilities with safety restrictions',
    categories: {
      [ToolCategory.FILE_SYSTEM]: { enabled: true },
      [ToolCategory.SEARCH]: { enabled: true },
      [ToolCategory.EXECUTION]: { enabled: true },
      [ToolCategory.WEB]: { enabled: true },
      [ToolCategory.PLANNING]: { enabled: true },
      [ToolCategory.MCP]: { enabled: true },
      [ToolCategory.COLLABORATION]: { enabled: true },
    },
  },

  architect: {
    name: 'Architect',
    description: 'Focus on design and documentation with limited execution',
    categories: {
      [ToolCategory.FILE_SYSTEM]: { enabled: true },
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
      [ToolCategory.EXECUTION]: { enabled: true },
      [ToolCategory.WEB]: { enabled: true },
      [ToolCategory.PLANNING]: { enabled: true },
      [ToolCategory.MCP]: { enabled: true },
      [ToolCategory.COLLABORATION]: { enabled: true },
    },
  },

  reviewer: {
    name: 'Code Reviewer',
    description: 'Read and analyze code without modification capabilities',
    categories: {
      [ToolCategory.FILE_SYSTEM]: { enabled: true },
      [ToolCategory.SEARCH]: { enabled: true },
      [ToolCategory.EXECUTION]: { enabled: true },
      [ToolCategory.WEB]: { enabled: false },
      [ToolCategory.PLANNING]: { enabled: true },
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
export function applyPreset(preset: PermissionPreset, availableTools?: string[]): ToolPermission[] {
  const permissions: ToolPermission[] = []

  // Convert preset categories to tool permissions
  Object.entries(preset.categories).forEach(([category, config]) => {
    if (!config.enabled) return

    // If specific tools are defined, use those
    if (config.tools) {
      permissions.push(...config.tools)
    } else if (availableTools) {
      // Otherwise, enable all tools in the category from available tools
      availableTools.forEach((toolName) => {
        if (getToolCategory(toolName) === category) {
          permissions.push({ name: toolName, enabled: true })
        }
      })
    }
  })

  // If available tools provided, ensure all tools are represented
  if (availableTools) {
    availableTools.forEach((tool) => {
      if (!permissions.find((p) => p.name === tool)) {
        // Add disabled by default if not in any enabled category
        permissions.push({ name: tool, enabled: false })
      }
    })
  }

  return permissions
}

// Detect which preset matches the current permissions
export function detectPreset(
  permissions: ToolPermission[],
  availableTools: string[]
): string | null {
  if (!permissions.length || !availableTools.length) return null

  // Check each preset to see if it matches the current permissions
  for (const [presetKey, preset] of Object.entries(PERMISSION_PRESETS)) {
    const presetPermissions = applyPreset(preset, availableTools)

    // Check if permissions match (same length and all tools have same enabled state)
    if (presetPermissions.length === permissions.length) {
      const matches = presetPermissions.every((presetPerm) => {
        const currentPerm = permissions.find((p) => p.name === presetPerm.name)
        return currentPerm && currentPerm.enabled === presetPerm.enabled
      })

      if (matches) {
        return presetKey
      }
    }
  }

  return null
}
