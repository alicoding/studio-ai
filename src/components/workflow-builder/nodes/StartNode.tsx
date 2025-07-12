/**
 * StartNode - Visual start point for workflows
 *
 * SOLID: Single responsibility - workflow start indicator
 * KISS: Simple, recognizable start node
 */

import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Play } from 'lucide-react'

interface StartNodeData {
  label: string
}

function StartNode({ data: _data }: NodeProps<StartNodeData>) {
  return (
    <div className="w-24 h-24 bg-green-500 rounded-full shadow-lg flex items-center justify-center border-4 border-green-600">
      <Play className="w-8 h-8 text-white ml-1" />

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-green-600" />
    </div>
  )
}

export default memo(StartNode)
