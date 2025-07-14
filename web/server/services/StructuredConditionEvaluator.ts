/**
 * Structured Condition Evaluator - n8n-inspired condition evaluation system
 *
 * SOLID: Single responsibility - evaluates structured conditions without JavaScript
 * DRY: Reuses existing template variable patterns from workflow system
 * KISS: Simple, type-safe condition evaluation with clear operation mapping
 * Library-First: Based on proven n8n patterns, extends existing ConditionEvaluator
 */

import type {
  StructuredCondition,
  LegacyCondition,
  WorkflowCondition,
  ConditionRule,
  ConditionGroup,
  ConditionValue,
  TemplateVariable,
  StaticValue,
  ConditionDataType,
  ConditionOperation,
  isStructuredCondition,
  isLegacyCondition,
  isTemplateVariable,
  isStaticValue,
} from '../schemas/condition-types'

import type { ConditionContext, ConditionResult } from '../schemas/workflow-builder'

import { ConditionEvaluator } from './ConditionEvaluator'

export class StructuredConditionEvaluator {
  private static instance: StructuredConditionEvaluator
  private legacyEvaluator: ConditionEvaluator

  private constructor() {
    this.legacyEvaluator = ConditionEvaluator.getInstance()
  }

  static getInstance(): StructuredConditionEvaluator {
    if (!StructuredConditionEvaluator.instance) {
      StructuredConditionEvaluator.instance = new StructuredConditionEvaluator()
    }
    return StructuredConditionEvaluator.instance
  }

  /**
   * Evaluate a workflow condition (structured or legacy)
   * SOLID: Single entry point for all condition evaluation
   * DRY: Delegates to appropriate evaluator based on condition type
   */
  evaluateCondition(condition: WorkflowCondition, context: ConditionContext): ConditionResult {
    try {
      if (isStructuredCondition(condition)) {
        return this.evaluateStructuredCondition(condition, context)
      } else if (isLegacyCondition(condition)) {
        return this.evaluateLegacyCondition(condition, context)
      } else {
        return {
          result: false,
          error: 'Invalid condition format',
          conditionType: 'structured',
        }
      }
    } catch (error) {
      return {
        result: false,
        error: error instanceof Error ? error.message : 'Unknown evaluation error',
        conditionType: isStructuredCondition(condition) ? 'structured' : 'legacy',
      }
    }
  }

  /**
   * Evaluate structured condition using n8n-style logic
   * KISS: Clear, type-safe evaluation without JavaScript expressions
   */
  private evaluateStructuredCondition(
    condition: StructuredCondition,
    context: ConditionContext
  ): ConditionResult {
    const result = this.evaluateConditionGroup(condition.rootGroup, context)

    return {
      result,
      conditionType: 'structured',
    }
  }

  /**
   * Evaluate legacy condition using existing evaluator
   * DRY: Reuses existing JavaScript expression evaluation
   */
  private evaluateLegacyCondition(
    condition: LegacyCondition,
    context: ConditionContext
  ): ConditionResult {
    const legacyResult = this.legacyEvaluator.evaluateCondition(condition.expression, context)

    return {
      ...legacyResult,
      conditionType: 'legacy',
    }
  }

  /**
   * Evaluate a condition group with logical combinators
   * SOLID: Single responsibility for group evaluation
   */
  private evaluateConditionGroup(group: ConditionGroup, context: ConditionContext): boolean {
    const ruleResults: boolean[] = []
    const groupResults: boolean[] = []

    // Evaluate all rules in this group
    if (group.rules) {
      for (const rule of group.rules) {
        const result = this.evaluateConditionRule(rule, context)
        ruleResults.push(result)
      }
    }

    // Evaluate all nested groups
    if (group.groups) {
      for (const nestedGroup of group.groups) {
        const result = this.evaluateConditionGroup(nestedGroup, context)
        groupResults.push(result)
      }
    }

    // Combine all results using the group's combinator
    const allResults = [...ruleResults, ...groupResults]

    if (allResults.length === 0) {
      return false // Empty group evaluates to false
    }

    if (group.combinator === 'AND') {
      return allResults.every((result) => result === true)
    } else {
      // OR
      return allResults.some((result) => result === true)
    }
  }

  /**
   * Evaluate individual condition rule
   * SOLID: Single responsibility for rule evaluation
   * Library-First: Uses operation-specific evaluation methods
   */
  private evaluateConditionRule(rule: ConditionRule, context: ConditionContext): boolean {
    // Resolve left value
    const leftValue = this.resolveConditionValue(rule.leftValue, context)

    // Resolve right value (if required)
    let rightValue: unknown = undefined
    if (rule.rightValue) {
      rightValue = this.resolveConditionValue(rule.rightValue, context)
    }

    // Evaluate based on operation and data type
    return this.evaluateOperation(leftValue, rule.operation, rightValue, rule.dataType)
  }

