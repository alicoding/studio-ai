/**
 * LoopNode - Loop iteration node for workflow builder
 *
 * SOLID: Single responsibility - loop configuration UI
 * DRY: Reuses common node components and patterns
 * KISS: Simple form for loop parameters
 * Library-First: Uses React Flow Handle component
 */

import { Handle, Position, NodeProps } from 'reactflow'
import { RotateCcw, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useWorkflowBuilderStore } from '@/stores/workflowBuilder'

interface LoopNodeData {
  label: string
  items?: string[]
  loopVar?: string
  maxIterations?: number
}

export default function LoopNode({ id, data, selected }: NodeProps<LoopNodeData>) {
  const [isEditing, setIsEditing] = useState(false)
  const [items, setItems] = useState<string[]>(data.items || ['item1', 'item2', 'item3'])
  const [loopVar, setLoopVar] = useState(data.loopVar || 'item')
  const [maxIterations, setMaxIterations] = useState(data.maxIterations || 0)
  const [newItem, setNewItem] = useState('')

  const updateStep = useWorkflowBuilderStore((state) => state.updateStep)

  const handleSave = () => {
    updateStep(id, {
      items,
      loopVar,
      maxIterations: maxIterations || items.length,
    })
    setIsEditing(false)
  }

  const handleAddItem = () => {
    if (newItem.trim()) {
      setItems([...items, newItem.trim()])
      setNewItem('')
    }
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  return (
    <div
      className={`workflow-node bg-card border-2 ${
        selected ? 'border-purple-500 shadow-lg' : 'border-border'
      } rounded-lg p-4 min-w-[250px]`}
    >
      <Handle type="target" position={Position.Top} className="workflow-handle" />

      <div className="flex items-center gap-2 mb-3">
        <div className="bg-purple-500 p-2 rounded-md text-white">
          <RotateCcw className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Loop</h3>
          <p className="text-xs text-muted-foreground">Iterate over {items.length} items</p>
        </div>
      </div>

      {!isEditing ? (
        <div className="space-y-2">
          <div className="text-xs">
            <span className="text-muted-foreground">Variable:</span> {loopVar}
          </div>
          <div className="text-xs">
            <span className="text-muted-foreground">Items:</span> {items.join(', ')}
          </div>
          {maxIterations > 0 && maxIterations < items.length && (
            <div className="text-xs">
              <span className="text-muted-foreground">Max iterations:</span> {maxIterations}
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(true)}
            className="w-full mt-2"
          >
            Configure Loop
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <Label htmlFor={`${id}-loopvar`} className="text-xs">
              Loop Variable Name
            </Label>
            <Input
              id={`${id}-loopvar`}
              value={loopVar}
              onChange={(e) => setLoopVar(e.target.value)}
              placeholder="item"
              className="h-8"
            />
          </div>

          <div>
            <Label className="text-xs">Items to Loop Over</Label>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={item}
                    onChange={(e) => {
                      const newItems = [...items]
                      newItems[index] = e.target.value
                      setItems(newItems)
                    }}
                    className="h-8"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemoveItem(index)}
                    className="h-8 w-8"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Input
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                  placeholder="Add item..."
                  className="h-8"
                />
                <Button size="icon" variant="outline" onClick={handleAddItem} className="h-8 w-8">
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor={`${id}-maxiter`} className="text-xs">
              Max Iterations (0 = all items)
            </Label>
            <Input
              id={`${id}-maxiter`}
              type="number"
              value={maxIterations}
              onChange={(e) => setMaxIterations(parseInt(e.target.value) || 0)}
              min={0}
              className="h-8"
            />
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} className="flex-1">
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(false)}
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
