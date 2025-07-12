/**
 * Workflow Graph Hook
 * Manages workflow graph data fetching and real-time updates
 *
 * SOLID: Single responsibility - workflow graph state management
 * DRY: Reuses existing service patterns
 * KISS: Simple hook interface with loading states
 * Library-First: Uses React hooks and service pattern
 */

import { useState, useEffect, useCallback } from 'react'
import { WorkflowGraphService, type WorkflowGraphResponse } from '../services/workflowGraphService'

interface UseWorkflowGraphResult {
  graphData: WorkflowGraphResponse | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useWorkflowGraph(threadId: string | null, consolidateLoops = false): UseWorkflowGraphResult {
  const [graphData, setGraphData] = useState<WorkflowGraphResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGraphData = useCallback(async () => {
    if (!threadId) {
      setGraphData(null)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log(`[useWorkflowGraph] Fetching graph data for ${threadId}, consolidateLoops=${consolidateLoops}`)
      const data = await WorkflowGraphService.getWorkflowGraph(threadId, consolidateLoops)
      console.log(`[useWorkflowGraph] Received data with ${data.graph.nodes.length} nodes`)
      setGraphData(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load workflow graph'
      setError(errorMessage)
      setGraphData(null)
    } finally {
      setLoading(false)
    }
  }, [threadId, consolidateLoops])

  useEffect(() => {
    fetchGraphData()
  }, [fetchGraphData])

  // Listen for workflow updates via custom events
  useEffect(() => {
    if (!threadId) return

    const handleWorkflowUpdate = (event: CustomEvent) => {
      const { threadId: updatedThreadId } = event.detail
      if (updatedThreadId === threadId) {
        // Refetch graph data when workflow updates
        fetchGraphData()
      }
    }

    window.addEventListener('workflow:update', handleWorkflowUpdate as EventListener)

    return () => {
      window.removeEventListener('workflow:update', handleWorkflowUpdate as EventListener)
    }
  }, [threadId, fetchGraphData])

  return {
    graphData,
    loading,
    error,
    refetch: fetchGraphData,
  }
}