  /**
   * Resolve condition value (template variable or static value)
   * DRY: Reuses existing template variable resolution patterns
   */
  private resolveConditionValue(value: ConditionValue, context: ConditionContext): unknown {
    if (isTemplateVariable(value)) {
      return this.resolveTemplateVariable(value, context)
    } else if (isStaticValue(value)) {
      return this.resolveStaticValue(value)
    } else {
      throw new Error('Invalid condition value type')
    }
  }

  /**
   * Resolve template variable to actual value
   * DRY: Consistent with existing template variable patterns
   */
  private resolveTemplateVariable(variable: TemplateVariable, context: ConditionContext): unknown {
    switch (variable.field) {
      case 'output':
        const output = context.stepOutputs[variable.stepId]
        if (output === undefined) {
          throw new Error(`Step output not found: ${variable.stepId}`)
        }
        return output

      case 'status':
        const result = context.stepResults[variable.stepId]
        if (!result) {
          throw new Error(`Step result not found: ${variable.stepId}`)
        }
        return result.status

      case 'response':
        const responseResult = context.stepResults[variable.stepId]
        if (!responseResult) {
          throw new Error(`Step result not found: ${variable.stepId}`)
        }
        return responseResult.response

      default:
        throw new Error(`Invalid template variable field: ${variable.field}`)
    }
  }

  /**
   * Resolve static value with type conversion
   * KISS: Simple type conversion based on declared type
   */
  private resolveStaticValue(value: StaticValue): unknown {
    if (value.value === null) {
      return null
    }

    switch (value.type) {
      case 'string':
        return String(value.value)
      case 'number':
        return Number(value.value)
      case 'boolean':
        return Boolean(value.value)
      case 'dateTime':
        return new Date(value.value as string)
      case 'array':
        return Array.isArray(value.value) ? value.value : JSON.parse(String(value.value))
      case 'object':
        return typeof value.value === 'object' ? value.value : JSON.parse(String(value.value))
      default:
        return value.value
    }
  }

  /**
   * Evaluate operation between left and right values
   * SOLID: Single responsibility for operation evaluation
   * Library-First: Based on n8n operation semantics
   */
  private evaluateOperation(
    leftValue: unknown,
    operation: ConditionOperation,
    rightValue: unknown,
    dataType: ConditionDataType
  ): boolean {
    // Handle existence checks first (work for all data types)
    switch (operation) {
      case 'exists':
        return leftValue !== null && leftValue !== undefined
      case 'notExists':
        return leftValue === null || leftValue === undefined
      case 'isEmpty':
        return this.isEmpty(leftValue, dataType)
      case 'isNotEmpty':
        return !this.isEmpty(leftValue, dataType)
    }

    // For other operations, handle null/undefined values
    if (leftValue === null || leftValue === undefined) {
      return false
    }

    // Type-specific operations
    switch (dataType) {
      case 'string':
        return this.evaluateStringOperation(String(leftValue), operation, rightValue)
      case 'number':
        return this.evaluateNumberOperation(Number(leftValue), operation, rightValue)
      case 'boolean':
        return this.evaluateBooleanOperation(Boolean(leftValue), operation, rightValue)
      case 'array':
        return this.evaluateArrayOperation(leftValue as unknown[], operation, rightValue)
      case 'object':
        return this.evaluateObjectOperation(
          leftValue as Record<string, unknown>,
          operation,
          rightValue
        )
      case 'dateTime':
        return this.evaluateDateTimeOperation(new Date(leftValue as string), operation, rightValue)
      default:
        throw new Error(`Unsupported data type: ${dataType}`)
    }
  }

  /**
   * Check if value is empty based on data type
   * KISS: Simple emptiness check per data type
   */
  private isEmpty(value: unknown, dataType: ConditionDataType): boolean {
    if (value === null || value === undefined) {
      return true
    }

    switch (dataType) {
      case 'string':
        return String(value).length === 0
      case 'array':
        return Array.isArray(value) && value.length === 0
      case 'object':
        return typeof value === 'object' && Object.keys(value as object).length === 0
      default:
        return false
    }
  }

  /**
   * String operation evaluation
   * Library-First: Standard string operations from n8n
   */
  private evaluateStringOperation(
    leftValue: string,
    operation: ConditionOperation,
    rightValue: unknown
  ): boolean {
    const rightStr = rightValue ? String(rightValue) : ''

    switch (operation) {
      case 'equals':
        return leftValue === rightStr
      case 'notEquals':
        return leftValue !== rightStr
      case 'contains':
        return leftValue.includes(rightStr)
      case 'notContains':
        return !leftValue.includes(rightStr)
      case 'startsWith':
        return leftValue.startsWith(rightStr)
      case 'notStartsWith':
        return !leftValue.startsWith(rightStr)
      case 'endsWith':
        return leftValue.endsWith(rightStr)
      case 'notEndsWith':
        return !leftValue.endsWith(rightStr)
      case 'matchesRegex':
        try {
          return new RegExp(rightStr).test(leftValue)
        } catch {
          return false
        }
      case 'notMatchesRegex':
        try {
          return !new RegExp(rightStr).test(leftValue)
        } catch {
          return true
        }
      default:
        throw new Error(`Unsupported string operation: ${operation}`)
    }
  }

