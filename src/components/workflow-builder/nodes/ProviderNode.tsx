/**
 * ProviderNode - AI Provider configuration node (OpenAI, Anthropic, Azure, Google)
 *
 * SOLID: Single responsibility - AI provider configuration only
 * DRY: Reuses common UI components and patterns
 * KISS: Simple provider selection and configuration interface
 * Library-First: Uses React Flow, Lucide icons, shadcn/ui components
 */

import { Handle, Position, NodeProps } from 'reactflow'
import { Bot, Brain, Sparkles, Key, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
// Removed Input component due to event handling issues in React Flow nodes
// Removed Select components due to portal rendering issues in React Flow nodes
import { useWorkflowBuilderStore } from '@/stores/workflowBuilder'
import type { WorkflowStepDefinition } from '../../../../web/server/schemas/workflow-builder'

// Extended step definition that includes provider config
interface ExtendedStepDefinition {
  providerType?: string
  config?: ProviderConfig | Record<string, unknown>
  [key: string]: unknown
}

// Provider configuration interface
interface ProviderConfig {
  type: 'openai' | 'anthropic' | 'azure' | 'google'
  apiKey?: string
  model: string
  temperature?: number
  maxTokens?: number
  baseUrl?: string
  organizationId?: string
}

// Provider node data interface
interface ProviderNodeData {
  label: string
  providerType?: ProviderConfig['type']
  config?: ProviderConfig
}

// Supported AI providers
const AI_PROVIDERS = {
  openai: {
    label: 'OpenAI',
    description: 'GPT models - Fast and cost-effective',
    icon: Bot,
    colorClass: 'bg-green-500',
    defaultModels: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  anthropic: {
    label: 'Anthropic',
    description: 'Claude models - Advanced reasoning',
    icon: Brain,
    colorClass: 'bg-orange-500',
    defaultModels: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
  },
  azure: {
    label: 'Azure OpenAI',
    description: 'Enterprise OpenAI via Azure',
    icon: Bot,
    colorClass: 'bg-blue-500',
    defaultModels: ['gpt-4', 'gpt-35-turbo'],
  },
  google: {
    label: 'Google AI',
    description: 'Gemini models - Multimodal capabilities',
    icon: Sparkles,
    colorClass: 'bg-purple-500',
    defaultModels: ['gemini-pro', 'gemini-pro-vision'],
  },
} as const

export default function ProviderNode({ id, data, selected }: NodeProps<ProviderNodeData>) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { updateStep } = useWorkflowBuilderStore()

  // Default values
  const defaultNodeData: ProviderNodeData = {
    label: 'AI Provider',
    providerType: 'openai',
    config: {
      type: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000,
    },
  }

  // Merge with data prop
  const nodeData = {
    ...defaultNodeData,
    ...(data || {}),
  }

  const currentProvider = nodeData.providerType || 'openai'
  const providerConfig = AI_PROVIDERS[currentProvider]
  const config = nodeData.config || defaultNodeData.config!

  // Handle configuration updates
  const handleConfigUpdate = (updates: Partial<ProviderConfig>) => {
    const newConfig = { ...config, ...updates }
    const nodeUpdate: ExtendedStepDefinition = {
      ...nodeData,
      config: newConfig,
    }

    // Type assertion for provider node data
    updateStep(id, nodeUpdate as unknown as Partial<WorkflowStepDefinition>)
  }

  const handleProviderChange = (providerType: ProviderConfig['type']) => {
    const newConfig: ProviderConfig = {
      type: providerType,
      model: AI_PROVIDERS[providerType].defaultModels[0],
      temperature: 0.7,
      maxTokens: 1000,
    }

    const nodeUpdate: ExtendedStepDefinition = {
      ...nodeData,
      providerType,
      config: newConfig,
    }

    updateStep(id, nodeUpdate as unknown as Partial<WorkflowStepDefinition>)
  }

  return (
    <div
      className={`
        relative bg-card border-2 rounded-lg shadow-sm min-w-[240px] max-w-[320px]
        ${selected ? 'border-primary shadow-md' : 'border-border'}
        transition-all duration-200
      `}
    >
      {/* Output handle - connects to AI node */}
      <Handle
        type="source"
        position={Position.Top}
        id="output"
        className="w-3 h-3 border-2 border-background"
        style={{ background: providerConfig.colorClass.replace('bg-', '#') }}
      />

      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-t-lg border-b">
        <div className="flex items-center gap-2">
          <div className={`${providerConfig.colorClass} p-1.5 rounded-md text-white`}>
            <providerConfig.icon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-medium">{providerConfig.label}</div>
            <div className="text-xs text-muted-foreground">Provider</div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-6 w-6 p-0"
        >
          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </Button>
      </div>

      {/* Configuration panel */}
      {isExpanded && (
        <div
          className="p-3 space-y-3"
          data-no-drag="true"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{ pointerEvents: 'auto', userSelect: 'text' }}
        >
          {/* Provider Selection */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Provider Type</Label>
            <select
              value={currentProvider}
              onChange={(e) =>
                handleProviderChange(e.target.value as 'openai' | 'anthropic' | 'azure' | 'google')
              }
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              onKeyDown={(e) => e.stopPropagation()}
              style={{ pointerEvents: 'auto', userSelect: 'text' }}
            >
              {Object.entries(AI_PROVIDERS).map(([key, provider]) => (
                <option key={key} value={key}>
                  {provider.label}
                </option>
              ))}
            </select>
          </div>

          {/* Model Selection */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Model</Label>
            <select
              value={config.model}
              onChange={(e) => handleConfigUpdate({ model: e.target.value })}
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              onKeyDown={(e) => e.stopPropagation()}
              style={{ pointerEvents: 'auto', userSelect: 'text' }}
            >
              {providerConfig.defaultModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>

          {/* API Key */}
          <div className="space-y-1">
            <Label className="text-xs font-medium flex items-center gap-1">
              <Key className="w-3 h-3" />
              API Key
            </Label>
            <input
              type="password"
              placeholder="Enter API key (optional)"
              value={config.apiKey || ''}
              onChange={(e) => handleConfigUpdate({ apiKey: e.target.value })}
              onKeyDown={(e) => e.stopPropagation()}
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ pointerEvents: 'auto', userSelect: 'text' }}
            />
          </div>

          {/* Temperature */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Temperature ({config.temperature})</Label>
            <input
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={config.temperature || 0.7}
              onChange={(e) =>
                handleConfigUpdate({ temperature: parseFloat(e.target.value) || 0.7 })
              }
              onKeyDown={(e) => e.stopPropagation()}
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ pointerEvents: 'auto', userSelect: 'text' }}
            />
          </div>

          {/* Max Tokens */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Max Tokens</Label>
            <input
              type="number"
              min="1"
              max="4000"
              value={config.maxTokens || 1000}
              onChange={(e) => handleConfigUpdate({ maxTokens: parseInt(e.target.value) || 1000 })}
              onKeyDown={(e) => e.stopPropagation()}
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ pointerEvents: 'auto', userSelect: 'text' }}
            />
          </div>

          {/* Base URL (optional) */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Base URL (Optional)</Label>
            <input
              type="url"
              placeholder="https://api.openai.com/v1"
              value={config.baseUrl || ''}
              onChange={(e) => handleConfigUpdate({ baseUrl: e.target.value })}
              onKeyDown={(e) => e.stopPropagation()}
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ pointerEvents: 'auto', userSelect: 'text' }}
            />
          </div>
        </div>
      )}

      {/* Summary when collapsed */}
      {!isExpanded && (
        <div className="p-3">
          <div className="text-xs text-muted-foreground">
            {config.model ? (
              <span>{config.model}</span>
            ) : (
              <span className="italic">Configure provider settings</span>
            )}
          </div>
          {config.apiKey && <div className="text-xs text-green-600 mt-1">✓ API Key configured</div>}
        </div>
      )}

      {/* Output Handle - Right side to connect to AI nodes */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="w-3 h-3 border-2 border-background"
        style={{ background: '#10b981' }} // green to match provider theme
      />
    </div>
  )
}
