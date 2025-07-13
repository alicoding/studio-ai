/**
 * WorkflowStepNode - Custom node for workflow steps
 *
 * SOLID: Single responsibility - displays workflow step
 * DRY: Reusable node component
 * KISS: Clean visual design
 * Library-First: Uses React Flow Handle components
 */

import { memo, useState, useEffect } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Settings, Trash2, User, Code } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWorkflowBuilderStore } from '@/stores/workflowBuilder'

interface WorkflowStepData {
  label: string
  task: string
  role?: string
  agentId?: string
  type?: 'task' | 'parallel' | 'conditional'
  stepId?: string // Reference to the step in the store
}

function WorkflowStepNode({ id, data, selected }: NodeProps<WorkflowStepData>) {
  const [isEditing, setIsEditing] = useState(false)
  const [localTask, setLocalTask] = useState(data.task || '')
  const [localRole, setLocalRole] = useState(data.role || '')
  
  const { updateStep, removeStep, getStep } = useWorkflowBuilderStore()

  // Get the current step data from store
  const stepData = getStep(data.stepId || id)

  // Sync local state with store when step data changes
  useEffect(() => {
    if (stepData) {
      setLocalTask(stepData.task)
      setLocalRole(stepData.role || '')
    }
  }, [stepData])

  const handleTaskSave = () => {
    if (data.stepId || id) {
      updateStep(data.stepId || id, {
        task: localTask,
        role: localRole,
      })
    }
    setIsEditing(false)
  }

  const handleDelete = () => {
    if (data.stepId || id) {
      removeStep(data.stepId || id)
    }
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
          <Button 
            size="sm" 
            variant="ghost" 
            className="p-1 h-6 w-6 text-red-600 hover:text-red-700"
            onClick={handleDelete}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Node Content */}
      <div className="p-3">
        {isEditing ? (
          <div className="space-y-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Role</label>
              <input
                type="text"
                value={localRole}
                onChange={(e) => setLocalRole(e.target.value)}
                placeholder="e.g., developer, architect..."
                className="w-full text-xs p-1 border border-border rounded bg-background text-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Task</label>
              <textarea
                value={localTask}
                onChange={(e) => setLocalTask(e.target.value)}
                placeholder="Describe the task..."
                className="w-full text-sm p-2 border border-border rounded resize-none bg-background text-foreground"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-1">
              <Button size="sm" variant="outline" onClick={() => {
                setIsEditing(false)
                // Reset local state to original values
                setLocalTask(stepData?.task || data.task || '')
                setLocalRole(stepData?.role || data.role || '')
              }}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleTaskSave}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="text-sm text-muted-foreground cursor-pointer hover:text-foreground min-h-[60px]"
            onClick={() => setIsEditing(true)}
          >
            {stepData?.task || data.task || 'Click to add task description...'}
          </div>
        )}
      </div>

      {/* Agent/Role Info */}
      {(stepData?.agentId || stepData?.role || data.agentId || data.role) && (
        <div className="px-3 pb-3">
          <div className="text-xs text-muted-foreground bg-muted rounded px-2 py-1 inline-block">
            {stepData?.agentId || stepData?.role || data.agentId || data.role}
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-gray-400" />
    </div>
  )
}

export default memo(WorkflowStepNode)
