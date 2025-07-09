/**
 * Tool Permission Service
 *
 * SOLID: Single responsibility - Managing tool permissions
 * DRY: Centralized permission logic
 * KISS: Simple interface for permission checks
 */

import type {
  ToolPermission,
  ToolRestrictions,
  PermissionPreset,
} from '../../../src/types/tool-permissions'
import {
  PERMISSION_PRESETS,
  convertToolsToPermissions,
  applyPreset,
  getToolCategory,
} from '../../../src/types/tool-permissions'

export class ToolPermissionService {
  private static instance: ToolPermissionService

  static getInstance(): ToolPermissionService {
    if (!this.instance) {
      this.instance = new ToolPermissionService()
    }
    return this.instance
  }

  /**
   * Parse tools from database (handles both string[] and ToolPermission[])
   */
  parseTools(tools: string | string[] | ToolPermission[]): ToolPermission[] {
    // Handle string (JSON)
    if (typeof tools === 'string') {
      try {
        const parsed = JSON.parse(tools)
        if (Array.isArray(parsed)) {
          // Check if it's already ToolPermission format
          if (parsed.length > 0 && typeof parsed[0] === 'object' && 'name' in parsed[0]) {
            return parsed as ToolPermission[]
          }
          // Otherwise it's string array
          return convertToolsToPermissions(parsed as string[])
        }
      } catch (error) {
        console.error('Failed to parse tools JSON:', error)
        return []
      }
    }

    // Handle array
    if (Array.isArray(tools)) {
      // Check if it's already ToolPermission format
      if (tools.length > 0 && typeof tools[0] === 'object' && 'name' in tools[0]) {
        return tools as ToolPermission[]
      }
      // Otherwise it's string array
      return convertToolsToPermissions(tools as string[])
    }

    return []
  }

  /**
   * Check if a tool is allowed based on permissions
   */
  isToolAllowed(toolName: string, permissions: ToolPermission[]): boolean {
    const permission = permissions.find((p) => {
      // Exact match
      if (p.name === toolName) return true

      // Wildcard match for MCP tools
      if (p.name === 'mcp__*' && toolName.startsWith('mcp__')) return true

      // Category wildcard
      if (p.name === '*') {
        const category = getToolCategory(toolName)
        return permissions.some((perm) => perm.name === `${category}:*` || perm.name === '*')
      }

      return false
    })

    return permission?.enabled ?? false
  }

  /**
   * Get restrictions for a specific tool
   */
  getToolRestrictions(
    toolName: string,
    permissions: ToolPermission[]
  ): ToolRestrictions | undefined {
    const permission = permissions.find((p) => {
      if (p.name === toolName) return true
      if (p.name === 'mcp__*' && toolName.startsWith('mcp__')) return true
      if (p.name === '*') return true
      return false
    })

    return permission?.restrictions
  }

  /**
   * Validate a command against bash restrictions
   */
  isCommandAllowed(command: string, restrictions?: ToolRestrictions): boolean {
    if (!restrictions) return true

    // Check blocked commands
    if (restrictions.blockedCommands) {
      for (const blocked of restrictions.blockedCommands) {
        if (command.includes(blocked)) {
          return false
        }
      }
    }

    // Check allowed commands (whitelist)
    if (restrictions.commands) {
      return restrictions.commands.some((allowed) => command.startsWith(allowed))
    }

    // Check sudo
    if (!restrictions.sudo && command.includes('sudo')) {
      return false
    }

    return true
  }

  /**
   * Validate a file path against restrictions
   */
  isPathAllowed(path: string, restrictions?: ToolRestrictions): boolean {
    if (!restrictions) return true

    // Check excluded paths
    if (restrictions.excludePaths) {
      for (const excluded of restrictions.excludePaths) {
        if (this.matchPath(path, excluded)) {
          return false
        }
      }
    }

    // Check allowed paths (whitelist)
    if (restrictions.paths) {
      return restrictions.paths.some((allowed) => this.matchPath(path, allowed))
    }

    return true
  }

