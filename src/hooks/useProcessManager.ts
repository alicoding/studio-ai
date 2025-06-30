/**
 * useProcessManager - React Hook for Server-Side Process Management
 * 
 * SOLID: Single Responsibility - only handles API calls to server-side ProcessManager
 * DRY: Centralized process management API for all components  
 * KISS: Simple API wrapper with error handling
 */

import { useState, useEffect, useCallback } from 'react'

interface AgentProcess {
  agentId: string
  projectId: string
  status: 'ready' | 'online' | 'busy' | 'offline'
  pid: number | null
  sessionId: string | null
  lastActivity: Date
}

interface AgentConfig {
  role: string
  systemPrompt: string
  tools: string[]
}

interface ProcessManagerHook {
  // Agent management
  spawnAgent: (agentId: string, projectId: string, config: AgentConfig) => Promise<void>
  killAgent: (agentId: string) => Promise<void>
  setAgentStatus: (agentId: string, status: 'online' | 'offline') => Promise<void>
  
  // Project management
  killProject: (projectId: string) => Promise<void>
  getProjectAgents: (projectId: string) => AgentProcess[]
  
  // Message routing
  sendMention: (message: string, fromAgentId: string, projectId: string) => Promise<void>
  
  // System status
  processCount: number
  cleanup: () => Promise<any>
  
  // State
  isInitialized: boolean
  error: string | null
}

export function useProcessManager(): ProcessManagerHook {
  const [isInitialized] = useState(true) // Always ready for API calls
  const [error, setError] = useState<string | null>(null)
  const [processCount, setProcessCount] = useState(0)
  const [projectAgents, setProjectAgents] = useState<Record<string, AgentProcess[]>>({})

  // Agent management functions via API
  const spawnAgent = useCallback(async (
    agentId: string, 
    projectId: string, 
    config: AgentConfig
  ) => {
    try {
      const response = await fetch(`/api/agents/${agentId}/spawn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, config })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to spawn agent: ${response.statusText}`)
      }
      
      console.log(`Agent ${agentId} spawn request sent`)
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [])

  const killAgent = useCallback(async (agentId: string) => {
    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to kill agent: ${response.statusText}`)
      }
      
      console.log(`Agent ${agentId} kill request sent`)
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [])

  const setAgentStatus = useCallback(async (
    agentId: string, 
    status: 'online' | 'offline'
  ) => {
    try {
      const response = await fetch(`/api/agents/${agentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to set agent status: ${response.statusText}`)
      }
      
      console.log(`Agent ${agentId} status set to ${status}`)
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [])

  const killProject = useCallback(async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/agents`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to kill project agents: ${response.statusText}`)
      }
      
      console.log(`Project ${projectId} agents kill request sent`)
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [])

  const getProjectAgents = useCallback((projectId: string): AgentProcess[] => {
    return projectAgents[projectId] || []
  }, [projectAgents])

  const sendMention = useCallback(async (
    message: string,
    fromAgentId: string,
    projectId: string
  ) => {
    try {
      const response = await fetch(`/api/messages/mention`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, fromAgentId, projectId })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to send mention: ${response.statusText}`)
      }
      
      console.log(`Mention sent from ${fromAgentId}`)
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [])

  const cleanup = useCallback(async () => {
    try {
      const response = await fetch(`/api/system/cleanup-zombies`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to cleanup zombies: ${response.statusText}`)
      }
      
      const result = await response.json()
      console.log(`Cleanup complete: ${result.killedCount} zombies killed`)
      return result
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [])

  // Fetch process stats periodically
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/system/process-stats')
        if (response.ok) {
          const stats = await response.json()
          setProcessCount(stats.processCount || 0)
          setProjectAgents(stats.projectAgents || {})
        }
      } catch (err) {
        console.error('Failed to fetch process stats:', err)
      }
    }

    fetchStats() // Initial fetch
    const interval = setInterval(fetchStats, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [])

  return {
    spawnAgent,
    killAgent,
    setAgentStatus,
    killProject,
    getProjectAgents,
    sendMention,
    processCount,
    cleanup,
    isInitialized,
    error
  }
}