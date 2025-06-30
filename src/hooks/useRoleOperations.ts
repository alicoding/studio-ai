/**
 * useRoleOperations - Role Assignment Hook
 * 
 * SOLID: Single Responsibility - Only handles role operations
 * DRY: Centralizes role assignment logic
 * KISS: Simple interface for role management
 * Library-First: Uses agent roles hook and stores
 */

import { useCallback, useState } from 'react'
import { useAgentStore } from '../stores'
import { useAgentRoles } from './useAgentRoles'
import type { Agent } from '../stores/agents'

interface RoleOperationResult {
  success: boolean
  error?: string
}

interface LegacyAgentSelection {
  agent: Agent | null
  isReassignment: boolean
}

export function useRoleOperations() {
  const { availableConfigs } = useAgentStore()
  const { assignRole, roleAssignments } = useAgentRoles()
  
  // Local state for selected legacy agent
  const [selectedLegacyAgent, setSelectedLegacyAgent] = useState<Agent | null>(null)
  const [showAssignRole, setShowAssignRole] = useState(false)

  /**
   * Start agent conversion process
   * Opens role assignment modal for legacy agent
   */
  const startAgentConversion = useCallback((agent: Agent) => {
    setSelectedLegacyAgent(agent)
    setShowAssignRole(true)
  }, [])

  /**
   * Start role reassignment process
   * Opens role assignment modal for agent with existing role
   */
  const startRoleReassignment = useCallback((agent: Agent) => {
    setSelectedLegacyAgent(agent)
    setShowAssignRole(true)
  }, [])

  /**
   * Assign role to agent
   * Updates agent configuration with new role
   */
  const assignRoleToAgent = useCallback(async (
    roleId: string,
    customTools?: string[]
  ): Promise<RoleOperationResult> => {
    if (!selectedLegacyAgent) {
      return { 
        success: false, 
        error: 'No agent selected' 
      }
    }

    try {
      const roleConfig = availableConfigs.find(c => c.id === roleId)
      if (!roleConfig) {
        return { 
          success: false, 
          error: 'Role configuration not found' 
        }
      }

      // Assign the role to the agent
      await assignRole(selectedLegacyAgent.id, roleId, customTools)
      
      console.log(`Agent ${selectedLegacyAgent.name} assigned role ${roleConfig.name}`)
      
      // Clear selection
      setSelectedLegacyAgent(null)
      setShowAssignRole(false)
      
      return { success: true }
    } catch (error) {
      console.error('Failed to assign role:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to assign role' 
      }
    }
  }, [selectedLegacyAgent, availableConfigs, assignRole])

  /**
   * Cancel role assignment
   * Clears selection and closes modal
   */
  const cancelRoleAssignment = useCallback(() => {
    setSelectedLegacyAgent(null)
    setShowAssignRole(false)
  }, [])

  /**
   * Get current role assignment for agent
   */
  const getAgentRoleAssignment = useCallback((agentId: string) => {
    const assignment = roleAssignments[agentId]
    if (!assignment) return null
    
    return availableConfigs.find(c => c.id === assignment.roleId)
  }, [roleAssignments, availableConfigs])

  /**
   * Check if agent has role assignment
   */
  const hasRoleAssignment = useCallback((agentId: string): boolean => {
    return !!roleAssignments[agentId]
  }, [roleAssignments])

  /**
   * Get legacy agent selection state
   */
  const getLegacyAgentSelection = useCallback((): LegacyAgentSelection => {
    return {
      agent: selectedLegacyAgent,
      isReassignment: selectedLegacyAgent ? hasRoleAssignment(selectedLegacyAgent.id) : false,
    }
  }, [selectedLegacyAgent, hasRoleAssignment])

  return {
    // Actions
    startAgentConversion,
    startRoleReassignment,
    assignRoleToAgent,
    cancelRoleAssignment,
    
    // Queries
    getAgentRoleAssignment,
    hasRoleAssignment,
    getLegacyAgentSelection,
    
    // State
    selectedLegacyAgent,
    showAssignRole,
  }
}