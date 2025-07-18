import { useEffect, useState, useCallback } from 'react'
import { useProjectStore, useAgentStore } from '../stores'
import { studioApi } from '../services/api'
import type { Agent } from '../stores/agents'
import type { AgentInstance } from '../services/api/types'

/**
 * Hook to get agents for the active project
 * Returns only agents that are configured in /agents and assigned to the project
 */
export function useProjectAgents() {
  const { activeProjectId } = useProjectStore()
  const { configs } = useAgentStore()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(false)

  const fetchProjectAgents = useCallback(async () => {
    if (!activeProjectId) {
      setAgents([])
      return
    }

    setLoading(true)
    try {
      console.log('[useProjectAgents] Fetching agents for project:', activeProjectId)
      const response = await studioApi.studioProjects.getAgentsWithShortIds(activeProjectId)
      const data = response.agents
      console.log('[useProjectAgents] Received agent data:', data)
      console.log('[useProjectAgents] First agent ID:', data[0]?.id)

      // Map agents from the new endpoint
      const projectAgents: Agent[] = data.map((agentInstance: AgentInstance, index: number) => {
        console.log(
          `[useProjectAgents] Loading agent ${agentInstance.id} with sessionId: ${agentInstance.sessionId}`
        )
        // We need to get the full agent data from the configs
        const config = configs.find((c) => c.id === agentInstance.agentId)
        return {
          id: agentInstance.id,
          name: config?.name || agentInstance.agentId,
          role: config?.role || 'Agent',
          status:
            agentInstance.status === 'active'
              ? 'online'
              : agentInstance.status === 'processing'
                ? 'busy'
                : 'offline',
          tokens: 0, // TODO: Get from session
          maxTokens: config?.maxTokens || 200000,
          lastMessage: 'No messages yet',
          sessionId: agentInstance.sessionId,
          order: index,
        }
      })

      // No need to add numbering - custom names are preserved from team templates
      // No need to fetch role assignments - already included in agent data

      console.log('[useProjectAgents] Setting agents:', projectAgents)
      setAgents(projectAgents)
    } catch (error) {
      console.error('Error fetching project agents:', error)
      setAgents([])
    } finally {
      setLoading(false)
    }
  }, [activeProjectId, configs])

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
      // Add a small delay to ensure backend has processed the update
      setTimeout(() => {
        fetchProjectAgents()
      }, 100)
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
