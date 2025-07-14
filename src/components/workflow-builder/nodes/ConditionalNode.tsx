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

            {/* Condition display/edit */}
            <div
              className="text-xs text-center cursor-pointer hover:text-foreground text-muted-foreground max-w-full px-1"
              onClick={() => setIsBuilderOpen(true)}
              data-testid="condition-display"
            >
              <div className="line-clamp-2">{conditionText}</div>
            </div>

            <Button
              size="sm"
              variant="ghost"
              className="absolute top-0 right-0 p-1 h-4 w-4"
              onClick={() => setIsBuilderOpen(true)}
              data-testid="node-settings"
            >
              <Edit className="w-2 h-2" />
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
