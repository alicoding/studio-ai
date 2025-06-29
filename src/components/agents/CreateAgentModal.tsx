import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Checkbox } from '../ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Save, Wand2 } from 'lucide-react'

const agentSchema = z.object({
  name: z.string().min(1, 'Agent name is required').max(50, 'Name too long'),
  role: z.string().min(1, 'Role is required'),
  systemPrompt: z.string().min(10, 'System prompt must be at least 10 characters'),
  tools: z.array(z.string()).min(1, 'At least one tool must be selected'),
  model: z.string().min(1, 'Model is required'),
})

type AgentFormData = z.infer<typeof agentSchema>

interface AgentConfig extends AgentFormData {
  id: string
  projectsUsing: string[]
}

interface CreateAgentModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (agent: AgentConfig) => void
  agent?: AgentConfig | null // Optional agent for edit mode
}

const AVAILABLE_TOOLS = [
  'File System (Read/Write)',
  'Terminal Commands',
  'Web Search',
  'Database Access',
  'Production Deploy',
]

const ROLE_OPTIONS = [
  { value: 'dev', label: 'Developer' },
  { value: 'architect', label: 'Architect' },
  { value: 'ux', label: 'UX Designer' },
  { value: 'tester', label: 'Tester' },
  { value: 'orchestrator', label: 'Orchestrator' },
  { value: 'custom', label: 'Custom' },
]

export function CreateAgentModal({ isOpen, onClose, onCreate, agent }: CreateAgentModalProps) {
  const isEditMode = Boolean(agent)

  const form = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: '',
      role: 'dev',
      systemPrompt: '',
      tools: ['File System (Read/Write)', 'Terminal Commands'],
      model: 'Claude 3 Opus',
    },
  })

  // Reset form when modal opens/closes or agent changes
  useEffect(() => {
    if (isOpen && agent) {
      // Edit mode - populate with agent data
      form.reset({
        name: agent.name,
        role: agent.role,
        systemPrompt: agent.systemPrompt,
        tools: agent.tools,
        model: agent.model,
      })
    } else if (isOpen) {
      // Create mode - reset to defaults
      form.reset({
        name: '',
        role: 'dev',
        systemPrompt: '',
        tools: ['File System (Read/Write)', 'Terminal Commands'],
        model: 'Claude 3 Opus',
      })
    }
  }, [isOpen, agent, form])

  const onSubmit = (data: AgentFormData) => {
    onCreate({
      id: isEditMode ? agent!.id : `${data.role}-${Date.now()}`,
      ...data,
      projectsUsing: isEditMode ? agent!.projectsUsing : [],
    })
    onClose()
  }

  const handleToolToggle = (tool: string, checked: boolean) => {
    const currentTools = form.getValues('tools')
    if (checked) {
      form.setValue('tools', [...currentTools, tool])
    } else {
      form.setValue(
        'tools',
        currentTools.filter((t) => t !== tool)
      )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Agent' : 'Create New Agent'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Agent Name</Label>
            <Input id="name" placeholder="e.g., dev_assistant" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={form.watch('role')}
              onValueChange={(value) => form.setValue('role', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.role && (
              <p className="text-sm text-destructive">{form.formState.errors.role.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="systemPrompt">System Prompt</Label>
            <Textarea
              id="systemPrompt"
              rows={6}
              placeholder="You are a specialized developer agent focused on..."
              {...form.register('systemPrompt')}
              className="resize-none"
            />
            {form.formState.errors.systemPrompt && (
              <p className="text-sm text-destructive">
                {form.formState.errors.systemPrompt.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Tool Access</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AVAILABLE_TOOLS.map((tool) => (
                <div key={tool} className="flex items-center space-x-2">
                  <Checkbox
                    id={tool}
                    checked={form.watch('tools').includes(tool)}
                    onCheckedChange={(checked) => handleToolToggle(tool, checked as boolean)}
                  />
                  <Label htmlFor={tool} className="text-sm font-normal">
                    {tool}
                  </Label>
                </div>
              ))}
            </div>
            {form.formState.errors.tools && (
              <p className="text-sm text-destructive">{form.formState.errors.tools.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select
              value={form.watch('model')}
              onValueChange={(value) => form.setValue('model', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Claude 3 Opus">Claude 3 Opus</SelectItem>
                <SelectItem value="Claude 3 Sonnet">Claude 3 Sonnet</SelectItem>
                <SelectItem value="Claude 3 Haiku">Claude 3 Haiku</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.model && (
              <p className="text-sm text-destructive">{form.formState.errors.model.message}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline">
              <Save className="w-4 h-4 mr-2" />
              Save as Template
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <Wand2 className="w-4 h-4 mr-2" />
              {isEditMode ? 'Save Changes' : 'Create & Spawn'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
