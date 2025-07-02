import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Textarea } from '../ui/textarea'
import { HelpCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'

interface Hook {
  event: string
  matcher: string
  command: string
  index?: number
}

interface HookModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (hook: Hook) => void
  hook?: Hook | null
}

const HOOK_EVENTS = [
  { value: 'PreToolUse', label: 'PreToolUse', description: 'Runs before tool calls' },
  { value: 'PostToolUse', label: 'PostToolUse', description: 'Runs after tool completion' },
  { value: 'Notification', label: 'Notification', description: 'Triggered during notifications' },
  { value: 'Stop', label: 'Stop', description: 'Executes when Claude Code finishes responding' },
]

const EXAMPLE_COMMANDS = {
  PreToolUse: 'echo "About to execute: $TOOL_NAME"',
  PostToolUse: 'echo "Completed: $TOOL_NAME with exit code $EXIT_CODE"',
  Notification: 'notify-send "Claude Code" "$MESSAGE"',
  Stop: 'echo "Session ended at $(date)"',
}

export function HookModal({ isOpen, onClose, onSave, hook }: HookModalProps) {
  const [formData, setFormData] = useState({
    event: '',
    matcher: '',
    command: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (hook) {
      setFormData({
        event: hook.event || '',
        matcher: hook.matcher || '',
        command: hook.command || '',
      })
    } else {
      setFormData({
        event: '',
        matcher: '',
        command: '',
      })
    }
    setErrors({})
  }, [hook, isOpen])

  const handleSave = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.event) {
      newErrors.event = 'Event is required'
    }

    if (!formData.command.trim()) {
      newErrors.command = 'Command is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSave({
      ...formData,
      matcher: formData.matcher || '*',
      index: hook?.index,
    })

    setFormData({ event: '', matcher: '', command: '' })
    setErrors({})
    onClose()
  }

  const handleClose = () => {
    setFormData({ event: '', matcher: '', command: '' })
    setErrors({})
    onClose()
  }

  const selectedEvent = HOOK_EVENTS.find((e) => e.value === formData.event)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{hook ? 'Edit Hook' : 'Add New Hook'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="event">Hook Event</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>When this hook should execute in Claude Code's lifecycle</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select
              value={formData.event}
              onValueChange={(value) => {
                setFormData((prev) => ({
                  ...prev,
                  event: value,
                  command:
                    prev.command || EXAMPLE_COMMANDS[value as keyof typeof EXAMPLE_COMMANDS] || '',
                }))
                setErrors((prev) => ({ ...prev, event: '' }))
              }}
            >
              <SelectTrigger className={errors.event ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select hook event" />
              </SelectTrigger>
              <SelectContent>
                {HOOK_EVENTS.map((event) => (
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
            {selectedEvent && (
              <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="matcher">Tool Matcher (Optional)</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Pattern to match specific tools (e.g., "bash", "file_*"). Leave empty for all
                      tools.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="matcher"
              value={formData.matcher}
              onChange={(e) => setFormData((prev) => ({ ...prev, matcher: e.target.value }))}
              placeholder="* (all tools)"
            />
            <p className="text-xs text-muted-foreground">
              Examples: "bash" for Bash tool only, "file_*" for file operations, "*" for all tools
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="command">Shell Command</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Shell command to execute. Use environment variables like $TOOL_NAME,
                      $EXIT_CODE
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Textarea
              id="command"
              value={formData.command}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, command: e.target.value }))
                setErrors((prev) => ({ ...prev, command: '' }))
              }}
              placeholder="echo 'Hook executed'"
              className={`font-mono text-sm ${errors.command ? 'border-red-500' : ''}`}
              rows={3}
            />
            {errors.command && <p className="text-sm text-red-500">{errors.command}</p>}
            <div className="text-xs text-muted-foreground">
              <p>
                <strong>Available variables:</strong> $TOOL_NAME, $EXIT_CODE, $MESSAGE, $CWD
              </p>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              Example Use Cases
            </h4>
            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <li>
                • <strong>Logging:</strong> Log all tool executions to a file
              </li>
              <li>
                • <strong>Notifications:</strong> Send desktop notifications on completion
              </li>
              <li>
                • <strong>Formatting:</strong> Auto-format code after file operations
              </li>
              <li>
                • <strong>Backup:</strong> Create backups before destructive operations
              </li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>{hook ? 'Update Hook' : 'Add Hook'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
