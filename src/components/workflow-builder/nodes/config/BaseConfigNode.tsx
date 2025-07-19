/**
 * BaseConfigNode - Shared component for all AI provider configuration nodes
 *
 * SOLID: Single responsibility - common config node UI patterns
 * DRY: Reusable base component for all provider configs
 * KISS: Simple, consistent interface across all config types
 * Library-First: Uses React Flow, shadcn/ui components
 */

import { Handle, Position } from 'reactflow'
import {
  ChevronDown,
  ChevronRight,
  Settings,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Bot,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type {
  AIConfigNodeData,
  ProviderMetadata,
  ConnectionTestResult,
} from '@/types/ai-config-nodes'

interface BaseConfigNodeProps {
  id: string
  data: AIConfigNodeData
  selected?: boolean
  providerMetadata: ProviderMetadata
  onUpdateConfig: (updates: Partial<AIConfigNodeData>) => void
  onTestConnection: () => Promise<ConnectionTestResult>
  children?: React.ReactNode // Provider-specific configuration fields
}

export default function BaseConfigNode({
  id,
  data,
  selected,
  providerMetadata,
  onUpdateConfig,
  onTestConnection,
  children,
}: BaseConfigNodeProps) {
  const [isExpanded, setIsExpanded] = useState(data.isExpanded ?? false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [lastTestResult, setLastTestResult] = useState<ConnectionTestResult | null>(null)

  // Handle expansion toggle
  const handleToggleExpanded = () => {
    const newExpanded = !isExpanded
    setIsExpanded(newExpanded)
    onUpdateConfig({ isExpanded: newExpanded })
  }

  // Handle basic field updates
  const handleFieldUpdate = (field: keyof AIConfigNodeData, value: string) => {
    onUpdateConfig({ [field]: value })
  }

  // Handle connection testing
  const handleTestConnection = async () => {
    setIsTestingConnection(true)
    try {
      const result = await onTestConnection()
      setLastTestResult(result)
      onUpdateConfig({
        isValid: result.success,
        lastTestedAt: result.testedAt,
        testError: result.error,
      })
    } catch (error) {
      const errorResult: ConnectionTestResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        testedAt: new Date().toISOString(),
      }
      setLastTestResult(errorResult)
      onUpdateConfig({
        isValid: false,
        testError: errorResult.error,
      })
    } finally {
      setIsTestingConnection(false)
    }
  }

  // Get connection status
  const getConnectionStatus = () => {
    if (isTestingConnection) {
      return { icon: Loader2, color: 'text-blue-500', label: 'Testing...' }
    }
    if (data.isValid === true) {
      return { icon: CheckCircle, color: 'text-green-500', label: 'Connected' }
    }
    if (data.isValid === false) {
      return { icon: AlertCircle, color: 'text-red-500', label: 'Error' }
    }
    return { icon: Settings, color: 'text-gray-500', label: 'Not tested' }
  }

  const status = getConnectionStatus()
  const StatusIcon = status.icon

  return (
    <TooltipProvider>
      <div
        className={`
          relative bg-card border-2 rounded-lg shadow-sm min-w-[320px] max-w-[400px]
          ${selected ? 'border-primary shadow-md' : 'border-border'}
          transition-all duration-200
        `}
        style={{ borderColor: selected ? providerMetadata.colorHex : undefined }}
      >
        {/* No input handle - config nodes don't receive data */}

        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-t-lg border-b">
          <div className="flex items-center gap-2">
            <div className={`${providerMetadata.colorClass} p-1.5 rounded-md text-white`}>
              {providerMetadata.icon ? (
                <providerMetadata.icon className="w-4 h-4" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="text-sm font-medium">{data.name}</div>
              <div className="text-xs text-muted-foreground">
                {providerMetadata.label} Configuration
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Badge
              variant={data.isValid ? 'default' : 'secondary'}
              className="text-xs"
              style={{
                backgroundColor: data.isValid ? providerMetadata.colorHex : undefined,
              }}
            >
              CONFIG
            </Badge>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`p-1 ${status.color}`}>
                  <StatusIcon className={`w-3 h-3 ${isTestingConnection ? 'animate-spin' : ''}`} />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{status.label}</p>
                {data.testError && <p className="text-xs text-red-400 mt-1">{data.testError}</p>}
              </TooltipContent>
            </Tooltip>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleExpanded}
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
          <div className="p-3 space-y-3 border-b nodrag nopan">
            {/* Basic configuration */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor={`name-${id}`} className="text-xs font-medium">
                  Configuration Name
                </Label>
                <Input
                  id={`name-${id}`}
                  value={data.name}
                  onChange={(e) => handleFieldUpdate('name', e.target.value)}
                  placeholder={`${providerMetadata.label} Configuration`}
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor={`description-${id}`} className="text-xs font-medium">
                  Description
                </Label>
                <Textarea
                  id={`description-${id}`}
                  value={data.description || ''}
                  onChange={(e) => handleFieldUpdate('description', e.target.value)}
                  placeholder="Optional description for this configuration"
                  className="text-xs min-h-[60px] resize-none"
                />
              </div>
            </div>

            {/* Provider-specific configuration fields */}
            {children}

            {/* Connection testing */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-medium">Connection</Label>
                {providerMetadata.documentationUrl && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => window.open(providerMetadata.documentationUrl, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">View API documentation</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={isTestingConnection}
                className="w-full text-xs h-8"
              >
                {isTestingConnection ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <Settings className="w-3 h-3 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>

              {lastTestResult && (
                <div className="mt-2 text-xs">
                  {lastTestResult.success ? (
                    <div className="text-green-600">
                      ✓ Connection successful
                      {lastTestResult.responseTime && (
                        <span className="text-muted-foreground ml-1">
                          ({lastTestResult.responseTime}ms)
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-red-600">✗ {lastTestResult.error}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status summary when collapsed */}
        {!isExpanded && (
          <div className="p-3">
            <div className="text-xs text-muted-foreground">
              {data.description ? (
                <span className="line-clamp-2">{data.description}</span>
              ) : (
                <span className="italic">Click to configure {providerMetadata.label}</span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs">
              <StatusIcon className={`w-3 h-3 ${status.color}`} />
              <span className={status.color}>{status.label}</span>
            </div>
          </div>
        )}

        {/* Output handle - only config nodes provide configuration */}
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 border-2 border-background"
          style={{ background: providerMetadata.colorHex }}
        />
      </div>
    </TooltipProvider>
  )
}
