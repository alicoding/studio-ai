/**
 * OpenAIConfigNode - OpenAI provider configuration node
 *
 * SOLID: Single responsibility - OpenAI configuration only
 * DRY: Reuses BaseConfigNode for common patterns
 * KISS: Simple OpenAI-specific configuration fields
 * Library-First: Uses shadcn/ui components and React Flow
 */

import { NodeProps } from 'reactflow'
import { Bot, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import BaseConfigNode from './BaseConfigNode'
import type {
  AIConfigNodeData,
  OpenAIProviderConfig,
  ConnectionTestResult,
  ProviderMetadata,
} from '@/types/ai-config-nodes'

// OpenAI provider metadata
const OPENAI_METADATA: ProviderMetadata = {
  label: 'OpenAI',
  description: 'GPT models - Fast and cost-effective',
  icon: Bot,
  colorClass: 'bg-green-500',
  colorHex: '#10b981',
  defaultModels: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  requiresApiKey: true,
  supportsCustomUrl: true,
  documentationUrl: 'https://platform.openai.com/docs',
}

export default function OpenAIConfigNode({ id, data, selected }: NodeProps<AIConfigNodeData>) {
  const [showApiKey, setShowApiKey] = useState(false)

  // Cast data to OpenAI config type
  const config = data as OpenAIProviderConfig
  const settings = config.settings || {}

  // Handle settings updates
  const handleUpdateConfig = (updates: Partial<AIConfigNodeData>) => {
    // TODO: Update via workflow builder store
    console.log('Update config:', updates)
  }

  const handleUpdateSettings = (settingUpdates: Partial<OpenAIProviderConfig['settings']>) => {
    const updatedSettings = { ...settings, ...settingUpdates }
    handleUpdateConfig({
      settings: updatedSettings,
      updatedAt: new Date().toISOString(),
    })
  }

  // Test OpenAI connection
  const handleTestConnection = async (): Promise<ConnectionTestResult> => {
    const startTime = Date.now()

    try {
      // TODO: Implement actual OpenAI API test
      // For now, simulate a connection test
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const responseTime = Date.now() - startTime

      if (!settings.apiKey) {
        throw new Error('API key is required')
      }

      return {
        success: true,
        responseTime,
        availableModels: OPENAI_METADATA.defaultModels,
        testedAt: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
        testedAt: new Date().toISOString(),
      }
    }
  }

  return (
    <BaseConfigNode
      id={id}
      data={data}
      selected={selected}
      providerMetadata={OPENAI_METADATA}
      onUpdateConfig={handleUpdateConfig}
      onTestConnection={handleTestConnection}
    >
      {/* OpenAI-specific configuration fields */}
      <div className="space-y-3">
        {/* API Key */}
        <div className="space-y-1">
          <Label htmlFor={`apiKey-${id}`} className="text-xs font-medium">
            API Key <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Input
              id={`apiKey-${id}`}
              type={showApiKey ? 'text' : 'password'}
              value={settings.apiKey || ''}
              onChange={(e) => handleUpdateSettings({ apiKey: e.target.value })}
              placeholder="sk-..."
              className="text-xs h-8 pr-8"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-6 w-6 p-0"
              onClick={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </Button>
          </div>
        </div>

        {/* Organization ID */}
        <div className="space-y-1">
          <Label htmlFor={`orgId-${id}`} className="text-xs font-medium">
            Organization ID
          </Label>
          <Input
            id={`orgId-${id}`}
            value={settings.organizationId || ''}
            onChange={(e) => handleUpdateSettings({ organizationId: e.target.value })}
            placeholder="org-..."
            className="text-xs h-8"
          />
        </div>

        {/* Project ID */}
        <div className="space-y-1">
          <Label htmlFor={`projectId-${id}`} className="text-xs font-medium">
            Project ID
          </Label>
          <Input
            id={`projectId-${id}`}
            value={settings.projectId || ''}
            onChange={(e) => handleUpdateSettings({ projectId: e.target.value })}
            placeholder="proj_..."
            className="text-xs h-8"
          />
        </div>

        {/* Base URL */}
        <div className="space-y-1">
          <Label htmlFor={`baseUrl-${id}`} className="text-xs font-medium">
            Base URL
          </Label>
          <Input
            id={`baseUrl-${id}`}
            value={settings.baseUrl || ''}
            onChange={(e) => handleUpdateSettings({ baseUrl: e.target.value })}
            placeholder="https://api.openai.com/v1 (default)"
            className="text-xs h-8"
          />
        </div>

        {/* Default Model */}
        <div className="space-y-1">
          <Label className="text-xs font-medium">Default Model</Label>
          <Select
            value={settings.defaultModel || OPENAI_METADATA.defaultModels[0]}
            onValueChange={(model) => handleUpdateSettings({ defaultModel: model })}
          >
            <SelectTrigger className="text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPENAI_METADATA.defaultModels.map((model) => (
                <SelectItem key={model} value={model} className="text-xs">
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Advanced Settings */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor={`timeout-${id}`} className="text-xs font-medium">
              Timeout (ms)
            </Label>
            <Input
              id={`timeout-${id}`}
              type="number"
              value={settings.timeout || 30000}
              onChange={(e) => handleUpdateSettings({ timeout: parseInt(e.target.value) || 30000 })}
              className="text-xs h-8"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`retries-${id}`} className="text-xs font-medium">
              Max Retries
            </Label>
            <Input
              id={`retries-${id}`}
              type="number"
              value={settings.maxRetries || 3}
              onChange={(e) => handleUpdateSettings({ maxRetries: parseInt(e.target.value) || 3 })}
              className="text-xs h-8"
            />
          </div>
        </div>
      </div>
    </BaseConfigNode>
  )
}
