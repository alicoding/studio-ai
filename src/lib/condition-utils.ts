/**
 * Utility functions for condition builder UI
 *
 * SOLID: Single responsibility - condition manipulation utilities only
 * DRY: Reusable functions for condition operations
 * KISS: Simple, focused utility functions
 * Library-First: Uses existing condition types and patterns
 */

import {
  OPERATION_METADATA,
  getOperationsForDataType,
  isTemplateVariable,
  isStaticValue,
  isStructuredCondition,
  isLegacyCondition,
  ConditionValueHelpers,
  type ConditionDataType,
  type ConditionOperation,
  type ConditionValue,
  type ConditionRule,
  type ConditionGroup,
  type StructuredCondition,
  type WorkflowCondition,
  type LogicalCombinator,
  type TemplateVariable,
} from '@/types/condition-types'

import type { AvailableField, ValueInputConfig } from '../types/condition-ui'

import type { WorkflowStepDefinition } from '../../web/server/schemas/workflow-builder'

/**
 * Generate a unique ID for condition elements
 */
export function generateConditionId(prefix: string = 'cond'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Create an empty condition rule
 */
export function createEmptyRule(dataType: ConditionDataType = 'string'): ConditionRule {
  return {
    id: generateConditionId('rule'),
    leftValue: ConditionValueHelpers.staticString(''),
    operation: 'equals',
    rightValue: ConditionValueHelpers.staticString(''),
    dataType,
  }
}

/**
 * Create an empty condition group
 */
export function createEmptyGroup(combinator: LogicalCombinator = 'AND'): ConditionGroup {
  return {
    id: generateConditionId('group'),
    rules: [createEmptyRule()],
    combinator,
    groups: [],
  }
}

/**
 * Create an empty structured condition
 */
export function createEmptyCondition(): StructuredCondition {
  return {
    version: '2.0',
    rootGroup: createEmptyGroup(),
  }
}

/**
 * Extract available fields from workflow steps
 */
export function extractAvailableFields(steps: WorkflowStepDefinition[]): AvailableField[] {
  const fields: AvailableField[] = []

  steps.forEach((step) => {
    // Skip conditional steps - they don't produce output
    if (step.type === 'conditional') return

    const stepName = step.task || step.id

    // Add output field
    fields.push({
      id: `${step.id}.output`,
      stepId: step.id,
      stepName,
      field: 'output',
      label: `${stepName} → Output`,
      dataType: inferDataTypeFromStep(step),
      description: `Output from: ${step.task || step.id}`,
    })

    // Add status field
    fields.push({
      id: `${step.id}.status`,
      stepId: step.id,
      stepName,
      field: 'status',
      label: `${stepName} → Status`,
      dataType: 'string',
      description: `Execution status: pending, running, completed, failed`,
    })

    // Add response field
    fields.push({
      id: `${step.id}.response`,
      stepId: step.id,
      stepName,
      field: 'response',
      label: `${stepName} → Response`,
      dataType: 'string',
      description: `Full response from: ${step.task || step.id}`,
    })
  })

  return fields
}

/**
 * Infer data type from workflow step definition
 */
function inferDataTypeFromStep(step: WorkflowStepDefinition): ConditionDataType {
  const task = step.task?.toLowerCase() || ''

  // Simple heuristics based on task content
  if (task.includes('count') || task.includes('number') || task.includes('calculate')) {
    return 'number'
  }
  if (task.includes('true') || task.includes('false') || task.includes('boolean')) {
    return 'boolean'
  }
  if (task.includes('array') || task.includes('list') || task.includes('items')) {
    return 'array'
  }
  if (task.includes('date') || task.includes('time')) {
    return 'dateTime'
  }
  if (task.includes('object') || task.includes('json')) {
    return 'object'
  }

  // Default to string
  return 'string'
}

/**
 * Find an available field by its ID
 */
export function findFieldById(fields: AvailableField[], fieldId: string): AvailableField | null {
  return fields.find((field) => field.id === fieldId) || null
}

/**
 * Convert a condition value to an available field reference
 */
export function conditionValueToField(
  value: ConditionValue,
  availableFields: AvailableField[]
): AvailableField | null {
  if (!isTemplateVariable(value)) return null

  const fieldId = `${value.stepId}.${value.field}`
  return findFieldById(availableFields, fieldId)
}

/**
 * Convert an available field to a template variable
 */
export function fieldToTemplateVariable(field: AvailableField): TemplateVariable {
  return {
    stepId: field.stepId,
    field: field.field,
  }
}

/**
 * Get input configuration for a value based on data type and operation
 */
export function getValueInputConfig(
  dataType: ConditionDataType,
  operation: ConditionOperation
): ValueInputConfig {
  const operationMeta = OPERATION_METADATA[operation]

  // Operations that don't require right value
  if (!operationMeta.requiresRightValue) {
    return { type: 'text', placeholder: 'No value required' }
  }

  switch (dataType) {
    case 'string':
      if (operation === 'matchesRegex' || operation === 'notMatchesRegex') {
        return {
          type: 'text',
          placeholder: 'Enter regex pattern (e.g., \\d+)',
          validation: (value: string) => {
            try {
              new RegExp(value)
              return true
            } catch {
              return false
            }
          },
        }
      }
      return { type: 'text', placeholder: 'Enter text value' }

    case 'number':
      return { type: 'number', placeholder: 'Enter number' }

    case 'boolean':
      return {
        type: 'select',
        options: [
          { value: true, label: 'True' },
          { value: false, label: 'False' },
        ],
      }

    case 'dateTime':
      return { type: 'date', placeholder: 'Select date/time' }

    case 'array':
      if (operation.startsWith('length')) {
        return { type: 'number', placeholder: 'Enter array length' }
      }
      return { type: 'text', placeholder: 'Enter array item value' }

    case 'object':
      return { type: 'text', placeholder: 'Enter object property' }

    default:
      return { type: 'text', placeholder: 'Enter value' }
  }
}

/**
 * Validate a condition rule
 */
export function validateConditionRule(
  rule: ConditionRule,
  availableFields: AvailableField[]
): string[] {
  const errors: string[] = []

  // Validate left value
  if (isTemplateVariable(rule.leftValue)) {
    const fieldId = `${rule.leftValue.stepId}.${rule.leftValue.field}`
    const field = findFieldById(availableFields, fieldId)
    if (!field) {
      errors.push(`Field "${fieldId}" is not available`)
    }
  }

  // Validate operation is supported for data type
  const supportedOps = getOperationsForDataType(rule.dataType)
  if (!supportedOps.includes(rule.operation)) {
    errors.push(`Operation "${rule.operation}" is not supported for ${rule.dataType}`)
  }

  // Validate right value if required
  const operationMeta = OPERATION_METADATA[rule.operation]
  if (operationMeta.requiresRightValue && !rule.rightValue) {
    errors.push('A value is required for this operation')
  }

  // Validate right value if it's a template variable
  if (rule.rightValue && isTemplateVariable(rule.rightValue)) {
    const fieldId = `${rule.rightValue.stepId}.${rule.rightValue.field}`
    const field = findFieldById(availableFields, fieldId)
    if (!field) {
      errors.push(`Field "${fieldId}" is not available`)
    }
  }

  return errors
}

/**
 * Validate a condition group
 */
export function validateConditionGroup(
  group: ConditionGroup,
  availableFields: AvailableField[]
): string[] {
  const errors: string[] = []

  // Validate all rules
  group.rules.forEach((rule) => {
    const ruleErrors = validateConditionRule(rule, availableFields)
    errors.push(...ruleErrors)
  })

  // Validate nested groups
  if (group.groups) {
    group.groups.forEach((nestedGroup) => {
      const groupErrors = validateConditionGroup(nestedGroup, availableFields)
      errors.push(...groupErrors)
    })
  }

  // Ensure at least one rule or group exists
  if (group.rules.length === 0 && (!group.groups || group.groups.length === 0)) {
    errors.push('Group must contain at least one rule or sub-group')
  }

  return errors
}

/**
 * Validate a complete structured condition
 */
export function validateStructuredCondition(
  condition: StructuredCondition,
  availableFields: AvailableField[]
): string[] {
  return validateConditionGroup(condition.rootGroup, availableFields)
}

/**
 * Convert legacy condition to structured condition (best effort)
 */
export function legacyToStructuredCondition(legacyCondition: string): StructuredCondition {
  // This is a simplified conversion - in practice, you'd want a proper parser
  // For now, create a basic condition that preserves the expression as a string comparison

  const rule: ConditionRule = {
    id: generateConditionId('rule'),
    leftValue: ConditionValueHelpers.staticString(legacyCondition),
    operation: 'equals',
    rightValue: ConditionValueHelpers.staticString('true'),
    dataType: 'string',
  }

  return {
    version: '2.0',
    rootGroup: {
      id: generateConditionId('group'),
      rules: [rule],
      combinator: 'AND',
      groups: [],
    },
  }
}

/**
 * Convert structured condition to readable text
 */
export function conditionToReadableText(
  condition: WorkflowCondition,
  availableFields: AvailableField[]
): string {
  if (isLegacyCondition(condition)) {
    return condition.expression || 'No condition'
  }

  if (!isStructuredCondition(condition)) {
    return 'Invalid condition'
  }

  return groupToReadableText(condition.rootGroup, availableFields)
}

/**
 * Convert condition group to readable text
 */
function groupToReadableText(
  group: ConditionGroup,
  availableFields: AvailableField[],
  level: number = 0
): string {
  const parts: string[] = []

  // Add rules
  group.rules.forEach((rule) => {
    parts.push(ruleToReadableText(rule, availableFields))
  })

  // Add nested groups
  if (group.groups) {
    group.groups.forEach((nestedGroup) => {
      const nestedText = groupToReadableText(nestedGroup, availableFields, level + 1)
      parts.push(level > 0 ? `(${nestedText})` : nestedText)
    })
  }

  const joinWord = group.combinator.toLowerCase()
  return parts.join(` ${joinWord} `)
}

/**
 * Convert condition rule to readable text
 */
function ruleToReadableText(rule: ConditionRule, availableFields: AvailableField[]): string {
  const leftText = valueToReadableText(rule.leftValue, availableFields)
  const operationMeta = OPERATION_METADATA[rule.operation]
  const rightText = rule.rightValue ? valueToReadableText(rule.rightValue, availableFields) : ''

  if (operationMeta.requiresRightValue) {
    return `${leftText} ${operationMeta.label} ${rightText}`
  } else {
    return `${leftText} ${operationMeta.label}`
  }
}

/**
 * Convert condition value to readable text
 */
function valueToReadableText(value: ConditionValue, availableFields: AvailableField[]): string {
  if (isTemplateVariable(value)) {
    const field = findFieldById(availableFields, `${value.stepId}.${value.field}`)
    return field ? field.label : `{${value.stepId}.${value.field}}`
  }

  if (isStaticValue(value)) {
    if (value.value === null) return 'null'
    if (typeof value.value === 'string') return `"${value.value}"`
    return String(value.value)
  }

  return 'unknown'
}

/**
 * Deep clone a condition (for immutable updates)
 */
export function cloneCondition(condition: WorkflowCondition): WorkflowCondition {
  return JSON.parse(JSON.stringify(condition))
}

/**
 * Update a rule within a structured condition
 */
export function updateRuleInCondition(
  condition: StructuredCondition,
  ruleId: string,
  updates: Partial<ConditionRule>
): StructuredCondition {
  const cloned = cloneCondition(condition) as StructuredCondition

  function updateRuleInGroup(group: ConditionGroup): boolean {
    // Check rules in this group
    const ruleIndex = group.rules.findIndex((rule) => rule.id === ruleId)
    if (ruleIndex !== -1) {
      group.rules[ruleIndex] = { ...group.rules[ruleIndex], ...updates }
      return true
    }

    // Check nested groups
    if (group.groups) {
      return group.groups.some(updateRuleInGroup)
    }

    return false
  }

  updateRuleInGroup(cloned.rootGroup)
  return cloned
}

/**
 * Update a group within a structured condition
 */
export function updateGroupInCondition(
  condition: StructuredCondition,
  groupId: string,
  updates: Partial<ConditionGroup>
): StructuredCondition {
  const cloned = cloneCondition(condition) as StructuredCondition

  function updateGroupInTree(group: ConditionGroup): boolean {
    if (group.id === groupId) {
      Object.assign(group, updates)
      return true
    }

    if (group.groups) {
      return group.groups.some(updateGroupInTree)
    }

    return false
  }

  updateGroupInTree(cloned.rootGroup)
  return cloned
}
