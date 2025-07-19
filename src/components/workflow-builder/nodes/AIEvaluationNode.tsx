/**
 * AINode - General-purpose AI node for workflow builder
 *
 * SOLID: Single responsibility - AI task configuration UI
 * DRY: Reuses common UI components and patterns
 * KISS: Simple form with clear provider options following n8n AI node patterns
 * Library-First: Uses React Flow, Lucide icons, shadcn/ui components
 */

import { Handle, Position, NodeProps } from 'reactflow'
import {
  Brain,
  Bot,
  ChevronDown,
  ChevronRight,
  Settings,
  Sparkles,
  Key,
  Sliders,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { useWorkflowBuilderStore } from '@/stores/workflowBuilder'

// Supported AI providers following n8n AI node patterns
type AIProvider = 'openai' | 'anthropic' | 'azure' | 'google'

interface AINodeData {
  label: string
  task?: string
  provider?: AIProvider
  model?: string
  systemPrompt?: string
  // Advanced configuration
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  // Authentication
  apiKey?: string
  baseUrl?: string
  organizationId?: string
  // Configuration
  timeout?: number
  retryCount?: number
}

// Provider configuration options
const AI_PROVIDERS = {
  openai: {
    label: 'OpenAI',
    description: 'GPT models - Fast and cost-effective',
    icon: Bot,
    colorClass: 'bg-green-500',
    colorHex: '#10b981',
    defaultModels: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  anthropic: {
    label: 'Anthropic',
    description: 'Claude models - Advanced reasoning',
    icon: Brain,
    colorClass: 'bg-orange-500',
    colorHex: '#f97316',
    defaultModels: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
  },
  azure: {
    label: 'Azure OpenAI',
    description: 'Enterprise OpenAI via Azure',
    icon: Bot,
    colorClass: 'bg-blue-500',
    colorHex: '#3b82f6',
    defaultModels: ['gpt-4', 'gpt-35-turbo'],
  },
  google: {
    label: 'Google AI',
    description: 'Gemini models - Multimodal capabilities',
    icon: Sparkles,
    colorClass: 'bg-purple-500',
    colorHex: '#8b5cf6',
    defaultModels: ['gemini-pro', 'gemini-pro-vision'],
  },
} as const

export default function AINode({ id, data, selected }: NodeProps<AINodeData>) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const { updateStep, getStep } = useWorkflowBuilderStore()

  // Get current step data from store to ensure reactivity
  const storeStep = getStep(id)

  // Default values
  const defaultNodeData = {
    label: 'AI Assistant',
    task: '',
    provider: 'openai' as AIProvider,
    model: '',
    systemPrompt: '',
    temperature: 0.7,
    maxTokens: 1000,
    topP: 1.0,
    frequencyPenalty: 0,
    presencePenalty: 0,
    timeout: 30000,
    retryCount: 3,
  }

  // Merge with data prop and store data, giving priority to store
  const nodeData = {
    ...defaultNodeData,
    ...(data || {}),
    ...(storeStep || {}),
  }

  const currentProvider = nodeData.provider || 'openai'
  const providerConfig = AI_PROVIDERS[currentProvider as keyof typeof AI_PROVIDERS]

  // Handle node data updates using workflow builder store
  const handleUpdate = (updates: Partial<AINodeData>) => {
    updateStep(id, updates)
  }

  const handleProviderChange = (provider: AIProvider) => {
    // Reset model when provider changes
    handleUpdate({
      provider,
      model: AI_PROVIDERS[provider].defaultModels[0],
    })
  }

  return (
    <TooltipProvider>
      <div
        className={`
          relative bg-card border-2 rounded-lg shadow-sm min-w-[280px] max-w-[380px]
          ${selected ? 'border-primary shadow-md' : 'border-border'}
          transition-all duration-200 nodrag nowheel
        `}
      >
        {/* Input handle */}
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 border-2 border-background"
          style={{ background: providerConfig.colorHex }}
        />

        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-t-lg border-b">
          <div className="flex items-center gap-2">
            <div className={`${providerConfig.colorClass} p-1.5 rounded-md text-white`}>
              <providerConfig.icon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-medium">{nodeData.label}</div>
              <div className="text-xs text-muted-foreground">{providerConfig.label} AI Task</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="text-xs">
              AI
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 w-6 p-0"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </Button>
          </div>
        </div>

        {/* Configuration panel */}
        {isExpanded && (
          <div className="p-3 space-y-3 border-b">
            {/* Task input */}
            <div className="space-y-1">
              <Label htmlFor={`task-${id}`} className="text-xs font-medium">
                AI Task
              </Label>
              <Textarea
                id={`task-${id}`}
                placeholder="Describe what you want the AI to do: {previous_step.output}"
                value={nodeData.task || ''}
                onChange={(e) => handleUpdate({ task: e.target.value })}
                className="text-xs min-h-[60px] resize-none"
              />
              <div className="text-xs text-muted-foreground">
                Use {`{step_id.output}`} for template variables
              </div>
            </div>

            {/* Provider selection */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">AI Provider</Label>
              <Select value={currentProvider} onValueChange={handleProviderChange}>
                <SelectTrigger
                  className="text-xs"
                  onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  {Object.entries(AI_PROVIDERS).map(([key, config]) => (
                    <SelectItem
                      key={key}
                      value={key}
                      className="text-xs"
                      onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2">
                        <config.icon className="w-3 h-3" />
                        <span>{config.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Model selection */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Model</Label>
              <Select
                value={nodeData.model || providerConfig.defaultModels[0]}
                onValueChange={(model) => handleUpdate({ model })}
              >
                <SelectTrigger
                  className="text-xs"
                  onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  {providerConfig.defaultModels.map((model: string) => (
                    <SelectItem
                      key={model}
                      value={model}
                      className="text-xs"
                      onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* System prompt */}
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Label className="text-xs font-medium">System Prompt</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Settings className="w-3 h-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    <p>Instructions for how the AI should perform the task</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Textarea
                placeholder="You are a helpful AI assistant. Please process the input and provide a clear response."
                value={nodeData.systemPrompt || ''}
                onChange={(e) => handleUpdate({ systemPrompt: e.target.value })}
                className="text-xs min-h-[60px] resize-none"
              />
            </div>

            {/* Advanced Configuration Toggle */}
            <div className="pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full text-xs h-8 justify-start"
              >
                <Sliders className="w-3 h-3 mr-2" />
                Advanced Configuration
                {showAdvanced ? (
                  <ChevronDown className="w-3 h-3 ml-auto" />
                ) : (
                  <ChevronRight className="w-3 h-3 ml-auto" />
                )}
              </Button>
            </div>

            {/* Advanced Configuration Panel */}
            {showAdvanced && (
              <div className="space-y-3 pt-2 border-t bg-muted/20 -mx-3 px-3 pb-2">
                {/* Model Parameters */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Temperature</Label>
                    <Input
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      value={nodeData.temperature || 0.7}
                      onChange={(e) =>
                        handleUpdate({ temperature: parseFloat(e.target.value) || 0.7 })
                      }
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Max Tokens</Label>
                    <Input
                      type="number"
                      min="1"
                      max="4000"
                      value={nodeData.maxTokens || 1000}
                      onChange={(e) =>
                        handleUpdate({ maxTokens: parseInt(e.target.value) || 1000 })
                      }
                      className="text-xs h-8"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Top P</Label>
                    <Input
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={nodeData.topP || 1.0}
                      onChange={(e) => handleUpdate({ topP: parseFloat(e.target.value) || 1.0 })}
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Timeout (ms)</Label>
                    <Input
                      type="number"
                      min="1000"
                      max="300000"
                      value={nodeData.timeout || 30000}
                      onChange={(e) => handleUpdate({ timeout: parseInt(e.target.value) || 30000 })}
                      className="text-xs h-8"
                    />
                  </div>
                </div>

                {/* Authentication */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Key className="w-3 h-3 text-muted-foreground" />
                    <Label className="text-xs font-medium">Authentication</Label>
                  </div>
                  <div className="space-y-2">
                    <Input
                      type="password"
                      placeholder="API Key (optional - uses environment variable if not set)"
                      value={nodeData.apiKey || ''}
                      onChange={(e) => handleUpdate({ apiKey: e.target.value })}
                      className="text-xs h-8"
                    />
                    <Input
                      type="url"
                      placeholder="Custom Base URL (optional)"
                      value={nodeData.baseUrl || ''}
                      onChange={(e) => handleUpdate({ baseUrl: e.target.value })}
                      className="text-xs h-8"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status summary when collapsed */}
        {!isExpanded && (
          <div className="p-3">
            <div className="text-xs text-muted-foreground">
              {nodeData.task ? (
                <span className="line-clamp-2">{nodeData.task}</span>
              ) : (
                <span className="italic">Click to configure AI task</span>
              )}
            </div>
            {nodeData.provider && nodeData.model && (
              <div className="mt-1 text-xs text-muted-foreground">
                {AI_PROVIDERS[nodeData.provider as keyof typeof AI_PROVIDERS].label} •{' '}
                {nodeData.model}
              </div>
            )}
          </div>
        )}

        {/* Output handle */}
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 border-2 border-background"
          style={{ background: providerConfig.colorHex }}
        />
      </div>
    </TooltipProvider>
  )
}
