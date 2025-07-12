/**
 * StepList Component - Lists all workflow steps
 *
 * SOLID: Single responsibility - manages step list display
 * DRY: Reuses common UI patterns
 * KISS: Simple list with basic interactions
 * Library-First: Uses existing icon and button components
 */

import React from 'react'
import { Plus, GripVertical, AlertCircle } from 'lucide-react'
import { useWorkflowBuilderStore } from '@/stores/workflowBuilder'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function StepList() {
  const { workflow, selectedStepId, validationErrors, addStep, reorderSteps } =
    useWorkflowBuilderStore()

  if (!workflow) return null

  const handleAddStep = () => {
    addStep({
      type: 'task',
      task: '',
      deps: [],
    })
  }

  const handleSelectStep = (stepId: string) => {
    useWorkflowBuilderStore.setState({ selectedStepId: stepId })
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('stepIndex', index.toString())
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault()
    const fromIndex = parseInt(e.dataTransfer.getData('stepIndex'))
    if (fromIndex !== toIndex) {
      reorderSteps(fromIndex, toIndex)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Workflow Steps</h3>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleAddStep}
            className="flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Step
          </Button>
        </div>
      </div>

      {/* Steps */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {workflow.steps.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-4">No steps yet</p>
            <Button variant="secondary" onClick={handleAddStep} className="mx-auto">
              <Plus className="w-4 h-4 mr-1" />
              Add First Step
            </Button>
          </div>
        ) : (
          workflow.steps.map((step, index) => {
            const hasError = !!validationErrors[step.id]
            const isSelected = selectedStepId === step.id

            return (
              <div
                key={step.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                onClick={() => handleSelectStep(step.id)}
                className={cn(
                  'flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-all',
                  isSelected
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-white hover:bg-gray-50 border-gray-200',
                  hasError && 'border-red-300'
                )}
              >
                {/* Drag Handle */}
                <div className="mt-1 cursor-move text-gray-400 hover:text-gray-600">
                  <GripVertical className="w-4 h-4" />
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Step {index + 1}</span>
                    <span className="text-xs text-gray-500">({step.id})</span>
                    {hasError && <AlertCircle className="w-4 h-4 text-red-500" />}
                  </div>

                  {/* Agent/Role */}
                  <div className="text-sm text-gray-600 mt-1">
                    {step.agentId ? (
                      <span className="font-medium">{step.agentId}</span>
                    ) : step.role ? (
                      <span className="font-medium capitalize">{step.role}</span>
                    ) : (
                      <span className="italic text-gray-400">No agent assigned</span>
                    )}
                  </div>

                  {/* Task Preview */}
                  <div className="text-sm text-gray-600 mt-1 truncate">
                    {step.task || <span className="italic text-gray-400">No task description</span>}
                  </div>

                  {/* Dependencies */}
                  {step.deps.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      Depends on: {step.deps.join(', ')}
                    </div>
                  )}

                  {/* Validation Error */}
                  {hasError && (
                    <div className="text-xs text-red-600 mt-1">{validationErrors[step.id]}</div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
