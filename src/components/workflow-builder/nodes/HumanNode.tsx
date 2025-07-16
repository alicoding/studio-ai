/**
 * HumanNode - Human input/approval node for workflow builder
 *
 * SOLID: Single responsibility - human input configuration UI
 * DRY: Reuses common UI components and patterns
 * KISS: Simple form with clear options following industry standards
 * Library-First: Uses React Flow, Lucide icons, shadcn/ui components
 */

import { Handle, Position, NodeProps } from 'reactflow'
import { Users, AlertTriangle, Info, CheckCircle, Clock, HelpCircle } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { useWorkflowBuilderStore } from '@/stores/workflowBuilder'

// Industry-standard interaction types following n8n/Power Automate patterns
type InteractionType = 'approval' | 'notification' | 'input'

// Timeout behavior options following industry standards
type TimeoutBehavior = 'fail' | 'auto-approve' | 'infinite'

interface HumanNodeData {
  label: string
  prompt?: string
  interactionType?: InteractionType
  timeoutBehavior?: TimeoutBehavior
  timeoutSeconds?: number
  task?: string
  // Legacy support
  approvalRequired?: boolean
}

// Configuration option definitions with descriptions
const INTERACTION_TYPES = {
  approval: {
    label: 'Approval Required',
    description: 'Critical decision - workflow stops until approved/rejected',
    icon: CheckCircle,
    color: 'bg-red-500',
    badge: 'Critical',
  },
  notification: {
    label: 'Notification Only',
    description: 'Info + acknowledgment - workflow continues after viewing',
    icon: Info,
    color: 'bg-blue-500',
    badge: 'Info',
  },
  input: {
    label: 'Input Collection',
    description: 'Gather feedback or data before continuing',
    icon: Users,
    color: 'bg-green-500',
    badge: 'Input',
  },
} as const

const TIMEOUT_BEHAVIORS = {
  fail: {
    label: 'Fail workflow',
    description: 'Stop workflow if no response (safest option)',
    icon: AlertTriangle,
    warning: false,
  },
  'auto-approve': {
    label: 'Auto-approve',
    description: 'Continue workflow automatically (use with caution)',
    icon: Clock,
    warning: true,
  },
  infinite: {
    label: 'Wait indefinitely',
    description: 'Wait until manual action (no timeout)',
    icon: Clock,
    warning: false,
  },
} as const

