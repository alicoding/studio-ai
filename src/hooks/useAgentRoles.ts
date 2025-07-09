import { useState, useCallback } from 'react'
import { useAgentStore } from '../stores'

interface AgentRoleAssignment {
  agentId: string
  roleId: string
  customTools?: string[]
  assignedAt: string
  updatedAt: string
}

/**
 * Hook to manage agent role assignments
 * Keeps role templates and agent assignments separate
 */
export function useAgentRoles() {
  const { configs, updateAgentFromConfig } = useAgentStore() // Updated from availableConfigs
  const [roleAssignments, setRoleAssignments] = useState<Record<string, AgentRoleAssignment>>({})
  const [loading, setLoading] = useState(false)

  // Get role config for an agent
  const getAgentRole = (agentId: string) => {
    const assignment = roleAssignments[agentId]
    if (!assignment) return null

    return configs.find((config) => config.id === assignment.roleId)
  }

  // Assign role to agent
  const assignRole = async (
    agentId: string,
    roleId: string,
    customTools?: string[],
    projectId?: string
  ) => {
    try {
      // For studio project agents (with short IDs like dev_01), we need to use studio-projects API
      if (projectId && agentId.includes('_')) {
        // Extract role from short ID (e.g., "dev_01" -> "dev")
        const role = agentId.split('_')[0]

        // First remove the agent from the project
        const deleteResponse = await fetch(`/api/studio-projects/${projectId}/agents/${role}`, {
          method: 'DELETE',
        })

        if (!deleteResponse.ok && deleteResponse.status !== 404) {
          const errorText = await deleteResponse.text()
          throw new Error(`Failed to remove agent: ${deleteResponse.status} - ${errorText}`)
        }

        // Then add it back with the new configuration
        const addResponse = await fetch(`/api/studio-projects/${projectId}/agents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role,
            agentConfigId: roleId,
            customTools,
          }),
        })

        if (!addResponse.ok) {
          const errorText = await addResponse.text()
          throw new Error(`Failed to add agent with new role: ${addResponse.status} - ${errorText}`)
        }

        // Parse response to ensure it's valid
        await addResponse.json()

        // Create assignment object for consistency
        const assignment = {
          agentId,
          roleId,
          customTools,
          assignedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        setRoleAssignments((prev) => ({
          ...prev,
          [agentId]: assignment,
        }))

        // Fire event to refresh project agents
        window.dispatchEvent(
          new CustomEvent('project-agents-updated', {
            detail: { projectId },
          })
        )

        return assignment
      } else {
        // Legacy agent-roles API for non-studio agents
        const response = await fetch(`/api/agent-roles/${agentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roleId, customTools }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Failed to assign role: ${response.status} - ${errorText}`)
        }

        const assignment = await response.json()

        setRoleAssignments((prev) => ({
          ...prev,
          [agentId]: assignment,
        }))

        // Update the agent's role in the Zustand store
        const roleConfig = configs.find((config) => config.id === roleId)
        if (roleConfig) {
          updateAgentFromConfig(agentId, roleConfig)
        }

        return assignment
      }
    } catch (error) {
      console.error('Error assigning role:', error)
      throw error
    }
  }

  // Load all role assignments using batch API (fixes N+1 query problem)
  const loadAssignments = useCallback(async (agentIds: string[], projectId?: string) => {
    if (agentIds.length === 0) {
      setRoleAssignments({})
      return
    }

    setLoading(true)

    try {
      // Use batch endpoint for efficient loading
      const response = await fetch('/api/agent-roles/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentIds, projectId }),
      })

      if (response.ok) {
        const assignments = await response.json()
        console.log('Batch loaded assignments:', assignments)
        setRoleAssignments(assignments || {})
      } else {
        console.error('Failed to load role assignments:', response.status)
        setRoleAssignments({})
      }
    } catch (error) {
      console.error('Error loading role assignments:', error)
      setRoleAssignments({})
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    roleAssignments,
    loading,
    getAgentRole,
    assignRole,
    loadAssignments,
  }
}
