/**
 * useMessageOperations - Message Handling Hook
 *
 * SOLID: Single Responsibility - Only handles message operations
 * DRY: Centralizes message routing logic
 * KISS: Simple interface for complex message handling
 * Library-First: Uses ProcessManager, ClaudeMessages, and stores
 */

import { useCallback } from 'react'
import { useAgentStore, useProjectStore } from '../stores'
import { useClaudeMessages } from './useClaudeMessages'
import { useProcessManager } from './useProcessManager'
import { isInteractiveOnlyCommand, getCommandErrorMessage } from '../config/commands'
import { CommandService } from '../services/CommandService'
import type { Agent } from '../stores/agents'
import type { Project } from '../stores/projects'

interface MessageResult {
  success: boolean
  error?: string
  sessionId?: string
}

interface MessageOptions {
  projectId?: string
  agentId?: string
  projectPath?: string
  role?: 'dev' | 'ux' | 'test' | 'pm'
  sessionId?: string
  forceNewSession?: boolean
}

export function useMessageOperations() {
  const processManager = useProcessManager()
  const { sendMessage: sendClaudeMessage } = useClaudeMessages()

  const { selectedAgentId, updateAgentSessionId } = useAgentStore()

  const { activeProjectId, addToQueue, clearQueue } = useProjectStore()

  /**
   * Handle @mention messages
   * Auto-respawns dead agents if needed
   */
  const handleMention = useCallback(
    async (message: string): Promise<MessageResult> => {
      if (!activeProjectId || !selectedAgentId) {
        return {
          success: false,
          error: 'No active project or selected agent',
        }
      }

      try {
        await processManager.sendMention(message, selectedAgentId, activeProjectId)

        // Add to message queue for UI feedback
        const [target, ...contentParts] = message.split(' ')
        addToQueue({
          target,
          message: contentParts.join(' '),
        })

        return { success: true }
      } catch (error) {
        console.error('Failed to send @mention:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to send mention',
        }
      }
    },
    [activeProjectId, selectedAgentId, processManager, addToQueue]
  )

  /**
   * Handle #command messages
   * Uses CommandService for all command logic
   */
  const handleCommand = useCallback(
    async (message: string): Promise<MessageResult> => {
      if (!activeProjectId) {
        return {
          success: false,
          error: 'No active project',
        }
      }

      const commandService = CommandService.getInstance()
      const agents = useAgentStore.getState().getProjectAgents(activeProjectId)
      const selectedAgent = agents.find((a) => a.id === selectedAgentId)

      const context = {
        sessionId: selectedAgent?.sessionId || '',
        projectId: activeProjectId,
        agents,
        selectedAgentId: selectedAgentId || undefined,
      }

      try {
        const result = await commandService.executeCommand(message, context)

        // Handle command result
        if (result.type === 'error') {
          return { success: false, error: result.content }
        }

        // Execute any action if provided
        if (result.action) {
          await result.action()
        }

        // Send command output as a system message to display in chat
        if (result.content && selectedAgent?.sessionId) {
          await fetch('/api/messages/system', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: selectedAgent.sessionId,
              content: result.content,
              type: 'command-response',
              role: 'system',
            }),
          })
        }

        return {
          success: true,
          sessionId: selectedAgent?.sessionId,
        }
      } catch (error) {
        console.error('Command execution failed:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Command execution failed',
        }
      }
    },
    [activeProjectId, selectedAgentId]
  )

  /**
   * Handle regular Claude API messages
   */
  const handleRegularMessage = useCallback(
    async (message: string, agents: Agent[], activeProject?: Project): Promise<MessageResult> => {
      if (!activeProject) {
        return {
          success: false,
          error: 'No active project',
        }
      }

      // Get the selected agent to use their sessionId
      const selectedAgent = agents.find((a) => a.id === selectedAgentId)

      const options: MessageOptions = {
        projectId: activeProject.id,
        agentId: selectedAgentId || undefined,
        projectPath: activeProject.path,
        role: (selectedAgent?.role || 'dev') as 'dev' | 'ux' | 'test' | 'pm',
        sessionId: selectedAgent?.sessionId || undefined,
      }

      try {
        const result = await sendClaudeMessage(message, options)

        if (result && result.sessionId) {
          console.log('Claude response:', result.response)
          console.log('New session ID:', result.sessionId)

          // Update the agent's sessionId if we have a selected agent
          if (selectedAgentId) {
            updateAgentSessionId(selectedAgentId, result.sessionId)
          }

          return {
            success: true,
            sessionId: result.sessionId,
          }
        }

        return { success: true }
      } catch (error) {
        console.error('Failed to send message:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to send message',
        }
      }
    },
    [selectedAgentId, sendClaudeMessage, updateAgentSessionId]
  )

  /**
   * Main message handler - routes based on message type
   */
  const sendMessage = useCallback(
    async (message: string, agents: Agent[], activeProject?: Project): Promise<MessageResult> => {
      // Check for interactive-only slash commands first
      if (message.startsWith('/')) {
        const command = message.split(' ')[0].toLowerCase()

        if (isInteractiveOnlyCommand(command)) {
          const errorMessage = getCommandErrorMessage(command)
          return {
            success: false,
            error: errorMessage || `${command} is not available in programmatic mode.`,
          }
        }
        // Other slash commands can pass through
      }

      if (message.startsWith('@')) {
        return handleMention(message)
      } else if (message.startsWith('#')) {
        return handleCommand(message)
      } else {
        return handleRegularMessage(message, agents, activeProject)
      }
    },
    [handleMention, handleCommand, handleRegularMessage]
  )

  /**
   * Broadcast message to all agents
   */
  const broadcastMessage = useCallback(() => {
    console.log('Broadcast command (UI-first):', '#broadcast')
    // TODO: Implement actual broadcast logic
  }, [])

  /**
   * Interrupt/clear message queue
   */
  const interruptMessages = useCallback(() => {
    clearQueue()
    console.log('Queue clear (UI-first):', selectedAgentId)
  }, [clearQueue, selectedAgentId])

  return {
    sendMessage,
    handleMention,
    handleCommand,
    handleRegularMessage,
    broadcastMessage,
    interruptMessages,
  }
}