export default function HumanNode({ id, data, selected }: NodeProps<HumanNodeData>) {
  const [isEditing, setIsEditing] = useState(false)
  const [prompt, setPrompt] = useState(data.prompt || 'Please review and approve to continue')

  // Migrate legacy approvalRequired to new interactionType
  const [interactionType, setInteractionType] = useState<InteractionType>(
    data.interactionType ?? (data.approvalRequired !== false ? 'approval' : 'notification')
  )

  const [timeoutBehavior, setTimeoutBehavior] = useState<TimeoutBehavior>(
    data.timeoutBehavior ?? 'fail'
  )

  const [timeoutSeconds, setTimeoutSeconds] = useState(data.timeoutSeconds || 3600)

  const updateStep = useWorkflowBuilderStore((state) => state.updateStep)

  // Get current interaction config
  const currentInteraction = INTERACTION_TYPES[interactionType]
  const currentTimeout = TIMEOUT_BEHAVIORS[timeoutBehavior]

  const handleSave = () => {
    updateStep(id, {
      prompt,
      interactionType,
      timeoutBehavior,
      timeoutSeconds: timeoutBehavior === 'infinite' ? 0 : timeoutSeconds,
      task: prompt,
      // Legacy support
      approvalRequired: interactionType === 'approval',
    })
    setIsEditing(false)
  }

  const formatTimeout = (seconds: number) => {
    if (seconds === 0) return 'No timeout'
    if (seconds < 60) return `${seconds} seconds`
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`
    return `${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) > 1 ? 's' : ''}`
  }

  const getDisplayTimeout = () => {
    if (timeoutBehavior === 'infinite') return 'Wait indefinitely'
    return `${currentTimeout.label} after ${formatTimeout(timeoutSeconds)}`
  }

  return (
    <TooltipProvider>
      <div
        className={`workflow-node bg-card border-2 ${
          selected ? 'border-primary shadow-lg' : 'border-border'
        } rounded-lg p-4 min-w-[280px]`}
      >
        <Handle type="target" position={Position.Top} className="workflow-handle" />

        <div className="flex items-center gap-2 mb-3">
          <div className={`${currentInteraction.color} p-2 rounded-md text-white`}>
            <currentInteraction.icon className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">Human Input</h3>
              <Badge variant="secondary" className="text-xs">
                {currentInteraction.badge}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{currentInteraction.label}</p>
          </div>
        </div>

        {!isEditing ? (
          <div className="space-y-2">
            <div className="text-xs">
              <span className="text-muted-foreground">Prompt:</span>
              <p className="mt-1 text-foreground">{prompt}</p>
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">Timeout:</span>
              <p className="mt-1 text-foreground">{getDisplayTimeout()}</p>
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
          <div className="space-y-4">
            {/* Prompt Message */}
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Label htmlFor={`${id}-prompt`} className="text-xs font-medium">
                  Prompt Message
                </Label>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="w-3 h-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-[200px]">
                      Message shown to the user when this step is reached.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Textarea
                id={`${id}-prompt`}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter the message to show to the human..."
                className="min-h-[60px] text-xs"
              />
            </div>

            {/* Interaction Type */}
            <div>
              <div className="flex items-center gap-1 mb-2">
                <Label className="text-xs font-medium">Interaction Type</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="w-3 h-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="max-w-[250px] space-y-1">
                      <p>
                        <strong>Approval:</strong> Requires explicit decision
                      </p>
                      <p>
                        <strong>Notification:</strong> Shows info, auto-continues
                      </p>
                      <p>
                        <strong>Input:</strong> Collects feedback/data
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
              <RadioGroup
                value={interactionType}
                onValueChange={(value: InteractionType) => setInteractionType(value)}
              >
                {(
                  Object.entries(INTERACTION_TYPES) as Array<
                    [InteractionType, (typeof INTERACTION_TYPES)[InteractionType]]
                  >
                ).map(([type, config]) => {
                  const IconComponent = config.icon
                  return (
                    <div
                      key={type}
                      className="flex items-center space-x-2 p-2 rounded border hover:bg-muted/50"
                    >
                      <RadioGroupItem value={type} id={`${id}-${type}`} />
                      <div className={`${config.color} p-1 rounded text-white`}>
                        <IconComponent className="w-3 h-3" />
                      </div>
                      <div className="flex-1">
                        <Label
                          htmlFor={`${id}-${type}`}
                          className="text-xs font-medium cursor-pointer"
                        >
                          {config.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">{config.description}</p>
                      </div>
                    </div>
                  )
                })}
              </RadioGroup>
            </div>

            {/* Timeout Behavior */}
            <div>
              <div className="flex items-center gap-1 mb-2">
                <Label className="text-xs font-medium">On Timeout</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="w-3 h-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="max-w-[250px] space-y-1">
                      <p>
                        <strong>Fail:</strong> Stop workflow (safest)
                      </p>
                      <p>
                        <strong>Auto-approve:</strong> Continue automatically (risky)
                      </p>
                      <p>
                        <strong>Wait indefinitely:</strong> No timeout
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select
                value={timeoutBehavior}
                onValueChange={(value: TimeoutBehavior) => setTimeoutBehavior(value)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(TIMEOUT_BEHAVIORS) as Array<
                      [TimeoutBehavior, (typeof TIMEOUT_BEHAVIORS)[TimeoutBehavior]]
                    >
                  ).map(([behavior, config]) => {
                    const IconComponent = config.icon
                    return (
                      <SelectItem key={behavior} value={behavior}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-3 h-3" />
                          <span>{config.label}</span>
                          {config.warning && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>

              {/* Warning for auto-approve */}
              {timeoutBehavior === 'auto-approve' && (
                <div className="flex items-center gap-1 mt-1 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  <span className="text-amber-800">
                    Auto-approve can bypass critical safety checks
                  </span>
                </div>
              )}

              {/* Timeout duration for fail and auto-approve */}
              {timeoutBehavior !== 'infinite' && (
                <div className="mt-2">
                  <Label htmlFor={`${id}-duration`} className="text-xs">
                    Timeout Duration
                  </Label>
                  <Select
                    value={timeoutSeconds.toString()}
                    onValueChange={(value) => setTimeoutSeconds(parseInt(value))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="300">5 minutes</SelectItem>
                      <SelectItem value="900">15 minutes</SelectItem>
                      <SelectItem value="1800">30 minutes</SelectItem>
                      <SelectItem value="3600">1 hour</SelectItem>
                      <SelectItem value="7200">2 hours</SelectItem>
                      <SelectItem value="14400">4 hours</SelectItem>
                      <SelectItem value="28800">8 hours</SelectItem>
                      <SelectItem value="86400">24 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <Button size="sm" onClick={handleSave} className="flex-1">
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setPrompt(data.prompt || 'Please review and approve to continue')
                  setInteractionType(
                    data.interactionType ??
                      (data.approvalRequired !== false ? 'approval' : 'notification')
                  )
                  setTimeoutBehavior(data.timeoutBehavior ?? 'fail')
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
    </TooltipProvider>
  )
}
