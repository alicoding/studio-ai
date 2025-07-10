import { useEffect, useRef, useState, useCallback } from 'react'
import { useWorkflowStore, WorkflowInfo } from '../stores/workflows'

interface SSEWorkflowEvent {
  type: 'step_start' | 'step_complete' | 'step_failed' | 'workflow_complete' | 'workflow_failed'
  threadId: string
  stepId?: string
  data: {
    agentId?: string
    sessionId?: string
    error?: string
    output?: string
    currentStep?: string
    status?: WorkflowInfo['status']
    task?: string
    role?: string
  }
  timestamp: string
}

interface UseWorkflowSSEOptions {
  threadId: string
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
}

export const useWorkflowSSE = ({
  threadId,
  onConnect,
  onDisconnect,
  onError,
}: UseWorkflowSSEOptions) => {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const { updateWorkflow, updateStep } = useWorkflowStore()

  const handleWorkflowEvent = useCallback(
    (event: SSEWorkflowEvent) => {
      const { type, threadId: eventThreadId, stepId, data, timestamp } = event

      switch (type) {
        case 'step_start':
          if (stepId) {
            updateStep(eventThreadId, stepId, {
              status: 'running',
              startTime: timestamp,
              agentId: data.agentId,
            })
            updateWorkflow(eventThreadId, {
              currentStep: stepId,
            })
          }
          break

        case 'step_complete':
          if (stepId) {
            updateStep(eventThreadId, stepId, {
              status: 'completed',
              endTime: timestamp,
            })
          }
          break

        case 'step_failed':
          if (stepId) {
            updateStep(eventThreadId, stepId, {
              status: 'failed',
              endTime: timestamp,
              error: data.error,
            })
          }
          break

        case 'workflow_complete':
          updateWorkflow(eventThreadId, {
            status: 'completed',
            currentStep: undefined,
          })
          break

        case 'workflow_failed':
          updateWorkflow(eventThreadId, {
            status: 'failed',
            currentStep: data.currentStep,
          })
          break

        default:
          console.warn('Unknown SSE event type:', type)
      }
    },
    [updateWorkflow, updateStep]
  )

  useEffect(() => {
    if (!threadId) return

    const eventSource = new EventSource(`/api/invoke/stream/${threadId}`)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setIsConnected(true)
      setError(null)
      onConnect?.()
    }

    eventSource.onerror = (event) => {
      setIsConnected(false)
      setError('Connection error')
      onError?.(event)
    }

    eventSource.onmessage = (event) => {
      try {
        const sseEvent: SSEWorkflowEvent = JSON.parse(event.data)
        handleWorkflowEvent(sseEvent)
      } catch (err) {
        console.error('Failed to parse SSE event:', err)
        setError('Failed to parse event data')
      }
    }

    return () => {
      eventSource.close()
      setIsConnected(false)
      onDisconnect?.()
    }
  }, [threadId, onConnect, onDisconnect, onError, handleWorkflowEvent])

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
      setIsConnected(false)
    }
  }

  const reconnect = () => {
    disconnect()
    // Trigger useEffect to reconnect
    setError(null)
  }

  return {
    isConnected,
    error,
    disconnect,
    reconnect,
  }
}

// Note: For monitoring multiple workflows, use separate useWorkflowSSE hooks
// in the component for each workflow, as hooks cannot be called conditionally
