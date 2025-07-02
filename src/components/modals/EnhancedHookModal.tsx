/**
 * EnhancedHookModal - Multi-tier hook configuration modal
 *
 * SOLID: Clear separation between hook types and their configurations
 * DRY: Reusable configuration components for different hook types
 */

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Textarea } from '../ui/textarea'
import { HelpCircle, Terminal, Shield, Bell, Zap } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { Checkbox } from '../ui/checkbox'
import {
  Hook,
  HookEvent,
  HookScope,
  ClaudeCodeEvent,
  StudioEvent,
  BUILT_IN_VALIDATORS,
  STUDIO_ACTIONS,
} from '../../types/hooks'

interface EnhancedHookModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (hook: Hook) => void
  hook?: Hook | null
  defaultScope?: HookScope
}

const CLAUDE_CODE_EVENTS: Array<{ value: ClaudeCodeEvent; label: string; description: string }> = [
  { value: 'PreToolUse', label: 'Pre Tool Use', description: 'Before any tool execution' },
  { value: 'PostToolUse', label: 'Post Tool Use', description: 'After tool completion' },
  { value: 'Notification', label: 'Notification', description: 'During notifications' },
  { value: 'Stop', label: 'Stop', description: 'When Claude Code finishes' },
]

const STUDIO_EVENTS: Array<{ value: StudioEvent; label: string; description: string }> = [
  { value: 'AgentMessage', label: 'Agent Message', description: 'When agents communicate' },
  {
    value: 'TypeCheckFailed',
    label: 'Type Check Failed',
    description: 'TypeScript errors detected',
  },
  { value: 'LintError', label: 'Lint Error', description: 'ESLint/other linting errors' },
  {
    value: 'FileConflict',
    label: 'File Conflict',
    description: 'Multiple agents editing same file',
  },
  {
    value: 'ToolValidation',
    label: 'Tool Validation',
    description: 'Before tool execution validation',
  },
  {
    value: 'SessionCompaction',
    label: 'Session Compaction',
    description: 'When session needs compaction',
  },
  { value: 'AgentHandoff', label: 'Agent Handoff', description: 'Switching between agents' },
]

const HOOK_TYPES = [
  { value: 'command', label: 'Command', icon: Terminal, description: 'Execute shell commands' },
  {
    value: 'validation',
    label: 'Validation',
    icon: Shield,
    description: 'Validate before actions',
  },
  { value: 'notification', label: 'Notification', icon: Bell, description: 'Send notifications' },
  { value: 'studio', label: 'Studio Action', icon: Zap, description: 'Trigger studio actions' },
] as const

