/**
 * Connection Status Hook - Monitors backend connectivity and handles graceful degradation
 * 
 * SOLID: Single responsibility - connection monitoring
 * DRY: Centralized connection state management
 * KISS: Simple ping-based health checks
 */

import { useState, useEffect, useCallback, useRef } from 'react'

interface ConnectionState {
  isOnline: boolean
  isReconnecting: boolean
  lastConnected: Date | null
  retryAttempts: number
  error: string | null
}

const HEALTH_CHECK_INTERVAL = 5000 // 5 seconds
const RETRY_INTERVALS = [1000, 2000, 5000, 10000, 30000] // Progressive backoff
const MAX_RETRY_ATTEMPTS = 5

export function useConnectionStatus() {
  const [state, setState] = useState<ConnectionState>({
    isOnline: true,
    isReconnecting: false,
    lastConnected: new Date(),
    retryAttempts: 0,
    error: null,
  })

  const healthCheckRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const retryTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const checkHealth = useCallback(async (): Promise<boolean> => {
    try {
      // Use a lightweight health check endpoint
      const response = await fetch('/api/health', {
        method: 'GET',
        signal: AbortSignal.timeout(3000), // 3 second timeout
      })
      return response.ok
    } catch (error) {
      console.log('[ConnectionStatus] Health check failed:', error instanceof Error ? error.message : 'Unknown error')
      return false
    }
  }, [])

  const updateConnectionState = useCallback((isOnline: boolean, error?: string | null) => {
    setState(prev => ({
      ...prev,
      isOnline,
      lastConnected: isOnline ? new Date() : prev.lastConnected,
      retryAttempts: isOnline ? 0 : prev.retryAttempts,
      error: error || null,
      isReconnecting: !isOnline && prev.retryAttempts < MAX_RETRY_ATTEMPTS,
    }))
  }, [])

  const stopRetryLoop = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = undefined
    }
    setState(prev => ({ ...prev, isReconnecting: false }))
  }, [])

  const startRetryLoop = useCallback(() => {
    if (retryTimeoutRef.current || state.retryAttempts >= MAX_RETRY_ATTEMPTS) {
      return
    }

    setState(prev => ({ ...prev, isReconnecting: true, retryAttempts: prev.retryAttempts + 1 }))

    const retryDelay = RETRY_INTERVALS[Math.min(state.retryAttempts, RETRY_INTERVALS.length - 1)]
    
    retryTimeoutRef.current = setTimeout(async () => {
      const isHealthy = await checkHealth()
      
      if (isHealthy) {
        updateConnectionState(true)
        stopRetryLoop()
      } else if (state.retryAttempts < MAX_RETRY_ATTEMPTS) {
        // Continue retrying
        retryTimeoutRef.current = undefined
        startRetryLoop()
      } else {
        // Max attempts reached
        setState(prev => ({ ...prev, isReconnecting: false, error: 'Connection failed after maximum retry attempts' }))
      }
    }, retryDelay)
  }, [checkHealth, state.retryAttempts, updateConnectionState, stopRetryLoop])

  const startHealthCheck = useCallback(() => {
    if (healthCheckRef.current) {
      clearInterval(healthCheckRef.current)
    }

    healthCheckRef.current = setInterval(async () => {
      const isHealthy = await checkHealth()
      
      if (!isHealthy && state.isOnline) {
        // Connection lost
        updateConnectionState(false, 'Backend server unavailable')
        startRetryLoop()
      } else if (isHealthy && !state.isOnline) {
        // Connection restored
        updateConnectionState(true)
        stopRetryLoop()
      }
    }, HEALTH_CHECK_INTERVAL)
  }, [checkHealth, state.isOnline, updateConnectionState, startRetryLoop, stopRetryLoop])

  const forceReconnect = useCallback(() => {
    setState(prev => ({ ...prev, retryAttempts: 0, error: null }))
    startRetryLoop()
  }, [startRetryLoop])

  useEffect(() => {
    // Initial health check
    checkHealth().then(isHealthy => {
      updateConnectionState(isHealthy, isHealthy ? null : 'Initial connection failed')
      if (!isHealthy) {
        startRetryLoop()
      }
    })

    // Start periodic health checks
    startHealthCheck()

    return () => {
      if (healthCheckRef.current) {
        clearInterval(healthCheckRef.current)
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [checkHealth, updateConnectionState, startRetryLoop, startHealthCheck])

  return {
    ...state,
    forceReconnect,
  }
}