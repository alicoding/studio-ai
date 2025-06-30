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
  [key: string]: any
}

export function useWebSocketOperations() {
  const { socket } = useWebSocket()
  const { updateAgentStatus } = useAgentStore()

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
    socket.on('agent:status', handleAgentStatusUpdate)

    // Cleanup
    return () => {
      socket.off('agent:status', handleAgentStatusUpdate)
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