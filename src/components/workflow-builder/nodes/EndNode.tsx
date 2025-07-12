/**
 * EndNode - Visual end point for workflows
 *
 * SOLID: Single responsibility - workflow end indicator
 * KISS: Simple, recognizable end node
 */

import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Square } from 'lucide-react'

interface EndNodeData {
  label: string
}

function EndNode({ data: _data }: NodeProps<EndNodeData>) {
  return (
    <div className="w-24 h-24 bg-red-500 rounded-lg shadow-lg flex items-center justify-center border-4 border-red-600">
      <Square className="w-8 h-8 text-white" />

      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-red-600" />
    </div>
  )
}

export default memo(EndNode)
