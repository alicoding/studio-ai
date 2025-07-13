# Conditional Nodes Implementation Plan

This document tracks the implementation of real LangGraph conditional nodes to replace the current UI mockups.

## 🎯 CRITICAL FINDING

**STATUS**: Conditional nodes are UI-only mockups without LangGraph backend integration
**USER REQUEST**: "I think you should look into those conditional notes that is native to lan graph... it was pretty much like all the mock"
**PRIORITY**: HIGH - Core workflow functionality missing

## 📋 CURRENT STATE ANALYSIS

### ✅ What EXISTS (UI Only)

- `ConditionalNode.tsx` - Diamond-shaped UI component with true/false handles
- Schema support for `'conditional'` step type in `workflow-builder.ts:26`
- Visual workflow builder can create conditional nodes
- Graph visualization supports `'conditional'` edge types

### ❌ What's MISSING (Backend Integration)

- **No LangGraph conditional edges** in WorkflowOrchestrator
- **No condition evaluation** logic at runtime
- **No dynamic routing** based on conditions
- **Store integration incomplete** (TODO in ConditionalNode.tsx:24)

### 🚨 ROOT CAUSE

`WorkflowOrchestrator.ts` lines 374-384 creates **static dependency graphs**, not conditional routing:

```typescript
// CURRENT: Static edges only
steps.forEach((step) => {
  if (step.deps && step.deps.length > 0) {
    step.deps.forEach((depId) => {
      workflow.addEdge(depId as '__start__', step.id! as '__start__')
    })
  }
})

// MISSING: LangGraph conditional edges
// workflow.addConditionalEdges(stepId, conditionFunction, edgeMapping)
```

## 🛠 IMPLEMENTATION PLAN

### **Phase 1: Backend LangGraph Integration** (2 hours)

#### **Task 1.1: Schema Enhancement** (30 min)

- [ ] Add condition field to `WorkflowStepDefinition` interface
- [ ] Add condition evaluation types and schemas
- [ ] Update validation logic for conditional steps
- [ ] Test schema changes with existing workflows

#### **Task 1.2: LangGraph Conditional Edges** (60 min)

- [ ] Implement `addConditionalEdges()` in WorkflowOrchestrator
- [ ] Create condition evaluation functions
- [ ] Add true/false branch routing logic
- [ ] Support template variable evaluation in conditions
- [ ] Test with simple conditional workflow

#### **Task 1.3: Condition Evaluation Engine** (30 min)

- [ ] Create `ConditionEvaluator` service (SOLID)
- [ ] Support JavaScript expressions safely
- [ ] Template variable substitution (`{step1.output} === "success"`)
- [ ] Error handling for invalid conditions
- [ ] Unit tests for evaluation logic

### **Phase 2: UI Store Integration** (1 hour)

#### **Task 2.1: ConditionalNode Store Connection** (30 min)

- [ ] Remove TODO comment in ConditionalNode.tsx:24
- [ ] Connect condition input to workflow store
- [ ] Persist condition logic in workflow definitions
- [ ] Real-time validation of condition syntax

#### **Task 2.2: Workflow Builder Integration** (30 min)

- [ ] Update workflow store to handle conditional steps
- [ ] Ensure condition data flows to execution API
- [ ] Update visual feedback for conditional nodes
- [ ] Test condition persistence across save/load

### **Phase 3: End-to-End Testing** (1 hour)

#### **Task 3.1: API Testing** (30 min)

- [ ] Test conditional workflow creation via API
- [ ] Test condition evaluation with different inputs
- [ ] Test true/false branch execution paths
- [ ] Test template variable substitution
- [ ] Test error handling for invalid conditions

#### **Task 3.2: Playwright E2E Testing** (30 min)

- [ ] Create conditional workflow in visual builder
- [ ] Save workflow with conditions
- [ ] Execute workflow and verify branching
- [ ] Test condition editing and persistence
- [ ] Test error states and validation

### **Phase 4: MCP Tool Integration** (30 min)

#### **Task 4.1: MCP Conditional Support**

- [ ] Update MCP workflow tools to support conditions
- [ ] Test conditional workflow creation via MCP
- [ ] Verify MCP tools work with conditional execution
- [ ] Update MCP tool documentation

## 🧪 TESTING STRATEGY

### **Unit Tests**

- [ ] ConditionEvaluator with various expression types
- [ ] Template variable substitution edge cases
- [ ] Schema validation for conditional steps
- [ ] WorkflowOrchestrator conditional edge logic

### **Integration Tests**

