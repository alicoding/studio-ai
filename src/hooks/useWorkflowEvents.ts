/**
 * Global workflow events hook - listens to SSE for all workflow updates
 *
 * SOLID: Single responsibility - global workflow event handling
 * DRY: One SSE connection for all workflows
 * KISS: Simple event-based updates to store
 */

import { useEffect, useRef } from 'react'
import { useWorkflowStore } from '../stores/workflows'

export const useWorkflowEvents = () => {
  const eventSourceRef = useRef<EventSource | null>(null)
  const fetchWorkflows = useWorkflowStore((state) => state.fetchWorkflows)
  const updateWorkflow = useWorkflowStore((state) => state.updateWorkflow)
  const updateStep = useWorkflowStore((state) => state.updateStep)

  // Initial fetch on mount only
  useEffect(() => {
    fetchWorkflows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty dependency array for mount-only effect

  useEffect(() => {
    // Create global SSE connection for workflow events
    // Use full URL to ensure it connects to the correct server
    const eventSource = new EventSource(`${window.location.origin}/api/invoke-status/events`)
    eventSourceRef.current = eventSource
    let reconnectAttempts = 0
    const maxReconnectAttempts = 3

    eventSource.onopen = () => {
      console.log('[WorkflowEvents] Connected to global workflow events')
      reconnectAttempts = 0 // Reset on successful connection
    }

    eventSource.onerror = (error) => {
      console.error('[WorkflowEvents] SSE error:', error)

      // Check if this is a connection failure
      if (eventSource.readyState === EventSource.CLOSED) {
        reconnectAttempts++

        if (reconnectAttempts >= maxReconnectAttempts) {
          console.error('[WorkflowEvents] Max reconnection attempts reached. Stopping.')
          eventSource.close()
          eventSourceRef.current = null
        }
      }
    }

    // Handle workflow created events
    eventSource.addEventListener('workflow_created', (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('[WorkflowEvents] New workflow created:', data)

        // Fetch workflows again to get the new one
        fetchWorkflows()
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
  }, []) // Empty dependency array - store functions are stable

  return {
    isConnected: eventSourceRef.current?.readyState === EventSource.OPEN,
  }
}
