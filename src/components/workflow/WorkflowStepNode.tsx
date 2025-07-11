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
} from 'lucide-react'

interface WorkflowStepNodeData {
  agentId?: string
  role?: string
  task: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'blocked'
  startTime?: number
  endTime?: number
  output?: string
  error?: string
  sessionId?: string
  threadId?: string
  isCurrentNode?: boolean
  isResumePoint?: boolean
  isInExecutionPath?: boolean
}

const statusIcons = {
  pending: Clock,
  running: Loader2,
  completed: CheckCircle,
  failed: XCircle,
  blocked: AlertTriangle,
}

const statusColors = {
  pending: 'border-gray-300 bg-gray-50 text-gray-600',
  running: 'border-blue-400 bg-blue-50 text-blue-700 shadow-blue-100',
  completed: 'border-green-400 bg-green-50 text-green-700',
  failed: 'border-red-400 bg-red-50 text-red-700',
  blocked: 'border-amber-400 bg-amber-50 text-amber-700',
}

export const WorkflowStepNode = memo(({ data }: NodeProps<WorkflowStepNodeData>) => {
  const StatusIcon = statusIcons[data.status]
  const statusClass = statusColors[data.status]

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
          {data.isResumePoint && <Pause className="w-3 h-3 text-amber-600" />}
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

      {/* Error message if failed */}
      {data.status === 'failed' && data.error && (
        <div className="mt-2 text-xs text-red-600 bg-red-100 px-2 py-1 rounded border">
          <span title={data.error}>
            {data.error.length > 50 ? `${data.error.substring(0, 47)}...` : data.error}
          </span>
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
