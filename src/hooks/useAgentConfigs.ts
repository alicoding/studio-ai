import { useState, useEffect } from 'react'
import ky from 'ky'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3456/api'

export interface AgentConfig {
  id: string
  name: string
  role: string
  systemPrompt: string
  tools: Array<{
    name: string
    enabled: boolean
  }>
  model: string
  maxTokens: number
  temperature: number
  createdAt: string
  updatedAt: string
  projectsUsing: string[]
}

export interface AgentRole {
  role: string
  name: string
  icon: string
  color: string
  description: string
}

// Map agent roles to UI configuration
const roleIconMap: Record<string, { icon: string; color: string; description: string }> = {
  developer: {
    icon: 'Code2',
    color: 'bg-blue-500',
    description: 'Code implementation and development tasks',
  },
  architect: {
    icon: 'Building',
    color: 'bg-purple-500',
    description: 'System design and architecture planning',
  },
  reviewer: {
    icon: 'Eye',
    color: 'bg-green-500',
    description: 'Code review and quality assurance',
  },
  tester: {
    icon: 'Zap',
    color: 'bg-orange-500',
    description: 'Testing and validation tasks',
  },
  security: {
    icon: 'Shield',
    color: 'bg-red-500',
    description: 'Security analysis and vulnerability assessment',
  },
  devops: {
    icon: 'Server',
    color: 'bg-gray-500',
    description: 'Deployment and infrastructure management',
  },
  orchestrator: {
    icon: 'Layers',
    color: 'bg-indigo-500',
    description: 'Workflow coordination and management',
  },
  ux: {
    icon: 'Palette',
    color: 'bg-pink-500',
    description: 'User experience and interface design',
  },
}

export function useAgentConfigs() {
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAgents = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await ky.get(`${API_BASE}/agents`).json<AgentConfig[]>()
      setAgents(response)
    } catch (err) {
      console.error('Failed to fetch agent configurations:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch agents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAgents()
  }, [])

  // Get unique roles with their UI configuration
  const getAvailableRoles = (): AgentRole[] => {
    const uniqueRoles = Array.from(new Set(agents.map((agent) => agent.role)))

    return uniqueRoles.map((role) => {
      const config = roleIconMap[role.toLowerCase()] || {
        icon: 'User',
        color: 'bg-gray-400',
        description: `${role} role tasks`,
      }

      // Find the first agent with this role to get a better name
      const agentWithRole = agents.find((agent) => agent.role === role)
      const displayName = agentWithRole?.name || role.charAt(0).toUpperCase() + role.slice(1)

      return {
        role,
        name: displayName,
        ...config,
      }
    })
  }

  return {
    agents,
    loading,
    error,
    refetch: fetchAgents,
    availableRoles: getAvailableRoles(),
  }
}
