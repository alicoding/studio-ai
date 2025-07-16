/**
 * ConditionalNode - Visual conditional branching node
 *
 * SOLID: Single responsibility - conditional logic
 * KISS: Diamond shape makes branching obvious
 */

import { memo, useState, useMemo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { GitBranch, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWorkflowBuilderStore } from '@/stores/workflowBuilder'
import { extractAvailableFields, conditionToReadableText } from '@/lib/condition-utils'
import type { WorkflowCondition } from '@/types/condition-types'
import ConditionBuilderModal from '../condition/ConditionBuilderModal'

interface ConditionalNodeData {
  label: string
  condition?: WorkflowCondition // Now supports both legacy and structured conditions
  description?: string
  stepId?: string // The workflow step ID associated with this node
}

function ConditionalNode({ data, selected, id }: NodeProps<ConditionalNodeData>) {
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)

  // Connect to workflow builder store
  const updateStep = useWorkflowBuilderStore((state) => state.updateStep)
  const workflow = useWorkflowBuilderStore((state) => state.workflow)

  // Extract available fields from workflow steps (excluding this conditional step)
  const availableFields = useMemo(() => {
    if (!workflow) return []

    // Get all steps except this conditional step
    const otherSteps = workflow.steps.filter(
      (step) => step.id !== (data.stepId || id) && step.type !== 'conditional'
    )

    return extractAvailableFields(otherSteps)
  }, [workflow, data.stepId, id])

  // Generate readable condition text
  const conditionText = useMemo(() => {
    if (!data.condition) return 'Click to build condition...'
    return conditionToReadableText(data.condition, availableFields)
  }, [data.condition, availableFields])

  const handleConditionSave = (condition: WorkflowCondition) => {
    // Update the workflow step with the new condition
    if (data.stepId || id) {
      updateStep(data.stepId || id, {
        condition,
        type: 'conditional' as const,
        // Note: trueBranch and falseBranch would be set when connecting edges in the visual builder
        // The visual builder handles the connection logic
      })
    }
  }

  return (
    <>
      <div className="relative">
        {/* Connection Handles */}
        <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-amber-500" />

        {/* Rectangular Shape with Cut Corners for Diamond Hint */}
        <div
          className={`
            relative w-64 h-24 bg-card border-2 border-amber-500 
            ${selected ? 'ring-2 ring-primary' : ''} 
            shadow-lg transition-all duration-200 hover:shadow-xl
            rounded-lg overflow-hidden
          `}
        >
          {/* Diamond Corner Cuts */}
          <div className="absolute top-0 left-0 w-4 h-4 bg-background transform rotate-45 -translate-x-2 -translate-y-2 border-r-2 border-b-2 border-amber-500" />
          <div className="absolute top-0 right-0 w-4 h-4 bg-background transform rotate-45 translate-x-2 -translate-y-2 border-l-2 border-b-2 border-amber-500" />
          <div className="absolute bottom-0 left-0 w-4 h-4 bg-background transform rotate-45 -translate-x-2 translate-y-2 border-r-2 border-t-2 border-amber-500" />
          <div className="absolute bottom-0 right-0 w-4 h-4 bg-background transform rotate-45 translate-x-2 translate-y-2 border-l-2 border-t-2 border-amber-500" />

          {/* Content Container */}
          <div className="flex flex-col items-center justify-center h-full p-3">
            <div className="flex items-center gap-2 mb-2">
              <GitBranch className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-foreground">Conditional</span>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto p-1 h-6 w-6"
                onClick={() => setIsBuilderOpen(true)}
                data-testid="node-settings"
              >
                <Edit className="w-3 h-3" />
              </Button>
            </div>

            {/* Condition display */}
            <div
              className="text-xs text-center cursor-pointer hover:text-foreground text-muted-foreground w-full px-2 py-1 bg-muted/30 rounded"
              onClick={() => setIsBuilderOpen(true)}
              data-testid="condition-display"
            >
              <div className="line-clamp-2">{conditionText}</div>
            </div>
          </div>
        </div>

        {/* Output Handles with Better Positioning */}
        <Handle
          type="source"
          position={Position.Right}
          id="true"
          className="w-3 h-3 !bg-green-500"
          style={{ top: '35%', right: '-6px' }}
        />
        <Handle
          type="source"
          position={Position.Left}
          id="false"
          className="w-3 h-3 !bg-red-500"
          style={{ top: '35%', left: '-6px' }}
        />

        {/* Branch Labels with Background */}
        <div className="absolute -right-12 top-[35%] transform -translate-y-1/2 text-xs text-green-600 font-medium bg-green-50 dark:bg-green-950/50 px-2 py-0.5 rounded">
          True
        </div>
        <div className="absolute -left-14 top-[35%] transform -translate-y-1/2 text-xs text-red-600 font-medium bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded">
          False
        </div>
      </div>

      {/* Condition Builder Modal */}
      <ConditionBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        onSave={handleConditionSave}
        initialCondition={data.condition}
        availableFields={availableFields}
        title="Build Condition"
      />
    </>
  )
}

export default memo(ConditionalNode)
