/**
 * ConditionBuilderModal - Main modal for building structured conditions
 *
 * SOLID: Single responsibility - condition building interface
 * KISS: Clean modal layout with preview and validation
 * Library-First: Uses shadcn/ui Dialog components
 */

import { memo, useState, useEffect } from 'react'
import { X, Eye, Code, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  createEmptyCondition,
  createEmptyRule,
  generateConditionId,
  validateStructuredCondition,
  conditionToReadableText,
  cloneCondition,
  legacyToStructuredCondition,
} from '@/lib/condition-utils'
import {
  isStructuredCondition,
  isLegacyCondition,
  type StructuredCondition,
  type ConditionGroup,
} from '@/types/condition-types'
import type { ConditionBuilderModalProps } from '@/types/condition-ui'
import ConditionGroupComponent from './ConditionGroup'

function ConditionBuilderModal({
  isOpen,
  onClose,
  onSave,
  initialCondition,
  availableFields,
  title = 'Build Condition',
}: ConditionBuilderModalProps) {
  const [condition, setCondition] = useState<StructuredCondition>(() => {
    if (initialCondition) {
      if (isStructuredCondition(initialCondition)) {
        return cloneCondition(initialCondition) as StructuredCondition
      } else if (isLegacyCondition(initialCondition)) {
        return legacyToStructuredCondition(initialCondition.expression || '')
      }
    }
    return createEmptyCondition()
  })

  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Validate condition whenever it changes
  useEffect(() => {
    const errors = validateStructuredCondition(condition, availableFields)
    setValidationErrors(errors)
  }, [condition, availableFields])

  const isValid = validationErrors.length === 0

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (initialCondition) {
        if (isStructuredCondition(initialCondition)) {
          setCondition(cloneCondition(initialCondition) as StructuredCondition)
        } else if (isLegacyCondition(initialCondition)) {
          setCondition(legacyToStructuredCondition(initialCondition.expression || ''))
        }
      } else {
        setCondition(createEmptyCondition())
      }
      setSelectedRuleId(null)
      setSelectedGroupId(null)
    }
  }, [isOpen, initialCondition])

  // Handle group updates
  const handleUpdateGroup = (groupId: string, updates: Partial<ConditionGroup>) => {
    setCondition((prev) => {
      const updated = cloneCondition(prev) as StructuredCondition

      function updateGroup(group: ConditionGroup): boolean {
        if (group.id === groupId) {
          Object.assign(group, updates)
          return true
        }
        if (group.groups) {
          return group.groups.some(updateGroup)
        }
        return false
      }

      updateGroup(updated.rootGroup)
      return updated
    })
  }

  // Handle group deletion
  const handleDeleteGroup = (groupId: string) => {
    setCondition((prev) => {
      const updated = cloneCondition(prev) as StructuredCondition

      function deleteGroup(parentGroup: ConditionGroup): boolean {
        if (!parentGroup.groups) return false

        const index = parentGroup.groups.findIndex((g) => g.id === groupId)
        if (index !== -1) {
          parentGroup.groups.splice(index, 1)
          return true
        }

        return parentGroup.groups.some(deleteGroup)
      }

      deleteGroup(updated.rootGroup)
      return updated
    })
  }

  // Handle rule addition
  const handleAddRule = (groupId: string) => {
    setCondition((prev) => {
      const updated = cloneCondition(prev) as StructuredCondition

      function addRuleToGroup(group: ConditionGroup): boolean {
        if (group.id === groupId) {
          const newRule = createEmptyRule()
          group.rules.push(newRule)
          setSelectedRuleId(newRule.id)
          return true
        }
        if (group.groups) {
          return group.groups.some(addRuleToGroup)
        }
        return false
      }

      addRuleToGroup(updated.rootGroup)
      return updated
    })
  }

  // Handle group addition
  const handleAddGroup = (parentGroupId: string) => {
    setCondition((prev) => {
      const updated = cloneCondition(prev) as StructuredCondition

      function addGroupToParent(group: ConditionGroup): boolean {
        if (group.id === parentGroupId) {
          const newGroup: ConditionGroup = {
            id: generateConditionId('group'),
            rules: [createEmptyRule()],
            combinator: 'AND',
            groups: [],
          }
          if (!group.groups) group.groups = []
          group.groups.push(newGroup)
          setSelectedGroupId(newGroup.id)
          return true
        }
        if (group.groups) {
          return group.groups.some(addGroupToParent)
        }
        return false
      }

      addGroupToParent(updated.rootGroup)
      return updated
    })
  }

  // Handle save
  const handleSave = () => {
    if (isValid) {
      onSave(condition)
      onClose()
    }
  }

  // Handle cancel
  const handleCancel = () => {
    onClose()
  }

  // Generate readable preview
  const readableCondition = conditionToReadableText(condition, availableFields)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span>{title}</span>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="builder" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mb-4 flex-shrink-0">
              <TabsTrigger value="builder" className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                Builder
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="builder" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-4">
                  {/* Validation status */}
                  <div className="flex items-center gap-2">
                    {isValid ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Valid condition</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {validationErrors.length} error{validationErrors.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}

                    <Badge variant="secondary" className="text-xs">
                      {availableFields.length} field{availableFields.length !== 1 ? 's' : ''}{' '}
                      available
                    </Badge>
                  </div>

                  {/* Validation errors */}
                  {validationErrors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <ul className="list-disc list-inside space-y-1">
                          {validationErrors.map((error, index) => (
                            <li key={index} className="text-sm">
                              {error}
                            </li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Condition builder */}
                  <ConditionGroupComponent
                    group={condition.rootGroup}
                    availableFields={availableFields}
                    level={0}
                    isRoot={true}
                    onUpdateGroup={handleUpdateGroup}
                    onDeleteGroup={handleDeleteGroup}
                    onAddRule={handleAddRule}
                    onAddGroup={handleAddGroup}
                    selectedRuleId={selectedRuleId}
                    selectedGroupId={selectedGroupId}
                    onSelectRule={setSelectedRuleId}
                    onSelectGroup={setSelectedGroupId}
                  />
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="preview" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Readable Condition</h3>
                    <div className="p-4 bg-muted rounded-lg">
                      <code className="text-sm">{readableCondition || 'No condition defined'}</code>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-2">JSON Structure</h3>
                    <pre className="text-xs p-4 bg-muted rounded-lg overflow-auto">
                      {JSON.stringify(condition, null, 2)}
                    </pre>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t flex-shrink-0">
          <div className="text-sm text-muted-foreground">
            {condition.rootGroup.rules.length} rule
            {condition.rootGroup.rules.length !== 1 ? 's' : ''}
            {condition.rootGroup.groups &&
              condition.rootGroup.groups.length > 0 &&
              `, ${condition.rootGroup.groups.length} group${condition.rootGroup.groups.length !== 1 ? 's' : ''}`}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!isValid}>
              Save Condition
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default memo(ConditionBuilderModal)