  /**
   * Simple path matching with wildcards
   */
  private matchPath(path: string, pattern: string): boolean {
    // Handle directory patterns - /etc should match /etc/file
    if (pattern.endsWith('/') || (!pattern.includes('*') && !pattern.includes('.'))) {
      // It's a directory pattern
      if (path.startsWith(pattern)) {
        return true
      }
      // Also check with trailing slash
      if (path.startsWith(pattern + '/')) {
        return true
      }
    }

    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '___DOUBLE_STAR___')
      .replace(/\*/g, '[^/]*')
      .replace(/___DOUBLE_STAR___/g, '.*')
      .replace(/\?/g, '.')

    const regex = new RegExp(`^${regexPattern}$`)
    return regex.test(path)
  }

  /**
   * Merge custom tools with base tools
   */
  mergeToolPermissions(
    baseTools: ToolPermission[],
    customTools?: ToolPermission[]
  ): ToolPermission[] {
    if (!customTools || customTools.length === 0) {
      return baseTools
    }

    const merged = [...baseTools]

    // Override or add custom tools
    customTools.forEach((customTool) => {
      const index = merged.findIndex((t) => t.name === customTool.name)
      if (index >= 0) {
        // Override existing tool
        merged[index] = customTool
      } else {
        // Add new tool
        merged.push(customTool)
      }
    })

    return merged
  }

  /**
   * Get preset by name
   */
  getPreset(name: string): PermissionPreset | undefined {
    return PERMISSION_PRESETS[name]
  }

  /**
   * Get all available presets
   */
  getAllPresets(): Record<string, PermissionPreset> {
    return PERMISSION_PRESETS
  }

  /**
   * Apply a preset to get tool permissions
   */
  applyPresetToRole(presetName: string, existingTools?: string[]): ToolPermission[] {
    const preset = this.getPreset(presetName)
    if (!preset) {
      return existingTools ? convertToolsToPermissions(existingTools) : []
    }

    return applyPreset(preset, existingTools)
  }

  /**
   * Serialize permissions for storage
   */
  serializePermissions(permissions: ToolPermission[]): string {
    return JSON.stringify(permissions)
  }

  /**
   * Get tool list for Claude SDK (enabled tools only)
   */
  getEnabledToolNames(permissions: ToolPermission[]): string[] {
    return permissions
      .filter((p) => p.enabled)
      .map((p) => p.name)
      .filter((name) => !name.includes('*')) // Remove wildcards
  }

  /**
   * Validate tool usage in real-time
   */
  validateToolUsage(
    toolName: string,
    args: Record<string, unknown>,
    permissions: ToolPermission[]
  ): { allowed: boolean; reason?: string } {
    // Check if tool is allowed
    if (!this.isToolAllowed(toolName, permissions)) {
      return { allowed: false, reason: `Tool ${toolName} is not allowed` }
    }

    const restrictions = this.getToolRestrictions(toolName, permissions)
    if (!restrictions) {
      return { allowed: true }
    }

    // Validate based on tool type
    switch (toolName) {
      case 'bash':
        if (args.command && typeof args.command === 'string') {
          if (!this.isCommandAllowed(args.command, restrictions)) {
            return { allowed: false, reason: 'Command not allowed by restrictions' }
          }
        }
        break

      case 'read':
      case 'write':
      case 'edit':
        if (args.file_path && typeof args.file_path === 'string') {
          if (!this.isPathAllowed(args.file_path, restrictions)) {
            return { allowed: false, reason: 'Path not allowed by restrictions' }
          }
          if (restrictions.readOnly && toolName !== 'read') {
            return { allowed: false, reason: 'Read-only access' }
          }
        }
        break

      case 'webfetch':
      case 'websearch':
        if (args.url && typeof args.url === 'string') {
          const url = new URL(args.url as string)
          const domain = url.hostname

          if (restrictions.blockedDomains?.includes(domain)) {
            return { allowed: false, reason: 'Domain is blocked' }
          }

          if (restrictions.domains && !restrictions.domains.includes(domain)) {
            return { allowed: false, reason: 'Domain not in allowed list' }
          }
        }
        break

      default:
        // MCP tools
        if (toolName.startsWith('mcp__') && restrictions.operations) {
          const operation = toolName.split('__').pop()
          if (operation && !restrictions.operations.includes('*')) {
            const allowed = restrictions.operations.some(
              (op) => operation.includes(op) || op === operation
            )
            if (!allowed) {
              return { allowed: false, reason: 'MCP operation not allowed' }
            }
          }
        }
    }

    return { allowed: true }
  }
}
