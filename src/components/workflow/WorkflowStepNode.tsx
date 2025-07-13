/**
 * Workflow Step Node Component
 * Custom ReactFlow node for displaying workflow steps
 *
 * SOLID: Single responsibility - step node rendering
 * DRY: Reuses existing UI components and status patterns
 * KISS: Simple node layout with clear status indicators
 * Library-First: Built for ReactFlow integration
 */

import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import {
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  User,
  Bot,
  Play,
  Pause,
  RotateCw,
} from 'lucide-react'

interface WorkflowStepNodeData {
  agentId?: string
  role?: string
  task: string
  status: 'pending' | 'not_executed' | 'running' | 'completed' | 'failed' | 'blocked'
  startTime?: number
  endTime?: number
  output?: string
  error?: string
  sessionId?: string
  threadId?: string
  isCurrentNode?: boolean
  isResumePoint?: boolean
  isInExecutionPath?: boolean
  isInLoop?: boolean
  loopIterations?: number
}

const statusIcons = {
  pending: Clock,
  not_executed: Clock, // Backend sends "not_executed" for pending
  running: Loader2,
  completed: CheckCircle,
  failed: XCircle,
  blocked: AlertTriangle,
}

const statusColors = {
  pending: 'border-gray-300 bg-gray-50 text-gray-600',
  not_executed: 'border-gray-300 bg-gray-50 text-gray-600', // Same as pending
  running: 'border-blue-400 bg-blue-50 text-blue-700 shadow-blue-100',
  completed: 'border-green-400 bg-green-50 text-green-700',
  failed: 'border-red-400 bg-red-50 text-red-700',
  blocked: 'border-amber-400 bg-amber-50 text-amber-700',
}

export const WorkflowStepNode = memo(({ data }: NodeProps<WorkflowStepNodeData>) => {
  const StatusIcon = statusIcons[data.status] || Clock // Fallback to Clock if status not found
  const statusClass = statusColors[data.status] || statusColors.pending // Fallback to pending style

  // Truncate long task descriptions
  const truncatedTask = data.task.length > 60 ? `${data.task.substring(0, 57)}...` : data.task

  const agentDisplay = data.agentId || data.role || 'Unknown'

  return (
    <div
      className={`
        relative px-4 py-3 rounded-lg border-2 shadow-sm w-[280px]
        ${statusClass}
        ${data.isCurrentNode ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
        ${data.isInExecutionPath ? 'shadow-md' : ''}
        ${data.isResumePoint ? 'ring-2 ring-amber-500 ring-offset-2 shadow-amber-200' : ''}
        transition-all duration-200
      `}
    >
      {/* Source handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 border-2 border-white bg-gray-400"
      />

      {/* Header with agent and status */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          {data.agentId ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
          <span className="truncate max-w-[120px]" title={agentDisplay}>
            {agentDisplay}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {data.isCurrentNode && <Play className="w-3 h-3 text-blue-600" />}
          {data.isResumePoint && (
            <div 
              className="flex items-center gap-1 bg-amber-100 px-1.5 py-0.5 rounded-md"
              title={`Resume point - workflow can be resumed from here (status: ${data.status})`}
            >
              <Pause className="w-3 h-3 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">Resume</span>
            </div>
          )}
          {data.isInLoop && (
            <div className="flex items-center gap-0.5" title={`Part of loop (${data.loopIterations || 1} iterations)`}>
              <RotateCw className="w-3 h-3 text-amber-600" />
              {data.loopIterations && data.loopIterations > 1 && (
                <span className="text-xs text-amber-600 font-medium">×{data.loopIterations}</span>
              )}
            </div>
          )}
          <StatusIcon className={`w-4 h-4 ${data.status === 'running' ? 'animate-spin' : ''}`} />
        </div>
      </div>

      {/* Task description */}
      <div className="text-xs text-gray-700 mb-2 leading-relaxed">
        <span title={data.task}>{truncatedTask}</span>
      </div>

      {/* Status and timing info */}
      <div className="flex items-center justify-between text-xs">
        <span className="capitalize font-medium">{data.status}</span>
        {data.startTime && data.endTime && (
          <span className="text-gray-500">
            {Math.round((data.endTime - data.startTime) / 1000)}s
          </span>
        )}
      </div>

      {/* Output if completed */}
      {data.status === 'completed' && data.output && (
        <div className="mt-2 text-xs text-green-700 bg-green-100 px-2 py-1 rounded border border-green-200">
          <span title={data.output} className="line-clamp-2">
            {data.output.length > 80 ? `${data.output.substring(0, 77)}...` : data.output}
          </span>
        </div>
      )}

      {/* Error message if failed */}
      {data.status === 'failed' && data.error && (
        <div className="mt-2 text-xs text-red-600 bg-red-100 px-2 py-1 rounded border border-red-200">
          <span title={data.error}>
            {data.error.length > 50 ? `${data.error.substring(0, 47)}...` : data.error}
          </span>
        </div>
      )}

      {/* Resume point indicator */}
      {data.isResumePoint && (
        <div className="mt-2 text-xs bg-amber-50 border border-amber-200 rounded px-2 py-1">
          <div className="flex items-center gap-1 text-amber-700">
            <Pause className="w-3 h-3" />
            <span className="font-medium">Checkpoint saved</span>
          </div>
          <div className="text-amber-600 mt-0.5">
            Can resume workflow from this point
          </div>
        </div>
      )}

      {/* Target handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 border-2 border-white bg-gray-400"
      />
    </div>
  )
})

WorkflowStepNode.displayName = 'WorkflowStepNode'
