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
  const { configs } = useAgentStore() // Updated from availableConfigs
  const { assignRole, roleAssignments, loadAssignments } = useAgentRoles()

  // Local state for selected legacy agent
  const [selectedLegacyAgent, setSelectedLegacyAgent] = useState<Agent | null>(null)
  const [showAssignRole, setShowAssignRole] = useState(false)

  /**
   * Start agent conversion process
   * Opens role assignment modal for legacy agent
   */
  const startAgentConversion = useCallback(async (agent: Agent) => {
    // Ensure role assignments are loaded for this agent
    console.log('Loading role assignments for agent conversion:', agent.id)
    await loadAssignments([agent.id])
    
    setSelectedLegacyAgent(agent)
    setShowAssignRole(true)
  }, [loadAssignments])

  /**
   * Start role reassignment process
   * Opens role assignment modal for agent with existing role
   */
  const startRoleReassignment = useCallback(async (agent: Agent) => {
    // Ensure role assignments are loaded for this agent
    console.log('Loading role assignments for agent reassignment:', agent.id)
    await loadAssignments([agent.id])
    
    setSelectedLegacyAgent(agent)
    setShowAssignRole(true)
  }, [loadAssignments])

  /**
   * Assign role to agent
   * Updates agent configuration with new role
   */
  const assignRoleToAgent = useCallback(
    async (roleId: string, customTools?: string[]): Promise<RoleOperationResult> => {
      if (!selectedLegacyAgent) {
        return {
          success: false,
          error: 'No agent selected',
        }
      }

      try {
        const roleConfig = configs.find((c) => c.id === roleId)
        if (!roleConfig) {
          return {
            success: false,
            error: 'Role configuration not found',
          }
        }

        // Assign the role to the agent
        await assignRole(selectedLegacyAgent.id, roleId, customTools)

        // Clear selection
        setSelectedLegacyAgent(null)
        setShowAssignRole(false)

        return { success: true }
      } catch (error) {
        console.error('Failed to assign role:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to assign role',
        }
      }
    },
    [selectedLegacyAgent, configs, assignRole]
  )

  /**
   * Cancel role assignment
   * Clears selection and closes modal
   */
  const cancelRoleAssignment = useCallback(() => {
    setSelectedLegacyAgent(null)
    setShowAssignRole(false)
  }, [])

  /**
   * Get current role assignment for agent (returns config)
   */
  const getAgentRoleAssignment = useCallback(
    (agentId: string) => {
      const assignment = roleAssignments[agentId]
      if (!assignment) return null

      return configs.find((c) => c.id === assignment.roleId) || null
    },
    [roleAssignments, configs]
  )

  /**
   * Get raw role assignment data for agent
   * SOLID: Separate method for different data needs
   */
  const getAgentRoleAssignmentData = useCallback(
    (agentId: string) => {
      return roleAssignments[agentId] || null
    },
    [roleAssignments]
  )

  /**
   * Check if agent has role assignment
   */
  const hasRoleAssignment = useCallback(
    (agentId: string): boolean => {
      return !!roleAssignments[agentId]
    },
    [roleAssignments]
  )

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
    getAgentRoleAssignmentData,
    hasRoleAssignment,
    getLegacyAgentSelection,

    // State
    selectedLegacyAgent,
    showAssignRole,
  }
}