  /**
   * Number operation evaluation
   * Library-First: Standard numeric comparisons from n8n
   */
  private evaluateNumberOperation(
    leftValue: number,
    operation: ConditionOperation,
    rightValue: unknown
  ): boolean {
    const rightNum = rightValue ? Number(rightValue) : 0

    switch (operation) {
      case 'equals':
        return leftValue === rightNum
      case 'notEquals':
        return leftValue !== rightNum
      case 'greaterThan':
        return leftValue > rightNum
      case 'lessThan':
        return leftValue < rightNum
      case 'greaterThanOrEqual':
        return leftValue >= rightNum
      case 'lessThanOrEqual':
        return leftValue <= rightNum
      default:
        throw new Error(`Unsupported number operation: ${operation}`)
    }
  }

  /**
   * Boolean operation evaluation
   * Library-First: Standard boolean operations from n8n
   */
  private evaluateBooleanOperation(
    leftValue: boolean,
    operation: ConditionOperation,
    rightValue: unknown
  ): boolean {
    switch (operation) {
      case 'isTrue':
        return leftValue === true
      case 'isFalse':
        return leftValue === false
      case 'equals':
        return leftValue === Boolean(rightValue)
      case 'notEquals':
        return leftValue !== Boolean(rightValue)
      default:
        throw new Error(`Unsupported boolean operation: ${operation}`)
    }
  }

  /**
   * Array operation evaluation
   * Library-First: Standard array operations from n8n
   */
  private evaluateArrayOperation(
    leftValue: unknown[],
    operation: ConditionOperation,
    rightValue: unknown
  ): boolean {
    switch (operation) {
      case 'contains':
        return leftValue.includes(rightValue)
      case 'notContains':
        return !leftValue.includes(rightValue)
      case 'lengthEquals':
        return leftValue.length === Number(rightValue)
      case 'lengthNotEquals':
        return leftValue.length !== Number(rightValue)
      case 'lengthGreaterThan':
        return leftValue.length > Number(rightValue)
      case 'lengthLessThan':
        return leftValue.length < Number(rightValue)
      case 'lengthGreaterThanOrEqual':
        return leftValue.length >= Number(rightValue)
      case 'lengthLessThanOrEqual':
        return leftValue.length <= Number(rightValue)
      default:
        throw new Error(`Unsupported array operation: ${operation}`)
    }
  }

  /**
   * Object operation evaluation
   * Library-First: Standard object operations from n8n
   */
  private evaluateObjectOperation(
    _leftValue: Record<string, unknown>,
    operation: ConditionOperation,
    _rightValue: unknown
  ): boolean {
    switch (operation) {
      // Object-specific operations are limited to existence and emptiness checks
      // which are handled in the main evaluateOperation method
      default:
        throw new Error(`Unsupported object operation: ${operation}`)
    }
  }

  /**
   * DateTime operation evaluation
   * Library-First: Standard date/time operations from n8n
   */
  private evaluateDateTimeOperation(
    leftValue: Date,
    operation: ConditionOperation,
    rightValue: unknown
  ): boolean {
    const rightDate = rightValue ? new Date(rightValue as string) : new Date()

    switch (operation) {
      case 'equals':
        return leftValue.getTime() === rightDate.getTime()
      case 'notEquals':
        return leftValue.getTime() !== rightDate.getTime()
      case 'isAfter':
        return leftValue.getTime() > rightDate.getTime()
      case 'isBefore':
        return leftValue.getTime() < rightDate.getTime()
      case 'isAfterOrEqual':
        return leftValue.getTime() >= rightDate.getTime()
      case 'isBeforeOrEqual':
        return leftValue.getTime() <= rightDate.getTime()
      default:
        throw new Error(`Unsupported dateTime operation: ${operation}`)
    }
  }

  /**
   * Get available template variables for UI
   * DRY: Reuses logic from legacy evaluator
   */
  getAvailableVariables(
    context: ConditionContext
  ): Array<{ stepId: string; field: string; label: string }> {
    const variables: Array<{ stepId: string; field: string; label: string }> = []

    // Add step output variables
    for (const stepId of Object.keys(context.stepOutputs)) {
      variables.push({
        stepId,
        field: 'output',
        label: `${stepId} Output`,
      })
    }

    // Add step result variables
    for (const stepId of Object.keys(context.stepResults)) {
      variables.push({
        stepId,
        field: 'status',
        label: `${stepId} Status`,
      })
      variables.push({
        stepId,
        field: 'response',
        label: `${stepId} Response`,
      })
    }

    return variables.sort((a, b) => a.label.localeCompare(b.label))
  }
}
