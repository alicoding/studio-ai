# Conditional Nodes Test Plan

This document outlines comprehensive testing procedures for the conditional nodes implementation.

## 🎯 Test Objectives

Verify that conditional nodes work end-to-end:

1. UI correctly saves condition data
2. Conditions flow to execution API
3. LangGraph evaluates conditions at runtime
4. Workflow branches execute based on condition results
5. Template variables work in conditions

## 🧪 Test Scenarios

### Scenario 1: Basic Conditional Flow

**Setup:**

```
Step1 (Task) → ConditionalNode → Step2 (True branch)
                              ↘ Step3 (False branch)
```

**Test Steps:**

1. Create workflow with 3 steps + 1 conditional node
2. Set condition: `{step1.output} === "success"`
3. Connect edges:
   - Step1 → ConditionalNode (input)
   - ConditionalNode (true) → Step2
   - ConditionalNode (false) → Step3
4. Execute workflow
5. Verify only Step2 executes when Step1 outputs "success"

**Expected Results:**

- Condition saved in workflow definition
- WorkflowOrchestrator uses addConditionalEdges()
- Only true branch executes

### Scenario 2: Complex Condition with Multiple Variables

**Setup:**

```
Step1 → Step2 → ConditionalNode → Step3 (True)
                               ↘ Step4 (False)
```

**Test Steps:**

1. Set condition: `{step1.status} === "success" && {step2.output} === "valid"`
2. Execute with different combinations:
   - Step1 success + Step2 valid → Step3 executes
   - Step1 success + Step2 invalid → Step4 executes
   - Step1 failed → Step4 executes

**Expected Results:**

- ConditionEvaluator correctly substitutes both variables
- Boolean logic works as expected

### Scenario 3: Error Handling

**Test Steps:**

1. Test invalid condition syntax: `{step1.output ===` (missing closing brace)
2. Test undefined variable: `{nonexistent.output} === "test"`
3. Test dangerous code: `process.exit(1)`

**Expected Results:**

- Invalid syntax shows validation error
- Undefined variables evaluate to false
- Dangerous code is blocked by ConditionEvaluator

## 🔍 Component Testing

### 1. ConditionalNode UI Component

```bash
# Manual Testing Steps:
1. Open workflow builder
2. Add conditional node
3. Click to edit condition
4. Enter: {step1.output} === "success"
5. Save condition
6. Verify condition persists after page reload
```

**Verification:**

- [ ] Condition text saves to store
- [ ] UI shows saved condition
- [ ] Edit/cancel works correctly

### 2. Workflow Store Integration

```javascript
// Test in browser console:
const store = window.__ZUSTAND_STORES__.get('workflow-builder')
const state = store.getState()

// After saving condition, verify:
const conditionalStep = state.workflow.steps.find((s) => s.type === 'conditional')
console.log(conditionalStep.condition) // Should show saved condition
```

### 3. API Data Flow

```bash
# Test workflow execution API
curl -X POST http://localhost:3456/api/workflows/execute \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": {
      "id": "test-conditional",
      "name": "Test Conditional",
      "steps": [
        {
          "id": "step1",
          "type": "task",
          "task": "Return success",
          "deps": []
        },
        {
          "id": "conditional1",
          "type": "conditional",
          "condition": "{step1.output} === \"success\"",
          "trueBranch": "step2",
          "falseBranch": "step3",
          "deps": ["step1"]
        },
        {
          "id": "step2",
          "type": "task",
          "task": "True branch executed",
          "deps": ["conditional1"]
        },
        {
          "id": "step3",
          "type": "task",
          "task": "False branch executed",
          "deps": ["conditional1"]
        }
      ]
    }
  }'
```

### 4. LangGraph Integration

Check server logs for:

```
[WorkflowOrchestrator] Adding conditional edge for step: conditional1
[ConditionEvaluator] Evaluating condition: {step1.output} === "success"
[ConditionEvaluator] Substituted: "success" === "success"
[ConditionEvaluator] Result: true
```

## 📊 Test Matrix

| Test Case                        | Component       | Status         | Notes              |
| -------------------------------- | --------------- | -------------- | ------------------ |
| Save condition in UI             | ConditionalNode | ✅ Implemented | Phase 2.1 complete |
| Condition in workflow definition | Store           | ⏳ Pending     | Phase 2.2          |
| trueBranch/falseBranch set       | Visual Builder  | ⏳ Pending     | Phase 2.2          |
| Condition flows to API           | API             | ⏳ Pending     | Phase 2.2          |
| LangGraph evaluates              | Backend         | ✅ Implemented | Phase 1 complete   |
| Correct branch executes          | E2E             | ⏳ Pending     | Phase 3            |

## 🐛 Known Issues to Test

1. **Edge Connection**: When connecting edges in visual builder, ensure:
   - True handle → sets trueBranch
   - False handle → sets falseBranch
2. **Validation**: Conditional steps must have:
   - A condition expression
   - At least one branch (true or false)
3. **Template Variables**: Ensure all formats work:
   - `{stepId.output}`
   - `{stepId.status}`
   - `{stepId.response}`

## 🚀 Automated Test Suite (Future)

```typescript
// test/conditional-workflows.test.ts
describe('Conditional Workflows', () => {
  it('evaluates simple conditions', async () => {
    const workflow = createConditionalWorkflow()
    const result = await executeWorkflow(workflow)
    expect(result.executedSteps).toContain('step2') // true branch
    expect(result.executedSteps).not.toContain('step3') // false branch
  })

  it('handles complex boolean expressions', async () => {
    // Test && || ! operators
  })

  it('substitutes template variables', async () => {
    // Test {stepId.output} patterns
  })

  it('blocks dangerous code', async () => {
    // Test security constraints
  })
})
```

## ✅ Definition of Done

- [ ] All manual test scenarios pass
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] Server logs show correct conditional evaluation
- [ ] UI persists conditions across reloads
- [ ] Workflows branch correctly based on conditions
- [ ] Error cases handled gracefully
- [ ] Documentation updated with findings

## 📝 Test Execution Log

### Session 1 (2025-01-13) - Phase 2.1

- ✅ ConditionalNode saves to store
- ✅ TypeScript/ESLint passing
- ⏳ Full E2E test pending (requires Phase 2.2)

### Next Session - Phase 2.2+

- [ ] Test edge connection logic
- [ ] Test API data flow
- [ ] Test full workflow execution
- [ ] Document any bugs found
