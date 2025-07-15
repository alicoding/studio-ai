# Workflow Persistence Issue Analysis

## Problem Description

When saving a workflow and refreshing the browser:

1. Text content reverts to default placeholder text
2. Node positions reset to default positions

## Root Cause Analysis

### Dual Storage System Conflict

The workflow builder uses TWO separate storage systems:

1. **Browser Storage (Zustand with persist)**
   - Stores workflow state in browser's local storage
   - Persists across page refreshes
   - Configured in `src/stores/workflowBuilder.ts`
   - Only persists: `workflow`, `isDirty`, and now `nodePositions`

2. **Backend Database (SQLite)**
   - Stores workflows when explicitly saved
   - Accessed via `/api/workflows/saved` endpoints
   - Properly saves all data including positions and text

### The Conflict

When you refresh the page:

1. Zustand rehydrates from browser storage FIRST
2. Then the component loads data from the database
3. If there's a timing issue or the browser's persisted state is stale, it can override the fresh database data

## Debugging Added

### 1. Save Process Logging

```typescript
// src/stores/workflowBuilder.ts
console.log('[WorkflowBuilder] Saving workflow with positions:', state.nodePositions)
console.log('[WorkflowBuilder] Workflow steps being saved:', state.workflow.steps)
console.log('[WorkflowBuilder] Save data being sent:', saveData)
```

### 2. Load Process Logging

```typescript
// src/routes/workflows/$workflowId.edit.tsx
console.log('[WorkflowEdit] Loading workflow from database:', workflowId)
console.log('[WorkflowEdit] Loaded workflow from DB:', savedWorkflow)
console.log('[WorkflowEdit] Workflow definition from DB:', savedWorkflow.definition)

// src/stores/workflowBuilder.ts
console.log('[WorkflowBuilder] Loading workflow:', workflow)
console.log('[WorkflowBuilder] Workflow positions:', workflow.positions)
console.log('[WorkflowBuilder] Workflow steps:', workflow.steps)
```

### 3. UI Rendering Logging

```typescript
// src/components/workflow-builder/VisualWorkflowBuilder.tsx
console.log('[VisualWorkflowBuilder] Creating nodes with positions:', nodePositions)
console.log('[VisualWorkflowBuilder] Workflow steps:', workflow.steps)
console.log(`[stepsToNodes] Step ${step.id}: task="${step.task}", position=`, position)
```

## Fixes Applied

### 1. Enhanced Persistence Configuration

```typescript
// Now also persists nodePositions
partialize: (state) => ({
  workflow: state.workflow,
  isDirty: state.isDirty,
  nodePositions: state.nodePositions, // Added
})
```

### 2. Force Complete State Replacement

```typescript
// Force complete state replacement to override any persisted state
loadWorkflow: (workflow) => {
  set(() => ({
    workflow,
    isDirty: false,
    selectedStepId: null,
    selectedStepIds: [],
    nodePositions: workflow.positions || {},
    validationResult: null,
    lastError: null,
    isValidating: false,
    isExecuting: false,
    isSaving: false,
  }))
}
```

## Potential Solutions

### Option 1: Disable Browser Persistence for Workflows

Remove the persist middleware from workflowBuilder store when editing saved workflows. This ensures data always comes from the database.

### Option 2: Clear Browser State Before Loading

Clear the persisted state before loading a workflow from the database:

```typescript
// Clear browser-persisted state
localStorage.removeItem('claude-studio-workflow-builder')
// Then load from database
loadWorkflowDefinition(savedWorkflow.definition)
```

### Option 3: Use Database as Single Source of Truth

Only use browser persistence for temporary/unsaved workflows. Once saved, always load from database.

### Option 4: Sync Browser and Database State

After saving to database, update the browser's persisted state to match exactly what was saved.

## Next Steps

1. **Test with debugging enabled** - Check browser console to see the data flow
2. **Verify save data** - Ensure positions and text are included in save request
3. **Check load sequence** - See if browser state is overriding database data
4. **Consider disabling persistence** - For saved workflows, rely only on database

## Related Files

- `src/stores/workflowBuilder.ts` - Zustand store with persistence
- `src/routes/workflows/$workflowId.edit.tsx` - Workflow edit route
- `web/server/services/storage/SQLiteWorkflowStorage.ts` - Database storage
- `src/components/workflow-builder/VisualWorkflowBuilder.tsx` - UI component
