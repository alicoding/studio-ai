import { useEffect } from 'react'

/**
 * Custom hook to handle HMR (Hot Module Replacement) gracefully
 * Preserves critical state during development
 */
export function useHotReload() {
  useEffect(() => {
    if (import.meta.hot) {
      // Preserve WebSocket connections
      import.meta.hot.data.sockets = window.__sockets || []
      
      // Preserve any critical state
      import.meta.hot.data.preservedState = {
        selectedAgentId: localStorage.getItem('selectedAgentId'),
        activeProjectId: localStorage.getItem('activeProjectId'),
      }
      
      // Clean up before reload
      import.meta.hot.dispose(() => {
        // Store state that should persist
        const selectedAgent = document.querySelector('[data-selected-agent-id]')
        if (selectedAgent) {
          localStorage.setItem('selectedAgentId', selectedAgent.getAttribute('data-selected-agent-id') || '')
        }
      })
      
      // Restore state after reload
      if (import.meta.hot.data.preservedState) {
        const { selectedAgentId, activeProjectId } = import.meta.hot.data.preservedState
        if (selectedAgentId) localStorage.setItem('selectedAgentId', selectedAgentId)
        if (activeProjectId) localStorage.setItem('activeProjectId', activeProjectId)
      }
    }
  }, [])
}

// Global window type augmentation
declare global {
  interface Window {
    __sockets?: any[]
  }
}