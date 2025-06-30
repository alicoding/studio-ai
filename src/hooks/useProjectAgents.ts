import { useEffect, useState } from 'react'
import { useProjectStore } from '../stores'
import type { Agent } from '../stores/agents'

/**
 * Hook to get agents for the active project
 * For Claude Code projects, each session represents an agent
 */
export function useProjectAgents() {
  const { activeProjectId } = useProjectStore()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(false)

  const fetchProjectAgents = async () => {
    if (!activeProjectId) {
      setAgents([])
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch(`/api/projects/${activeProjectId}/sessions`)
      if (response.ok) {
        const data = await response.json()
        
        // Convert sessions to agents
        const projectAgents: Agent[] = data.sessions.map((session: any) => {
          return {
            id: session.sessionId,
            name: session.agentName || `Agent ${session.sessionId.slice(0, 8)}`,
            role: 'Legacy Agent', // Will be updated by parent component with role assignments
            status: 'offline' as const, // Sessions are historical, so offline
            tokens: session.totalTokens || 0,
            maxTokens: 200000,
            lastMessage: session.lastMessage || `${session.messageCount} messages`,
            sessionId: session.sessionId,
          }
        })
        
        setAgents(projectAgents)
      }
    } catch (error) {
      console.error('Error fetching project agents:', error)
      setAgents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjectAgents()
  }, [activeProjectId])

  // Listen for session compaction events
  useEffect(() => {
    const handleCompaction = (event: CustomEvent) => {
      console.log('Session compacted, refreshing agents...', event.detail)
      // Refresh the agents to get updated token counts
      fetchProjectAgents()
    }

    window.addEventListener('session-compacted', handleCompaction as EventListener)
    
    return () => {
      window.removeEventListener('session-compacted', handleCompaction as EventListener)
    }
  }, [activeProjectId])

  return { agents, loading, activeProjectId }
}