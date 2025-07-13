/**
 * Tool Permission Editor Component
 * SOLID: Single responsibility for editing tool permissions
 * DRY: Reusable component for any tool permission editing
 * KISS: Simple interface with preset and manual options
 */

import { useState, useEffect, useMemo } from 'react'
import { Button } from './button'
import { Label } from './label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { Checkbox } from './checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { Badge } from './badge'
import { Shield, Eye, EyeOff } from 'lucide-react'
import {
  ToolPermission,
  PERMISSION_PRESETS,
  applyPreset,
  getToolCategory,
  detectPreset,
} from '../../types/tool-permissions'
import { useAvailableTools } from '../../hooks/useAvailableTools'

interface ToolPermissionEditorProps {
  permissions: ToolPermission[]
  onChange: (permissions: ToolPermission[]) => void
  className?: string
}

export function ToolPermissionEditor({
  permissions,
  onChange,
  className,
}: ToolPermissionEditorProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Get available tools from Claude SDK
  const { tools: availableTools, loading: toolsLoading } = useAvailableTools()

  // Normalize permissions to include all available tools
  const normalizedPermissions = useMemo(() => {
    if (!availableTools.length) return permissions

    const normalized = [...permissions]

    // Add missing tools as disabled
    availableTools.forEach((toolName) => {
      if (!normalized.find((p) => p.name === toolName)) {
        normalized.push({ name: toolName, enabled: false })
      }
    })

    return normalized
  }, [permissions, availableTools])

  // Detect current preset when normalized permissions or tools change
  useEffect(() => {
    if (availableTools.length > 0 && normalizedPermissions.length > 0) {
      const detectedPreset = detectPreset(normalizedPermissions, availableTools)
      setSelectedPreset(detectedPreset || '')
    }
  }, [normalizedPermissions, availableTools])

  // Show loading state while tools are being fetched
  if (toolsLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Tool Permissions
          </CardTitle>
          <CardDescription>Loading available tools...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Apply a permission preset
  const handlePresetChange = (presetName: string) => {
    if (!presetName) return

    const preset = PERMISSION_PRESETS[presetName]
    if (preset) {
      const newPermissions = applyPreset(preset, availableTools)
      onChange(newPermissions)
      setSelectedPreset(presetName)
    }
  }

  // Toggle individual tool permission
  const handleToolToggle = (toolName: string, enabled: boolean) => {
    const updated = normalizedPermissions.map((p) => (p.name === toolName ? { ...p, enabled } : p))
    onChange(updated)
  }

  // Get permission status for a tool
  const getToolEnabled = (toolName: string): boolean => {
    const permission = normalizedPermissions.find((p) => p.name === toolName)
    return permission?.enabled ?? false
  }

  // Create tool objects with categories from available tools
  const toolsWithCategories = availableTools.map((toolName) => ({
    name: toolName,
    category: getToolCategory(toolName),
  }))

  // Group tools by category for display
  const groupedTools = toolsWithCategories.reduce(
    (groups: Record<string, Array<{ name: string; category: string }>>, tool) => {
      const category = tool.category
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(tool)
      return groups
    },
    {}
  )

  const enabledCount = normalizedPermissions.filter((p) => p.enabled).length
  const totalCount = availableTools.length

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Tool Permissions
        </CardTitle>
        <CardDescription>
          Configure which tools this agent can access. Use presets for common roles or customize
          manually.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Permission Presets */}
        <div className="space-y-2">
          <Label>Permission Preset</Label>
          <Select value={selectedPreset} onValueChange={handlePresetChange}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a preset or configure manually" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PERMISSION_PRESETS).map(([key, preset]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex flex-col">
                    <span className="font-medium">{preset.name}</span>
                    <span className="text-xs text-muted-foreground">{preset.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {enabledCount} / {totalCount} tools enabled
            </Badge>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs"
          >
            {showAdvanced ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
            {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
          </Button>
        </div>

        {/* Advanced Tool Selection */}
        {showAdvanced && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label>Manual Tool Selection</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Toggle all tools
                  const allEnabled = enabledCount === totalCount
                  const newPermissions = availableTools.map((toolName) => ({
                    name: toolName,
                    enabled: !allEnabled,
                  }))
                  onChange(newPermissions)
                  setSelectedPreset('') // Clear preset selection
                }}
                className="text-xs"
              >
                {enabledCount === totalCount ? 'Disable All' : 'Enable All'}
              </Button>
            </div>

            {/* Tool Categories */}
            <div className="space-y-4">
              {Object.entries(groupedTools).map(([category, tools]) => (
                <div key={category}>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 capitalize">
                    {category.replace('_', ' ')}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {tools.map((tool) => (
                      <div key={tool.name} className="flex items-center space-x-2">
                        <Checkbox
                          id={tool.name}
                          checked={getToolEnabled(tool.name)}
                          onCheckedChange={(checked) => {
                            handleToolToggle(tool.name, checked as boolean)
                            setSelectedPreset('') // Clear preset when manually changing
                          }}
                        />
                        <Label htmlFor={tool.name} className="text-sm font-normal">
                          <span className="font-medium">{tool.name}</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* MCP Tools Note */}
            <div className="text-xs text-muted-foreground p-3 bg-muted rounded-lg">
              <strong>Note:</strong> MCP tools will be automatically included based on the MCP
              servers configured for your project. Tool restrictions apply to individual tool
              invocations.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
