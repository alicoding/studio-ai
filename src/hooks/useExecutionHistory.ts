/**
 * Execution History Hook
 *
 * SOLID: Single responsibility - manage execution history state and API calls
 * DRY: Reusable hook for execution history operations
 * KISS: Simple hook with clear interface
 * Library-First: Uses ky for HTTP requests
 */

import { useState, useCallback } from 'react'
import ky from 'ky'

const API_BASE = import.meta.env.VITE_API_BASE || `${window.location.origin}/api`

interface ExecutionSummary {
  savedWorkflowId: string
  total: number
  completed: number
  failed: number
  running: number
  lastExecution: string | null
  successRate: number
}

interface WorkflowExecution {
  threadId: string
  savedWorkflowId?: string
  status: 'running' | 'completed' | 'failed' | 'aborted'
  projectId?: string
  projectName?: string
  startedBy?: string
  invocation?: string
  lastUpdate: string
  createdAt: string
  steps: Array<{
    id: string
    status: string
    task: string
  }>
}

interface ExecutionHistoryResponse {
  savedWorkflowId: string
  executions: WorkflowExecution[]
  summary: ExecutionSummary
}

export function useExecutionHistory() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchExecutionHistory = useCallback(
    async (savedWorkflowId: string): Promise<ExecutionHistoryResponse | null> => {
      setLoading(true)
      setError(null)

      try {
        const response = await ky
          .get(`${API_BASE}/workflows/execution-history/${savedWorkflowId}`)
          .json<ExecutionHistoryResponse>()
        return response
      } catch (err) {
        console.error('Failed to fetch execution history:', err)
        setError('Failed to load execution history')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const fetchExecutionSummary = useCallback(
    async (savedWorkflowId: string): Promise<ExecutionSummary | null> => {
      setLoading(true)
      setError(null)

      try {
        const response = await ky
          .get(`${API_BASE}/workflows/execution-history/${savedWorkflowId}/summary`)
          .json<ExecutionSummary>()
        return response
      } catch (err) {
        console.error('Failed to fetch execution summary:', err)
        setError('Failed to load execution summary')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return {
    loading,
    error,
    fetchExecutionHistory,
    fetchExecutionSummary,
  }
}

export type { ExecutionHistoryResponse, ExecutionSummary, WorkflowExecution }
