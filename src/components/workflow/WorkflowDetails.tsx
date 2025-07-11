/**
 * Workflow Details Component - Canvas-based workflow view
 *
 * SOLID: Single responsibility - workflow details display
 * DRY: Reuses existing workflow components and store
 * KISS: Simple details view with graph visualization
 * State Preservation: Maintains workflow selection and view state
 */

import React, { useState } from 'react'
import { useWorkflowStore } from '../../stores/workflows'
import { WorkflowGraph } from './WorkflowGraph'
import { Activity, Clock, User, GitBranch, List, Network } from 'lucide-react'

interface WorkflowDetailsProps {
  selectedWorkflowId: string | null
  className?: string
}

export const WorkflowDetails: React.FC<WorkflowDetailsProps> = ({
  selectedWorkflowId,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'steps' | 'graph'>('steps')
  const workflows = useWorkflowStore((state) => state.workflows)

  if (!selectedWorkflowId) {
    return (
      <div className={`flex items-center justify-center h-full p-8 ${className}`}>
        <div className="text-center text-muted-foreground">
          <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">No Workflow Selected</h3>
          <p className="text-sm">Select a workflow from the sidebar to view details</p>
        </div>
      </div>
    )
  }

  const workflow = workflows[selectedWorkflowId]

  if (!workflow) {
    return (
      <div className={`flex items-center justify-center h-full p-8 ${className}`}>
        <div className="text-center text-muted-foreground">
          <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">Workflow Not Found</h3>
          <p className="text-sm">The selected workflow could not be loaded</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`workflow-details h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="border-b border-border p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">
              {workflow.invocation || `Workflow ${workflow.threadId.substring(0, 8)}...`}
            </h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>{workflow.startedBy}</span>
              </div>
              <div className="flex items-center gap-1">
                <GitBranch className="w-4 h-4" />
                <span>{workflow.projectName || 'Unknown project'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{new Date(workflow.lastUpdate).toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center border border-border rounded-lg p-1">
              <button
                onClick={() => setViewMode('steps')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === 'steps'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <List className="w-4 h-4" />
                Steps
              </button>
              <button
                onClick={() => setViewMode('graph')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === 'graph'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Network className="w-4 h-4" />
                Graph
              </button>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                workflow.status === 'running'
                  ? 'bg-blue-500/20 text-blue-500'
                  : workflow.status === 'completed'
                    ? 'bg-green-500/20 text-green-500'
                    : workflow.status === 'failed'
                      ? 'bg-red-500/20 text-red-500'
                      : workflow.status === 'aborted'
                        ? 'bg-orange-500/20 text-orange-500'
                        : 'bg-gray-500/20 text-gray-500'
              }`}
            >
              {workflow.status}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        {viewMode === 'steps' ? (
          /* Step List View - Full Width */
          <div className="h-full">
            <h3 className="text-lg font-medium mb-4">Steps ({workflow.steps.length})</h3>
            <div className="space-y-3 overflow-y-auto h-[calc(100%-3rem)]">
              {workflow.steps.map((step, index) => (
                <div key={step.id} className="p-4 border border-border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-muted-foreground">{index + 1}.</span>
                      <span className="font-medium">{step.id}</span>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        step.status === 'running'
                          ? 'bg-blue-500/20 text-blue-500'
                          : step.status === 'completed'
                            ? 'bg-green-500/20 text-green-500'
                            : step.status === 'failed'
                              ? 'bg-red-500/20 text-red-500'
                              : 'bg-gray-500/20 text-gray-500'
                      }`}
                    >
                      {step.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{step.task}</p>
                  {step.role && (
                    <div className="text-xs text-muted-foreground">Role: {step.role}</div>
                  )}
                  {step.agentId && (
                    <div className="text-xs text-muted-foreground">Agent: {step.agentId}</div>
                  )}
                  {step.error && (
                    <div className="text-xs text-red-500 mt-2 p-2 bg-red-500/10 rounded">
                      Error: {step.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Workflow Graph View - Full Width */
          <div className="h-full">
            <h3 className="text-lg font-medium mb-4">Workflow Graph</h3>
            <div className="h-[calc(100%-3rem)] border border-border rounded-lg overflow-hidden">
              <WorkflowGraph
                threadId={workflow.threadId}
                data={{
                  nodes: workflow.steps.map((step, index) => ({
                    id: step.id,
                    type: 'step' as const,
                    data: {
                      agentId: step.agentId,
                      role: step.role,
                      task: step.task,
                      status: step.status,
                      startTime: step.startTime ? new Date(step.startTime).getTime() : undefined,
                      endTime: step.endTime ? new Date(step.endTime).getTime() : undefined,
                      error: step.error,
                    },
                    position: {
                      x: 100 + (index % 3) * 250,
                      y: 100 + Math.floor(index / 3) * 150,
                    },
                  })),
                  edges: [],
                  execution: {
                    path: workflow.steps.map((step) => step.id),
                    loops: [],
                    currentNode: workflow.currentStep,
                    resumePoints: [],
                    startTime: new Date(workflow.lastUpdate).getTime(),
                  },
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
