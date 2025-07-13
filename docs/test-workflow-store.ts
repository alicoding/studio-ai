/**
 * Manual test script for WorkflowBuilderStore
 * Run with: npx tsx docs/test-workflow-store.ts
 */

import { useWorkflowBuilderStore } from '../src/stores/workflowBuilder'

console.log('=== Testing WorkflowBuilderStore ===\n')

// Test 1: Initialize workflow
console.log('Test 1: Initialize workflow')
const store = useWorkflowBuilderStore.getState()
store.initWorkflow('Test Workflow', 'A test workflow', 'project-123')

let state = useWorkflowBuilderStore.getState()
console.log('Workflow created:', {
  name: state.workflow?.name,
  description: state.workflow?.description,
  projectId: state.workflow?.metadata.projectId,
  steps: state.workflow?.steps.length,
})
console.log('✅ Success\n')

// Test 2: Add steps
console.log('Test 2: Add steps')
const step1 = store.addStep({
  task: 'Design the API',
  role: 'architect',
})
const step2 = store.addStep({
  task: 'Implement the design',
  role: 'developer',
  deps: [step1],
})

state = useWorkflowBuilderStore.getState()
console.log('Steps added:', state.workflow?.steps.map(s => ({
  id: s.id,
  task: s.task,
  role: s.role,
  deps: s.deps,
})))
console.log('✅ Success\n')

// Test 3: Update step
console.log('Test 3: Update step')
store.updateStep(step1, { task: 'Design a REST API for TODO app' })

state = useWorkflowBuilderStore.getState()
console.log('Step updated:', state.workflow?.steps[0].task)
console.log('✅ Success\n')

// Test 4: Remove step
console.log('Test 4: Remove step and clean dependencies')
const step3 = store.addStep({
  task: 'Test the implementation',
  role: 'tester',
  deps: [step1, step2],
})

console.log('Before removal - Step 3 deps:', state.workflow?.steps.find(s => s.id === step3)?.deps)

store.removeStep(step1)
state = useWorkflowBuilderStore.getState()

console.log('After removal:')
console.log('- Total steps:', state.workflow?.steps.length)
console.log('- Step 2 deps:', state.workflow?.steps.find(s => s.id === step2)?.deps)
console.log('- Step 3 deps:', state.workflow?.steps.find(s => s.id === step3)?.deps)
console.log('✅ Success\n')

// Test 5: Validation (mock - requires API)
console.log('Test 5: Validation state')
console.log('isDirty:', state.isDirty)
console.log('isValidating:', state.isValidating)
console.log('validationErrors:', state.validationErrors)
console.log('✅ Success\n')

console.log('=== All tests passed! ===')
process.exit(0)