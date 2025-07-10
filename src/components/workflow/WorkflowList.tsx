import React, { useEffect } from 'react'
import { useWorkflowStore, WorkflowInfo, WorkflowStep } from '../../stores/workflows'
import { useWorkflowSSE } from '../../hooks/useWorkflowSSE'

interface WorkflowListProps {
  className?: string
}

const StatusIcon: React.FC<{ status: WorkflowInfo['status'] | WorkflowStep['status'] }> = ({
  status,
}) => {
  switch (status) {
    case 'running':
      return <span className="text-blue-500">🔄</span>
    case 'completed':
      return <span className="text-green-500">✅</span>
    case 'failed':
      return <span className="text-red-500">❌</span>
    case 'pending':
      return <span className="text-gray-500">⏳</span>
    case 'aborted':
      return <span className="text-yellow-500">⏹️</span>
    default:
      return <span className="text-gray-400">❓</span>
  }
}

const WorkflowStepItem: React.FC<{ step: WorkflowStep }> = ({ step }) => {
  const duration =
    step.startTime && step.endTime
      ? `${Math.round((new Date(step.endTime).getTime() - new Date(step.startTime).getTime()) / 1000)}s`
      : step.startTime
        ? `${Math.round((Date.now() - new Date(step.startTime).getTime()) / 1000)}s`
        : ''

  return (
    <div className="ml-4 text-sm border-l-2 border-gray-200 pl-3 py-1">
      <div className="flex items-center gap-2">
        <StatusIcon status={step.status} />
        <span className="font-medium">{step.id}:</span>
        <span className="text-gray-600 truncate">&quot;{step.task}&quot;</span>
        {step.agentId && <span className="text-blue-600 text-xs">({step.agentId})</span>}
        {duration && <span className="text-gray-500 text-xs">{duration}</span>}
      </div>
      {step.error && <div className="text-red-600 text-xs mt-1 pl-6">Error: {step.error}</div>}
    </div>
  )
}

const WorkflowItem: React.FC<{ workflow: WorkflowInfo }> = ({ workflow }) => {
  const { isConnected, error } = useWorkflowSSE({
    threadId: workflow.threadId,
    onConnect: () => console.log(`Connected to workflow ${workflow.threadId}`),
    onDisconnect: () => console.log(`Disconnected from workflow ${workflow.threadId}`),
    onError: () => console.error(`SSE error for workflow ${workflow.threadId}`),
  })

  const handleRetry = async () => {
    try {
      // Call the invoke endpoint to retry the workflow
      const response = await fetch('/api/invoke/async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threadId: workflow.threadId, // Use same threadId to resume
          workflow: workflow.steps.map((step) => ({
            id: step.id,
            role: step.role,
            agentId: step.agentId,
            task: step.task,
            dependencies: step.dependencies,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to retry workflow: ${response.statusText}`)
      }

      console.log(`Retrying workflow ${workflow.threadId}`)
    } catch (err) {
      console.error('Failed to retry workflow:', err)
    }
  }

  const truncatedInvocation =
    workflow.invocation.length > 60
      ? `${workflow.invocation.substring(0, 60)}...`
      : workflow.invocation

  return (
    <div className="border border-gray-200 rounded-lg p-3 mb-3 bg-white shadow-sm">
      {/* Workflow Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <StatusIcon status={workflow.status} />
          <span className="font-semibold text-sm">
            Workflow {workflow.threadId.substring(0, 8)}...
          </span>
          <span className="text-xs text-gray-500">({workflow.status})</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {workflow.status === 'failed' && (
            <button
              onClick={handleRetry}
              className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
            >
              Retry
            </button>
          )}
          {!isConnected && workflow.status === 'running' && (
            <span className="text-xs text-red-500" title="SSE disconnected">
              📡❌
            </span>
          )}
          {error && (
            <span className="text-xs text-red-500" title={`SSE error: ${error}`}>
              ⚠️
            </span>
          )}
        </div>
      </div>

      {/* Workflow Context */}
      <div className="text-xs text-gray-600 mb-2 space-y-1">
        <div>
          <span className="font-medium">Invocation:</span> {truncatedInvocation}
        </div>
        <div>
          <span className="font-medium">Started by:</span> {workflow.startedBy}
        </div>
        {workflow.projectName && (
          <div>
            <span className="font-medium">Project:</span> {workflow.projectName}
          </div>
        )}
        {workflow.webhook && (
          <div>
            <span className="font-medium">Webhook:</span> {workflow.webhook}
            {workflow.webhookType && (
              <span className="text-gray-500"> ({workflow.webhookType})</span>
            )}
          </div>
        )}
        {!workflow.webhook && (
          <div className="text-gray-500">
            <span className="font-medium">Webhook:</span> Not configured
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-1">
        {workflow.steps.map((step) => (
          <WorkflowStepItem key={step.id} step={step} />
        ))}
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
        Last updated: {new Date(workflow.lastUpdate).toLocaleTimeString()}
      </div>
    </div>
  )
}

export const WorkflowList: React.FC<WorkflowListProps> = ({ className = '' }) => {
  const { workflows, fetchWorkflows } = useWorkflowStore()
  const workflowList = Object.values(workflows)

  // Fetch workflows when component mounts
  useEffect(() => {
    fetchWorkflows()
  }, [fetchWorkflows])

  // Sort workflows: running first, then by last update
  const sortedWorkflows = workflowList.sort((a, b) => {
    if (a.status === 'running' && b.status !== 'running') return -1
    if (b.status === 'running' && a.status !== 'running') return 1
    return new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime()
  })

  if (workflowList.length === 0) {
    return (
      <div className={`text-gray-500 text-sm p-4 text-center ${className}`}>
        No workflows to display
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Workflows ({workflowList.length})</h3>
        {workflowList.some((w) => w.status === 'running') && (
          <div className="flex items-center gap-1 text-xs text-blue-600">
            <span className="animate-pulse">●</span>
            <span>Live</span>
          </div>
        )}
      </div>

      {sortedWorkflows.map((workflow) => (
        <WorkflowItem key={workflow.threadId} workflow={workflow} />
      ))}
    </div>
  )
}
