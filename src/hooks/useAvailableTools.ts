/**
 * useAvailableTools Hook
 *
 * SOLID: Single responsibility - Fetches available tools from API
 * DRY: Centralizes tool fetching logic
 * KISS: Simple hook with caching
 * Library-First: Uses SWR-like pattern with built-in React
 */

import { useState, useEffect, useCallback } from 'react'
import ky from 'ky'
import { ToolPermission } from '../types/tool-permissions'

interface AvailableToolsResponse {
  tools: string[]
  toolPermissions: ToolPermission[]
  count: number
}

interface UseAvailableToolsResult {
  tools: string[]
  toolPermissions: ToolPermission[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// Cache for tools to avoid repeated API calls
let cachedTools: AvailableToolsResponse | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function useAvailableTools(): UseAvailableToolsResult {
  const [tools, setTools] = useState<string[]>([])
  const [toolPermissions, setToolPermissions] = useState<ToolPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTools = useCallback(async (forceRefresh = false) => {
    try {
      // Check cache first
      const now = Date.now()
      if (!forceRefresh && cachedTools && now - cacheTimestamp < CACHE_DURATION) {
        setTools(cachedTools.tools)
        setToolPermissions(cachedTools.toolPermissions)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      const apiUrl = window.location.origin.replace('5173', '3457')
      const response = await ky.get(`${apiUrl}/api/tools`).json<AvailableToolsResponse>()

      // Update cache
      cachedTools = response
      cacheTimestamp = now

      setTools(response.tools)
      setToolPermissions(response.toolPermissions)
    } catch (err) {
      console.error('Failed to fetch available tools:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch tools')

      // Fallback to hardcoded list if API fails
      const fallbackTools = [
        'Task',
        'Bash',
        'Glob',
        'Grep',
        'LS',
        'exit_plan_mode',
        'Read',
        'Edit',
        'MultiEdit',
        'Write',
        'NotebookRead',
        'NotebookEdit',
        'WebFetch',
        'TodoRead',
        'TodoWrite',
        'WebSearch',
      ]
      setTools(fallbackTools)
      setToolPermissions(fallbackTools.map((name) => ({ name, enabled: true })))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTools()
  }, [fetchTools])

  const refetch = useCallback(async () => {
    await fetchTools(true)
  }, [fetchTools])

  return {
    tools,
    toolPermissions,
    loading,
    error,
    refetch,
  }
}