export function EnhancedHookModal({
  isOpen,
  onClose,
  onSave,
  hook,
  defaultScope = 'studio',
}: EnhancedHookModalProps) {
  const [formData, setFormData] = useState<{
    type: 'command' | 'validation' | 'notification' | 'studio'
    event: HookEvent
    matcher?: string
    scope: HookScope
    enabled: boolean
    description?: string
    // Type-specific fields
    command?: string
    timeout?: number
    validator?: string
    validatorConfig?: Record<string, unknown>
    channel?: 'desktop' | 'console' | 'file'
    template?: string
    action?: keyof typeof STUDIO_ACTIONS
    actionConfig?: Record<string, unknown>
  }>({
    type: 'command',
    event: 'PreToolUse',
    scope: defaultScope,
    enabled: true,
    matcher: '*',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [warnings, setWarnings] = useState<Record<string, string>>({})

  // Dangerous command patterns to check
  const DANGEROUS_PATTERNS = [
    { pattern: /rm\s+-rf\s+\//, message: 'Deleting root directory is extremely dangerous' },
    { pattern: /rm\s+-rf\s+~/, message: 'Deleting home directory is dangerous' },
    { pattern: /:(){ :|:& };:/, message: 'Fork bomb detected - this will crash the system' },
    { pattern: /dd\s+if=.*of=\/dev\/[sh]d/, message: 'Direct disk write operations are dangerous' },
    { pattern: /chmod\s+777\s+\//, message: 'Making root world-writable is a security risk' },
    { pattern: /curl.*\|\s*sh/, message: 'Piping untrusted scripts to shell is risky' },
    { pattern: /wget.*\|\s*bash/, message: 'Piping untrusted scripts to shell is risky' },
    { pattern: />\/dev\/sda/, message: 'Direct disk operations are dangerous' },
    { pattern: /mkfs\./, message: 'Formatting operations need careful review' },
  ]

  const WARNING_PATTERNS = [
    { pattern: /sudo/, message: 'Commands with sudo will require user password' },
    { pattern: /rm\s+-rf/, message: 'Recursive deletion - ensure paths are correct' },
    { pattern: /\.\.\//, message: 'Path traversal detected - use absolute paths when possible' },
    { pattern: /eval/, message: 'eval can execute arbitrary code' },
    { pattern: /exec/, message: 'exec can execute arbitrary code' },
  ]

  const validateCommand = (command: string): { error?: string; warning?: string } => {
    // Check for dangerous patterns
    for (const { pattern, message } of DANGEROUS_PATTERNS) {
      if (pattern.test(command)) {
        return { error: message }
      }
    }

    // Check for warning patterns
    for (const { pattern, message } of WARNING_PATTERNS) {
      if (pattern.test(command)) {
        return { warning: message }
      }
    }

    return {}
  }

  useEffect(() => {
    if (hook) {
      setFormData({
        type: hook.type,
        event: hook.event,
        matcher: hook.matcher,
        scope: hook.scope,
        enabled: hook.enabled,
        description: hook.description,
        command: 'command' in hook ? hook.command : undefined,
        timeout: 'timeout' in hook ? hook.timeout : undefined,
        validator: 'validator' in hook ? hook.validator : undefined,
        validatorConfig: 'config' in hook && hook.type === 'validation' ? hook.config : undefined,
        channel: 'channel' in hook ? hook.channel : undefined,
        template: 'template' in hook ? hook.template : undefined,
        action: 'action' in hook ? hook.action : undefined,
        actionConfig: 'config' in hook && hook.type === 'studio' ? hook.config : undefined,
      })
    } else {
      setFormData({
        type: 'command',
        event: 'PreToolUse',
        scope: defaultScope,
        enabled: true,
        matcher: '*',
      })
    }
    setErrors({})
  }, [hook, isOpen, defaultScope])

  const handleSave = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.event) {
      newErrors.event = 'Event is required'
    }

    // Type-specific validation
    if (formData.type === 'command') {
      if (!formData.command?.trim()) {
        newErrors.command = 'Command is required'
      } else {
        // Re-validate command for dangerous patterns
        const validation = validateCommand(formData.command)
        if (validation.error) {
          newErrors.command = validation.error
        }
      }
    }
    if (formData.type === 'validation' && !formData.validator) {
      newErrors.validator = 'Validator is required'
    }
    if (formData.type === 'notification' && !formData.template?.trim()) {
      newErrors.template = 'Notification template is required'
    }
    if (formData.type === 'studio' && !formData.action) {
      newErrors.action = 'Studio action is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Build hook object based on type
    const baseHook = {
      id: hook?.id || `hook-${Date.now()}`,
      event: formData.event,
      matcher: formData.matcher || '*',
      scope: formData.scope,
      enabled: formData.enabled,
      description: formData.description,
    }

    let hookToSave: Hook
    switch (formData.type) {
      case 'command':
        hookToSave = {
          ...baseHook,
          type: 'command',
          command: formData.command!,
          timeout: formData.timeout,
        }
        break
      case 'validation':
        hookToSave = {
          ...baseHook,
          type: 'validation',
          validator: formData.validator!,
          config: formData.validatorConfig,
        }
        break
      case 'notification':
        hookToSave = {
          ...baseHook,
          type: 'notification',
          channel: formData.channel || 'console',
          template: formData.template!,
        }
        break
      case 'studio':
        hookToSave = {
          ...baseHook,
          type: 'studio',
          action: formData.action!,
          config: formData.actionConfig,
        }
        break
    }

    onSave(hookToSave)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{hook ? 'Edit Hook' : 'Add New Hook'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Security Warning */}
          {formData.type === 'command' && (errors.command || warnings.command) && (
            <div
              className={`p-4 rounded-lg border ${errors.command ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'}`}
            >
              <div className="flex items-start gap-2">
                <Shield
                  className={`w-5 h-5 mt-0.5 flex-shrink-0 ${errors.command ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}
                />
                <div className="space-y-2">
                  <p
                    className={`text-sm font-medium ${errors.command ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'}`}
                  >
                    {errors.command ? 'Dangerous Command Detected' : 'Command Warning'}
                  </p>
                  <p
                    className={`text-sm ${errors.command ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'}`}
                  >
                    {errors.command || warnings.command}
                  </p>
                  {errors.command && (
                    <p className="text-sm text-red-700 dark:text-red-300">
                      This command will be blocked from saving. Please modify it to remove dangerous
                      operations.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Hook Type Selection */}
          <div className="space-y-2">
            <Label>Hook Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {HOOK_TYPES.map(({ value, label, icon: Icon, description }) => (
                <div
                  key={value}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    formData.type === value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      type: value as 'command' | 'validation' | 'notification' | 'studio',
                    }))
                  }
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Scope Selection */}
          <div className="space-y-2">
            <Label>Scope</Label>
            <Select
              value={formData.scope}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, scope: value as HookScope }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="studio">Studio Level</SelectItem>
                <SelectItem value="project">Project Level</SelectItem>
                <SelectItem value="system">System Level</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {formData.scope === 'studio' && 'Applies to Claude Studio operations'}
              {formData.scope === 'project' && 'Applies to specific projects'}
              {formData.scope === 'system' && 'Applies globally to all Claude Code operations'}
            </p>
          </div>

          {/* Event Selection */}
          <div className="space-y-2">
            <Label>Event</Label>
            <Select
              value={formData.event}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, event: value as HookEvent }))
              }
            >
              <SelectTrigger className={errors.event ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select event" />
              </SelectTrigger>
              <SelectContent>
                <div className="font-medium text-xs text-muted-foreground px-2 py-1">
                  Claude Code Events
                </div>
                {CLAUDE_CODE_EVENTS.map((event) => (
                  <SelectItem key={event.value} value={event.value}>
                    <div>
                      <div className="font-medium">{event.label}</div>
                      <div className="text-xs text-muted-foreground">{event.description}</div>
                    </div>
                  </SelectItem>
                ))}
                <div className="font-medium text-xs text-muted-foreground px-2 py-1 pt-2">
                  Studio Events
                </div>
                {STUDIO_EVENTS.map((event) => (
                  <SelectItem key={event.value} value={event.value}>
                    <div>
                      <div className="font-medium">{event.label}</div>
                      <div className="text-xs text-muted-foreground">{event.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.event && <p className="text-sm text-red-500">{errors.event}</p>}
          </div>

          {/* Tool Matcher */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Tool/Pattern Matcher</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Pattern to match specific tools or agents. Use * for all.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              value={formData.matcher}
              onChange={(e) => setFormData((prev) => ({ ...prev, matcher: e.target.value }))}
              placeholder="* (all tools/agents)"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="What does this hook do?"
            />
          </div>

          {/* Type-specific configuration */}
          {formData.type === 'command' && (
            <>
              <div className="space-y-2">
                <Label>Shell Command</Label>
                <Textarea
                  value={formData.command}
                  onChange={(e) => {
                    const command = e.target.value
                    setFormData((prev) => ({ ...prev, command }))

                    // Validate command
                    const validation = validateCommand(command)
                    if (validation.error) {
                      setErrors((prev) => ({ ...prev, command: validation.error || '' }))
                      setWarnings((prev) => {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { command: _, ...rest } = prev
                        return rest
                      })
                    } else if (validation.warning) {
                      setErrors((prev) => {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { command: _, ...rest } = prev
                        return rest
                      })
                      setWarnings((prev) => ({ ...prev, command: validation.warning || '' }))
                    } else {
                      setErrors((prev) => {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { command: _, ...rest } = prev
                        return rest
                      })
                      setWarnings((prev) => {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { command: _, ...rest } = prev
                        return rest
                      })
                    }
                  }}
                  placeholder="echo 'Hook executed for $TOOL_NAME'"
                  className={`font-mono text-sm ${errors.command ? 'border-red-500' : warnings.command ? 'border-yellow-500' : ''}`}
                  rows={3}
                />
                {errors.command && <p className="text-sm text-red-500">{errors.command}</p>}
                {warnings.command && <p className="text-sm text-yellow-600">{warnings.command}</p>}
                <p className="text-xs text-muted-foreground">
                  Variables: $TOOL_NAME, $EXIT_CODE, $MESSAGE, $CWD, $AGENT_ID, $PROJECT_ID
                </p>
              </div>
              <div className="space-y-2">
                <Label>Timeout (ms)</Label>
                <Input
                  type="number"
                  value={formData.timeout || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      timeout: e.target.value ? parseInt(e.target.value) : undefined,
                    }))
                  }
                  placeholder="5000"
                />
              </div>
            </>
          )}

          {formData.type === 'validation' && (
            <div className="space-y-2">
              <Label>Validator</Label>
              <Select
                value={formData.validator}
                onValueChange={(value) => {
                  setFormData((prev) => ({ ...prev, validator: value }))
                  setErrors((prev) => ({ ...prev, validator: '' }))
                }}
              >
                <SelectTrigger className={errors.validator ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select validator" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BUILT_IN_VALIDATORS).map(([key, description]) => (
                    <SelectItem key={key} value={key}>
                      <div>
                        <div className="font-medium">{key}</div>
                        <div className="text-xs text-muted-foreground">{description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.validator && <p className="text-sm text-red-500">{errors.validator}</p>}
            </div>
          )}

          {formData.type === 'notification' && (
            <>
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select
                  value={formData.channel || 'console'}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      channel: value as 'desktop' | 'console' | 'file',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="console">Console</SelectItem>
                    <SelectItem value="desktop">Desktop Notification</SelectItem>
                    <SelectItem value="file">Log to File</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Template</Label>
                <Textarea
                  value={formData.template}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, template: e.target.value }))
                    setErrors((prev) => ({ ...prev, template: '' }))
                  }}
                  placeholder="[{{event}}] {{message}} - Agent: {{agentId}}"
                  className={errors.template ? 'border-red-500' : ''}
                  rows={2}
                />
                {errors.template && <p className="text-sm text-red-500">{errors.template}</p>}
                <p className="text-xs text-muted-foreground">
                  Variables: {`{{event}}, {{message}}, {{agentId}}, {{projectId}}, {{timestamp}}`}
                </p>
              </div>
            </>
          )}

          {formData.type === 'studio' && (
            <div className="space-y-2">
              <Label>Studio Action</Label>
              <Select
                value={formData.action}
                onValueChange={(value) => {
                  setFormData((prev) => ({ ...prev, action: value as keyof typeof STUDIO_ACTIONS }))
                  setErrors((prev) => ({ ...prev, action: '' }))
                }}
              >
                <SelectTrigger className={errors.action ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STUDIO_ACTIONS).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div>
                        <div className="font-medium">{key}</div>
                        <div className="text-xs text-muted-foreground">{config.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.action && <p className="text-sm text-red-500">{errors.action}</p>}
            </div>
          )}

          {/* Enabled Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enabled"
              checked={formData.enabled}
              onCheckedChange={(checked: boolean) =>
                setFormData((prev) => ({ ...prev, enabled: checked }))
              }
            />
            <Label htmlFor="enabled">Enabled</Label>
          </div>

          {/* Examples based on current configuration */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              Example:{' '}
              {formData.type === 'command'
                ? 'Command'
                : formData.type === 'validation'
                  ? 'Validation'
                  : formData.type === 'notification'
                    ? 'Notification'
                    : 'Studio Action'}
            </h4>
            <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              {formData.type === 'command' && (
                <>
                  <p>
                    • Log all TypeScript errors:{' '}
                    <code>echo "[TS Error] $MESSAGE" &gt;&gt; errors.log</code>
                  </p>
                  <p>
                    • Auto-fix on save: <code>npm run lint:fix && npm run format</code>
                  </p>
                </>
              )}
              {formData.type === 'validation' && (
                <>
                  <p>• Prevent destructive commands without confirmation</p>
                  <p>• Ensure tests pass before committing</p>
                </>
              )}
              {formData.type === 'notification' && (
                <>
                  <p>• Alert on type check failures</p>
                  <p>• Log agent handoffs for debugging</p>
                </>
              )}
              {formData.type === 'studio' && (
                <>
                  <p>• Auto-run type checking on file changes</p>
                  <p>• Format code after agent edits</p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>{hook ? 'Update Hook' : 'Add Hook'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
