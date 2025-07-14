/**
 * Debug script for conditional workflow execution
 * Tests to understand why conditional workflows aren't executing
 */

import ky from 'ky'

const API_URL = 'http://localhost:3456/api'

async function debugConditionalWorkflow() {
  console.log('🔍 Debugging Conditional Workflow...\n')

  // Simplified test workflow
  const testWorkflow = {
    workflow: {
      id: 'debug-conditional',
      name: 'Debug Conditional',
      description: 'Minimal test for conditional logic',
      steps: [
        {
          id: 'step1',
          type: 'task',
          role: 'developer',
          task: 'Return the word "success"',
          deps: [],
        },
        {
          id: 'conditional1',
          type: 'conditional',
          task: 'Check if step1 returned success',
          condition: '{step1.output} === "success"',
          trueBranch: 'step2',
          falseBranch: 'step3',
          deps: ['step1'],
        },
        {
          id: 'step2',
          type: 'task',
          role: 'developer',
          task: 'Say "TRUE BRANCH"',
          deps: ['conditional1'],
        },
        {
          id: 'step3',
          type: 'task',
          role: 'developer',
          task: 'Say "FALSE BRANCH"',
          deps: ['conditional1'],
        },
      ],
      metadata: {
        createdBy: 'debug-script',
        createdAt: new Date().toISOString(),
        version: 1,
        tags: ['debug'],
        projectId: 'test-project',
      },
    },
    projectId: 'test-project',
  }

  try {
    console.log('📤 Executing workflow...')
    const executeResponse = await ky
      .post(`${API_URL}/workflows/execute`, {
        json: testWorkflow,
        timeout: 30000,
      })
      .json<{ threadId: string; status: string; message: string }>()

    console.log('Response:', executeResponse)
    const { threadId } = executeResponse

    // Wait longer to see if execution starts
    console.log('\n⏳ Waiting 5 seconds for execution to begin...')
    await new Promise((resolve) => setTimeout(resolve, 5000))

    console.log('\n📊 Checking status...')
    const statusResponse = await ky
      .post(`${API_URL}/invoke-status/status/${threadId}`, {
        json: { steps: testWorkflow.workflow.steps },
      })
      .json<{
        threadId: string
        status: string
        sessionIds: Record<string, string>
        currentStep?: string
        completedSteps: string[]
        results?: Record<string, string>
      }>()

    console.log('Status:', JSON.stringify(statusResponse, null, 2))

    // Check what executors are available
    console.log('\n🔧 Checking executor types...')
    console.log('Process env USE_MOCK_AI:', process.env.USE_MOCK_AI)
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

console.log('Environment: USE_MOCK_AI =', process.env.USE_MOCK_AI)
debugConditionalWorkflow()
