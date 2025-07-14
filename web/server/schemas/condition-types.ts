/**
 * Structured Condition Types - n8n-inspired conditional logic system
 *
 * SOLID: Single responsibility - only condition type definitions
 * DRY: Reusable condition types across workflow system
 * KISS: Simple, clear data structures that replace JavaScript expressions
 * Library-First: Based on proven n8n patterns for conditional logic
 */

/**
 * Data types supported in conditional evaluations
 * Based on n8n's data type system
 */
export type ConditionDataType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'dateTime'

/**
 * String comparison operations
 */
export type StringOperation =
  | 'exists'
  | 'notExists'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'notStartsWith'
  | 'endsWith'
  | 'notEndsWith'
  | 'matchesRegex'
  | 'notMatchesRegex'

/**
 * Number comparison operations
 */
export type NumberOperation =
  | 'exists'
  | 'notExists'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'

/**
 * Boolean comparison operations
 */
export type BooleanOperation =
  | 'exists'
  | 'notExists'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'isTrue'
  | 'isFalse'
  | 'equals'
  | 'notEquals'

/**
 * Array comparison operations
 */
export type ArrayOperation =
  | 'exists'
  | 'notExists'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'contains'
  | 'notContains'
  | 'lengthEquals'
  | 'lengthNotEquals'
  | 'lengthGreaterThan'
  | 'lengthLessThan'
  | 'lengthGreaterThanOrEqual'
  | 'lengthLessThanOrEqual'

/**
 * Object comparison operations
 */
export type ObjectOperation = 'exists' | 'notExists' | 'isEmpty' | 'isNotEmpty'

/**
 * Date & Time comparison operations
 */
export type DateTimeOperation =
  | 'exists'
  | 'notExists'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'equals'
  | 'notEquals'
  | 'isAfter'
  | 'isBefore'
  | 'isAfterOrEqual'
  | 'isBeforeOrEqual'

/**
 * Union type for all possible operations
 */
export type ConditionOperation =
  | StringOperation
  | NumberOperation
  | BooleanOperation
  | ArrayOperation
  | ObjectOperation
  | DateTimeOperation

/**
 * Template variable reference for dynamic values
 * Supports existing {stepId.field} syntax
 */
export interface TemplateVariable {
  stepId: string // Step ID to reference
  field: 'output' | 'status' | 'response' // Field to access
}

/**
 * Static value for comparison
 */
export interface StaticValue {
  type: ConditionDataType
  value: string | number | boolean | null // Serialized value
}

/**
 * Value source - either template variable or static value
 */
export type ConditionValue = TemplateVariable | StaticValue

/**
 * Individual condition rule
 */
export interface ConditionRule {
  id: string // Unique ID for the condition rule
  leftValue: ConditionValue // Left side of comparison
  operation: ConditionOperation // Comparison operation
  rightValue?: ConditionValue // Right side of comparison (optional for some operations)
  dataType: ConditionDataType // Expected data type for type-safe evaluation
}

/**
 * Logical combinator for multiple conditions
 */
export type LogicalCombinator = 'AND' | 'OR'

/**
 * Group of conditions with logical combinators
 */
export interface ConditionGroup {
  id: string // Unique ID for the condition group
  rules: ConditionRule[] // Array of condition rules
  combinator: LogicalCombinator // How to combine the rules (AND/OR)
  groups?: ConditionGroup[] // Nested condition groups for complex logic
}

/**
 * Main structured condition definition
 * Replaces JavaScript expression strings
 */
export interface StructuredCondition {
  version: '2.0' // Version for backward compatibility
  rootGroup: ConditionGroup // Root condition group
}

/**
 * Legacy condition format for backward compatibility
 */
export interface LegacyCondition {
  version?: '1.0' | undefined // Legacy version or undefined
  expression: string // JavaScript expression string
}

/**
 * Union type supporting both legacy and structured conditions
 */
export type WorkflowCondition = StructuredCondition | LegacyCondition

/**
 * Type guards for condition types
 */
export function isTemplateVariable(value: ConditionValue): value is TemplateVariable {
  return 'stepId' in value && 'field' in value
}

