/**
 * useRoleResolver - Role Resolution Hook
 *
 * SOLID: Single Responsibility - Only handles role resolution logic
 * DRY: Centralizes role matching and tool comparison logic
 * KISS: Simple interface for role resolution
 * Library-First: Uses existing role hooks
 */

import { useMemo } from 'react'
import type { AgentConfig } from '../stores/agents'
import type { ToolPermission } from '../types/tool-permissions'

interface AgentRoleAssignment {
  agentId: string
  roleId: string
  customTools?: string[] | ToolPermission[]
  assignedAt: string
  updatedAt: string
}

interface RoleResolutionResult {
  roleTemplate: AgentConfig | null
  hasCustomTools: boolean
  currentTools: string[]
  isAssigned: boolean
}

/**
 * Resolves agent role information from multiple sources
 */
export function useRoleResolver(
  agentId: string,
  currentRole: string | undefined,
  availableRoles: AgentConfig[],
  roleAssignment: AgentRoleAssignment | null
): RoleResolutionResult {
  return useMemo(() => {
    console.log(`useRoleResolver for ${agentId}:`, {
      currentRole,
      roleAssignment,
      availableRoles: availableRoles.length,
    })

    // Try role assignment first (most authoritative)
    let roleTemplate = roleAssignment
      ? availableRoles.find((r) => r.id === roleAssignment.roleId)
      : null

    // Fallback to matching by current role string
    if (!roleTemplate && currentRole) {
      roleTemplate = findRoleByString(currentRole, availableRoles)
    }

    if (!roleTemplate) {
      return {
        roleTemplate: null,
        hasCustomTools: false,
        currentTools: [],
        isAssigned: false,
      }
    }

    // Determine tools and customization
    const templateToolNames =
      roleTemplate.tools?.filter((tool) => tool.enabled).map((tool) => tool.name) || []
    const assignedTools = normalizeToStringArray(roleAssignment?.customTools)
    const hasCustomTools = hasToolCustomization(templateToolNames, assignedTools)
    const currentTools = hasCustomTools ? assignedTools || [] : templateToolNames

    console.log(`Role resolution result for ${agentId}:`, {
      roleTemplate: roleTemplate.name,
      hasCustomTools,
      currentTools: currentTools.length,
      assignedTools,
      templateTools: templateToolNames.length,
    })

    return {
      roleTemplate,
      hasCustomTools,
      currentTools,
      isAssigned: !!roleAssignment,
    }
  }, [agentId, currentRole, availableRoles, roleAssignment])
}

/**
 * Finds role by matching against role string (name, id, or role field)
 * DRY: Centralized role matching logic
 */
function findRoleByString(roleString: string, availableRoles: AgentConfig[]): AgentConfig | null {
  if (!roleString || !availableRoles || availableRoles.length === 0) {
    return null
  }

  const normalized = roleString.toLowerCase()

  return (
    availableRoles.find((role) => {
      if (!role) return false
      return (
        role.role?.toLowerCase() === normalized ||
        role.id?.toLowerCase() === normalized ||
        role.name?.toLowerCase() === normalized
      )
    }) || null
  )
}

/**
 * Normalizes tool permissions to string array format
 * Handles both legacy string[] and new ToolPermission[] formats
 */
function normalizeToStringArray(
  tools: string[] | ToolPermission[] | undefined
): string[] | undefined {
  if (!tools) return undefined

  // If it's already a string array, return as-is
  if (tools.length === 0) return []

  // Check if first element is a string (legacy format)
  if (typeof tools[0] === 'string') {
    return tools as string[]
  }

  // It's ToolPermission[] format - extract enabled tool names
  return (tools as ToolPermission[]).filter((tool) => tool.enabled).map((tool) => tool.name)
}

/**
 * Determines if tools have been customized from template
 * SOLID: Single responsibility for tool comparison
 */
function hasToolCustomization(
  templateTools: string[],
  assignedTools: string[] | undefined
): boolean {
  // If no assignment exists, no customization
  if (assignedTools === undefined || assignedTools === null) return false

  // If assigned tools array exists (even empty), check for differences
  return (
    assignedTools.length !== templateTools.length ||
    !assignedTools.every((tool) => templateTools.includes(tool))
  )
}
