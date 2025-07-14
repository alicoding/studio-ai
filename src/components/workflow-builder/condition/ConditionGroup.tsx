/**
 * ConditionGroup - Container for multiple condition rules with AND/OR logic
 *
 * SOLID: Single responsibility - group management only
 * KISS: Simple layout with combinator selection and rule management
 * Library-First: Uses condition builder components
 */

import { memo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { createEmptyRule, generateConditionId } from '@/lib/condition-utils'
import type { ConditionGroupProps } from '@/types/condition-ui'
import type { LogicalCombinator, ConditionRule } from '@/types/condition-types'
import ConditionRuleComponent from './ConditionRule'

function ConditionGroup({
  group,
  availableFields,
  level = 0,
  isRoot = false,
  onUpdateGroup,
  onDeleteGroup,
  onAddRule,
  onAddGroup,
  selectedRuleId,
  selectedGroupId,
  onSelectRule,
  onSelectGroup,
}: ConditionGroupProps) {
  const isSelected = selectedGroupId === group.id
  const maxNestingLevel = 3 // Prevent excessive nesting

  // Handle combinator change
  const handleCombinatorChange = (combinator: LogicalCombinator) => {
    onUpdateGroup(group.id, { combinator })
  }

  // Handle adding a new rule
  const handleAddRule = () => {
    onAddRule(group.id)
  }

  // Handle adding a new nested group
  const handleAddGroup = () => {
    if (level < maxNestingLevel) {
      onAddGroup(group.id)
    }
  }

  // Handle rule updates
  const handleUpdateRule = (ruleId: string, updates: Partial<ConditionRule>) => {
    const updatedRules = group.rules.map((rule) =>
      rule.id === ruleId ? { ...rule, ...updates } : rule
    )
    onUpdateGroup(group.id, { rules: updatedRules })
  }

  // Handle rule deletion
  const handleDeleteRule = (ruleId: string) => {
    const updatedRules = group.rules.filter((rule) => rule.id !== ruleId)
    onUpdateGroup(group.id, { rules: updatedRules })
  }

  // Handle nested group updates
  const handleUpdateNestedGroup = (groupId: string, updates: Partial<typeof group>) => {
    if (!group.groups) return

    const updatedGroups = group.groups.map((nestedGroup) =>
      nestedGroup.id === groupId ? { ...nestedGroup, ...updates } : nestedGroup
    )
    onUpdateGroup(group.id, { groups: updatedGroups })
  }

  // Handle nested group deletion
  const handleDeleteNestedGroup = (groupId: string) => {
    if (!group.groups) return

    const updatedGroups = group.groups.filter((nestedGroup) => nestedGroup.id !== groupId)
    onUpdateGroup(group.id, { groups: updatedGroups })
  }

  // Handle nested group rule addition
  const handleAddNestedRule = (groupId: string) => {
    if (!group.groups) return

    const updatedGroups = group.groups.map((nestedGroup) => {
      if (nestedGroup.id === groupId) {
        const newRule = createEmptyRule()
        return { ...nestedGroup, rules: [...nestedGroup.rules, newRule] }
      }
      return nestedGroup
    })
    onUpdateGroup(group.id, { groups: updatedGroups })
  }

  // Handle nested group addition
  const handleAddNestedGroup = (parentGroupId: string) => {
    if (!group.groups) return

    const newGroup = {
      id: generateConditionId('group'),
      rules: [createEmptyRule()],
      combinator: 'AND' as LogicalCombinator,
      groups: [],
    }

    const updatedGroups = group.groups.map((nestedGroup) => {
      if (nestedGroup.id === parentGroupId) {
        return {
          ...nestedGroup,
          groups: [...(nestedGroup.groups || []), newGroup],
        }
      }
      return nestedGroup
    })
    onUpdateGroup(group.id, { groups: updatedGroups })
  }

  const getCombinatorColor = (combinator: LogicalCombinator) => {
    return combinator === 'AND' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
  }

  const getIndentationClass = (level: number) => {
    const indents = ['ml-0', 'ml-4', 'ml-8', 'ml-12']
    return indents[Math.min(level, indents.length - 1)]
  }

  return (
    <div className={`space-y-3 ${getIndentationClass(level)}`}>
      <Card
        className={`p-4 ${
          isSelected ? 'ring-2 ring-primary border-primary' : 'border-muted-foreground/20'
        } ${level > 0 ? 'bg-muted/20' : ''}`}
        onClick={() => onSelectGroup(group.id)}
      >
        {/* Group header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {!isRoot && <span className="text-sm font-medium">Group {level + 1}</span>}

            {/* Combinator selector */}
            {(group.rules.length > 1 || (group.groups && group.groups.length > 0)) && (
              <Select value={group.combinator} onValueChange={handleCombinatorChange}>
                <SelectTrigger className="w-auto h-6">
                  <SelectValue>
                    <Badge
                      className={`text-xs px-2 py-0.5 ${getCombinatorColor(group.combinator)}`}
                    >
                      {group.combinator}
                    </Badge>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">AND</SelectItem>
                  <SelectItem value="OR">OR</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Add rule button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleAddRule()
              }}
              className="h-6 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Rule
            </Button>

            {/* Add group button */}
            {level < maxNestingLevel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleAddGroup()
                }}
                className="h-6 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Group
              </Button>
            )}

            {/* Delete group button (not for root) */}
            {!isRoot && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteGroup(group.id)
                }}
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-100"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Rules */}
        <div className="space-y-3">
          {group.rules.map((rule, index) => (
            <div key={rule.id}>
              {index > 0 && (
                <div className="flex items-center justify-center py-2">
                  <Badge
                    variant="secondary"
                    className={`text-xs px-2 py-1 ${getCombinatorColor(group.combinator)}`}
                  >
                    {group.combinator}
                  </Badge>
                </div>
              )}
              <ConditionRuleComponent
                rule={rule}
                availableFields={availableFields}
                isSelected={selectedRuleId === rule.id}
                onUpdateRule={handleUpdateRule}
                onDeleteRule={handleDeleteRule}
                onSelect={onSelectRule}
              />
            </div>
          ))}
        </div>

        {/* Nested groups */}
        {group.groups && group.groups.length > 0 && (
          <div className="mt-4 space-y-3">
            {group.rules.length > 0 && (
              <div className="flex items-center justify-center py-2">
                <Badge
                  variant="secondary"
                  className={`text-xs px-2 py-1 ${getCombinatorColor(group.combinator)}`}
                >
                  {group.combinator}
                </Badge>
              </div>
            )}

            {group.groups.map((nestedGroup, index) => (
              <div key={nestedGroup.id}>
                {index > 0 && (
                  <div className="flex items-center justify-center py-2">
                    <Badge
                      variant="secondary"
                      className={`text-xs px-2 py-1 ${getCombinatorColor(group.combinator)}`}
                    >
                      {group.combinator}
                    </Badge>
                  </div>
                )}
                <ConditionGroup
                  group={nestedGroup}
                  availableFields={availableFields}
                  level={level + 1}
                  isRoot={false}
                  onUpdateGroup={handleUpdateNestedGroup}
                  onDeleteGroup={handleDeleteNestedGroup}
                  onAddRule={handleAddNestedRule}
                  onAddGroup={handleAddNestedGroup}
                  selectedRuleId={selectedRuleId}
                  selectedGroupId={selectedGroupId}
                  onSelectRule={onSelectRule}
                  onSelectGroup={onSelectGroup}
                />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default memo(ConditionGroup)