export function isStaticValue(value: ConditionValue): value is StaticValue {
  return 'type' in value && 'value' in value
}

export function isStructuredCondition(
  condition: WorkflowCondition
): condition is StructuredCondition {
  return 'version' in condition && condition.version === '2.0' && 'rootGroup' in condition
}

export function isLegacyCondition(condition: WorkflowCondition): condition is LegacyCondition {
  return !('version' in condition) || condition.version === '1.0' || 'expression' in condition
}

/**
 * Validation result for structured conditions
 */
export interface ConditionValidationResult {
  valid: boolean
  errors: ConditionValidationError[]
  warnings: ConditionValidationWarning[]
}

/**
 * Condition validation error
 */
export interface ConditionValidationError {
  ruleId?: string // Rule ID if rule-specific
  groupId?: string // Group ID if group-specific
  field?: string // Field name if field-specific
  message: string // Error message
  code: string // Error code for i18n
}

/**
 * Condition validation warning
 */
export interface ConditionValidationWarning {
  ruleId?: string // Rule ID if rule-specific
  message: string // Warning message
  code: string // Warning code
}

/**
 * Helper functions for creating condition values
 */
export const ConditionValueHelpers = {
  /**
   * Create a template variable reference
   */
  templateVariable(stepId: string, field: 'output' | 'status' | 'response'): TemplateVariable {
    return { stepId, field }
  },

  /**
   * Create a static string value
   */
  staticString(value: string): StaticValue {
    return { type: 'string', value }
  },

  /**
   * Create a static number value
   */
  staticNumber(value: number): StaticValue {
    return { type: 'number', value }
  },

  /**
   * Create a static boolean value
   */
  staticBoolean(value: boolean): StaticValue {
    return { type: 'boolean', value }
  },

  /**
   * Create a static null value
   */
  staticNull(): StaticValue {
    return { type: 'string', value: null }
  },
}

/**
 * Metadata for UI rendering of condition operations
 */
export interface OperationMetadata {
  operation: ConditionOperation
  label: string // Human-readable label
  description: string // Description for tooltips
  requiresRightValue: boolean // Whether operation needs a right-hand value
  supportedDataTypes: ConditionDataType[] // Which data types support this operation
}

/**
 * Complete operation metadata for all supported operations
 * Used by UI components to render operation dropdowns
 */
