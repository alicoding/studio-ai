// KISS: Simple React hook wrapper for AgentManager
import { useState, useEffect, useCallback } from 'react'
import { AgentManager, AgentState, AgentConfig } from '../../lib/agents'

export function useAgentManager(projectId: string) {
  const [agents, setAgents] = useState<AgentState[]>([])
  const [loading, setLoading] = useState(true)
  
  const manager = AgentManager.getInstance()

  // Load agents for project
  useEffect(() => {
    const loadAgents = async () => {
      setLoading(true)
      try {
        // In real implementation, this would load from API
        const projectAgents = manager.getProjectAgents(projectId)
        setAgents(projectAgents)
      } finally {
        setLoading(false)
      }
    }

    loadAgents()

    // Listen for updates
    const handleUpdate = () => {
      setAgents(manager.getProjectAgents(projectId))
    }

    manager.on('agent:updated', handleUpdate)
    manager.on('agent:process-changed', handleUpdate)
    manager.on('agent:activity-changed', handleUpdate)

    return () => {
      manager.off('agent:updated', handleUpdate)
      manager.off('agent:process-changed', handleUpdate)
      manager.off('agent:activity-changed', handleUpdate)
    }
  }, [projectId])

  // Spawn agent if needed
  const ensureAgentActive = useCallback(async (agentId: string, projectPath: string) => {
    if (manager.needsSpawn(agentId)) {
      await manager.spawnAgent(agentId, projectPath)
    }
  }, [])

  // Send message to agent (auto-spawn if needed)
  const sendMessage = useCallback(async (agentId: string, _message: string, projectPath: string) => {
    // Ensure agent is active
    await ensureAgentActive(agentId, projectPath)
    
    // Mark as responding
    manager.setResponding(agentId, true)
    
    try {
      // Send message via API
      // ... actual message sending logic
    } finally {
      manager.setResponding(agentId, false)
    }
  }, [ensureAgentActive])

  // Convert legacy agent
  const convertAgent = useCallback(async (agentId: string, config: AgentConfig) => {
    manager.setConfig(agentId, config)
  }, [])

  return {
    agents,
    loading,
    ensureAgentActive,
    sendMessage,
    convertAgent,
    agentManager: manager,
  }
}