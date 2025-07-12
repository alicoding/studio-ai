/**
 * LoopNode - Visual loop/iteration node
 *
 * SOLID: Single responsibility - loop logic
 * KISS: Circular shape with loop arrow makes iteration obvious
 */

import { memo, useState } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { RotateCcw, Settings, Repeat } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LoopNodeData {
  label: string
  loopType: 'while' | 'for' | 'retry'
  condition: string
  maxIterations?: number
  currentIteration?: number
}

function LoopNode({ data, selected }: NodeProps<LoopNodeData>) {
  const [isEditing, setIsEditing] = useState(false)
  const [localCondition, setLocalCondition] = useState(data.condition || '')
  const [maxIterations, setMaxIterations] = useState(data.maxIterations || 10)

  const handleSave = () => {
    // TODO: Update store with new loop settings
    setIsEditing(false)
  }

  const getLoopIcon = () => {
    switch (data.loopType) {
      case 'retry': return <RotateCcw className="w-5 h-5 text-orange-600" />
      case 'for': return <Repeat className="w-5 h-5 text-blue-600" />
      default: return <RotateCcw className="w-5 h-5 text-green-600" />
    }
  }

  const getLoopColor = () => {
    switch (data.loopType) {
      case 'retry': return 'border-orange-500 bg-orange-50'
      case 'for': return 'border-blue-500 bg-blue-50'
      default: return 'border-green-500 bg-green-50'
    }
  }

  return (
    <div className="relative">
      {/* Connection Handles */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-green-500" />
      
      {/* Circular Loop Node */}
      <div 
        className={`
          w-32 h-32 rounded-full border-4 ${getLoopColor()}
          ${selected ? 'ring-2 ring-primary' : ''} 
          flex flex-col items-center justify-center shadow-lg
          transition-all duration-200 hover:shadow-xl relative
        `}
      >
        {/* Loop Icon */}
        <div className="mb-1">
          {getLoopIcon()}
        </div>
        
        {/* Loop Type */}
        <div className="text-xs font-medium text-foreground capitalize">
          {data.loopType || 'While'}
        </div>
        
        {/* Iteration Counter */}
        {data.currentIteration !== undefined && (
          <div className="text-xs text-muted-foreground">
            {data.currentIteration}/{data.maxIterations || '∞'}
          </div>
        )}
        
        {/* Settings Button */}
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-1 right-1 p-1 h-5 w-5"
          onClick={() => setIsEditing(!isEditing)}
        >
          <Settings className="w-3 h-3" />
        </Button>
      </div>

      {/* Loop Back Handle (Left) */}
      <Handle 
        type="source" 
        position={Position.Left} 
        id="loop"
        className="w-3 h-3 !bg-yellow-500"
        style={{ top: '50%', left: '-6px' }}
      />
      
      {/* Continue Handle (Bottom) */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="continue"
        className="w-3 h-3 !bg-green-500"
      />
      
      {/* Loop Labels */}
      <div className="absolute -left-12 top-1/2 transform -translate-y-1/2 text-xs text-yellow-600 font-medium">
        Loop
      </div>
      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-green-600 font-medium">
        Exit
      </div>

      {/* Condition Editor Modal/Popup */}
      {isEditing && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-card border border-border rounded-lg shadow-lg p-4 min-w-[250px] z-10">
          <h4 className="text-sm font-medium mb-3">Loop Configuration</h4>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Loop Type</label>
              <select className="w-full text-sm p-2 border border-border rounded bg-background">
                <option value="while">While (condition)</option>
                <option value="for">For (iterations)</option>
                <option value="retry">Retry (on failure)</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs text-muted-foreground">Condition</label>
              <input
                type="text"
                value={localCondition}
                onChange={(e) => setLocalCondition(e.target.value)}
                placeholder="e.g., output.success !== true"
                className="w-full text-sm p-2 border border-border rounded bg-background"
              />
            </div>
            
            <div>
              <label className="text-xs text-muted-foreground">Max Iterations</label>
              <input
                type="number"
                value={maxIterations}
                onChange={(e) => setMaxIterations(parseInt(e.target.value))}
                className="w-full text-sm p-2 border border-border rounded bg-background"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default memo(LoopNode)