export const OPERATION_METADATA: Record<ConditionOperation, OperationMetadata> = {
  // String operations
  exists: {
    operation: 'exists',
    label: 'exists',
    description: 'Check if the value exists (is not null or undefined)',
    requiresRightValue: false,
    supportedDataTypes: ['string', 'number', 'boolean', 'array', 'object', 'dateTime'],
  },
  notExists: {
    operation: 'notExists',
    label: 'does not exist',
    description: 'Check if the value does not exist (is null or undefined)',
    requiresRightValue: false,
    supportedDataTypes: ['string', 'number', 'boolean', 'array', 'object', 'dateTime'],
  },
  isEmpty: {
    operation: 'isEmpty',
    label: 'is empty',
    description: 'Check if the value is empty (empty string, empty array, empty object)',
    requiresRightValue: false,
    supportedDataTypes: ['string', 'array', 'object'],
  },
  isNotEmpty: {
    operation: 'isNotEmpty',
    label: 'is not empty',
    description: 'Check if the value is not empty',
    requiresRightValue: false,
    supportedDataTypes: ['string', 'array', 'object'],
  },
  equals: {
    operation: 'equals',
    label: 'is equal to',
    description: 'Check if values are equal',
    requiresRightValue: true,
    supportedDataTypes: ['string', 'number', 'boolean', 'dateTime'],
  },
  notEquals: {
    operation: 'notEquals',
    label: 'is not equal to',
    description: 'Check if values are not equal',
    requiresRightValue: true,
    supportedDataTypes: ['string', 'number', 'boolean', 'dateTime'],
  },
  contains: {
    operation: 'contains',
    label: 'contains',
    description: 'Check if string contains substring or array contains item',
    requiresRightValue: true,
    supportedDataTypes: ['string', 'array'],
  },
  notContains: {
    operation: 'notContains',
    label: 'does not contain',
    description: 'Check if string does not contain substring or array does not contain item',
    requiresRightValue: true,
    supportedDataTypes: ['string', 'array'],
  },
  startsWith: {
    operation: 'startsWith',
    label: 'starts with',
    description: 'Check if string starts with specified substring',
    requiresRightValue: true,
    supportedDataTypes: ['string'],
  },
  notStartsWith: {
    operation: 'notStartsWith',
    label: 'does not start with',
    description: 'Check if string does not start with specified substring',
    requiresRightValue: true,
    supportedDataTypes: ['string'],
  },
  endsWith: {
    operation: 'endsWith',
    label: 'ends with',
    description: 'Check if string ends with specified substring',
    requiresRightValue: true,
    supportedDataTypes: ['string'],
  },
  notEndsWith: {
    operation: 'notEndsWith',
    label: 'does not end with',
    description: 'Check if string does not end with specified substring',
    requiresRightValue: true,
    supportedDataTypes: ['string'],
  },
  matchesRegex: {
    operation: 'matchesRegex',
    label: 'matches regex',
    description: 'Check if string matches regular expression pattern',
    requiresRightValue: true,
    supportedDataTypes: ['string'],
  },
  notMatchesRegex: {
    operation: 'notMatchesRegex',
    label: 'does not match regex',
    description: 'Check if string does not match regular expression pattern',
    requiresRightValue: true,
    supportedDataTypes: ['string'],
  },
  // Number operations
  greaterThan: {
    operation: 'greaterThan',
    label: 'is greater than',
    description: 'Check if number is greater than specified value',
    requiresRightValue: true,
    supportedDataTypes: ['number'],
  },
  lessThan: {
    operation: 'lessThan',
    label: 'is less than',
    description: 'Check if number is less than specified value',
    requiresRightValue: true,
    supportedDataTypes: ['number'],
  },
  greaterThanOrEqual: {
    operation: 'greaterThanOrEqual',
    label: 'is greater than or equal to',
    description: 'Check if number is greater than or equal to specified value',
    requiresRightValue: true,
    supportedDataTypes: ['number'],
  },
  lessThanOrEqual: {
    operation: 'lessThanOrEqual',
    label: 'is less than or equal to',
    description: 'Check if number is less than or equal to specified value',
    requiresRightValue: true,
    supportedDataTypes: ['number'],
  },
  // Boolean operations
  isTrue: {
    operation: 'isTrue',
    label: 'is true',
    description: 'Check if boolean value is true',
    requiresRightValue: false,
    supportedDataTypes: ['boolean'],
  },
  isFalse: {
    operation: 'isFalse',
    label: 'is false',
    description: 'Check if boolean value is false',
    requiresRightValue: false,
    supportedDataTypes: ['boolean'],
  },
  // Array operations
  lengthEquals: {
    operation: 'lengthEquals',
    label: 'length equals',
    description: 'Check if array length equals specified number',
    requiresRightValue: true,
    supportedDataTypes: ['array'],
  },
  lengthNotEquals: {
    operation: 'lengthNotEquals',
    label: 'length not equals',
    description: 'Check if array length does not equal specified number',
    requiresRightValue: true,
    supportedDataTypes: ['array'],
  },
  lengthGreaterThan: {
    operation: 'lengthGreaterThan',
    label: 'length greater than',
    description: 'Check if array length is greater than specified number',
    requiresRightValue: true,
    supportedDataTypes: ['array'],
  },
  lengthLessThan: {
    operation: 'lengthLessThan',
    label: 'length less than',
    description: 'Check if array length is less than specified number',
    requiresRightValue: true,
    supportedDataTypes: ['array'],
  },
  lengthGreaterThanOrEqual: {
    operation: 'lengthGreaterThanOrEqual',
    label: 'length greater than or equal to',
    description: 'Check if array length is greater than or equal to specified number',
    requiresRightValue: true,
    supportedDataTypes: ['array'],
  },
  lengthLessThanOrEqual: {
    operation: 'lengthLessThanOrEqual',
    label: 'length less than or equal to',
    description: 'Check if array length is less than or equal to specified number',
    requiresRightValue: true,
    supportedDataTypes: ['array'],
  },
  // DateTime operations
  isAfter: {
    operation: 'isAfter',
    label: 'is after',
    description: 'Check if date is after specified date',
    requiresRightValue: true,
    supportedDataTypes: ['dateTime'],
  },
  isBefore: {
    operation: 'isBefore',
    label: 'is before',
    description: 'Check if date is before specified date',
    requiresRightValue: true,
    supportedDataTypes: ['dateTime'],
  },
  isAfterOrEqual: {
    operation: 'isAfterOrEqual',
    label: 'is after or equal to',
    description: 'Check if date is after or equal to specified date',
    requiresRightValue: true,
    supportedDataTypes: ['dateTime'],
  },
  isBeforeOrEqual: {
    operation: 'isBeforeOrEqual',
    label: 'is before or equal to',
    description: 'Check if date is before or equal to specified date',
    requiresRightValue: true,
    supportedDataTypes: ['dateTime'],
  },
}

