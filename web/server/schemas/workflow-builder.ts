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
