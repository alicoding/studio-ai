import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Save, Wand2 } from 'lucide-react'
import { getRoleDefaultTools, ROLE_SYSTEM_PROMPTS } from '../../lib/tools/roleDefaults'
import { ModalLayout } from '../ui/modal-layout'
import { ToolPermissionEditor } from '../ui/ToolPermissionEditor'
import { useAvailableTools } from '../../hooks/useAvailableTools'

const agentSchema = z.object({
  name: z.string().min(1, 'Agent name is required').max(50, 'Name too long'),
  role: z.string().min(1, 'Role is required'),
  systemPrompt: z.string().min(10, 'System prompt must be at least 10 characters'),
  tools: z
    .array(
      z.object({
        name: z.string(),
        enabled: z.boolean(),
        restrictions: z.object({}).optional(),
        metadata: z.object({}).optional(),
      })
    )
    .min(1, 'At least one tool must be selected'),
  model: z.string().min(1, 'Model is required'),
  maxTokens: z.number().min(1000).max(1000000).optional(),
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
  const { tools: availableTools } = useAvailableTools()

  const form = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: '',
      role: 'dev',
      systemPrompt: '',
      tools: [],
      model: 'claude-opus-4',
      maxTokens: 200000,
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
        maxTokens: agent.maxTokens || 200000,
      })
    } else if (isOpen && availableTools.length > 0) {
      // Create mode - reset to defaults with role-specific values
      const defaultRole = 'dev'
      const roleDefaults = getRoleDefaultTools(availableTools)
      form.reset({
        name: '',
        role: defaultRole,
        systemPrompt: ROLE_SYSTEM_PROMPTS[defaultRole] || '',
        tools: roleDefaults[defaultRole] || [],
        model: 'claude-opus-4',
        maxTokens: 200000,
      })
    }
  }, [isOpen, agent, form, availableTools])

  const onSubmit = (data: AgentFormData) => {
    onCreate({
      id: isEditMode ? agent!.id : `${data.role}-${Date.now()}`,
      ...data,
      projectsUsing: isEditMode ? agent!.projectsUsing : [],
    })
    onClose()
  }

  const handleRoleChange = (role: string) => {
    form.setValue('role', role)
    // Apply role defaults when role changes
    if (availableTools.length > 0) {
      const roleDefaults = getRoleDefaultTools(availableTools)
      if (roleDefaults[role]) {
        form.setValue('tools', roleDefaults[role])
      }
    }
    if (ROLE_SYSTEM_PROMPTS[role]) {
      form.setValue('systemPrompt', ROLE_SYSTEM_PROMPTS[role])
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Agent Name</Label>
          <Input id="name" placeholder="e.g., dev_assistant" {...form.register('name')} />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select value={form.watch('role')} onValueChange={handleRoleChange}>
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
            <p className="text-sm text-destructive">{form.formState.errors.systemPrompt.message}</p>
          )}
        </div>

        {/* Tool Permission Editor */}
        <ToolPermissionEditor
          permissions={form.watch('tools')}
          onChange={(permissions) => form.setValue('tools', permissions)}
        />
        {form.formState.errors.tools && (
          <p className="text-sm text-destructive">{form.formState.errors.tools.message}</p>
        )}

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

        <div className="space-y-2">
          <Label htmlFor="maxTokens">Max Tokens</Label>
          <Input
            id="maxTokens"
            type="number"
            placeholder="200000"
            {...form.register('maxTokens', { valueAsNumber: true })}
          />
          <p className="text-xs text-muted-foreground">
            Maximum number of tokens for this agent (1000 - 1000000)
          </p>
          {form.formState.errors.maxTokens && (
            <p className="text-sm text-destructive">{form.formState.errors.maxTokens.message}</p>
          )}
        </div>
      </form>
    </ModalLayout>
  )
}
