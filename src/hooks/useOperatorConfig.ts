/**
 * Operator Configuration Hook
 *
 * SOLID: Single responsibility - operator config management
 * DRY: Reuses API client patterns
 * KISS: Simple interface for operator settings
 * Library-First: Uses React hooks for state management
 */

import { useState, useEffect, useCallback } from 'react'
import ky from 'ky'

interface OperatorConfig {
  model: string
  systemPrompt: string
  temperature: number
  maxTokens: number
  apiKey?: string
  baseURL?: string
}

interface OperatorAnalysis {
  status: 'success' | 'blocked' | 'failed'
  reason?: string
}

const API_BASE = import.meta.env.VITE_API_URL || `${window.location.origin}/api`

export function useOperatorConfig() {
  const [config, setConfig] = useState<OperatorConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Fetch configuration
  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await ky.get(`${API_BASE}/operator/config`).json<OperatorConfig>()
      setConfig(response)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch config'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load config on mount
  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  // Update configuration
  const updateConfig = useCallback(async (updates: Partial<OperatorConfig>) => {
    try {
      const response = await ky
        .put(`${API_BASE}/operator/config`, {
          json: updates,
        })
        .json<OperatorConfig>()
      setConfig(response)
      return response
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update config')
    }
  }, [])

  // Reset to default
  const resetConfig = useCallback(async () => {
    try {
      const response = await ky.post(`${API_BASE}/operator/reset`).json<OperatorConfig>()
      setConfig(response)
      return response
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to reset config')
    }
  }, [])

  // Test operator
  const testOperator = useCallback(async (text: string) => {
    try {
      const response = await ky
        .post(`${API_BASE}/operator/test`, {
          json: { text },
        })
        .json<OperatorAnalysis>()
      return response
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to test operator')
    }
  }, [])

  return {
    config,
    isLoading,
    error,
    updateConfig,
    resetConfig,
    testOperator,
  }
}
