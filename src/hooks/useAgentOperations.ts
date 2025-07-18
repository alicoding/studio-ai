/**
 * useAgentOperations - Agent Lifecycle Management Hook
 *
 * SOLID: Single Responsibility - Only handles agent lifecycle operations
 * DRY: Centralizes all agent operation logic
 * KISS: Simple interface for complex agent operations
 * Library-First: Uses centralized API client with ky
 */

import { useCallback } from 'react'
import { convertToolsToPermissions } from '../types/tool-permissions'
import { useAgentStore, useProjectStore } from '../stores'
import { useProcessManager } from './useProcessManager'
import { useClaudeMessages } from './useClaudeMessages'
import { studioApi } from '../services/api'
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
                tools: convertToolsToPermissions(['file_system', 'terminal', 'web_search']),
                model: 'claude-3-opus',
                maxTokens: agent.maxTokens || 200000,
              }

          // Convert ToolPermission[] back to string[] for the process manager
          const processManagerConfig = {
            ...agentConfig,
            tools: agentConfig.tools.filter((tool) => tool.enabled).map((tool) => tool.name),
          }

          await processManager.spawnAgent(agentId, activeProjectId, processManagerConfig)

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
        const agent = agents.find((a) => a.id === agentId)
        const oldSessionId = agent?.sessionId || ''

        // Step 2: First abort any running Claude agent to prevent final messages
        try {
          await studioApi.agents.abort(agentId, activeProjectId!)
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
          await studioApi.agents.clearSession(agentId, activeProjectId!, oldSessionId)
          console.log('Backend session cleanup completed successfully')
        } catch (error) {
          console.error('Failed to clean up backend session:', error)
          // Don't continue on backend failure - this causes the reported bug
          throw new Error(
            `Backend cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
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
      agents,
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
        // Get the agent to find its role
        const agent = agents.find((a) => a.id === agentId)
        if (!agent) {
          return { success: false, error: 'Agent not found' }
        }

        // Call the studio-projects API endpoint to remove agent from project
        // This handles removing from metadata and cleaning up sessions
        console.log(
          `Removing agent ${agentId} (role: ${agent.role}) from project ${activeProjectId}`
        )

        await studioApi.delete(`studio-projects/${activeProjectId}/agents/${agent.role}`)

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
    [removeAgent, activeProjectId, agents]
  )

  /**
   * Add multiple agents to project
   */
  const addAgentsToProject = useCallback(
    async (
      agentIds: string[] | Array<{ configId: string; name?: string; role?: string }>
    ): Promise<AgentOperationResult> => {
      if (!activeProjectId) {
        return { success: false, error: 'No active project' }
      }

      try {
        // Studio projects API expects agents to be added one by one with role
        // We need to add each agent individually
        const errors: string[] = []

        for (const agent of agentIds) {
          try {
            const agentConfigId = typeof agent === 'string' ? agent : agent.configId

            // Get the actual role from the agent config
            let role: string
            if (typeof agent === 'object' && agent.role) {
              role = agent.role
            } else {
              // Look up the agent config to get the role
              const config = getConfig(agentConfigId)
              role = config?.role || 'agent'
            }

            // Use the studio-projects API endpoint
            await studioApi.post(`studio-projects/${activeProjectId}/agents`, {
              role,
              agentConfigId,
              customTools: undefined, // Can be extended later if needed
            })
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error'
            errors.push(
              `Failed to add agent ${typeof agent === 'string' ? agent : agent.configId}: ${errorMsg}`
            )
            console.error('Failed to add agent:', error)
          }
        }

        // If there were any errors, report them
        if (errors.length > 0) {
          console.error('Some agents failed to add:', errors)
          return {
            success: false,
            error: errors.join('; '),
          }
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
    [activeProjectId, getConfig]
  )

  return {
    toggleAgent,
    clearAgentSession,
    removeAgentFromTeam,
    addAgentsToProject,
  }
}