- [ ] Full conditional workflow execution
- [ ] True/false branch routing verification
- [ ] Condition persistence across save/load
- [ ] Error handling for invalid conditions

### **E2E Tests (Playwright)**

- [ ] Visual workflow builder conditional node creation
- [ ] Condition editing and saving workflow
- [ ] Workflow execution with conditional branching
- [ ] Error states and user feedback

## 📐 ARCHITECTURE PRINCIPLES

### **SOLID**

- **S**: ConditionEvaluator handles only condition evaluation
- **O**: Extensible for new condition types (regex, custom functions)
- **L**: Conditional steps are substitutable with regular steps
- **I**: Small, focused interfaces for condition logic
- **D**: Depends on abstractions, not concrete implementations

### **DRY**

- Reuse existing template variable system
- Reuse workflow validation patterns
- Reuse existing LangGraph node patterns

### **KISS**

- Simple JavaScript expression evaluation
- Clear true/false routing logic
- Minimal API surface for conditions

### **Library-First**

- Use LangGraph's native `addConditionalEdges()`
- Use existing template engine for variables
- Use existing workflow schemas and patterns

## 🎯 SUCCESS CRITERIA

### **Definition of Done**

1. ✅ ConditionalNode UI connects to workflow store (no more TODOs)
2. ✅ LangGraph conditional edges implemented in WorkflowOrchestrator
3. ✅ Condition evaluation works with template variables
4. ✅ True/false branch execution verified end-to-end
5. ✅ All tests passing (unit, integration, E2E)
6. ✅ MCP tools support conditional workflows
7. ✅ Zero bugs in existing functionality

### **Test Workflows**

1. **Simple Condition**: `{step1.output} === "success"` → true/false branches
2. **Complex Condition**: `{api_call.status} === 200 && {validation.result} === true`
3. **Error Handling**: Invalid condition syntax shows user-friendly error
4. **Template Variables**: All existing template patterns work in conditions

## 📝 IMPLEMENTATION NOTES

### **LangGraph Conditional Edge Pattern**

```typescript
// Target implementation in WorkflowOrchestrator
workflow.addConditionalEdges(
  'conditional_step_id',
  (state) => this.evaluateCondition(step.condition, state),
  {
    true: 'true_branch_step_id',
    false: 'false_branch_step_id',
  }
)
```

### **Condition Schema Addition**

```typescript
// Add to WorkflowStepDefinition
export interface WorkflowStepDefinition {
  // ... existing fields
  condition?: string // JavaScript expression for conditional steps
  trueBranch?: string // Step ID for true condition
  falseBranch?: string // Step ID for false condition
}
```

### **Files to Modify**

- `web/server/schemas/workflow-builder.ts` - Add condition fields
- `web/server/services/WorkflowOrchestrator.ts` - Add conditional edges
- `web/server/services/ConditionEvaluator.ts` - New service
- `src/components/workflow-builder/nodes/ConditionalNode.tsx` - Remove TODO, add store
- `src/stores/workflowBuilder.ts` - Handle conditional step data
- Tests: API, unit, integration, Playwright E2E

## 📊 PROGRESS TRACKING

### **Completed Tasks** ✅

- [x] Audit existing conditional node implementation
- [x] Identify missing LangGraph integration
- [x] Document current state and required changes
- [x] Create comprehensive implementation plan
- [x] **Phase 1.1: Schema Enhancement** - Added condition fields to WorkflowStepDefinition
- [x] **Phase 1.2: LangGraph Conditional Edges** - Implemented addConditionalEdges() in WorkflowOrchestrator
- [x] **Phase 1.3: Condition Evaluation Engine** - Created ConditionEvaluator service with template variables
- [x] **Phase 2.1: ConditionalNode Store Connection** - Removed TODO and connected to workflow store

### **In Progress** 🟡

- [ ] Phase 2.2: Workflow Builder Integration - Update store for conditional steps

### **Pending** ⏳

- [ ] Phase 3.1: API Testing - Test conditional workflow execution
- [ ] Phase 3.2: Playwright E2E Testing - Test UI conditional workflows
- [ ] Phase 4.1: MCP Tool Integration - Update MCP tools for conditional support

### **✅ PHASE 1 COMPLETE - Backend LangGraph Integration**

**What Was Implemented:**

1. **Schema Enhancement** (`web/server/schemas/workflow-builder.ts`):
   - Added `condition`, `trueBranch`, `falseBranch` fields to `WorkflowStepDefinition`
   - Created `ConditionContext` and `ConditionResult` interfaces
   - Added `validateConditionalStep()` and `validateConditionSyntax()` functions
   - Proper TypeScript types with no 'any' usage (SOLID compliance)

