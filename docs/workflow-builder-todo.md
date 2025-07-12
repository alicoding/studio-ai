# Workflow Builder Implementation Plan

This document outlines the phased implementation of the Workflow Builder feature for Claude Studio. Each phase builds upon the previous one, with clear deliverables and testing checkpoints.

## Overview

The Workflow Builder will allow users to create, configure, and execute multi-agent workflows directly from the Claude Studio UI. We'll build this incrementally, starting with a solid foundation.

## Phase 1: Data Model & API Foundation

### Goal
Establish the core data structures and API endpoints that will power the workflow builder.

### Tasks

#### 1.1 Define Core Data Models
**File**: `web/server/schemas/workflow-builder.ts`
```typescript
interface WorkflowDefinition {
  id: string
  name: string
  description?: string
  steps: WorkflowStepDefinition[]
  metadata: {
    createdBy: string
    createdAt: string
    version: number
    tags: string[]
    projectId: string
  }
}

interface WorkflowStepDefinition {
  id: string
  type: 'task' | 'parallel' | 'conditional'
  agentId?: string    // specific agent like "dev_01"
  role?: string       // or role-based like "developer"
  task: string        // task description with template vars
  deps: string[]      // step dependencies
  config?: {
    timeout?: number
    retries?: number
    continueOnError?: boolean
  }
}
```

#### 1.2 Create Validation Endpoint
**File**: `web/server/api/workflows/validate.ts`
- Endpoint: `POST /api/workflows/validate`
- Validates workflow structure
- Checks for circular dependencies
- Ensures agents/roles exist
- Returns validation errors or success

#### 1.3 Create Execution Endpoint
**File**: `web/server/api/workflows/execute.ts`
- Endpoint: `POST /api/workflows/execute`
- Converts WorkflowDefinition to invoke format
- Calls existing WorkflowOrchestrator
- Returns thread ID and initial status

#### 1.4 API Testing
- Create test scripts with curl commands
- Test various workflow configurations
- Verify error handling
- Document API responses

**Testing checkpoint**: Ali tests API endpoints with Postman/curl while I verify backend logic

## Phase 2: State Management

### Goal
Create a robust state management layer for the workflow builder UI.

### Tasks

#### 2.1 Create Workflow Builder Store
**File**: `src/stores/workflowBuilder.ts`
```typescript
interface WorkflowBuilderStore {
  // Current workflow being built
  workflow: WorkflowDefinition | null
  isDirty: boolean
  
  // UI state
  selectedStepId: string | null
  validationErrors: Record<string, string>
  isValidating: boolean
  isExecuting: boolean
  
  // Actions
  initWorkflow: (name: string, description?: string) => void
  addStep: (step: Partial<WorkflowStepDefinition>) => void
  updateStep: (id: string, updates: Partial<WorkflowStepDefinition>) => void
  removeStep: (id: string) => void
  reorderSteps: (fromIndex: number, toIndex: number) => void
  setDependencies: (stepId: string, deps: string[]) => void
  
  // Validation
  validateWorkflow: () => Promise<boolean>
  clearValidation: () => void
  
  // Execution
  executeWorkflow: () => Promise<{ threadId: string }>
  reset: () => void
}
```

#### 2.2 Implement Step CRUD Operations
- Auto-generate step IDs
- Maintain step order
- Update dependencies when steps are removed
- Track dirty state for unsaved changes

#### 2.3 Add Validation Logic
- Client-side validation for immediate feedback
- Server-side validation before execution
- Clear error messages per step
- Overall workflow validation status

**Testing checkpoint**: Test store actions in browser console while UI is being built

## Phase 3: Basic UI Components

### Goal
Build the core UI components for creating workflows.

### Tasks

#### 3.1 WorkflowBuilder Container
**File**: `src/components/workflow-builder/WorkflowBuilder.tsx`
- Modal or full-page component
- Header with workflow name/description
- Footer with Cancel/Preview/Execute buttons
- Integrates all child components

#### 3.2 StepEditor Component
**File**: `src/components/workflow-builder/StepEditor.tsx`
- Agent/role selector (dropdown)
- Task description (textarea with template var hints)
- Config options (timeout, retries)
- Delete button
- Validation error display

#### 3.3 StepList Component
**File**: `src/components/workflow-builder/StepList.tsx`
- List all steps with drag-to-reorder
- Add step button
- Step numbering/naming
- Visual indicators for validation errors
- Expand/collapse step details

#### 3.4 WorkflowPreview Component
**File**: `src/components/workflow-builder/WorkflowPreview.tsx`
- Read-only view of workflow
- Shows as JSON or visual format
- Highlights any validation issues
- Execute button with confirmation

#### 3.5 Entry Point - New Workflow Button
**File**: Update `src/components/layout/Header.tsx`
- Add "New Workflow" button
- Opens WorkflowBuilder modal
- Keyboard shortcut (Cmd+Shift+W)

**Testing checkpoint**: Ali tests UI interactions, I verify state updates and API calls

## Phase 4: Integration & Polish

### Goal
Connect all components and ensure smooth user experience.

### Tasks

#### 4.1 Connect UI to Store
- Wire up all components to store actions
- Ensure state consistency
- Add optimistic updates

#### 4.2 Implement Execution Flow
- Execute button shows confirmation
- Display loading state during execution
- Redirect to workflow details on success
- Show errors clearly

#### 4.3 Loading States & Error Handling
- Skeleton loaders for async operations
- Toast notifications for success/errors
- Form validation on blur
- Prevent accidental navigation with unsaved changes

**Testing checkpoint**: Full end-to-end workflow creation and execution

## Phase 5: Dependencies & Visualization

### Goal
Add support for complex workflows with dependencies.

### Tasks

#### 5.1 Dependency Selection UI
- Multi-select dropdown in StepEditor
- Only show previous steps as options
- Visual indicators for dependencies

#### 5.2 Dependency Graph Component
**File**: `src/components/workflow-builder/DependencyGraph.tsx`
- Visual node/edge representation
- Interactive - click to select steps
- Highlight circular dependencies
- Mini-map for large workflows

#### 5.3 Validation Enhancements
- Detect circular dependencies
- Warn about missing dependencies
- Validate template variables reference valid steps

**Testing checkpoint**: Test complex workflows with multiple dependencies

## Phase 6: Templates

### Goal
Allow saving and reusing workflow templates.

### Tasks

#### 6.1 Template API Endpoints
**Files**: `web/server/api/workflows/templates/*.ts`
- GET /api/workflows/templates - list all
- GET /api/workflows/templates/:id - get one
- POST /api/workflows/templates - create
- PUT /api/workflows/templates/:id - update
- DELETE /api/workflows/templates/:id - delete

#### 6.2 Save as Template
- Button in WorkflowBuilder
- Template metadata form (name, description, tags)
- Parameter extraction (variables to fill)

#### 6.3 Template Library UI
**File**: `src/components/workflow-builder/TemplateLibrary.tsx`
- Grid/list view of templates
- Search and filter
- Preview before using
- "Use Template" fills workflow builder

**Testing checkpoint**: Create, save, and reuse various templates

## Success Criteria

Each phase is considered complete when:
1. All code is implemented and passes TypeScript/linting
2. API endpoints are tested and documented
3. UI components are functional and accessible
4. Ali has tested the UI flow
5. I have verified the backend logic
6. No critical bugs remain

## Next Steps After MVP

- Parallel execution support
- Conditional branching
- Sub-workflows
- Workflow versioning
- Import/export workflows
- Scheduled execution
- Webhook triggers
- Performance optimizations