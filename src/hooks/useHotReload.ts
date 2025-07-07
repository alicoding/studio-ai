import { useEffect } from 'react'

/**
 * Custom hook to handle HMR (Hot Module Replacement) gracefully
 * Preserves WebSocket connections during development
 * Note: State persistence is now handled automatically by our Zustand stores
 */
export function useHotReload() {
  useEffect(() => {
    if (import.meta.hot) {
      // Preserve WebSocket connections
      import.meta.hot.data.sockets = window.__sockets || []
      
      // Clean up before reload
      import.meta.hot.dispose(() => {
        // WebSocket connections will be preserved
        // State is automatically persisted by Zustand stores
      })
    }
  }, [])
}

// Global window type augmentation
declare global {
  interface Window {
    __sockets?: WebSocket[]
  }
}