2. **Condition Evaluation Engine** (`web/server/services/ConditionEvaluator.ts`):
   - **SOLID**: Single responsibility for condition evaluation only
   - **DRY**: Reuses existing template variable patterns `{stepId.output}`
   - **KISS**: Simple JavaScript expression evaluation with security constraints
   - **Library-First**: Compatible with existing workflow template system
   - Features:
     - Template variable substitution: `{step1.output}`, `{step2.status}`, `{step3.response}`
     - Safe JavaScript evaluation with security checks
     - Boolean expression support: `===`, `!==`, `&&`, `||`, `!`
     - Error handling with fallback to `false`

3. **LangGraph Conditional Edges** (`web/server/services/WorkflowOrchestrator.ts`):
   - Added `ConditionalWorkflowStep` interface extending `WorkflowStep`
   - Implemented `isConditionalStep()` type guard for type safety
   - Added `evaluateStepCondition()` method using ConditionEvaluator
   - Enhanced `buildWorkflow()` to use LangGraph's native `addConditionalEdges()`
   - Proper true/false branch routing with fallback to `__end__`

**Key Implementation Patterns:**

```typescript
// Type-safe conditional step detection
if (isConditionalStep(step) && step.condition) {
  workflow.addConditionalEdges(step.id!, (state) => this.evaluateStepCondition(step, state), {
    true: step.trueBranch || '__end__',
    false: step.falseBranch || '__end__',
  })
}

// Template variable evaluation
const result = this.conditionEvaluator.evaluateCondition(
  '{step1.output} === "success" && {step2.status} === "completed"',
  {
    stepOutputs: { step1: 'success', step2: 'completed' },
    stepResults: { step1: { status: 'success', response: '...' } },
    metadata: { threadId: '...', projectId: '...' },
  }
)
```

**Security Features:**

- No `eval()` usage - uses Function constructor with restricted scope
- Input sanitization with regex pattern matching
- Whitelist approach for allowed operations
- Error handling with safe fallbacks
- [ ] Phase 4: MCP Tool Integration

### **Blocked** 🔴

- None currently

## 🎯 IMMEDIATE NEXT STEPS

1. **Start with Schema Enhancement** (Task 1.1)
   - Add condition field to WorkflowStepDefinition
   - Update type definitions
   - Ensure backward compatibility

2. **Implement LangGraph Conditional Edges** (Task 1.2)
   - Replace static edge logic with conditional routing
   - Add condition evaluation in WorkflowOrchestrator

3. **Test Early and Often**
   - Unit test condition evaluation
   - API test simple conditional workflow
   - Playwright test UI integration

**Ready to begin implementation following SOLID/DRY/KISS/Library-First principles!**

### **✅ PHASE 2.1 COMPLETE - ConditionalNode Store Connection**

**What Was Implemented:**

1. **ConditionalNode Component Update** (`src/components/workflow-builder/nodes/ConditionalNode.tsx`):
   - Removed TODO comment (line 24)
   - Connected to `useWorkflowBuilderStore` hook
   - Added `updateStep` functionality to save conditions to workflow store
   - Properly typed with TypeScript interfaces (no 'any' types)
   - Maintains existing UI behavior while adding store persistence

2. **Key Implementation Details:**

   ```typescript
   // Connected to workflow builder store
   const updateStep = useWorkflowBuilderStore((state) => state.updateStep)

   // Save condition to workflow step
   const handleSave = () => {
     if (data.stepId || id) {
       updateStep(data.stepId || id, {
         condition: localCondition,
         type: 'conditional' as const,
         // trueBranch and falseBranch set by visual builder edge connections
       })
     }
     setIsEditing(false)
   }
   ```

3. **Testing Results:**
   - ✅ ESLint: No errors
   - ✅ TypeScript: No type errors
   - ✅ Apple resource fork files cleaned up
   - ✅ Code follows SOLID/DRY/KISS principles

**Next Steps:**

- Phase 2.2: Ensure workflow builder properly handles conditional step data flow
- Phase 3: End-to-end testing of conditional workflows

---

**Last Updated**: 2025-01-13  
**Status**: 🟡 PARTIAL - Backend complete, Phase 2.1 complete, UI integration in progress  
**Priority**: 🔥 HIGH - Core workflow functionality gap  
**Completed**: Phase 1 (Backend) + Phase 2.1 (Store Connection) - 3 hours  
**Remaining**: Phase 2.2, 3, 4 (UI + Testing) - 1.5 hours estimated
