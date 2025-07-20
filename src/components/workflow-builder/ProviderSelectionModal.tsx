/**
 * ProviderSelectionModal - Modal for selecting AI providers (OpenAI, Anthropic, Azure, Google)
 *
 * SOLID: Single responsibility - provider selection only
 * DRY: Reuses shadcn/ui Dialog components
 * KISS: Simple grid layout with provider cards
 * Library-First: Uses shadcn/ui Dialog, existing icons from Lucide
 */

import { Bot, Brain, Sparkles, Key, ArrowLeft, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useConfigModal, type ProviderConfig } from './ConfigModalContext'
import { useWorkflowBuilderStore } from '@/stores/workflowBuilder'
import { useState } from 'react'
import type { WorkflowStepDefinition } from '../../../web/server/schemas/workflow-builder'

// Extended step definition that includes provider config (temporary until schema is updated)
interface ExtendedStepDefinition extends Partial<WorkflowStepDefinition> {
  providerConfig?: ProviderConfig
  provider?: string
  model?: string
  temperature?: number
  maxTokens?: number
  apiKey?: string
  baseUrl?: string
}

// Provider configuration options (matching n8n patterns)
const PROVIDER_OPTIONS = [
  {
    id: 'openai' as const,
    name: 'OpenAI',
    description: 'GPT models - Fast and cost-effective',
    icon: Bot,
    colorClass: 'bg-green-500',
    defaultModels: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  {
    id: 'anthropic' as const,
    name: 'Anthropic',
    description: 'Claude models - Advanced reasoning',
    icon: Brain,
    colorClass: 'bg-orange-500',
    defaultModels: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
  },
  {
    id: 'azure' as const,
    name: 'Azure OpenAI',
    description: 'Enterprise OpenAI via Azure',
    icon: Bot,
    colorClass: 'bg-blue-500',
    defaultModels: ['gpt-4', 'gpt-35-turbo'],
  },
  {
    id: 'google' as const,
    name: 'Google AI',
    description: 'Gemini models - Multimodal capabilities',
    icon: Sparkles,
    colorClass: 'bg-purple-500',
    defaultModels: ['gemini-pro', 'gemini-pro-vision'],
  },
] as const

export default function ProviderSelectionModal() {
  const { modalState, closeModal, updateProviderConfig } = useConfigModal()
  const { updateStep } = useWorkflowBuilderStore()
  const [configStep, setConfigStep] = useState<'selection' | 'configuration'>('selection')
  const [selectedProvider, setSelectedProvider] = useState<
    (typeof PROVIDER_OPTIONS)[number] | null
  >(null)
  const [config, setConfig] = useState<ProviderConfig>({
    type: 'openai',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 1000,
  })

  const isOpen = modalState.isOpen && modalState.modalType === 'provider'

  // Debug logging
  console.log('ProviderSelectionModal render:', {
    modalStateOpen: modalState.isOpen,
    modalType: modalState.modalType,
    nodeId: modalState.nodeId,
    isOpen,
  })

  const handleProviderSelect = (providerId: (typeof PROVIDER_OPTIONS)[number]['id']) => {
    const provider = PROVIDER_OPTIONS.find((p) => p.id === providerId)
    if (!provider) return

    setSelectedProvider(provider)
    setConfig({
      type: providerId,
      model: provider.defaultModels[0],
      temperature: 0.7,
      maxTokens: 1000,
    })
    setConfigStep('configuration')
  }

  const handleBackToSelection = () => {
    setConfigStep('selection')
    setSelectedProvider(null)
  }

  const handleSaveConfiguration = () => {
    if (!modalState.nodeId) return

    // Update the provider config in context
    updateProviderConfig(config)

    // Save the configuration to the AI node via workflow builder store
    const stepUpdate: ExtendedStepDefinition = {
      // Store provider config as extended property (will update schema later)
      providerConfig: config,
      // Also update legacy fields for backward compatibility
      provider: config.type,
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
    }

    updateStep(modalState.nodeId, stepUpdate as Partial<WorkflowStepDefinition>)

    closeModal()
    setConfigStep('selection')
    setSelectedProvider(null)
  }

  const handleConfigChange = (field: keyof ProviderConfig, value: string | number) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeModal()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {configStep === 'selection' ? (
          <>
            <DialogHeader>
              <DialogTitle>Select AI Provider</DialogTitle>
              <DialogDescription>
                Choose an AI provider for this task. You can configure the specific model and
                settings in the next step.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 py-4">
              {PROVIDER_OPTIONS.map((provider) => {
                const IconComponent = provider.icon

                return (
                  <button
                    key={provider.id}
                    onClick={() => handleProviderSelect(provider.id)}
                    className="flex flex-col items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors group"
                  >
                    <div
                      className={`${provider.colorClass} p-3 rounded-lg text-white group-hover:scale-105 transition-transform`}
                    >
                      <IconComponent className="w-6 h-6" />
                    </div>

                    <div className="text-center">
                      <div className="font-medium text-sm">{provider.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {provider.description}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="pt-4 border-t border-border">
              <div className="text-xs text-muted-foreground text-center">
                💡 Each provider offers different models and capabilities
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToSelection}
                  className="h-8 w-8 p-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                Configure {selectedProvider?.name}
              </DialogTitle>
              <DialogDescription>
                Set up your {selectedProvider?.name} provider configuration including API key,
                model, and parameters.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* API Key */}
              <div className="space-y-2">
                <Label htmlFor="apiKey" className="text-sm font-medium flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  API Key
                </Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Enter your API key"
                  value={config.apiKey || ''}
                  onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                />
                <div className="text-xs text-muted-foreground">
                  Leave empty to use environment variable
                </div>
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Model</Label>
                <Select
                  value={config.model}
                  onValueChange={(value) => handleConfigChange('model', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedProvider?.defaultModels.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Temperature */}
              <div className="space-y-2">
                <Label htmlFor="temperature" className="text-sm font-medium">
                  Temperature ({config.temperature})
                </Label>
                <Input
                  id="temperature"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={config.temperature}
                  onChange={(e) =>
                    handleConfigChange('temperature', parseFloat(e.target.value) || 0.7)
                  }
                />
                <div className="text-xs text-muted-foreground">
                  Controls randomness (0 = focused, 2 = creative)
                </div>
              </div>

              {/* Max Tokens */}
              <div className="space-y-2">
                <Label htmlFor="maxTokens" className="text-sm font-medium">
                  Max Tokens
                </Label>
                <Input
                  id="maxTokens"
                  type="number"
                  min="1"
                  max="4000"
                  value={config.maxTokens}
                  onChange={(e) =>
                    handleConfigChange('maxTokens', parseInt(e.target.value) || 1000)
                  }
                />
                <div className="text-xs text-muted-foreground">Maximum tokens in response</div>
              </div>

              {/* Base URL (optional) */}
              <div className="space-y-2">
                <Label htmlFor="baseUrl" className="text-sm font-medium">
                  Base URL (Optional)
                </Label>
                <Input
                  id="baseUrl"
                  type="url"
                  placeholder="https://api.openai.com/v1"
                  value={config.baseUrl || ''}
                  onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
                />
                <div className="text-xs text-muted-foreground">
                  Custom endpoint for compatible APIs
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleBackToSelection}>
                Back
              </Button>
              <Button onClick={handleSaveConfiguration} className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                Save Configuration
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