/**
 * Get operations supported by a specific data type
 */
export function getOperationsForDataType(dataType: ConditionDataType): ConditionOperation[] {
  return Object.values(OPERATION_METADATA)
    .filter((metadata) => metadata.supportedDataTypes.includes(dataType))
    .map((metadata) => metadata.operation)
}

/**
 * Example structured conditions for documentation and testing
 */
export const EXAMPLE_CONDITIONS = {
  /**
   * Simple string equality check
   * Equivalent to: {step1.output} === "success"
   */
  simpleStringEquals: {
    version: '2.0' as const,
    rootGroup: {
      id: 'root',
      combinator: 'AND' as const,
      rules: [
        {
          id: 'rule1',
          leftValue: { stepId: 'step1', field: 'output' as const },
          operation: 'equals' as const,
          rightValue: { type: 'string' as const, value: 'success' },
          dataType: 'string' as const,
        },
      ],
    },
  },

  /**
   * Multiple conditions with AND logic
   * Equivalent to: {step1.status} === "completed" && {step2.output} > 100
   */
  multipleConditionsAnd: {
    version: '2.0' as const,
    rootGroup: {
      id: 'root',
      combinator: 'AND' as const,
      rules: [
        {
          id: 'rule1',
          leftValue: { stepId: 'step1', field: 'status' as const },
          operation: 'equals' as const,
          rightValue: { type: 'string' as const, value: 'completed' },
          dataType: 'string' as const,
        },
        {
          id: 'rule2',
          leftValue: { stepId: 'step2', field: 'output' as const },
          operation: 'greaterThan' as const,
          rightValue: { type: 'number' as const, value: 100 },
          dataType: 'number' as const,
        },
      ],
    },
  },

  /**
   * Complex nested conditions
   * Equivalent to: ({step1.output} === "success" || {step1.output} === "warning") && {step2.status} !== "failed"
   */
  nestedConditions: {
    version: '2.0' as const,
    rootGroup: {
      id: 'root',
      combinator: 'AND' as const,
      rules: [
        {
          id: 'rule2',
          leftValue: { stepId: 'step2', field: 'status' as const },
          operation: 'notEquals' as const,
          rightValue: { type: 'string' as const, value: 'failed' },
          dataType: 'string' as const,
        },
      ],
      groups: [
        {
          id: 'group1',
          combinator: 'OR' as const,
          rules: [
            {
              id: 'rule1a',
              leftValue: { stepId: 'step1', field: 'output' as const },
              operation: 'equals' as const,
              rightValue: { type: 'string' as const, value: 'success' },
              dataType: 'string' as const,
            },
            {
              id: 'rule1b',
              leftValue: { stepId: 'step1', field: 'output' as const },
              operation: 'equals' as const,
              rightValue: { type: 'string' as const, value: 'warning' },
              dataType: 'string' as const,
            },
          ],
        },
      ],
    },
  },
}
