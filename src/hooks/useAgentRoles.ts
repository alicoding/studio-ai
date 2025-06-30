import { useState } from 'react'
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
  const { availableConfigs } = useAgentStore()
  const [roleAssignments, setRoleAssignments] = useState<Record<string, AgentRoleAssignment>>({})
  const [loading, setLoading] = useState(false)

  // Get role config for an agent
  const getAgentRole = (agentId: string) => {
    const assignment = roleAssignments[agentId]
    if (!assignment) return null
    
    return availableConfigs.find(config => config.id === assignment.roleId)
  }

  // Assign role to agent
  const assignRole = async (agentId: string, roleId: string, customTools?: string[]) => {
    try {
      const response = await fetch(`/api/agent-roles/${agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId, customTools }),
      })

      if (!response.ok) {
        throw new Error('Failed to assign role')
      }

      const assignment = await response.json()
      setRoleAssignments(prev => ({
        ...prev,
        [agentId]: assignment
      }))

      return assignment
    } catch (error) {
      console.error('Error assigning role:', error)
      throw error
    }
  }

  // Load all role assignments
  const loadAssignments = async (agentIds: string[]) => {
    setLoading(true)
    const assignments: Record<string, AgentRoleAssignment> = {}

    await Promise.all(
      agentIds.map(async (agentId) => {
        try {
          const response = await fetch(`/api/agent-roles/${agentId}`)
          if (response.ok) {
            const data = await response.json()
            if (data) {
              assignments[agentId] = data
            }
          }
        } catch {
          // Agent has no role assigned, that's ok
        }
      })
    )

    setRoleAssignments(assignments)
    setLoading(false)
  }

  return {
    roleAssignments,
    loading,
    getAgentRole,
    assignRole,
    loadAssignments,
  }
}