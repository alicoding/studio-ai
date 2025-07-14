/**
 * Workflow Builder Schema Definitions
 *
 * SOLID: Single responsibility - only schema definitions
 * DRY: Reusable types for workflow building
 * KISS: Simple, clear data structures
 * Library-First: Uses standard TypeScript types
 */

import type {
  WorkflowCondition,
  StructuredCondition,
  LegacyCondition,
  ConditionValidationResult,
  ConditionRule,
  ConditionGroup,
} from './condition-types'

import { isStructuredCondition, isLegacyCondition } from './condition-types'

/**
 * Main workflow definition that users create in the builder
 */
export interface WorkflowDefinition {
  id: string // Unique workflow ID (generated)
  name: string // User-friendly workflow name
  description?: string // Optional description
  steps: WorkflowStepDefinition[] // Array of workflow steps
  metadata: WorkflowMetadata // Workflow metadata
}

/**
 * Individual step in a workflow
 */
export interface WorkflowStepDefinition {
  id: string // Step ID (e.g., "step1", "design_api")
  type: 'task' | 'parallel' | 'conditional' | 'loop' | 'human' // Step type
  agentId?: string // Specific agent ID (e.g., "dev_01")
  role?: string // Or role-based (e.g., "developer")
  task: string // Task description with template vars
  deps: string[] // Array of step IDs this depends on
  config?: StepConfig // Optional step configuration
  // Conditional step fields (only for type: 'conditional')
  condition?: WorkflowCondition // Structured condition or legacy JavaScript expression
  trueBranch?: string // Step ID to execute if condition is true
  falseBranch?: string // Step ID to execute if condition is false
  // Loop-specific fields
  items?: string[] // Array of items to loop over
  loopVar?: string // Variable name for current item (default: 'item')
  maxIterations?: number // Maximum number of iterations
  // Human input fields
  prompt?: string // Prompt for human input
  approvalRequired?: boolean // Whether approval is required
  timeoutSeconds?: number // Timeout for human input
  // Parallel fields
  parallelSteps?: string[] // IDs of steps to run in parallel
}

/**
 * Step configuration options
 */
export interface StepConfig {
  timeout?: number // Timeout in milliseconds
  retries?: number // Number of retry attempts
  continueOnError?: boolean // Continue workflow even if step fails
  parallelLimit?: number // For parallel steps, max concurrent
}

/**
 * Condition evaluation context for conditional steps
 * Library-First: Uses existing template variable patterns
 * Supports both structured and legacy conditions
 */
export interface ConditionContext {
  stepOutputs: Record<string, string> // Previous step outputs for template substitution
  stepResults: Record<string, { status: string; response: string }> // Full step results
  metadata: Record<string, unknown> // Additional context data
}

/**
 * Condition evaluation result
 * KISS: Simple boolean result with optional error
 * Supports both structured and legacy condition evaluation
 */
export interface ConditionResult {
  result: boolean // True or false evaluation result
  error?: string // Error message if evaluation failed
  evaluatedExpression?: string // The expression after template substitution (legacy)
  conditionType?: 'structured' | 'legacy' // Type of condition that was evaluated
}

/**
 * Workflow metadata
 */
export interface WorkflowMetadata {
  createdBy: string // User who created the workflow
  createdAt: string // ISO timestamp
  updatedAt?: string // ISO timestamp of last update
  version: number // Version number (for future use)
  tags: string[] // Tags for categorization
  projectId: string // Associated project ID
  isTemplate?: boolean // Is this a template?
  templateId?: string // If created from template
}

/**
 * Validation result for workflows
 */
export interface WorkflowValidationResult {
  valid: boolean // Overall validation status
  errors: ValidationError[] // Array of validation errors
  warnings: ValidationWarning[] // Non-blocking warnings
}

/**
 * Validation error details
 */
export interface ValidationError {
  stepId?: string // Step ID if step-specific
  field?: string // Field name if field-specific
  ruleId?: string // Rule ID if rule-specific (for structured conditions)
  groupId?: string // Group ID if group-specific (for structured conditions)
  message: string // Error message
  code: string // Error code for i18n
}

