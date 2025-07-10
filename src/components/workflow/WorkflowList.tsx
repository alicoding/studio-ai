/**
 * Workflow visibility component - displays active workflows
 *
 * SOLID: Single responsibility - workflow display
 * DRY: Reuses workflow store
 * KISS: Simple list interface with modal for details
 */

import { Activity } from 'lucide-react'
import { useState, useMemo } from 'react'
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
}

export function WorkflowList({ className = '' }: WorkflowListProps) {
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowInfo | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const workflows = useWorkflowStore((state) => Object.values(state.workflows))

  // Memoize computed values to prevent infinite loops
  const { activeWorkflows, allWorkflows } = useMemo(() => {
    const active = workflows.filter((w) => w.status === 'running')
    const recent = workflows
      .filter((w) => w.status !== 'running')
      .sort((a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime())
      .slice(0, 5)

    return {
      activeWorkflows: active,
      allWorkflows: [...active, ...recent],
    }
  }, [workflows])

  const handleWorkflowClick = (workflow: WorkflowInfo) => {
    setSelectedWorkflow(workflow)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    // Keep selectedWorkflow for animation purposes
  }

  if (allWorkflows.length === 0) {
    return (
      <div className={`p-4 text-center text-sm text-muted-foreground ${className}`}>
        No workflows to display
      </div>
    )
  }

  return (
    <>
      <div className={className}>
        <div className="p-3 border-b border-border flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium">Workflows</h3>
          <span className="text-xs text-muted-foreground ml-auto">
            {activeWorkflows.length} active
          </span>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {allWorkflows.map((workflow) => (
            <WorkflowItem
              key={workflow.threadId}
              workflow={workflow}
              onClick={() => handleWorkflowClick(workflow)}
            />
          ))}
        </div>
      </div>

      <WorkflowModal workflow={selectedWorkflow} isOpen={isModalOpen} onClose={handleCloseModal} />
    </>
  )
}
