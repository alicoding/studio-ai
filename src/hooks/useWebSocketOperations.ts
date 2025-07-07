/**
 * useWebSocketOperations - WebSocket Event Handling Hook
 * 
 * SOLID: Single Responsibility - Only handles WebSocket events
 * DRY: Centralizes WebSocket event handling
 * KISS: Simple event registration pattern
 * Library-First: Uses existing WebSocket hook
 */

import { useEffect } from 'react'
import { useWebSocket } from './useWebSocket'
import { useAgentStore } from '../stores'

interface WebSocketEventData {
  agentId?: string
  status?: string
  [key: string]: unknown
}

export function useWebSocketOperations() {
  const { socket } = useWebSocket()
  const { updateAgentStatus, updateAgentTokens } = useAgentStore()

  /**
   * Handle agent status updates
   * Updates UI when agent status changes via WebSocket
   */
  useEffect(() => {
    if (!socket) return

    const handleAgentStatusUpdate = (data: WebSocketEventData) => {
      console.log('Agent status update:', data)
      
      if (data.agentId && data.status) {
        updateAgentStatus(data.agentId, data.status as 'ready' | 'online' | 'busy' | 'offline')
      }
    }

    // Register event handler
    socket.on('agent:status-changed', handleAgentStatusUpdate)

    // Cleanup
    return () => {
      socket.off('agent:status-changed', handleAgentStatusUpdate)
    }
  }, [socket, updateAgentStatus])

  /**
   * Handle agent token usage updates
   */
  useEffect(() => {
    if (!socket) return

    const handleTokenUsageUpdate = (data: { agentId: string; tokens: number; maxTokens: number }) => {
      console.log('Agent token usage update:', data)
      
      if (data.agentId && typeof data.tokens === 'number') {
        updateAgentTokens(data.agentId, data.tokens, data.maxTokens)
      }
    }

    // Register event handler
    socket.on('agent:token-usage', handleTokenUsageUpdate)

    // Cleanup
    return () => {
      socket.off('agent:token-usage', handleTokenUsageUpdate)
    }
  }, [socket, updateAgentTokens])

  /**
   * Handle message aborted events
   * Updates agent status when message is aborted via ESC key
   */
  useEffect(() => {
    if (!socket) return

    const handleMessageAborted = (data: { agentId: string; projectId: string }) => {
      console.log('Message aborted event received:', data)
      
      if (data.agentId) {
        // Update agent status back to online when message is aborted
        updateAgentStatus(data.agentId, 'online')
      }
    }

    // Register event handler
    socket.on('message:aborted', handleMessageAborted)

    // Cleanup
    return () => {
      socket.off('message:aborted', handleMessageAborted)
    }
  }, [socket, updateAgentStatus])

  /**
   * Future WebSocket events can be added here:
   * - agent:message
   * - agent:error
   * - project:update
   * - system:notification
   * etc.
   */

  // Return socket for direct access if needed
  return {
    socket,
    isConnected: !!socket,
  }
}