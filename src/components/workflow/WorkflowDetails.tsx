/**
 * Workflow Details Component - Canvas-based workflow view
 *
 * SOLID: Single responsibility - workflow details display
 * DRY: Reuses existing workflow components and store
 * KISS: Simple details view with graph visualization
 * State Preservation: Maintains workflow selection and view state
 */

import React, { useState, useEffect } from 'react'
import { useWorkflowStore } from '../../stores/workflows'
import { useProjectStore } from '../../stores/projects'
import { WorkflowGraph } from './WorkflowGraph'
import { WorkflowStepList } from './WorkflowStepList'
import { useWorkflowGraph } from '../../hooks/useWorkflowGraph'
import { WorkflowGraphService } from '../../services/workflowGraphService'
import {
  Activity,
  Clock,
  User,
  GitBranch,
  List,
  Network,
  Copy,
  CheckCircle,
  PlayCircle,
} from 'lucide-react'

interface WorkflowDetailsProps {
  selectedWorkflowId: string | null
  className?: string
}

export const WorkflowDetails: React.FC<WorkflowDetailsProps> = ({
  selectedWorkflowId,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'steps' | 'graph'>('steps')
  const [copied, setCopied] = useState(false)
  const [resuming, setResuming] = useState(false)
  const workflows = useWorkflowStore((state) => state.workflows)
  const fetchWorkflows = useWorkflowStore((state) => state.fetchWorkflows)
  const { graphData, loading: graphLoading } = useWorkflowGraph(
    selectedWorkflowId,
    viewMode === 'graph'
  )

  // Get current workspace project
  const { activeProjectId, projects } = useProjectStore()
  const currentProject = projects.find((p) => p.id === activeProjectId)

  // Remove debug console logs when component unmounts
  useEffect(() => {
    return () => {
      // Cleanup if needed
    }
  }, [])

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

  // Create debug info for easy troubleshooting
  const debugInfo = {
    threadId: workflow.threadId,
    status: workflow.status,
    workspaceProject: currentProject?.name || 'No active project',
    storedProjectName: workflow.projectName || 'Not stored',
    lastUpdate: workflow.lastUpdate,
    steps: workflow.steps.map((s) => ({
      id: s.id,
      role: s.role,
      agentId: s.agentId,
      status: s.status,
      task: s.task.substring(0, 50) + '...',
    })),
    nodeOrder: graphData?.graph.nodes.map((n) => `${n.id} (${n.type})`) || [],
    files: {
      workflowDetails: 'src/components/workflow/WorkflowDetails.tsx',
      workflowOrchestrator: 'web/server/services/WorkflowOrchestrator.ts',
      workflowGraphGenerator: 'web/server/services/WorkflowGraphGenerator.ts',
      workflowGraphAPI: 'web/server/api/workflow-graph.ts',
    },
  }

  // Calculate resume points from workflow data (DRY principle - don't depend on graph API)
  const getResumePoints = () => {
    if (!workflow) return []

    // Resume points are failed steps that can be restarted
    return workflow.steps.filter((step) => step.status === 'failed').map((step) => step.id)
  }

  const resumePoints = getResumePoints()
  const canResume =
    resumePoints.length > 0 && (workflow?.status === 'failed' || workflow?.status === 'aborted')

  const handleResume = async () => {
    if (!workflow || resuming || !canResume) return

    setResuming(true)
    try {
      // Convert workflow steps to the format expected by the API
      const workflowSteps = workflow.steps.map((step) => ({
        id: step.id,
        role: step.role,
        task: step.task,
        deps: step.dependencies || [],
      }))

      // Call the resume API
      const result = await WorkflowGraphService.resumeWorkflow(workflow.threadId, workflowSteps)

      // Show success message with resume points from our calculation
      alert(
        `Workflow resumed successfully!\n\nThread ID: ${result.threadId}\nStatus: ${result.status}\n\nThe workflow will continue from the resume points:\n${resumePoints.join(', ')}`
      )

      // Refresh workflow data without full page reload
      await fetchWorkflows()
    } catch (error) {
      console.error('Failed to resume workflow:', error)
      alert(
        `Failed to resume workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } finally {
      setResuming(false)
    }
  }

  const copyDebugInfo = () => {
    const debugText = `WORKFLOW DEBUG INFO:
===================
Thread ID: ${debugInfo.threadId}
Status: ${debugInfo.status}
Workspace Project: ${debugInfo.workspaceProject}
Stored Project Name: ${debugInfo.storedProjectName}
Last Update: ${debugInfo.lastUpdate}

Steps: ${JSON.stringify(debugInfo.steps, null, 2)}

Node Order: ${debugInfo.nodeOrder.join(' → ')}

Key Files:
- ${debugInfo.files.workflowDetails}
- ${debugInfo.files.workflowOrchestrator}
- ${debugInfo.files.workflowGraphGenerator}
- ${debugInfo.files.workflowGraphAPI}

Debug Commands:
curl -s "http://localhost:3457/api/workflow-graph/${debugInfo.threadId}" | jq
`
    navigator.clipboard.writeText(debugText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`workflow-details h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="border-b border-border p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-1">
              {workflow.invocation || `Workflow ${workflow.threadId.substring(0, 8)}...`}
            </h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <code className="bg-secondary px-2 py-0.5 rounded font-mono">
                {workflow.threadId}
              </code>
              <button
                onClick={copyDebugInfo}
                className="flex items-center gap-1 px-2 py-0.5 bg-secondary hover:bg-secondary/80 rounded transition-colors"
                title="Copy debug info for troubleshooting"
              >
                {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied!' : 'Copy Debug Info'}</span>
              </button>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{workflow.startedBy}</span>
              </div>
              <div className="flex items-center gap-1">
                <GitBranch className="w-3 h-3" />
                <span>{currentProject?.name || workflow.projectName || 'Unknown project'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{new Date(workflow.lastUpdate).toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Resume Button - Show if workflow can be resumed */}
            {canResume && (
              <button
                onClick={handleResume}
                disabled={resuming}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
                  resuming
                    ? 'bg-amber-400 text-white cursor-not-allowed opacity-75'
                    : 'bg-amber-500 text-white hover:bg-amber-600'
                }`}
                title={`Resume workflow from ${resumePoints.length} checkpoint${resumePoints.length > 1 ? 's' : ''}: ${resumePoints.join(', ')}`}
              >
                <PlayCircle className="w-4 h-4" />
                {resuming ? 'Resuming...' : 'Resume Workflow'}
              </button>
            )}
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
              data-testid="workflow-status"
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
      <div className="flex-1 overflow-hidden">
        {viewMode === 'steps' ? (
          /* Step List View - Full Width */
          <div className="h-full overflow-y-auto p-6">
            <h3 className="text-lg font-medium mb-4 sticky top-0 bg-background z-10">
              Execution Flow ({graphData ? graphData.graph.nodes.length : workflow.steps.length}{' '}
              steps)
            </h3>
            {graphData && graphData.graph.nodes.length > 0 ? (
              // Use the new WorkflowStepList component with loop visualization
              <WorkflowStepList
                nodes={graphData.graph.nodes}
                resumePoints={resumePoints}
                className="pb-6"
              />
            ) : (
              // Fallback to simple list when graph data is not available
              <div className="space-y-3 pb-6">
                {workflow.steps.map((step, index) => {
                  const isResumePoint = resumePoints.includes(step.id)
                  return (
                    <div
                      key={step.id}
                      className={`p-4 border border-border rounded-lg ${isResumePoint ? 'ring-2 ring-amber-500' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-muted-foreground">
                            {index + 1}.
                          </span>
                          <span className="font-medium">{step.id}</span>
                          {isResumePoint && (
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-700 text-xs rounded-full font-medium">
                              Resume Point
                            </span>
                          )}
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
                      <div className="mb-3">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Task:</div>
                        <p className="text-sm bg-secondary/50 p-2 rounded">{step.task}</p>
                      </div>

                      {(workflow.results?.[step.id] || step.output) && (
                        <div className="mb-3">
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            Output:
                          </div>
                          <div className="text-sm bg-primary/5 p-3 rounded whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                            {workflow.results?.[step.id] || step.output}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-4 text-xs text-muted-foreground">
                        {step.role && <div>Role: {step.role}</div>}
                        {step.agentId && <div>Agent: {step.agentId}</div>}
                      </div>

                      {step.error && (
                        <div className="text-xs text-red-500 mt-2 p-2 bg-red-500/10 rounded">
                          Error: {step.error}
                        </div>
                      )}

                      {isResumePoint && (
                        <div className="mt-2 text-xs bg-amber-50 border border-amber-200 rounded px-2 py-1">
                          <div className="flex items-center gap-1 text-amber-700">
                            <PlayCircle className="w-3 h-3" />
                            <span className="font-medium">Checkpoint saved</span>
                          </div>
                          <div className="text-amber-600 mt-0.5">
                            Can resume workflow from this point
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          /* Workflow Graph View - Full Width */
          <div className="h-full flex flex-col p-6">
            <h3 className="text-lg font-medium mb-4 flex-shrink-0">Workflow Graph</h3>
            <div className="flex-1 border border-border rounded-lg overflow-hidden">
              {graphLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <Activity className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                    <p className="text-sm">Loading workflow graph...</p>
                  </div>
                </div>
              ) : graphData ? (
                <WorkflowGraph
                  key={`${workflow.threadId}-${viewMode}`}
                  threadId={workflow.threadId}
                  data={graphData.graph}
                />
              ) : (
                // Fallback to manually constructed graph if API fails
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
                        output: workflow.results?.[step.id] || step.output,
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
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
