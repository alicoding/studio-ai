import { useState } from 'react'
import * as React from 'react'
import { Button } from '../ui/button'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { Label } from '../ui/label'
import { Checkbox } from '../ui/checkbox'
import { Sparkles, Plus } from 'lucide-react'
import { ModalLayout } from '../ui/modal-layout'
import { ToolPermissionEditor } from '../ui/ToolPermissionEditor'
import { useRoleResolver } from '../../hooks/useRoleResolver'
import type { AgentConfig } from '../../stores/agents'
import type { ToolPermission } from '../../types/tool-permissions'

interface AgentRoleAssignment {
  agentId: string
  roleId: string
  customTools?: string[]
  assignedAt: string
  updatedAt: string
}

interface AssignRoleModalProps {
  isOpen: boolean
  onClose: () => void
  agentName: string
  agentId: string
  availableRoles: AgentConfig[]
  currentAgentAssignment?: AgentRoleAssignment
  onAssignRole: (roleId: string, customTools?: string[]) => void
  onCreateRole: () => void
  isReassignment?: boolean
  currentRole?: string
  currentCustomTools?: string[]
}

export function AssignRoleModal({
  isOpen,
  onClose,
  agentName,
  agentId,
  availableRoles,
  currentAgentAssignment,
  onAssignRole,
  onCreateRole,
  isReassignment = false,
  currentRole,
  currentCustomTools,
}: AssignRoleModalProps) {
  // SOLID: Use dedicated resolver for role logic
  const roleResolution = useRoleResolver(
    agentId,
    currentRole,
    availableRoles,
    currentAgentAssignment || null
  )

  const [selectedRole, setSelectedRole] = useState<string>('')
  const [customizeTools, setCustomizeTools] = useState(false)
  const [toolPermissions, setToolPermissions] = useState<ToolPermission[]>([])

  // Initialize selected role when modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (roleResolution.roleTemplate) {
        // KISS: Simple state setting based on resolution
        setSelectedRole(roleResolution.roleTemplate.id)

        // Check if we have custom tools from props or role resolution
        const hasCustom = currentCustomTools
          ? currentCustomTools.length > 0
          : roleResolution.hasCustomTools
        setCustomizeTools(hasCustom)

        // Convert current tools to ToolPermission format
        const permissions: ToolPermission[] = roleResolution.roleTemplate.tools || []

        if (currentCustomTools && currentCustomTools.length > 0) {
          // Use custom tools from props (highest priority)
          setToolPermissions(
            currentCustomTools.map((toolName) => ({
              name: toolName,
              enabled: true,
            }))
          )
        } else if (roleResolution.hasCustomTools && roleResolution.currentTools) {
          // If customized through role resolution, use those
          setToolPermissions(
            roleResolution.currentTools.map((toolName) => ({
              name: toolName,
              enabled: true,
            }))
          )
        } else {
          // Use template permissions
          setToolPermissions(permissions)
        }
      } else {
        setSelectedRole('')
        setCustomizeTools(false)
        setToolPermissions([])
      }
    }
  }, [isOpen, roleResolution, currentCustomTools])

  const handleAssign = () => {
    if (selectedRole === 'new') {
      onCreateRole()
    } else if (selectedRole) {
      // Convert ToolPermission[] back to string[] for enabled tools only
      const enabledTools = customizeTools
        ? toolPermissions.filter((p) => p.enabled).map((p) => p.name)
        : undefined
      onAssignRole(selectedRole, enabledTools)
    }
  }

  const selectedRoleConfig = availableRoles.find((r) => r.id === selectedRole)

  return (
    <ModalLayout
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          {isReassignment ? 'Change Role for' : 'Assign Role to'} {agentName}
        </div>
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!selectedRole}>
            {selectedRole === 'new' ? 'Create New Role' : 'Assign Role'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="space-y-3">
          <Label>
            {isReassignment && currentRole
              ? `Current role: ${currentRole}. Select a new role:`
              : 'Select a role configuration:'}
          </Label>
          <RadioGroup value={selectedRole} onValueChange={setSelectedRole}>
            {availableRoles.map((role) => (
              <div
                key={role.id}
                className={`flex items-start space-x-3 py-2 rounded-md px-2 ${
                  roleResolution.roleTemplate?.id === role.id
                    ? 'bg-primary/5 border border-primary/20'
                    : ''
                }`}
              >
                <RadioGroupItem value={role.id} id={role.id} className="mt-1" />
                <Label htmlFor={role.id} className="flex-1 cursor-pointer">
                  <div className="font-medium flex items-center gap-2">
                    {role.name}
                    {roleResolution.roleTemplate?.id === role.id && (
                      <span className="text-xs text-primary">
                        (Current{roleResolution.hasCustomTools ? ' - Customized' : ''})
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">{role.role}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Tools:{' '}
                    {roleResolution.roleTemplate?.id === role.id && roleResolution.hasCustomTools
                      ? roleResolution.currentTools?.join(', ') || 'None selected'
                      : role.tools
                          ?.filter((t) => (typeof t === 'string' ? true : t.enabled))
                          .map((t) => (typeof t === 'string' ? t : t.name))
                          .join(', ') || 'None'}
                  </div>
                </Label>
              </div>
            ))}
            <div className="flex items-start space-x-3 py-2 border-t pt-4">
              <RadioGroupItem value="new" id="new" className="mt-1" />
              <Label htmlFor="new" className="flex-1 cursor-pointer">
                <div className="font-medium flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create New Role
                </div>
                <div className="text-sm text-muted-foreground">
                  Define a custom role configuration for this agent
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {selectedRole && selectedRole !== 'new' && (
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="customize"
                checked={customizeTools}
                onCheckedChange={(checked) => {
                  setCustomizeTools(checked as boolean)
                  if (checked && selectedRoleConfig) {
                    // Initialize with role template permissions when enabling customization
                    if (!roleResolution.hasCustomTools) {
                      setToolPermissions(selectedRoleConfig.tools || [])
                    }
                  }
                }}
              />
              <Label htmlFor="customize" className="cursor-pointer">
                Customize tool access for this agent
              </Label>
            </div>

            {customizeTools && (
              <div className="mt-4">
                <ToolPermissionEditor
                  permissions={toolPermissions}
                  onChange={setToolPermissions}
                  className="border-0 shadow-none p-0"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </ModalLayout>
  )
}