/**
 * Validation warning details
 */
export interface ValidationWarning {
  stepId?: string // Step ID if step-specific
  message: string // Warning message
  code: string // Warning code
}

/**
 * Workflow execution request
 */
export interface WorkflowExecutionRequest {
  workflow: WorkflowDefinition // The workflow to execute
  threadId?: string // Optional thread ID for resuming
  startNewConversation?: boolean // Force new conversation
  projectId?: string // Override project ID
  savedWorkflowId?: string // Link to saved workflow definition
}

/**
 * Workflow execution response
 */
export interface WorkflowExecutionResponse {
  threadId: string // Thread ID for monitoring
  status: 'started' | 'failed' // Initial status
  message?: string // Optional message
  error?: string // Error if failed to start
}

/**
 * Type guards for runtime validation
 */
export function isWorkflowDefinition(obj: unknown): obj is WorkflowDefinition {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'steps' in obj &&
    Array.isArray((obj as WorkflowDefinition).steps)
  )
}

export function isWorkflowStepDefinition(obj: unknown): obj is WorkflowStepDefinition {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'type' in obj &&
    'task' in obj &&
    'deps' in obj &&
    Array.isArray((obj as WorkflowStepDefinition).deps)
  )
}

/**
 * Validates conditional step configuration
 * SOLID: Single responsibility for conditional validation
 * Supports both structured and legacy conditions
 */
export function validateConditionalStep(step: WorkflowStepDefinition): ValidationError[] {
  const errors: ValidationError[] = []

  if (step.type !== 'conditional') {
    return errors // Not a conditional step, no validation needed
  }

  // Conditional steps must have a condition
  if (!step.condition) {
    errors.push({
      stepId: step.id,
      field: 'condition',
      message: 'Conditional steps must have a condition',
      code: 'CONDITIONAL_MISSING_CONDITION',
    })
  } else {
    // Validate the condition based on its type
    const conditionValidation = validateWorkflowCondition(step.condition)
    if (!conditionValidation.valid) {
      errors.push(
        ...conditionValidation.errors.map((error) => ({
          stepId: step.id,
          field: error.field || 'condition',
          message: error.message,
          code: error.code,
        }))
      )
    }
  }

  // Conditional steps must have at least one branch
  if (!step.trueBranch && !step.falseBranch) {
    errors.push({
      stepId: step.id,
      field: 'branches',
      message: 'Conditional steps must have at least one branch (trueBranch or falseBranch)',
      code: 'CONDITIONAL_MISSING_BRANCHES',
    })
  }

  return errors
}

/**
 * Validates workflow condition (structured or legacy)
 * SOLID: Single responsibility for condition validation
 * DRY: Handles both condition types in one place
 */
export function validateWorkflowCondition(condition: WorkflowCondition): ConditionValidationResult {
  if (isStructuredCondition(condition)) {
    return validateStructuredCondition(condition)
  } else if (isLegacyCondition(condition)) {
    return validateLegacyCondition(condition)
  } else {
    return {
      valid: false,
      errors: [
        {
          message: 'Invalid condition format',
          code: 'CONDITION_INVALID_FORMAT',
        },
      ],
      warnings: [],
    }
  }
}

/**
 * Validates structured condition
 * KISS: Simple validation for structured conditions
 */
