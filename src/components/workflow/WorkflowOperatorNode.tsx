/**
 * Workflow Operator Node Component
 * Custom ReactFlow node for displaying operator decision points
 *
 * SOLID: Single responsibility - operator node rendering
 * DRY: Reuses existing UI patterns
 * KISS: Simple diamond shape with clear indicators
 * Library-First: Built for ReactFlow integration
 */

import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { GitBranch, Cpu, CheckCircle, XCircle, AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react'

interface WorkflowOperatorNodeData {
  task: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'blocked'
  agentId?: string
  role?: string
  output?: string
}

export const WorkflowOperatorNode = memo(({ data }: NodeProps<WorkflowOperatorNodeData>) => {
  const statusColors = {
    pending: 'border-gray-400 bg-gray-100',
    running: 'border-blue-400 bg-blue-100',
    completed: 'border-purple-400 bg-purple-100',
    failed: 'border-red-400 bg-red-100',
    blocked: 'border-amber-400 bg-amber-100',
  }

  const statusClass = statusColors[data.status] || statusColors.pending

  // Parse decision outcome from output
  const getDecisionInfo = () => {
    const output = data.output || ''
    if (output.includes('SUCCESS')) {
      return { icon: CheckCircle, text: 'SUCCESS', color: 'text-green-600', action: 'Continue' }
    } else if (output.includes('FAILED')) {
      return { icon: XCircle, text: 'FAILED', color: 'text-red-600', action: 'Retry' }
    } else if (output.includes('BLOCKED')) {
      return { icon: AlertTriangle, text: 'BLOCKED', color: 'text-amber-600', action: 'Manual' }
    } else {
      return { icon: Cpu, text: 'EVAL', color: 'text-purple-600', action: 'Processing' }
    }
  }

  const decision = getDecisionInfo()

  return (
    <div className="relative">
      {/* Diamond shape container with enhanced decision point styling */}
      <div
        className={`
          w-[200px] h-[80px] flex items-center justify-center
          transform rotate-45 rounded-lg border-2 shadow-lg
          ${statusClass}
          ${data.status === 'completed' ? 'ring-2 ring-purple-300 ring-offset-2' : ''}
          transition-all duration-200 hover:scale-105
        `}
      >
        <div className="transform -rotate-45 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <decision.icon className={`w-4 h-4 ${decision.color}`} />
            <GitBranch className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xs font-medium text-gray-700">
            {decision.text}
          </div>
          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            {decision.action === 'Continue' && <ArrowRight className="w-3 h-3" />}
            {decision.action === 'Retry' && <RotateCcw className="w-3 h-3" />}
            {decision.action}
          </div>
        </div>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 border-2 border-white bg-purple-400"
        style={{ top: '20px' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 border-2 border-white bg-purple-400"
        style={{ bottom: '20px' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="loop"
        className="w-3 h-3 border-2 border-white bg-amber-400"
        style={{ right: '20px' }}
      />
    </div>
  )
})

WorkflowOperatorNode.displayName = 'WorkflowOperatorNode'