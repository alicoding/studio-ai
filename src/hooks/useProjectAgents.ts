import { useEffect, useState, useCallback } from 'react'
import { useProjectStore, useAgentStore } from '../stores'
import type { Agent } from '../stores/agents'

interface APIAgent {
  id: string
  name: string
  role: string
  status: string
  totalTokens?: number
  claudeSessionId?: string
  sessionStartedAt?: string
  totalMessages?: number
  systemPrompt?: string
  tools?: string[]
  model?: string
  projectPath?: string
  maxTokens?: number
  lastMessage?: string
  sessionId?: string
  hasSession?: boolean
}

/**
 * Hook to get agents for the active project
 * Returns only agents that are configured in /agents and assigned to the project
 */
export function useProjectAgents() {
  const { activeProjectId } = useProjectStore()
  const { configs, updateAgentFromConfig } = useAgentStore()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(false)

  const fetchProjectAgents = useCallback(async () => {
    if (!activeProjectId) {
      setAgents([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/projects/${activeProjectId}/agents`)
      if (response.ok) {
        const data = await response.json()

        // Map agents from the new endpoint
        const projectAgents: Agent[] = data.agents.map((agent: APIAgent) => {
          return {
            id: agent.id,
            name: agent.name,
            role: agent.role,
            status: agent.status,
            tokens: agent.totalTokens || 0,
            maxTokens: agent.maxTokens || 200000,
            lastMessage: agent.lastMessage || 'No messages yet',
            sessionId: agent.sessionId,
            hasSession: agent.hasSession || false,
          }
        })

        // Add numbering to agents with the same role for clarity
        const roleCount: Record<string, number> = {}
        const roleTotals: Record<string, number> = {}

        // First, count total agents per role
        projectAgents.forEach((agent) => {
          roleTotals[agent.role] = (roleTotals[agent.role] || 0) + 1
        })

        // Then, add numbers to agents with duplicate roles
        projectAgents.forEach((agent) => {
          if (roleTotals[agent.role] > 1) {
            roleCount[agent.role] = (roleCount[agent.role] || 0) + 1
            agent.name = `${agent.name} #${roleCount[agent.role]}`
          }
        })

        // No need to fetch role assignments - already included in agent data

        setAgents(projectAgents)
      }
    } catch (error) {
      console.error('Error fetching project agents:', error)
      setAgents([])
    } finally {
      setLoading(false)
    }
  }, [activeProjectId, configs, updateAgentFromConfig])

  useEffect(() => {
    fetchProjectAgents()
  }, [fetchProjectAgents])

  // Listen for session compaction events
  useEffect(() => {
    const handleCompaction = (event: CustomEvent) => {
      console.log('Session compacted, refreshing agents...', event.detail)
      // Refresh the agents to get updated token counts
      fetchProjectAgents()
    }

    const handleAgentsUpdated = (event: CustomEvent) => {
      console.log('Project agents updated, refreshing...', event.detail)
      // Refresh the agents list
      fetchProjectAgents()
    }

    window.addEventListener('session-compacted', handleCompaction as EventListener)
    window.addEventListener('project-agents-updated', handleAgentsUpdated as EventListener)

    return () => {
      window.removeEventListener('session-compacted', handleCompaction as EventListener)
      window.removeEventListener('project-agents-updated', handleAgentsUpdated as EventListener)
    }
  }, [fetchProjectAgents])

  return { agents, loading, activeProjectId }
}
