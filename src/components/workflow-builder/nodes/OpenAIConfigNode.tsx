/**
 * OpenAI Configuration Node - Draggable config node that connects to AI Task nodes
 *
 * SOLID: Single responsibility - OpenAI API configuration only
 * DRY: Reuses UI components and patterns from other nodes
 * KISS: Simple configuration form with API key and model selection
 * Library-First: Uses shadcn/ui components and React Flow handles
 */

import { Handle, Position, NodeProps } from 'reactflow'
import { Bot, Settings, Key, TestTube } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface OpenAIConfigData {
  name: string
  apiKey?: string
  organizationId?: string
  baseUrl?: string
  defaultModel: string
  isConnected?: boolean
}

const OPENAI_MODELS = [
  'gpt-4',
  'gpt-4-turbo',
  'gpt-4-turbo-preview',
  'gpt-3.5-turbo',
  'gpt-3.5-turbo-16k',
]

export default function OpenAIConfigNode({ id, data, selected }: NodeProps<OpenAIConfigData>) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  // Default values
  const defaults: OpenAIConfigData = {
    name: 'OpenAI Configuration',
    defaultModel: 'gpt-4',
    isConnected: false,
  }

  const nodeData: OpenAIConfigData = {
    ...defaults,
    ...data,
  }

  const handleTestConnection = async () => {
    setIsTesting(true)
    // TODO: Implement actual connection test
    setTimeout(() => {
      setIsTesting(false)
      // Simulate successful connection
    }, 2000)
  }

  return (
    <div
      className={`
        relative bg-card border-2 rounded-lg shadow-sm min-w-[280px] max-w-[350px]
        ${selected ? 'border-primary shadow-md' : 'border-border'}
        transition-all duration-200
      `}
    >
      {/* Provider output handle - Right side for connecting to AI Task nodes */}
      <Handle
        type="source"
        position={Position.Right}
        id="provider-output"
        className="w-3 h-3 border-2 border-background"
        style={{ background: '#10b981' }} // OpenAI green
      />

      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-green-50 rounded-t-lg border-b">
        <div className="flex items-center gap-2">
          <div className="bg-green-500 p-1.5 rounded-md text-white">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-medium">{nodeData.name}</div>
            <div className="text-xs text-muted-foreground">OpenAI Provider</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant={nodeData.isConnected ? 'default' : 'secondary'} className="text-xs">
            {nodeData.isConnected ? 'Connected' : 'Config'}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            <Settings className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Configuration panel */}
      {isExpanded && (
        <div className="p-3 space-y-3 border-b">
          {/* Configuration Name */}
          <div className="space-y-1">
            <Label htmlFor={`name-${id}`} className="text-xs font-medium">
              Configuration Name
            </Label>
            <Input
              id={`name-${id}`}
              placeholder="e.g., Production OpenAI, Dev OpenAI"
              value={nodeData.name}
              className="text-xs h-8"
            />
          </div>

          {/* API Key */}
          <div className="space-y-1">
            <Label htmlFor={`apikey-${id}`} className="text-xs font-medium">
              <Key className="w-3 h-3 inline mr-1" />
              API Key
            </Label>
            <Input
              id={`apikey-${id}`}
              type="password"
              placeholder="sk-..."
              value={nodeData.apiKey || ''}
              className="text-xs h-8"
            />
            <div className="text-xs text-muted-foreground">
              Leave empty to use environment variable OPENAI_API_KEY
            </div>
          </div>

          {/* Default Model */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Default Model</Label>
            <Select value={nodeData.defaultModel}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPENAI_MODELS.map((model) => (
                  <SelectItem key={model} value={model} className="text-xs">
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Organization ID (Optional) */}
          <div className="space-y-1">
            <Label htmlFor={`org-${id}`} className="text-xs font-medium">
              Organization ID (Optional)
            </Label>
            <Input
              id={`org-${id}`}
              placeholder="org-..."
              value={nodeData.organizationId || ''}
              className="text-xs h-8"
            />
          </div>

          {/* Custom Base URL (Optional) */}
          <div className="space-y-1">
            <Label htmlFor={`baseurl-${id}`} className="text-xs font-medium">
              Base URL (Optional)
            </Label>
            <Input
              id={`baseurl-${id}`}
              type="url"
              placeholder="https://api.openai.com/v1"
              value={nodeData.baseUrl || ''}
              className="text-xs h-8"
            />
            <div className="text-xs text-muted-foreground">
              For custom OpenAI-compatible endpoints
            </div>
          </div>

          {/* Test Connection */}
          <div className="pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="w-full text-xs h-8"
            >
              <TestTube className="w-3 h-3 mr-2" />
              {isTesting ? 'Testing...' : 'Test Connection'}
            </Button>
          </div>
        </div>
      )}

      {/* Status summary when collapsed */}
      {!isExpanded && (
        <div className="p-3">
          <div className="text-xs text-muted-foreground">
            {nodeData.isConnected ? (
              <span className="text-green-600">✓ Connected • {nodeData.defaultModel}</span>
            ) : (
              <span className="italic">Click to configure OpenAI API</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