export function validateStructuredCondition(
  condition: StructuredCondition
): ConditionValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  // Validate root group exists
  if (!condition.rootGroup) {
    errors.push({
      message: 'Structured condition must have a root group',
      code: 'STRUCTURED_CONDITION_MISSING_ROOT',
    })
    return { valid: false, errors, warnings }
  }

  // Validate that root group has rules or nested groups
  if (
    (!condition.rootGroup.rules || condition.rootGroup.rules.length === 0) &&
    (!condition.rootGroup.groups || condition.rootGroup.groups.length === 0)
  ) {
    errors.push({
      groupId: condition.rootGroup.id,
      message: 'Condition group must have at least one rule or nested group',
      code: 'CONDITION_GROUP_EMPTY',
    })
  }

  // Validate all rules in the root group
  if (condition.rootGroup.rules) {
    for (const rule of condition.rootGroup.rules) {
      const ruleErrors = validateConditionRule(rule)
      errors.push(...ruleErrors)
    }
  }

  // Recursively validate nested groups
  if (condition.rootGroup.groups) {
    for (const group of condition.rootGroup.groups) {
      const groupValidation = validateConditionGroup(group)
      errors.push(...groupValidation.errors)
      warnings.push(...groupValidation.warnings)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validates legacy condition (JavaScript expression)
 * KISS: Basic syntax validation for legacy conditions
 */
export function validateLegacyCondition(condition: LegacyCondition): ConditionValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  if (!condition.expression || condition.expression.trim() === '') {
    errors.push({
      field: 'expression',
      message: 'Legacy condition expression cannot be empty',
      code: 'LEGACY_CONDITION_EMPTY',
    })
    return { valid: false, errors, warnings }
  }

  const trimmed = condition.expression.trim()

  // Check for template variable patterns
  const templateVarPattern = /\{[^}]+\}/g
  const hasTemplateVars = templateVarPattern.test(trimmed)

  // Check for boolean literals
  const hasBooleanLiterals = /\b(true|false)\b/.test(trimmed)

  if (!hasTemplateVars && !hasBooleanLiterals) {
    errors.push({
      field: 'expression',
      message:
        'Legacy condition must contain template variables (e.g., {step1.output}) or boolean values',
      code: 'LEGACY_CONDITION_INVALID_SYNTAX',
    })
  }

  // Add warning about legacy format
  warnings.push({
    message:
      'Legacy JavaScript expressions are deprecated. Consider upgrading to structured conditions.',
    code: 'LEGACY_CONDITION_DEPRECATED',
  })

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Helper function to validate individual condition rules
 */
function validateConditionRule(rule: ConditionRule): ValidationError[] {
  const errors: ValidationError[] = []

  if (!rule.id) {
    errors.push({
      ruleId: rule.id,
      field: 'id',
      message: 'Condition rule must have an ID',
      code: 'CONDITION_RULE_MISSING_ID',
    })
  }

  if (!rule.leftValue) {
    errors.push({
      ruleId: rule.id,
      field: 'leftValue',
      message: 'Condition rule must have a left value',
      code: 'CONDITION_RULE_MISSING_LEFT_VALUE',
    })
  }

  if (!rule.operation) {
    errors.push({
      ruleId: rule.id,
      field: 'operation',
      message: 'Condition rule must have an operation',
      code: 'CONDITION_RULE_MISSING_OPERATION',
    })
  }

  if (!rule.dataType) {
    errors.push({
      ruleId: rule.id,
      field: 'dataType',
      message: 'Condition rule must have a data type',
      code: 'CONDITION_RULE_MISSING_DATA_TYPE',
    })
  }

  return errors
}

/**
 * Helper function to validate condition groups recursively
 */
function validateConditionGroup(group: ConditionGroup): ConditionValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  if (!group.id) {
    errors.push({
      groupId: group.id,
      field: 'id',
      message: 'Condition group must have an ID',
      code: 'CONDITION_GROUP_MISSING_ID',
    })
  }

  if (!group.combinator || !['AND', 'OR'].includes(group.combinator)) {
    errors.push({
      groupId: group.id,
      field: 'combinator',
      message: 'Condition group must have a valid combinator (AND or OR)',
      code: 'CONDITION_GROUP_INVALID_COMBINATOR',
    })
  }

  // Validate rules
  if (group.rules) {
    for (const rule of group.rules) {
      const ruleErrors = validateConditionRule(rule)
      errors.push(...ruleErrors)
    }
  }

  // Recursively validate nested groups
  if (group.groups) {
    for (const nestedGroup of group.groups) {
      const nestedValidation = validateConditionGroup(nestedGroup)
      errors.push(...nestedValidation.errors)
      warnings.push(...nestedValidation.warnings)
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}
