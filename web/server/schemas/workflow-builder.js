/**
 * Workflow Builder Schema Definitions
 *
 * SOLID: Single responsibility - only schema definitions
 * DRY: Reusable types for workflow building
 * KISS: Simple, clear data structures
 * Library-First: Uses standard TypeScript types
 */
/**
 * Type guards for runtime validation
 */
export function isWorkflowDefinition(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        'name' in obj &&
        'steps' in obj &&
        Array.isArray(obj.steps));
}
export function isWorkflowStepDefinition(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        'type' in obj &&
        'task' in obj &&
        'deps' in obj &&
        Array.isArray(obj.deps));
}
//# sourceMappingURL=workflow-builder.js.map