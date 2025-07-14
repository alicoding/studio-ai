/**
 * HumanNode - Human input/approval node for workflow builder
 *
 * SOLID: Single responsibility - human input configuration UI
 * DRY: Reuses common node components and patterns
 * KISS: Simple form for approval settings
 * Library-First: Uses React Flow Handle component
 */

import { Handle, Position, NodeProps } from 'reactflow'
import { Users } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useWorkflowBuilderStore } from '@/stores/workflowBuilder'

interface HumanNodeData {
  label: string
  prompt?: string
  approvalRequired?: boolean
  timeoutSeconds?: number
  task?: string
}

export default function HumanNode({ id, data, selected }: NodeProps<HumanNodeData>) {
  const [isEditing, setIsEditing] = useState(false)
  const [prompt, setPrompt] = useState(data.prompt || 'Please review and approve to continue')
  const [approvalRequired, setApprovalRequired] = useState(data.approvalRequired ?? true)
  const [timeoutSeconds, setTimeoutSeconds] = useState(data.timeoutSeconds || 3600) // 1 hour default

  const updateStep = useWorkflowBuilderStore((state) => state.updateStep)

  const handleSave = () => {
    updateStep(id, {
      prompt,
      approvalRequired,
      timeoutSeconds,
      task: prompt,
    })
    setIsEditing(false)
  }

  const formatTimeout = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`
    return `${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) > 1 ? 's' : ''}`
  }

  return (
    <div
      className={`workflow-node bg-card border-2 ${
        selected ? 'border-green-500 shadow-lg' : 'border-border'
      } rounded-lg p-4 min-w-[250px]`}
    >
      <Handle type="target" position={Position.Top} className="workflow-handle" />

      <div className="flex items-center gap-2 mb-3">
        <div className="bg-green-500 p-2 rounded-md text-white">
          <Users className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Human Input</h3>
          <p className="text-xs text-muted-foreground">
            {approvalRequired ? 'Approval required' : 'Input requested'}
          </p>
        </div>
      </div>

      {!isEditing ? (
        <div className="space-y-2">
          <div className="text-xs">
            <span className="text-muted-foreground">Prompt:</span>
            <p className="mt-1 text-foreground">{prompt}</p>
          </div>
          <div className="text-xs">
            <span className="text-muted-foreground">Timeout:</span> {formatTimeout(timeoutSeconds)}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(true)}
            className="w-full mt-2"
          >
            Configure Input
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <Label htmlFor={`${id}-prompt`} className="text-xs">
              Prompt Message
            </Label>
            <Textarea
              id={`${id}-prompt`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter the message to show to the human..."
              className="min-h-[80px] text-xs"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor={`${id}-approval`} className="text-xs">
              Require Approval
            </Label>
            <Switch
              id={`${id}-approval`}
              checked={approvalRequired}
              onCheckedChange={setApprovalRequired}
            />
          </div>

          <div>
            <Label htmlFor={`${id}-timeout`} className="text-xs">
              Timeout (seconds)
            </Label>
            <Input
              id={`${id}-timeout`}
              type="number"
              value={timeoutSeconds}
              onChange={(e) => setTimeoutSeconds(parseInt(e.target.value) || 0)}
              min={0}
              className="h-8"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {timeoutSeconds > 0 ? formatTimeout(timeoutSeconds) : 'No timeout'}
            </p>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} className="flex-1">
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setPrompt(data.prompt || 'Please review and approve to continue')
                setApprovalRequired(data.approvalRequired ?? true)
                setTimeoutSeconds(data.timeoutSeconds || 3600)
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
