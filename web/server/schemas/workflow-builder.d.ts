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
    id: string;
    name: string;
    description?: string;
    steps: WorkflowStepDefinition[];
    metadata: WorkflowMetadata;
}
/**
 * Individual step in a workflow
 */
export interface WorkflowStepDefinition {
    id: string;
    type: 'task' | 'parallel' | 'conditional';
    agentId?: string;
    role?: string;
    task: string;
    deps: string[];
    config?: StepConfig;
}
/**
 * Step configuration options
 */
export interface StepConfig {
    timeout?: number;
    retries?: number;
    continueOnError?: boolean;
    parallelLimit?: number;
}
/**
 * Workflow metadata
 */
export interface WorkflowMetadata {
    createdBy: string;
    createdAt: string;
    updatedAt?: string;
    version: number;
    tags: string[];
    projectId: string;
    isTemplate?: boolean;
    templateId?: string;
}
/**
 * Validation result for workflows
 */
export interface WorkflowValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}
/**
 * Validation error details
 */
export interface ValidationError {
    stepId?: string;
    field?: string;
    message: string;
    code: string;
}
/**
 * Validation warning details
 */
export interface ValidationWarning {
    stepId?: string;
    message: string;
    code: string;
}
/**
 * Workflow execution request
 */
export interface WorkflowExecutionRequest {
    workflow: WorkflowDefinition;
    threadId?: string;
    startNewConversation?: boolean;
    projectId?: string;
}
/**
 * Workflow execution response
 */
export interface WorkflowExecutionResponse {
    threadId: string;
    status: 'started' | 'failed';
    message?: string;
    error?: string;
}
/**
 * Type guards for runtime validation
 */
export declare function isWorkflowDefinition(obj: unknown): obj is WorkflowDefinition;
export declare function isWorkflowStepDefinition(obj: unknown): obj is WorkflowStepDefinition;
//# sourceMappingURL=workflow-builder.d.ts.map