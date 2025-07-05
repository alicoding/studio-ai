import { useState } from 'react'
import * as React from 'react'
import { Button } from '../ui/button'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { Label } from '../ui/label'
import { Checkbox } from '../ui/checkbox'
import { Sparkles, Plus } from 'lucide-react'
import { CLAUDE_CODE_TOOLS } from '../../lib/tools/toolRegistry'
import { ModalLayout } from '../ui/modal-layout'
import { useRoleResolver } from '../../hooks/useRoleResolver'

interface AgentConfig {
  id: string
  name: string
  role: string
  systemPrompt: string
  tools: string[]
  model: string
}

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
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  
  // Initialize selected role when modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (roleResolution.roleTemplate) {
        // KISS: Simple state setting based on resolution
        setSelectedRole(roleResolution.roleTemplate.id)
        setCustomizeTools(roleResolution.hasCustomTools)
        setSelectedTools(roleResolution.currentTools)
      } else {
        setSelectedRole('')
        setCustomizeTools(false)
        setSelectedTools([])
      }
    }
  }, [isOpen, roleResolution])

  const handleAssign = () => {
    if (selectedRole === 'new') {
      onCreateRole()
    } else if (selectedRole) {
      onAssignRole(selectedRole, customizeTools ? selectedTools : undefined)
    }
  }

  const selectedRoleConfig = availableRoles.find(r => r.id === selectedRole)

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
                <div key={role.id} className={`flex items-start space-x-3 py-2 rounded-md px-2 ${
                  roleResolution.roleTemplate?.id === role.id ? 'bg-primary/5 border border-primary/20' : ''
                }`}>
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
                      Tools: {
                        roleResolution.roleTemplate?.id === role.id && roleResolution.hasCustomTools
                          ? (roleResolution.currentTools?.join(', ') || 'None selected')
                          : (role.tools?.join(', ') || 'None')
                      }
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
                      // Only set to template tools if no existing customization
                      if (!roleResolution.hasCustomTools) {
                        setSelectedTools(selectedRoleConfig.tools)
                      }
                      // If hasCustomTools is true, keep current selectedTools (preserves existing customization)
                    }
                  }}
                />
                <Label htmlFor="customize" className="cursor-pointer">
                  Customize tool access for this agent
                </Label>
              </div>

              {customizeTools && (
                <div className="space-y-2 pl-6">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Select tools:</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const allToolIds = CLAUDE_CODE_TOOLS.map(t => t.id)
                        if (selectedTools.length === allToolIds.length) {
                          setSelectedTools([])
                        } else {
                          setSelectedTools(allToolIds)
                        }
                      }}
                      className="text-xs"
                    >
                      {selectedTools.length === CLAUDE_CODE_TOOLS.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {/* Group tools by category for better organization */}
                    {['file', 'search', 'execution', 'utility', 'mcp'].map(category => {
                      const categoryTools = CLAUDE_CODE_TOOLS.filter(t => t.category === category)
                      if (categoryTools.length === 0) return null
                      
                      return (
                        <div key={category}>
                          <h5 className="text-xs font-medium text-muted-foreground capitalize mb-1">
                            {category === 'file' ? 'File Operations' : 
                             category === 'search' ? 'Search & Navigation' :
                             category === 'execution' ? 'Execution' : 
                             category === 'utility' ? 'Utilities' : 'MCP Tools'}
                          </h5>
                          <div className="grid grid-cols-2 gap-2">
                            {categoryTools.map((tool) => (
                              <div key={tool.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={tool.id}
                                  checked={selectedTools.includes(tool.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedTools([...selectedTools, tool.id])
                                    } else {
                                      setSelectedTools(selectedTools.filter(t => t !== tool.id))
                                    }
                                  }}
                                />
                                <Label htmlFor={tool.id} className="text-sm cursor-pointer">
                                  {tool.name}
                                  {tool.requiresPermission && <span className="text-xs text-yellow-600 ml-1">⚠️</span>}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
      </div>
    </ModalLayout>
  )
}