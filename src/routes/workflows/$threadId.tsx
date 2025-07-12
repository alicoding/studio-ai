import { createFileRoute, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { WorkflowDetails } from '../../components/workflow/WorkflowDetails'
import { useWorkflowEvents } from '../../hooks/useWorkflowEvents'

interface WorkflowData {
  threadId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'aborted'
  projectName?: string
  graph: {
    nodes: Array<{
      id: string
      type: string
      data: Record<string, unknown>
      position: { x: number; y: number }
    }>
    edges: Array<{
      id: string
      source: string
      target: string
      type: string
    }>
    execution: {
      path: string[]
      loops: Array<{ nodes: string[]; iterations: number; active: boolean }>
      currentNode?: string
      resumePoints: string[]
      startTime: number
      endTime?: number
    }
  }
}

export const Route = createFileRoute('/workflows/$threadId')({
  component: WorkflowPage,
})

function WorkflowPage() {
  const { threadId } = useParams({ from: '/workflows/$threadId' })
  const [workflow, setWorkflow] = useState<WorkflowData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Listen for workflow events
  useWorkflowEvents()

  useEffect(() => {
    if (!threadId) return

    // Fetch workflow data
    const fetchWorkflow = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/workflow-graph/${threadId}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch workflow: ${response.status}`)
        }

        const data = await response.json()
        setWorkflow(data)
      } catch (err) {
        console.error('Error fetching workflow:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch workflow')
      } finally {
        setLoading(false)
      }
    }

    fetchWorkflow()
  }, [threadId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading workflow...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="text-destructive mb-4">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 15.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Workflow Not Found</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Back to Home
          </a>
        </div>
      </div>
    )
  }

  if (!workflow) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Workflow Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The workflow with ID "{threadId}" could not be found.
          </p>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Back to Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Workflow: {workflow.threadId}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Status:{' '}
              <span
                className={`font-medium ${
                  workflow.status === 'completed'
                    ? 'text-green-500'
                    : workflow.status === 'failed'
                      ? 'text-destructive'
                      : workflow.status === 'running'
                        ? 'text-primary'
                        : 'text-muted-foreground'
                }`}
              >
                {workflow.status}
              </span>
              {workflow.projectName && (
                <span className="ml-4">
                  Project: <span className="font-medium">{workflow.projectName}</span>
                </span>
              )}
            </p>
          </div>
          <a
            href="/"
            className="inline-flex items-center px-3 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
          >
            ← Back to Home
          </a>
        </div>
      </div>

      {/* Workflow Content */}
      <div className="flex-1 overflow-hidden">
        <WorkflowDetails selectedWorkflowId={threadId} className="h-full" />
      </div>
    </div>
  )
}
