/**
 * Enhanced WorkflowList with debugging capabilities
 * Use this temporarily to debug workflow display issues
 */

import { Activity } from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { useWorkflowStore } from '../../stores/workflows'
import type { WorkflowInfo } from '../../stores/workflows'
import { WorkflowModal } from './WorkflowModal'

const WorkflowItem: React.FC<{ workflow: WorkflowInfo; onClick: () => void }> = ({
  workflow,
  onClick,
}) => {
  return (
    <button
      className="w-full p-3 hover:bg-secondary/50 transition-colors text-left border-b border-border last:border-b-0"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-3 h-3 text-primary" />
          <span className="text-xs font-medium truncate">
            {workflow.threadId.substring(0, 8)}...
          </span>
        </div>
        <span
          className={`text-xs px-1.5 py-0.5 rounded ${
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
      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
        <span>{workflow.projectName || 'Unknown project'}</span>
        <span>•</span>
        <span>{workflow.steps.length} steps</span>
      </div>
    </button>
  )
}

interface WorkflowListProps {
  className?: string
  enableDebug?: boolean
}

interface DebugInfo {
  timestamp: string
  workflowsArrayLength: number
  workflowsObjectKeys: number
  workflowsArray: WorkflowInfo[]
  workflowsObject: Record<string, WorkflowInfo>
  hasWorkflowsInStore: boolean
  workflowStatuses: Array<{ id: string; status: string }>
}

export function WorkflowListDebug({ className = '', enableDebug = false }: WorkflowListProps) {
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowInfo | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    timestamp: '',
    workflowsArrayLength: 0,
    workflowsObjectKeys: 0,
    workflowsArray: [],
    workflowsObject: {},
    hasWorkflowsInStore: false,
    workflowStatuses: [],
  })

  // Get workflows and store state for debugging
  const workflows = useWorkflowStore((state) => state.workflowList)
  const workflowsObject = useWorkflowStore((state) => state.workflows)
  const fetchWorkflows = useWorkflowStore((state) => state.fetchWorkflows)

  // Debug effect
  useEffect(() => {
    if (enableDebug) {
      const debug = {
        timestamp: new Date().toISOString(),
        workflowsArrayLength: workflows.length,
        workflowsObjectKeys: Object.keys(workflowsObject).length,
        workflowsArray: workflows,
        workflowsObject: workflowsObject,
        hasWorkflowsInStore: workflows.length > 0,
        workflowStatuses: workflows.map((w) => ({
          id: w.threadId.substring(0, 8),
          status: w.status,
        })),
      }

      setDebugInfo(debug)
      console.log('[WorkflowListDebug] Debug info:', debug)

      // Test API call
      fetchWorkflows()
        .then(() => {
          console.log('[WorkflowListDebug] Fetch completed')
        })
        .catch((error) => {
          console.error('[WorkflowListDebug] Fetch failed:', error)
        })
    }
  }, [workflows, workflowsObject, enableDebug, fetchWorkflows])

  // Memoize computed values to prevent infinite loops
  const { activeWorkflows, completedWorkflows, allWorkflows } = useMemo(() => {
    const active = workflows.filter((w) => w.status === 'running')
    const completed = workflows
      .filter((w) => w.status !== 'running')
      .sort((a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime())

    if (enableDebug) {
      console.log('[WorkflowListDebug] Computed workflows:', {
        total: workflows.length,
        active: active.length,
        completed: completed.length,
        activeStatuses: active.map((w) => w.status),
        completedStatuses: completed.map((w) => w.status),
      })
    }

    return {
      activeWorkflows: active,
      completedWorkflows: completed,
      allWorkflows: [...active, ...completed],
    }
  }, [workflows, enableDebug])

  const handleWorkflowClick = (workflow: WorkflowInfo) => {
    setSelectedWorkflow(workflow)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handleViewHistoryClick = () => {
    setSelectedWorkflow(null)
    setIsModalOpen(true)
  }

  const handleRefreshClick = () => {
    console.log('[WorkflowListDebug] Manual refresh triggered')
    fetchWorkflows()
  }

  if (enableDebug) {
    console.log('[WorkflowListDebug] Rendering with allWorkflows.length:', allWorkflows.length)
  }

  if (allWorkflows.length === 0) {
    return (
      <>
        <div className={className}>
          <div className="p-3 border-b border-border flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-medium">Workflows</h3>
            {enableDebug && (
              <button
                onClick={handleRefreshClick}
                className="text-xs text-blue-500 hover:text-blue-600 ml-auto mr-2"
              >
                Refresh
              </button>
            )}
            <button
              onClick={handleViewHistoryClick}
              className="text-xs text-primary hover:text-primary/80 ml-auto"
            >
              View History
            </button>
          </div>

          <div className="p-4 text-center text-sm text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
              <Activity className="w-8 h-8 text-muted-foreground/50" />
              <div>
                <p className="font-medium">No active workflows</p>
                <p className="text-xs">Workflows will appear here when created</p>
                {enableDebug && (
                  <div className="mt-2 text-xs bg-yellow-100 p-2 rounded">
                    <p>
                      <strong>Debug Info:</strong>
                    </p>
                    <p>Store Array: {debugInfo.workflowsArrayLength || 0} items</p>
                    <p>Store Object: {debugInfo.workflowsObjectKeys || 0} keys</p>
                    <p>Last Check: {debugInfo.timestamp}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <WorkflowModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          workflow={selectedWorkflow}
        />
      </>
    )
  }

  return (
    <>
      <div className={className}>
        <div className="p-3 border-b border-border flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium">Workflows</h3>
          {enableDebug && (
            <button
              onClick={handleRefreshClick}
              className="text-xs text-blue-500 hover:text-blue-600 mr-2"
            >
              Refresh
            </button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{workflows.length} total</span>
        </div>

        {enableDebug && workflows.length > 0 && (
          <div className="px-3 py-2 bg-green-100 text-xs">
            <strong>✅ Found {workflows.length} workflows:</strong>
            <div className="mt-1">
              {workflows.slice(0, 3).map((w) => (
                <div key={w.threadId}>
                  {w.threadId.substring(0, 8)}... ({w.status})
                </div>
              ))}
              {workflows.length > 3 && <div>... and {workflows.length - 3} more</div>}
            </div>
          </div>
        )}

        <div className="max-h-96 overflow-y-auto">
          {/* Active Workflows Section */}
          {activeWorkflows.length > 0 && (
            <>
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-secondary/30">
                Active ({activeWorkflows.length})
              </div>
              {activeWorkflows.map((workflow) => (
                <WorkflowItem
                  key={workflow.threadId}
                  workflow={workflow}
                  onClick={() => handleWorkflowClick(workflow)}
                />
              ))}
            </>
          )}

          {/* Completed Workflows Section */}
          {completedWorkflows.length > 0 && (
            <>
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-secondary/30">
                History ({completedWorkflows.length})
              </div>
              {completedWorkflows.map((workflow) => (
                <WorkflowItem
                  key={workflow.threadId}
                  workflow={workflow}
                  onClick={() => handleWorkflowClick(workflow)}
                />
              ))}
            </>
          )}
        </div>
      </div>

      <WorkflowModal workflow={selectedWorkflow} isOpen={isModalOpen} onClose={handleCloseModal} />
    </>
  )
}
