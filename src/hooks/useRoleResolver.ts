/**
 * useRoleResolver - Role Resolution Hook
 * 
 * SOLID: Single Responsibility - Only handles role resolution logic
 * DRY: Centralizes role matching and tool comparison logic
 * KISS: Simple interface for role resolution
 * Library-First: Uses existing role hooks
 */

import { useMemo } from 'react'

interface AgentConfig {
  id: string
  name: string
  role: string
  systemPrompt: string
  tools: string[]
  model: string
}

interface AgentRoleAssignment {
  agentId: string
  roleId: string
  customTools?: string[]
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
      availableRoles: availableRoles.length
    })
    
    // Try role assignment first (most authoritative)
    let roleTemplate = roleAssignment 
      ? availableRoles.find(r => r.id === roleAssignment.roleId)
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
        isAssigned: false
      }
    }
    
    // Determine tools and customization
    const templateTools = roleTemplate.tools || []
    const assignedTools = roleAssignment?.customTools
    const hasCustomTools = hasToolCustomization(templateTools, assignedTools)
    const currentTools = hasCustomTools ? (assignedTools || []) : templateTools
    
    console.log(`Role resolution result for ${agentId}:`, {
      roleTemplate: roleTemplate.name,
      hasCustomTools,
      currentTools: currentTools.length,
      assignedTools,
      templateTools: templateTools.length
    })
    
    return {
      roleTemplate,
      hasCustomTools,
      currentTools,
      isAssigned: !!roleAssignment
    }
  }, [agentId, currentRole, availableRoles, roleAssignment])
}

/**
 * Finds role by matching against role string (name, id, or role field)
 * DRY: Centralized role matching logic
 */
function findRoleByString(roleString: string, availableRoles: AgentConfig[]): AgentConfig | null {
  const normalized = roleString.toLowerCase()
  
  return availableRoles.find(role => 
    role.role.toLowerCase() === normalized || 
    role.id.toLowerCase() === normalized ||
    role.name.toLowerCase() === normalized
  ) || null
}

/**
 * Determines if tools have been customized from template
 * SOLID: Single responsibility for tool comparison
 */
function hasToolCustomization(templateTools: string[], assignedTools: string[] | undefined): boolean {
  // If no assignment exists, no customization
  if (assignedTools === undefined || assignedTools === null) return false
  
  // If assigned tools array exists (even empty), check for differences
  return assignedTools.length !== templateTools.length || 
         !assignedTools.every(tool => templateTools.includes(tool))
}