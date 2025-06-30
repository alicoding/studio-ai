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
    updateAgentStatus,
    updateAgentSessionId,
    updateAgentTokens,
    updateAgentMessage,
    removeAgent,
    getConfig,
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
      console.log('Clearing agent session (starting fresh session):', agentId)

      try {
        // Step 1: Clear the current sessionId
        updateAgentSessionId(agentId, '')

        // Step 2: Get project info for new session
        const activeProject = projects.find((p) => p.id === activeProjectId)
        if (!activeProject) {
          return {
            success: false,
            error: 'No active project',
          }
        }

        // Step 3: Find agent config or use defaults
        const agentConfig = getConfig(agentId)
        const agentName = agentConfig?.name || `Agent ${agentId.slice(0, 8)}`
        const agentRole = agentConfig?.role || 'dev'

        // Step 4: Determine the prompt to use
        let initMessage: string

        if (customPrompt) {
          // Use custom prompt if provided
          initMessage = customPrompt
        } else if (agentConfig?.systemPrompt) {
          // Use the agent's configured system prompt (role configuration)
          initMessage = agentConfig.systemPrompt
          console.log('Using agent role system prompt for clear session')
        } else {
          // Only fall back to default for legacy agents without proper configuration
          let defaultPrompt = `You are ${agentName}, a ${agentRole} agent. Please stand by for instructions.`

          try {
            const response = await fetch('/api/settings/system')
            if (response.ok) {
              const settings = await response.json()
              if (settings.defaultClearSessionPrompt) {
                // Replace placeholders in the prompt
                defaultPrompt = settings.defaultClearSessionPrompt
                  .replace('{agentName}', agentName)
                  .replace('{agentRole}', agentRole)
              }
            }
          } catch (error) {
            console.warn('Failed to load system settings, using default prompt:', error)
          }

          initMessage = defaultPrompt
          console.log('Using default clear session prompt for legacy agent')
        }

        // Step 5: Start fresh session with initialization message

        console.log('Starting new session with message:', initMessage)
        const result = await sendClaudeMessage(initMessage, {
          projectPath: activeProject.path,
          role: agentRole as 'dev' | 'ux' | 'test' | 'pm',
          forceNewSession: true,
        })

        if (result && result.sessionId) {
          // Step 5: Update with new session ID
          updateAgentSessionId(agentId, result.sessionId)
          console.log('New session started:', result.sessionId)

          // Step 6: Reset agent state for fresh session
          updateAgentTokens(agentId, 0) // Reset tokens to 0 for fresh session
          updateAgentMessage(agentId, 'Session cleared - fresh start') // Update last message

          // Step 7: Emit event to clear message history in UI
          window.dispatchEvent(
            new CustomEvent('agent-session-cleared', {
              detail: {
                agentId,
                oldSessionId: '', // We cleared it already
                newSessionId: result.sessionId,
                projectPath: activeProject.path,
              },
            })
          )

          // Step 8: Emit event to refresh agents from server
          window.dispatchEvent(
            new CustomEvent('session-compacted', {
              detail: {
                agentId,
                sessionId: result.sessionId,
                reason: 'session-cleared',
              },
            })
          )

          return {
            success: true,
            newSessionId: result.sessionId,
          }
        }

        return {
          success: false,
          error: 'Failed to start new session',
        }
      } catch (error) {
        console.error('Failed to clear agent session:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to clear session',
        }
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
    ]
  )

  /**
   * Remove agent from team
   * Kills process and removes from UI
   */
  const removeAgentFromTeam = useCallback(
    async (agentId: string, agentName: string): Promise<AgentOperationResult> => {
      if (!confirm(`Remove ${agentName} from team?`)) {
        return { success: false, error: 'User cancelled' }
      }

      try {
        // Kill the agent process if it exists
        await processManager.killAgent(agentId)

        // Remove from Zustand store
        removeAgent(agentId)

        console.log(`Agent ${agentId} removed from team and process killed`)
        return { success: true }
      } catch (error) {
        console.error(`Failed to remove agent ${agentId}:`, error)

        // Still remove from UI store even if process kill fails
        removeAgent(agentId)

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to kill process',
        }
      }
    },
    [processManager, removeAgent]
  )

  /**
   * Add multiple agents to project
   */
  const addAgentsToProject = useCallback(
    async (agentIds: string[]): Promise<AgentOperationResult> => {
      if (!activeProjectId) {
        return { success: false, error: 'No active project' }
      }

      try {
        // Spawn agents using ProcessManager
        for (const agentId of agentIds) {
          const agentConfig = getConfig(agentId)
          if (agentConfig) {
            await processManager.spawnAgent(agentId, activeProjectId, {
              name: agentConfig.name,
              role: agentConfig.role,
              systemPrompt: agentConfig.systemPrompt || '',
              tools: agentConfig.tools || [],
              model: agentConfig.model,
              maxTokens: agentConfig.maxTokens,
            })
            console.log(`Agent ${agentId} spawned for project ${activeProjectId}`)
          }
        }

        return { success: true }
      } catch (error) {
        console.error('Failed to add agents:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to add agents',
        }
      }
    },
    [activeProjectId, getConfig, processManager]
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
