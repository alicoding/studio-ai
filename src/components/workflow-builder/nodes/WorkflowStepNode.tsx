/**
 * WorkflowStepNode - Custom node for workflow steps
 *
 * SOLID: Single responsibility - displays workflow step
 * DRY: Reusable node component
 * KISS: Clean visual design
 * Library-First: Uses React Flow Handle components
 */

import { memo, useState } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Settings, Trash2, User, Code } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WorkflowStepData {
  label: string
  task: string
  role?: string
  agentId?: string
  type?: 'task' | 'parallel' | 'conditional'
}

function WorkflowStepNode({ data, selected }: NodeProps<WorkflowStepData>) {
  const [isEditing, setIsEditing] = useState(false)
  const [localTask, setLocalTask] = useState(data.task || '')

  const handleTaskSave = () => {
    // TODO: Update store with new task
    setIsEditing(false)
  }

  const getIcon = () => {
    if (data.agentId) return <User className="w-4 h-4" />
    return <Code className="w-4 h-4" />
  }

  const getNodeColor = () => {
    switch (data.role) {
      case 'developer':
        return 'border-blue-500 bg-blue-50'
      case 'architect':
        return 'border-purple-500 bg-purple-50'
      case 'reviewer':
        return 'border-green-500 bg-green-50'
      case 'tester':
        return 'border-orange-500 bg-orange-50'
      case 'security':
        return 'border-red-500 bg-red-50'
      default:
        return 'border-gray-500 bg-gray-50'
    }
  }

  return (
    <div
      className={`
        min-w-[200px] max-w-[300px] bg-card rounded-lg shadow-lg border-2 
        ${selected ? 'ring-2 ring-primary' : ''} 
        ${getNodeColor()}
        transition-all duration-200 hover:shadow-xl
      `}
    >
      {/* Connection Handles */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-gray-400" />

      {/* Node Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className="text-sm font-medium text-foreground">{data.role || 'Task'}</span>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="p-1 h-6 w-6"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Settings className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" className="p-1 h-6 w-6 text-red-600 hover:text-red-700">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Node Content */}
      <div className="p-3">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={localTask}
              onChange={(e) => setLocalTask(e.target.value)}
              placeholder="Describe the task..."
              className="w-full text-sm p-2 border border-border rounded resize-none bg-background text-foreground"
              rows={3}
            />
            <div className="flex justify-end gap-1">
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleTaskSave}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="text-sm text-muted-foreground cursor-pointer hover:text-foreground"
            onClick={() => setIsEditing(true)}
          >
            {data.task || 'Click to add task description...'}
          </div>
        )}
      </div>

      {/* Agent/Role Info */}
      {(data.agentId || data.role) && (
        <div className="px-3 pb-3">
          <div className="text-xs text-muted-foreground bg-muted rounded px-2 py-1 inline-block">
            {data.agentId || data.role}
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-gray-400" />
    </div>
  )
}

export default memo(WorkflowStepNode)
