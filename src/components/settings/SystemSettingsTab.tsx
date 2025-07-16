/**
 * SystemSettingsTab - System Configuration Component
 *
 * SOLID: Single Responsibility - only handles system settings UI
 * DRY: Reusable input components and patterns
 * KISS: Clean, focused UI for system configuration
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Checkbox } from '../ui/checkbox'
import { Save, HelpCircle, Loader2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { ClaudeInstructionsEditor } from './ClaudeInstructionsEditor'

interface SystemConfig {
  claudeCodePath: string
  defaultWorkspacePath: string
  apiEndpoint: string
  enableTelemetry: boolean
  defaultClearSessionPrompt: string
}

interface SystemSettingsTabProps {
  systemConfig: SystemConfig
  loading: boolean
  saving: boolean
  detectedPaths: string[]
  detectingPath: boolean
  onConfigChange: (updates: Partial<SystemConfig>) => void
  onSave: () => void
  onDetectPath: () => void
}

interface SettingFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  tooltip?: string
  type?: 'text' | 'textarea'
  rows?: number
}

function SettingField({
  id,
  label,
  value,
  onChange,
  placeholder,
  tooltip,
  type = 'text',
  rows = 3,
}: SettingFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={id}>{label}</Label>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {type === 'textarea' ? (
        <textarea
          id={id}
          className="w-full px-3 py-2 bg-background border border-input rounded-md resize-y min-h-[80px] text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
        />
      ) : (
        <Input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  )
}

interface PathDetectionProps {
  detectedPaths: string[]
  detectingPath: boolean
  onDetectPath: () => void
  onSelectPath: (path: string) => void
}

function PathDetection({
  detectedPaths,
  detectingPath,
  onDetectPath,
  onSelectPath,
}: PathDetectionProps) {
  return (
    <div className="p-4 bg-muted rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <Label>Detect Claude Code Installation</Label>
        <Button size="sm" variant="outline" onClick={onDetectPath} disabled={detectingPath}>
          {detectingPath ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Detecting...
            </>
          ) : (
            'Auto-detect'
          )}
        </Button>
      </div>
      {detectedPaths.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Found installations:</p>
          {detectedPaths.map((path) => {
            const isProjectLocal = path.includes('node_modules')
            return (
              <Button
                key={path}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-left font-mono text-xs"
                onClick={() => onSelectPath(path)}
              >
                <span className={isProjectLocal ? 'opacity-50' : ''}>{path}</span>
                {isProjectLocal && (
                  <span className="ml-2 text-xs text-muted-foreground">(project local)</span>
                )}
              </Button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function SystemSettingsTab({
  systemConfig,
  loading,
  saving,
  detectedPaths,
  detectingPath,
  onConfigChange,
  onSave,
  onDetectPath,
}: SystemSettingsTabProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>System Configuration</CardTitle>
          <CardDescription>Global settings that apply to all projects and agents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <PathDetection
            detectedPaths={detectedPaths}
            detectingPath={detectingPath}
            onDetectPath={onDetectPath}
            onSelectPath={(path) => onConfigChange({ claudeCodePath: path })}
          />

          <SettingField
            id="claude-path"
            label="Claude Code Installation Path"
            value={systemConfig.claudeCodePath}
            onChange={(value) => onConfigChange({ claudeCodePath: value })}
            placeholder="e.g., /usr/local/bin/claude"
            tooltip="Path to your Claude Code executable. Click 'Auto-detect' to find it automatically or enter the path manually."
          />

          <SettingField
            id="workspace-path"
            label="Default Workspace Path"
            value={systemConfig.defaultWorkspacePath}
            onChange={(value) => onConfigChange({ defaultWorkspacePath: value })}
            placeholder="~/projects"
            tooltip="Default directory where new projects will be created"
          />

          <SettingField
            id="api-endpoint"
            label="API Endpoint"
            value={systemConfig.apiEndpoint}
            onChange={(value) => onConfigChange({ apiEndpoint: value })}
            placeholder="http://localhost:3000"
            tooltip="Backend API server URL. Useful when running backend separately or on a different machine/port"
          />

          <SettingField
            id="clear-prompt"
            label="Default Clear Session Prompt (Legacy Agents)"
            value={systemConfig.defaultClearSessionPrompt}
            onChange={(value) => onConfigChange({ defaultClearSessionPrompt: value })}
            placeholder="Session cleared. You are an AI assistant. Please stand by for instructions. Do not respond to this message."
            tooltip="Default message when clearing agent sessions. Only used for legacy agents without system prompts. Agents with role configurations use their own prompts."
            type="textarea"
          />

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="telemetry"
                checked={systemConfig.enableTelemetry}
                onCheckedChange={(checked) => onConfigChange({ enableTelemetry: !!checked })}
              />
              <Label htmlFor="telemetry" className="font-normal cursor-pointer">
                Enable anonymous usage analytics
              </Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Help improve Studio AI by sharing anonymous usage data
            </p>
          </div>

          <div className="pt-4">
            <Button onClick={onSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save System Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <ClaudeInstructionsEditor
        scope="global"
        title="Global Claude Instructions"
        description="Instructions that apply to Claude across all projects"
      />

      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <p className="text-sm font-medium">Multi-Platform Support</p>
            <p className="text-xs text-muted-foreground">
              Studio AI is designed to work across web, desktop, and mobile platforms. Additional
              platform-specific features will be available as we expand support.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
