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
import { Save, Wand2 } from 'lucide-react'
import { CLAUDE_CODE_TOOLS } from '../../lib/tools/toolRegistry'
import { ROLE_DEFAULT_TOOLS, ROLE_SYSTEM_PROMPTS } from '../../lib/tools/roleDefaults'
import { ModalLayout } from '../ui/modal-layout'

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

// Default tools that most agents should have
const DEFAULT_TOOLS = ['read', 'write', 'edit', 'bash', 'grep', 'glob', 'ls']

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
      tools: ['desktop-commander', 'zen-ai'],
      model: 'claude-opus-4',
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
      // Create mode - reset to defaults with role-specific values
      const defaultRole = 'dev'
      form.reset({
        name: '',
        role: defaultRole,
        systemPrompt: ROLE_SYSTEM_PROMPTS[defaultRole] || '',
        tools: ROLE_DEFAULT_TOOLS[defaultRole] || DEFAULT_TOOLS,
        model: 'claude-opus-4',
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
    <ModalLayout
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Agent' : 'Create New Agent'}
      footer={
        <>
          <Button type="button" variant="outline">
            <Save className="w-4 h-4 mr-2" />
            Save as Template
          </Button>
          <Button 
            type="submit" 
            disabled={form.formState.isSubmitting}
            onClick={form.handleSubmit(onSubmit)}
          >
            <Wand2 className="w-4 h-4 mr-2" />
            {isEditMode ? 'Save Changes' : 'Create & Spawn'}
          </Button>
        </>
      }
    >
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
              onValueChange={(value) => {
                form.setValue('role', value)
                // Apply role defaults when role changes
                if (ROLE_DEFAULT_TOOLS[value]) {
                  form.setValue('tools', ROLE_DEFAULT_TOOLS[value])
                }
                if (ROLE_SYSTEM_PROMPTS[value]) {
                  form.setValue('systemPrompt', ROLE_SYSTEM_PROMPTS[value])
                }
              }}
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
            <div className="flex items-center justify-between">
              <Label>Tool Access</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const currentTools = form.watch('tools')
                  const allToolIds = CLAUDE_CODE_TOOLS.map(t => t.id)
                  if (currentTools.length === allToolIds.length) {
                    form.setValue('tools', [])
                  } else {
                    form.setValue('tools', allToolIds)
                  }
                }}
                className="text-xs"
              >
                {form.watch('tools').length === CLAUDE_CODE_TOOLS.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="space-y-4">
              {/* Group tools by category */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">File Operations</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CLAUDE_CODE_TOOLS.filter(t => t.category === 'file').map((tool) => (
                    <div key={tool.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={tool.id}
                        checked={form.watch('tools').includes(tool.id)}
                        onCheckedChange={(checked) => handleToolToggle(tool.id, checked as boolean)}
                      />
                      <Label htmlFor={tool.id} className="text-sm font-normal">
                        <span className="font-medium">{tool.name}</span>
                        {tool.requiresPermission && <span className="text-xs text-yellow-600 ml-1">⚠️</span>}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Search & Navigation</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CLAUDE_CODE_TOOLS.filter(t => t.category === 'search').map((tool) => (
                    <div key={tool.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={tool.id}
                        checked={form.watch('tools').includes(tool.id)}
                        onCheckedChange={(checked) => handleToolToggle(tool.id, checked as boolean)}
                      />
                      <Label htmlFor={tool.id} className="text-sm font-normal">
                        <span className="font-medium">{tool.name}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Execution</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CLAUDE_CODE_TOOLS.filter(t => t.category === 'execution').map((tool) => (
                    <div key={tool.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={tool.id}
                        checked={form.watch('tools').includes(tool.id)}
                        onCheckedChange={(checked) => handleToolToggle(tool.id, checked as boolean)}
                      />
                      <Label htmlFor={tool.id} className="text-sm font-normal">
                        <span className="font-medium">{tool.name}</span>
                        {tool.requiresPermission && <span className="text-xs text-yellow-600 ml-1">⚠️</span>}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Utilities</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CLAUDE_CODE_TOOLS.filter(t => t.category === 'utility').map((tool) => (
                    <div key={tool.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={tool.id}
                        checked={form.watch('tools').includes(tool.id)}
                        onCheckedChange={(checked) => handleToolToggle(tool.id, checked as boolean)}
                      />
                      <Label htmlFor={tool.id} className="text-sm font-normal">
                        <span className="font-medium">{tool.name}</span>
                        {tool.requiresPermission && <span className="text-xs text-yellow-600 ml-1">⚠️</span>}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">MCP Tools</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CLAUDE_CODE_TOOLS.filter(t => t.category === 'mcp').map((tool) => (
                    <div key={tool.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={tool.id}
                        checked={form.watch('tools').includes(tool.id)}
                        onCheckedChange={(checked) => handleToolToggle(tool.id, checked as boolean)}
                      />
                      <Label htmlFor={tool.id} className="text-sm font-normal">
                        <span className="font-medium">{tool.name}</span>
                        {tool.requiresPermission && <span className="text-xs text-yellow-600 ml-1">⚠️</span>}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
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
                <SelectItem value="claude-opus-4">Claude 4 Opus</SelectItem>
                <SelectItem value="claude-sonnet-4">Claude 4 Sonnet</SelectItem>
                <SelectItem value="claude-3.5-sonnet">Claude 3.5 Sonnet</SelectItem>
                <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.model && (
              <p className="text-sm text-destructive">{form.formState.errors.model.message}</p>
            )}
          </div>

      </form>
    </ModalLayout>
  )
}
