/**
 * Workflow Builder Schema Definitions
 *
 * SOLID: Single responsibility - only schema definitions
 * DRY: Reusable types for workflow building
 * KISS: Simple, clear data structures
 * Library-First: Uses standard TypeScript types
 */

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
  type: 'task' | 'parallel' | 'conditional' // Step type (for future expansion)
  agentId?: string // Specific agent ID (e.g., "dev_01")
  role?: string // Or role-based (e.g., "developer")
  task: string // Task description with template vars
  deps: string[] // Array of step IDs this depends on
  config?: StepConfig // Optional step configuration
  // Conditional step fields (only for type: 'conditional')
  condition?: string // JavaScript expression (e.g., "{step1.output} === 'success'")
  trueBranch?: string // Step ID to execute if condition is true
  falseBranch?: string // Step ID to execute if condition is false
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
 */
export interface ConditionContext {
  stepOutputs: Record<string, string> // Previous step outputs for template substitution
  stepResults: Record<string, { status: string; response: string }> // Full step results
  metadata: Record<string, unknown> // Additional context data
}

/**
 * Condition evaluation result
 * KISS: Simple boolean result with optional error
 */
export interface ConditionResult {
  result: boolean // True or false evaluation result
  error?: string // Error message if evaluation failed
  evaluatedExpression?: string // The expression after template substitution
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
 */
export function validateConditionalStep(step: WorkflowStepDefinition): ValidationError[] {
  const errors: ValidationError[] = []

  if (step.type !== 'conditional') {
    return errors // Not a conditional step, no validation needed
  }

  // Conditional steps must have a condition
  if (!step.condition || step.condition.trim() === '') {
    errors.push({
      stepId: step.id,
      field: 'condition',
      message: 'Conditional steps must have a condition expression',
      code: 'CONDITIONAL_MISSING_CONDITION',
    })
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
 * Validates condition expression syntax
 * KISS: Basic syntax validation without evaluation
 */
export function validateConditionSyntax(condition: string): ValidationError | null {
  if (!condition || condition.trim() === '') {
    return {
      field: 'condition',
      message: 'Condition cannot be empty',
      code: 'CONDITION_EMPTY',
    }
  }

  // Basic syntax checks - more comprehensive validation in ConditionEvaluator
  const trimmed = condition.trim()

  // Check for template variable patterns
  const templateVarPattern = /\{[^}]+\}/g
  const hasTemplateVars = templateVarPattern.test(trimmed)

  if (!hasTemplateVars && !trimmed.includes('true') && !trimmed.includes('false')) {
    return {
      field: 'condition',
      message: 'Condition must contain template variables (e.g., {step1.output}) or boolean values',
      code: 'CONDITION_INVALID_SYNTAX',
    }
  }

  return null
}
