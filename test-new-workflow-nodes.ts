#!/usr/bin/env npx tsx
/**
 * Test script for new workflow node types
 * Tests Loop, Parallel, and Human Input nodes
 */

import ky from 'ky'

const API_BASE = 'http://localhost:3457/api'

async function testWorkflows() {
  console.log('🧪 Testing new workflow node types...\n')

  // Test 1: Loop Node
  console.log('1️⃣ Testing Loop Node...')
  const loopWorkflow = {
    workflow: {
      name: 'Loop Test Workflow',
      steps: [
        {
          id: 'loop1',
          type: 'loop',
          task: 'Process each item',
          items: ['apple', 'banana', 'orange'],
          loopVar: 'fruit',
          maxIterations: 3,
        },
      ],
    },
    projectId: 'test-project',
  }

  try {
    const loopResult = await ky
      .post(`${API_BASE}/workflows/execute`, {
        json: loopWorkflow,
        timeout: 30000,
      })
      .json()
    console.log('✅ Loop workflow started:', loopResult)
  } catch (error) {
    console.error('❌ Loop workflow failed:', error)
  }

  // Test 2: Parallel Node
  console.log('\n2️⃣ Testing Parallel Node...')
  const parallelWorkflow = {
    workflow: {
      name: 'Parallel Test Workflow',
      steps: [
        {
          id: 'task1',
          type: 'task',
          role: 'developer',
          task: 'Implement feature A',
        },
        {
          id: 'task2',
          type: 'task',
          role: 'developer',
          task: 'Implement feature B',
        },
        {
          id: 'parallel1',
          type: 'parallel',
          task: 'Run tasks in parallel',
          parallelSteps: ['task1', 'task2'],
        },
      ],
    },
    projectId: 'test-project',
  }

  try {
    const parallelResult = await ky
      .post(`${API_BASE}/workflows/execute`, {
        json: parallelWorkflow,
        timeout: 30000,
      })
      .json()
    console.log('✅ Parallel workflow started:', parallelResult)
  } catch (error) {
    console.error('❌ Parallel workflow failed:', error)
  }

  // Test 3: Human Input Node
  console.log('\n3️⃣ Testing Human Input Node...')
  const humanWorkflow = {
    workflow: {
      name: 'Human Input Test Workflow',
      steps: [
        {
          id: 'task1',
          type: 'task',
          role: 'developer',
          task: 'Generate code',
        },
        {
          id: 'human1',
          type: 'human',
          task: 'Review generated code',
          prompt: 'Please review the generated code and approve to continue',
          approvalRequired: true,
          timeoutSeconds: 300,
          deps: ['task1'],
        },
        {
          id: 'task2',
          type: 'task',
          role: 'developer',
          task: 'Deploy approved code',
          deps: ['human1'],
        },
      ],
    },
    projectId: 'test-project',
  }

  try {
    const humanResult = await ky
      .post(`${API_BASE}/workflows/execute`, {
        json: humanWorkflow,
        timeout: 30000,
      })
      .json()
    console.log('✅ Human input workflow started:', humanResult)
  } catch (error) {
    console.error('❌ Human input workflow failed:', error)
  }

  // Test 4: Combined workflow with all node types
  console.log('\n4️⃣ Testing Combined Workflow...')
  const combinedWorkflow = {
    workflow: {
      name: 'Combined Test Workflow',
      steps: [
        {
          id: 'loop1',
          type: 'loop',
          task: 'Process each environment',
          items: ['dev', 'staging', 'prod'],
          loopVar: 'env',
        },
        {
          id: 'task1',
          type: 'task',
          role: 'developer',
          task: 'Prepare deployment for {env}',
          deps: ['loop1'],
        },
        {
          id: 'task2',
          type: 'task',
          role: 'tester',
          task: 'Test deployment for {env}',
          deps: ['loop1'],
        },
        {
          id: 'parallel1',
          type: 'parallel',
          task: 'Run deployment tasks in parallel',
          parallelSteps: ['task1', 'task2'],
          deps: ['loop1'],
        },
        {
          id: 'human1',
          type: 'human',
          task: 'Approve deployment to production',
          prompt: 'All tests passed. Approve production deployment?',
          approvalRequired: true,
          deps: ['parallel1'],
        },
        {
          id: 'deploy',
          type: 'task',
          role: 'developer',
          task: 'Deploy to production',
          deps: ['human1'],
        },
      ],
    },
    projectId: 'test-project',
  }

  try {
    const combinedResult = await ky
      .post(`${API_BASE}/workflows/execute`, {
        json: combinedWorkflow,
        timeout: 30000,
      })
      .json()
    console.log('✅ Combined workflow started:', combinedResult)
  } catch (error) {
    console.error('❌ Combined workflow failed:', error)
  }

  console.log('\n✨ All tests completed!')
}

// Run tests
testWorkflows().catch(console.error)
