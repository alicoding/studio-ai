/**
 * ConditionalNode - Visual conditional branching node
 *
 * SOLID: Single responsibility - conditional logic
 * KISS: Diamond shape makes branching obvious
 */

import { memo, useState } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { GitBranch, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ConditionalNodeData {
  label: string
  condition: string
  description?: string
}

function ConditionalNode({ data, selected }: NodeProps<ConditionalNodeData>) {
  const [isEditing, setIsEditing] = useState(false)
  const [localCondition, setLocalCondition] = useState(data.condition || '')

  const handleSave = () => {
    // TODO: Update store with new condition
    setIsEditing(false)
  }

  return (
    <div className="relative">
      {/* Connection Handles */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-amber-500" />
      
      {/* Diamond Shape */}
      <div 
        className={`
          w-48 h-32 bg-card border-2 border-amber-500 
          ${selected ? 'ring-2 ring-primary' : ''} 
          rotate-45 relative shadow-lg
          transition-all duration-200 hover:shadow-xl
        `}
      >
        {/* Content Container (counter-rotated) */}
        <div className="absolute inset-2 -rotate-45 flex flex-col items-center justify-center p-2">
          <div className="flex items-center gap-1 mb-1">
            <GitBranch className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-medium text-foreground">Conditional</span>
          </div>
          
          {isEditing ? (
            <div className="w-full space-y-1">
              <input
                type="text"
                value={localCondition}
                onChange={(e) => setLocalCondition(e.target.value)}
                placeholder="Enter condition..."
                className="w-full text-xs p-1 border border-border rounded bg-background text-foreground"
              />
              <div className="flex justify-center gap-1">
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="text-xs px-2 py-1">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} className="text-xs px-2 py-1">
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div 
              className="text-xs text-center cursor-pointer hover:text-foreground text-muted-foreground"
              onClick={() => setIsEditing(true)}
            >
              {data.condition || 'Click to set condition...'}
            </div>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-0 right-0 p-1 h-4 w-4"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Settings className="w-2 h-2" />
          </Button>
        </div>
      </div>

      {/* Output Handles */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="true"
        className="w-3 h-3 !bg-green-500"
        style={{ top: '50%', right: '-6px' }}
      />
      <Handle 
        type="source" 
        position={Position.Left} 
        id="false"
        className="w-3 h-3 !bg-red-500"
        style={{ top: '50%', left: '-6px' }}
      />
      
      {/* Branch Labels */}
      <div className="absolute -right-8 top-1/2 transform -translate-y-1/2 text-xs text-green-600 font-medium">
        True
      </div>
      <div className="absolute -left-8 top-1/2 transform -translate-y-1/2 text-xs text-red-600 font-medium">
        False
      </div>
    </div>
  )
}

export default memo(ConditionalNode)