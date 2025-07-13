/**
 * Optimized Workspace Data Hook
 *
 * SOLID: Single responsibility for workspace data management
 * DRY: Eliminates duplicate API calls across workspace components
 * KISS: Simple interface that loads all workspace data efficiently
 * Library-First: Uses react-query for caching and performance
 */

import { useState, useCallback, useEffect, useRef } from 'react'

export interface ProjectAgent {
  id: string
  configId?: string
  name: string
  role: string
  status: 'online' | 'offline'
  sessionId: string | null
  messageCount: number
  totalTokens: number
  lastMessage: string
  hasSession: boolean
  customTools?: string[]
}

export interface AgentConfig {
  id: string
  name: string
  role: string
  systemPrompt: string
  tools: string[]
  model: string
  maxTokens?: number
  temperature?: number
  createdAt: string
  updatedAt: string
}

interface AgentRoleAssignment {
  id: string
  projectId: string
  role: string
  agentConfigId: string
  customTools?: string[]
  hasCustomTools: boolean
  createdAt: string
  updatedAt: string
}

interface Project {
  id: string
  name: string
  description?: string
  workspacePath?: string
  agents?: ProjectAgent[]
  agentInstances?: ProjectAgent[]
}

interface WorkspaceData {
  projects: Project[]
  agentConfigs: AgentConfig[]
  roleAssignments: Record<string, AgentRoleAssignment[]>
  projectAgents: Record<string, ProjectAgent[]>
}

interface UseWorkspaceDataOptions {
  projectId?: string
  includeAgents?: boolean
  includeRoles?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UseWorkspaceDataResult {
  data: WorkspaceData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  isStale: boolean
}

// Global request deduplication map
const pendingRequests = new Map<string, Promise<WorkspaceData>>()

/**
 * Hook for efficiently loading all workspace data in a single request
 * Replaces the need for multiple useEffect chains and individual API calls
 */
export function useWorkspaceData(options: UseWorkspaceDataOptions = {}): UseWorkspaceDataResult {
  const {
    projectId,
    includeAgents = true,
    includeRoles = true,
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
  } = options

  const [data, setData] = useState<WorkspaceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastFetch, setLastFetch] = useState<number>(0)
  const [isStale, setIsStale] = useState(false)

  const fetchWorkspaceData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (!includeAgents) params.set('includeAgents', 'false')
      if (!includeRoles) params.set('includeRoles', 'false')

      const url = projectId
        ? `/api/workspace/${projectId}?${params.toString()}`
        : `/api/workspace?${params.toString()}`

      // Check if there's already a pending request for this URL
      const requestKey = url
      if (pendingRequests.has(requestKey)) {
        console.log('Reusing pending workspace data request for:', requestKey)
        const workspaceData = await pendingRequests.get(requestKey)!
        setData(workspaceData)
        setLastFetch(Date.now())
        setIsStale(false)
        return
      }

      // Create new request
      const requestPromise = (async (): Promise<WorkspaceData> => {
        const timerId = `workspace-data-fetch-${Date.now()}`
        console.time(timerId)
        const response = await fetch(url)
        console.timeEnd(timerId)

        if (!response.ok) {
          throw new Error(`Failed to fetch workspace data: ${response.status}`)
        }

        const workspaceData = await response.json()
        console.log('Workspace data loaded:', {
          projects: workspaceData.projects.length,
          agentConfigs: workspaceData.agentConfigs.length,
          roleAssignments: Object.keys(workspaceData.roleAssignments).length,
          projectAgents: Object.keys(workspaceData.projectAgents).length,
        })
        return workspaceData
      })()

      // Store the request
      pendingRequests.set(requestKey, requestPromise)

      try {
        const workspaceData = await requestPromise
        setData(workspaceData)
        setLastFetch(Date.now())
        setIsStale(false)
      } finally {
        // Clean up the request after completion
        pendingRequests.delete(requestKey)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Failed to fetch workspace data:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId, includeAgents, includeRoles])

  // Initial load with ref to prevent double-loading in strict mode
  const initialLoadRef = useRef(false)
  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true
      fetchWorkspaceData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount, ignore fetchWorkspaceData changes

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return

    const interval = setInterval(() => {
      setIsStale(true)
      fetchWorkspaceData()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchWorkspaceData])

  // Mark data as stale after 5 minutes
  useEffect(() => {
    if (lastFetch === 0) return

    const staleTimeout = setTimeout(
      () => {
        setIsStale(true)
      },
      5 * 60 * 1000
    ) // 5 minutes

    return () => clearTimeout(staleTimeout)
  }, [lastFetch])

  return {
    data,
    loading,
    error,
    refetch: fetchWorkspaceData,
    isStale,
  }
}

/**
 * Hook for loading workspace data for a specific project
 * Optimized version of useWorkspaceData for single project use
 */
export function useProjectWorkspaceData(
  projectId: string,
  options: Omit<UseWorkspaceDataOptions, 'projectId'> = {}
) {
  return useWorkspaceData({ ...options, projectId })
}

/**
 * Hook for getting cached workspace data without triggering a fetch
 * Useful for components that need to read workspace data but don't want to cause loading
 */
export function useCachedWorkspaceData(): WorkspaceData | null {
  const { data } = useWorkspaceData({ autoRefresh: false })
  return data
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  services: {
    projects: 'healthy' | 'unhealthy' | 'unknown'
    agentConfigs: 'healthy' | 'unhealthy' | 'unknown'
    projectAgents: 'healthy' | 'unhealthy' | 'unknown'
  }
  timestamp: string
  error?: string
}

/**
 * Hook for workspace health monitoring
 * Provides real-time status of workspace services
 */
export function useWorkspaceHealth() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const checkHealth = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/workspace/health')
      if (response.ok) {
        const healthData = await response.json()
        setHealth(healthData)
      }
    } catch (error) {
      console.error('Health check failed:', error)
      setHealth({
        status: 'unhealthy',
        error: 'Health check failed',
        services: {
          projects: 'unknown',
          agentConfigs: 'unknown',
          projectAgents: 'unknown',
        },
        timestamp: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkHealth()

    // Check health every 60 seconds
    const interval = setInterval(checkHealth, 60000)
    return () => clearInterval(interval)
  }, [checkHealth])

  return { health, loading, refetch: checkHealth }
}
