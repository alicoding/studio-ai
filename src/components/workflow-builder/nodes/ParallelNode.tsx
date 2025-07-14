/**
 * ParallelNode - Parallel execution node for workflow builder
 *
 * SOLID: Single responsibility - parallel step configuration UI
 * DRY: Reuses common node components and patterns
 * KISS: Simple multi-select for parallel steps
 * Library-First: Uses React Flow Handle component
 */

import { Handle, Position, NodeProps } from 'reactflow'
import { Settings, X } from 'lucide-react'
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useWorkflowBuilderStore } from '@/stores/workflowBuilder'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ParallelNodeData {
  label: string
  parallelSteps?: string[]
  task?: string
}

export default function ParallelNode({ id, data, selected }: NodeProps<ParallelNodeData>) {
  const [isEditing, setIsEditing] = useState(false)
  const [parallelSteps, setParallelSteps] = useState<string[]>(data.parallelSteps || [])

  const updateStep = useWorkflowBuilderStore((state) => state.updateStep)
  const workflow = useWorkflowBuilderStore((state) => state.workflow)

  // Get all nodes from workflow steps
  const nodes = useMemo(() => {
    if (!workflow) return []
    return workflow.steps.map((step) => ({
      id: step.id,
      type: step.type || 'task',
      data: {
        label: step.role || step.type || 'Task',
        role: step.role,
      },
    }))
  }, [workflow])

  // Get available steps (all task nodes except self)
  const availableSteps = useMemo(() => {
    return nodes.filter(
      (node) => node.type === 'task' && node.id !== id && !parallelSteps.includes(node.id)
    )
  }, [nodes, id, parallelSteps])

  const handleSave = () => {
    updateStep(id, {
      parallelSteps,
      task: `Run ${parallelSteps.length} steps in parallel`,
    })
    setIsEditing(false)
  }

  const handleAddStep = (stepId: string) => {
    if (stepId && !parallelSteps.includes(stepId)) {
      setParallelSteps([...parallelSteps, stepId])
    }
  }

  const handleRemoveStep = (stepId: string) => {
    setParallelSteps(parallelSteps.filter((id) => id !== stepId))
  }

  const getStepLabel = (stepId: string) => {
    const node = nodes.find((n) => n.id === stepId)
    return node?.data?.label || node?.data?.role || stepId
  }

  return (
    <div
      className={`workflow-node bg-card border-2 ${
        selected ? 'border-blue-500 shadow-lg' : 'border-border'
      } rounded-lg p-4 min-w-[250px]`}
    >
      <Handle type="target" position={Position.Top} className="workflow-handle" />

      <div className="flex items-center gap-2 mb-3">
        <div className="bg-blue-500 p-2 rounded-md text-white">
          <Settings className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Parallel</h3>
          <p className="text-xs text-muted-foreground">
            {parallelSteps.length === 0
              ? 'No steps selected'
              : `Run ${parallelSteps.length} steps in parallel`}
          </p>
        </div>
      </div>

      {!isEditing ? (
        <div className="space-y-2">
          {parallelSteps.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Click configure to select steps</p>
          ) : (
            <div className="space-y-1">
              {parallelSteps.map((stepId) => (
                <div key={stepId} className="text-xs bg-muted px-2 py-1 rounded">
                  {getStepLabel(stepId)}
                </div>
              ))}
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(true)}
            className="w-full mt-2"
          >
            Configure Parallel Steps
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Parallel Steps</Label>
            <div className="space-y-2">
              {parallelSteps.map((stepId) => (
                <div key={stepId} className="flex items-center gap-2">
                  <div className="flex-1 text-xs bg-muted px-2 py-2 rounded">
                    {getStepLabel(stepId)}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemoveStep(stepId)}
                    className="h-8 w-8"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}

              {availableSteps.length > 0 && (
                <Select onValueChange={handleAddStep}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Add step..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSteps.map((node) => (
                      <SelectItem key={node.id} value={node.id}>
                        {node.data?.label || node.data?.role || node.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {availableSteps.length === 0 && parallelSteps.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  No task steps available. Add task nodes first.
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={parallelSteps.length === 0}
              className="flex-1"
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setParallelSteps(data.parallelSteps || [])
                setIsEditing(false)
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="workflow-handle" />
    </div>
  )
}
