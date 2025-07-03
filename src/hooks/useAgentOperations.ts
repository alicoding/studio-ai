/**
 * useAgentOperations - Agent Lifecycle Management Hook
 *
 * SOLID: Single Responsibility - Only handles agent lifecycle operations
 * DRY: Centralizes all agent operation logic
 * KISS: Simple interface for complex agent operations
 * Library-First: Leverages ProcessManager and stores
 */

import { useCallback } from 'react'
import { useAgentStore, useProjectStore } from '../stores'
import { useProcessManager } from './useProcessManager'
import { useClaudeMessages } from './useClaudeMessages'
import type { Agent } from '../stores/agents'

interface AgentOperationResult {
  success: boolean
  error?: string
}

export function useAgentOperations() {
  const processManager = useProcessManager()
  const { sendMessage: sendClaudeMessage } = useClaudeMessages()

  const {
    agents,
    updateAgentStatus,
    updateAgentSessionId,
    updateAgentTokens,
    updateAgentMessage,
    removeAgent,
    getConfig,
    setClearingAgent,
  } = useAgentStore()

  const { activeProjectId, projects } = useProjectStore()

  /**
   * Toggle agent online/offline status
   * Spawns agent if offline, kills if online
   */
  const toggleAgent = useCallback(
    async (agentId: string, agent: Agent): Promise<AgentOperationResult> => {
      if (!activeProjectId) {
        return { success: false, error: 'No active project' }
      }

      try {
        if (agent.status === 'offline') {
          // Agent is offline - spawn it
          console.log(`Spawning agent ${agentId}...`)

          // Try to find existing config first
          const existingConfig = getConfig(agentId)

          const agentConfig = existingConfig
            ? {
                name: existingConfig.name,
                role: existingConfig.role,
                systemPrompt:
                  existingConfig.systemPrompt ||
                  `You are ${existingConfig.name}, a ${existingConfig.role} agent.`,
                tools: existingConfig.tools || [],
                model: existingConfig.model,
                maxTokens: existingConfig.maxTokens,
              }
            : {
                // Create dynamic config for agents without existing configuration
                name: agent.name,
                role: agent.role,
                systemPrompt: `You are ${agent.name}, a ${agent.role} agent.`,
                tools: ['file_system', 'terminal', 'web_search'],
                model: 'claude-3-opus',
                maxTokens: agent.maxTokens || 200000,
              }

          await processManager.spawnAgent(agentId, activeProjectId, agentConfig)

          // Update UI status to online
          updateAgentStatus(agentId, 'online')
          console.log(`Agent ${agentId} spawned and online`)

          return { success: true }
        } else {
          // Agent is online/busy/ready - kill the process
          console.log(`Stopping agent ${agentId}...`)
          await processManager.killAgent(agentId)

          // Update UI status to offline
          updateAgentStatus(agentId, 'offline')
          console.log(`Agent ${agentId} stopped`)

          return { success: true }
        }
      } catch (error) {
        console.error(`Failed to toggle agent ${agentId}:`, error)

        // Revert UI status on error
        updateAgentStatus(agentId, agent.status)

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    },
    [activeProjectId, getConfig, processManager, updateAgentStatus]
  )

  /**
   * Clear agent session - starts a fresh session and gets new session ID
   * This replicates the /clear command functionality
   */
  const clearAgentSession = useCallback(
    async (
      agentId: string,
      customPrompt?: string
    ): Promise<AgentOperationResult & { newSessionId?: string }> => {
      console.log('Clearing agent session (resetting to fresh state):', agentId)

      // Set clearing state to prevent spam clicking and show loading
      setClearingAgent(agentId)
      updateAgentMessage(agentId, 'Clearing context...')

      try {
        // Step 1: Get the old sessionId before clearing
        const agent = agents.find(a => a.id === agentId)
        const oldSessionId = agent?.sessionId || ''

        // Step 2: First abort any running Claude agent to prevent final messages
        try {
          await fetch(`/api/agents/${agentId}/abort`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: activeProjectId,
            }),
          })
        } catch (error) {
          console.warn('Failed to abort agent (might not be running):', error)
          // Continue anyway - agent might not be running
        }

        // Step 3: Clear the current sessionId (empty string = no session yet)
        updateAgentSessionId(agentId, '')

        // Step 4: Reset agent state to fresh (like just added to project)
        updateAgentTokens(agentId, 0) // Reset tokens to 0
        updateAgentMessage(agentId, 'Ready') // Reset to initial state message

        // Step 5: Immediately clear the UI message history
        window.dispatchEvent(
          new CustomEvent('agent-session-cleared', {
            detail: {
              agentId,
              oldSessionId,
              newSessionId: '', // No new session - agent is fresh
              projectPath: projects.find((p) => p.id === activeProjectId)?.path || '',
            },
          })
        )

        // Step 6: Clean up the backend session/files - WAIT for completion
        // This is critical - we must ensure files are actually deleted
        try {
          const response = await fetch(`/api/agents/${agentId}/clear-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: activeProjectId,
              oldSessionId,
            }),
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error('Backend session cleanup failed:', response.status, errorText)
            throw new Error(`Backend cleanup failed: ${response.status}`)
          }

          console.log('Backend session cleanup completed successfully')
        } catch (error) {
          console.error('Failed to clean up backend session:', error)
          // Don't continue on backend failure - this causes the reported bug
          throw new Error(`Backend cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }

        // Step 7: Emit event to refresh agents from server (optional)
        window.dispatchEvent(
          new CustomEvent('session-compacted', {
            detail: {
              agentId,
              sessionId: '', // No session
              reason: 'session-cleared',
            },
          })
        )

        // If custom prompt provided, send it as the first message in the new session
        if (customPrompt) {
          console.log('Sending custom prompt as first message:', customPrompt)
          const result = await sendClaudeMessage(customPrompt, {
            projectId: activeProjectId || undefined,
            agentId: agentId,
            projectPath: projects.find((p) => p.id === activeProjectId)?.path,
            role: agent?.role as 'dev' | 'ux' | 'test' | 'pm',
            forceNewSession: true,
          })

          if (result && result.sessionId) {
            updateAgentSessionId(agentId, result.sessionId)
            return {
              success: true,
              newSessionId: result.sessionId,
            }
          }
        }

        return {
          success: true,
          newSessionId: '', // No session - agent is fresh
        }
      } catch (error) {
        console.error('Failed to clear agent session:', error)
        // Reset agent message on error
        updateAgentMessage(agentId, 'Error clearing context')
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to clear session',
        }
      } finally {
        // Always clear the loading state
        setClearingAgent(null)
      }
    },
    [
      activeProjectId,
      getConfig,
      projects,
      sendClaudeMessage,
      updateAgentSessionId,
      updateAgentTokens,
      updateAgentMessage,
      setClearingAgent,
    ]
  )

  /**
   * Remove agent from team
   * Removes agent from project metadata and cleans up sessions
   */
  const removeAgentFromTeam = useCallback(
    async (
      agentId: string,
      agentName: string,
      skipConfirm = false
    ): Promise<AgentOperationResult> => {
      if (
        !skipConfirm &&
        !confirm(`Remove ${agentName} from team? This will delete all session history.`)
      ) {
        return { success: false, error: 'User cancelled' }
      }

      if (!activeProjectId) {
        return { success: false, error: 'No active project' }
      }

      try {
        // Call the new API endpoint to remove agent from project
        // This handles removing from metadata and cleaning up sessions
        console.log(`Removing agent ${agentId} from project ${activeProjectId}`)
        
        const response = await fetch(`/api/projects/${activeProjectId}/agents/${agentId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to remove agent from project')
        }

        // Remove from UI store
        removeAgent(agentId)

        // Refresh the agent list
        window.dispatchEvent(
          new CustomEvent('project-agents-updated', {
            detail: { projectId: activeProjectId },
          })
        )

        console.log(`Agent ${agentId} successfully removed from project`)
        return { success: true }
      } catch (error) {
        console.error(`Failed to remove agent ${agentId}:`, error)

        // Still remove from UI store even if API call fails
        removeAgent(agentId)

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to remove agent',
        }
      }
    },
    [removeAgent, activeProjectId]
  )

  /**
   * Add multiple agents to project
   */
  const addAgentsToProject = useCallback(
    async (agentIds: string[] | Array<{ configId: string; name?: string }>): Promise<AgentOperationResult> => {
      if (!activeProjectId) {
        return { success: false, error: 'No active project' }
      }

      try {
        // Normalize input to always have configId and optional name
        const agentData = agentIds.map(agent => 
          typeof agent === 'string' 
            ? { configId: agent } 
            : agent
        )

        // Call the API to add agents to project metadata
        const response = await fetch(`/api/projects/${activeProjectId}/agents`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ agentIds: agentData }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to add agents to project')
        }

        // Refresh the agent list
        window.dispatchEvent(
          new CustomEvent('project-agents-updated', {
            detail: { projectId: activeProjectId },
          })
        )

        console.log(`Added ${agentIds.length} agents to project ${activeProjectId}`)
        return { success: true }
      } catch (error) {
        console.error('Failed to add agents:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to add agents',
        }
      }
    },
    [activeProjectId]
  )

  /**
   * Cleanup zombie processes
   */
  const cleanupZombies = useCallback(async (): Promise<{
    success: boolean
    killedCount?: number
    error?: string
  }> => {
    try {
      const result = await processManager.cleanup()
      console.log('Zombie cleanup completed:', result)

      return {
        success: true,
        killedCount: result?.killedCount || 0,
      }
    } catch (error) {
      console.error('Failed to cleanup zombies:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Cleanup failed',
      }
    }
  }, [processManager])

  return {
    toggleAgent,
    clearAgentSession,
    removeAgentFromTeam,
    addAgentsToProject,
    cleanupZombies,
  }
}
