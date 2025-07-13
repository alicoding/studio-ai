/**
 * Test WorkflowBuilderStore API integration
 * Run with: npx tsx docs/test-workflow-store-api.ts
 */

import { useWorkflowBuilderStore } from '../src/stores/workflowBuilder'

console.log('=== Testing WorkflowBuilderStore API Integration ===\n')

async function runTests() {
  const store = useWorkflowBuilderStore.getState()

  // Test 1: Create and validate a valid workflow
  console.log('Test 1: Validate a valid workflow')
  store.initWorkflow('API Test Workflow', 'Testing API integration', 'mcp-context')
  
  store.addStep({
    task: 'Design the system',
    role: 'architect',
  })
  
  store.addStep({
    task: 'Implement the design',
    role: 'developer',
    deps: ['step1'],
  })

  const isValid = await store.validateWorkflow()
  console.log('Validation result:', isValid)
  console.log('Validation errors:', useWorkflowBuilderStore.getState().validationErrors)
  console.log('✅ Success\n')

  // Test 2: Validate workflow with errors
  console.log('Test 2: Validate workflow with circular dependency')
  store.reset()
  store.initWorkflow('Circular Test', 'Has circular deps', 'mcp-context')
  
  const stepA = store.addStep({
    id: 'stepA',
    task: 'Do something with {stepB.output}',
    role: 'developer',
  })
  
  const stepB = store.addStep({
    id: 'stepB',
    task: 'Review {stepA.output}',
    role: 'reviewer',
  })
  
  // Create circular dependency
  store.setDependencies('stepA', ['stepB'])
  store.setDependencies('stepB', ['stepA'])

  const isValid2 = await store.validateWorkflow()
  console.log('Validation result:', isValid2)
  console.log('Validation errors:', useWorkflowBuilderStore.getState().validationErrors)
  console.log('✅ Success\n')

  // Test 3: Execute a workflow
  console.log('Test 3: Execute a valid workflow')
  store.reset()
  store.initWorkflow('Execution Test', 'Test workflow execution', 'mcp-context')
  
  store.addStep({
    task: 'Create a hello world function',
    role: 'developer',
  })

  try {
    const result = await store.executeWorkflow()
    console.log('Execution result:', result)
    console.log('✅ Success\n')
  } catch (error) {
    console.error('Execution failed:', error)
  }

  console.log('=== All API tests completed! ===')
}

runTests().then(() => process.exit(0)).catch(console.error)