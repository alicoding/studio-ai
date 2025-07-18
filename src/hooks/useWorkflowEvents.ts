/**
 * Global workflow events hook - listens to SSE for all workflow updates
 *
 * SOLID: Single responsibility - global workflow event handling
 * DRY: One SSE connection for all workflows
 * KISS: Simple event-based updates to store
 */

import { useEffect, useRef } from 'react'
import { useWorkflowStore } from '../stores/workflows'

export const useWorkflowEvents = (projectId?: string) => {
  const eventSourceRef = useRef<EventSource | null>(null)
  const fetchWorkflows = useWorkflowStore((state) => state.fetchWorkflows)
  const updateWorkflow = useWorkflowStore((state) => state.updateWorkflow)
  const updateStep = useWorkflowStore((state) => state.updateStep)

  // Initial fetch on mount and when project changes
  useEffect(() => {
    fetchWorkflows(projectId)
  }, [fetchWorkflows, projectId])

  useEffect(() => {
    // Create project-scoped SSE connection for workflow events
    // Use window.location.origin (dev server has Redis cross-server communication)
    const url = new URL(`${window.location.origin}/api/invoke-status/events`)
    if (projectId) {
      url.searchParams.set('projectId', projectId)
    }
    const sseUrl = url.toString()
    console.log('[WorkflowEvents] Creating project-scoped SSE connection to:', sseUrl)

    const eventSource = new EventSource(sseUrl)
    eventSourceRef.current = eventSource
    let reconnectAttempts = 0
    const maxReconnectAttempts = 3

    eventSource.onopen = () => {
      console.log('[WorkflowEvents] Connected to global workflow events')
      reconnectAttempts = 0 // Reset on successful connection
    }

    eventSource.onerror = () => {
      // SSE will automatically reconnect, but we need to prevent infinite loops
      // EventSource fires error event before each reconnection attempt
      if (eventSource.readyState === EventSource.CONNECTING) {
        reconnectAttempts++
        console.warn(
          `[WorkflowEvents] SSE reconnecting... (attempt ${reconnectAttempts}/${maxReconnectAttempts})`
        )

        if (reconnectAttempts >= maxReconnectAttempts) {
          console.log('[WorkflowEvents] Max reconnection attempts reached. Closing connection.')
          eventSource.close()
          eventSourceRef.current = null
          return
        }
      } else if (eventSource.readyState === EventSource.CLOSED) {
        console.log('[WorkflowEvents] SSE connection closed')
        eventSourceRef.current = null
      }
    }

    // Handle workflow created events
    eventSource.addEventListener('workflow_created', (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('[WorkflowEvents] New workflow created:', data)

        // Don't call fetchWorkflows() to avoid overriding local deletions
        // The workflow will appear on next manual refresh or page reload
        console.log('[WorkflowEvents] Skipping fetchWorkflows() to preserve local state changes')
      } catch (error) {
        console.error('[WorkflowEvents] Failed to parse workflow_created event:', error)
      }
    })

    // Handle workflow status updates
    eventSource.addEventListener('workflow_status', (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('[WorkflowEvents] Workflow status update:', data)

        updateWorkflow(data.threadId, {
          status: data.status,
          currentStep: data.currentStep,
        })
      } catch (error) {
        console.error('[WorkflowEvents] Failed to parse workflow_status event:', error)
      }
    })

    // Handle step updates
    eventSource.addEventListener('step_update', (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('[WorkflowEvents] Step update:', data)

        updateStep(data.threadId, data.stepId, {
          status: data.status,
          startTime: data.startTime,
          endTime: data.endTime,
          error: data.error,
        })
      } catch (error) {
        console.error('[WorkflowEvents] Failed to parse step_update event:', error)
      }
    })

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        console.log('[WorkflowEvents] Closing SSE connection')
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]) // Recreate connection when project changes for proper isolation

  return {
    isConnected: eventSourceRef.current?.readyState === EventSource.OPEN,
  }
}
