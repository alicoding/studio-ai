/**
 * Test script for conditional workflow execution
 * Tests Phase 3.1: API Testing - Verify conditional workflows work end-to-end
 */

import ky from 'ky'

const API_URL = 'http://localhost:3456/api'

async function testConditionalWorkflow() {
  console.log('🧪 Testing Conditional Workflow Execution...\n')

  // Test workflow with conditional branching
  const testWorkflow = {
    workflow: {
      id: 'test-conditional-workflow',
      name: 'Test Conditional Workflow',
      description: 'Tests conditional node branching logic',
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
          task: 'Execute TRUE branch - Say "Condition was true!"',
          deps: ['conditional1'],
        },
        {
          id: 'step3',
          type: 'task',
          role: 'developer',
          task: 'Execute FALSE branch - Say "Condition was false!"',
          deps: ['conditional1'],
        },
      ],
      metadata: {
        createdBy: 'test-script',
        createdAt: new Date().toISOString(),
        version: 1,
        tags: ['test', 'conditional'],
        projectId: 'test-project',
      },
    },
    projectId: 'test-project',
  }

  try {
    // Step 1: Execute the workflow
    console.log('📤 Sending workflow execution request...')
    const executeResponse = await ky
      .post(`${API_URL}/workflows/execute`, {
        json: testWorkflow,
        timeout: 30000,
      })
      .json<{ threadId: string; status: string; message: string }>()

    console.log('✅ Workflow started:', executeResponse)
    const { threadId } = executeResponse

    // Step 2: Wait a bit for execution
    console.log('\n⏳ Waiting 10 seconds for workflow to execute...')
    await new Promise((resolve) => setTimeout(resolve, 10000))

    // Step 3: Check workflow status
    console.log('\n📊 Checking workflow status...')
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

    console.log('\n📊 Full Status Response:', JSON.stringify(statusResponse, null, 2))
    console.log('\nWorkflow Status:', statusResponse.status)
    console.log('Completed Steps:', statusResponse.completedSteps)

    if (statusResponse.results) {
      console.log('\n📝 Step Results:')
      Object.entries(statusResponse.results).forEach(([stepId, result]) => {
        console.log(`  ${stepId}: ${result}`)
      })
    }

    // Step 4: Verify conditional logic
    console.log('\n🔍 Verifying conditional branching...')

    const executedSteps = statusResponse.completedSteps || []
    const hasStep2 = executedSteps.includes('step2')
    const hasStep3 = executedSteps.includes('step3')

    if (hasStep2 && !hasStep3) {
      console.log('✅ SUCCESS: True branch (step2) executed, false branch (step3) skipped')
      console.log('✅ Conditional workflow working correctly!')
    } else if (!hasStep2 && hasStep3) {
      console.log('⚠️  WARNING: False branch executed instead of true branch')
      console.log('   This suggests the condition evaluated to false')
    } else if (hasStep2 && hasStep3) {
      console.log('❌ ERROR: Both branches executed - conditional logic not working')
    } else {
      console.log('❌ ERROR: Neither branch executed - workflow may have failed')
    }

    // Step 5: Get detailed workflow graph (if available)
    try {
      console.log('\n📈 Fetching workflow graph...')
      const graphResponse = await ky.get(`${API_URL}/workflow-graph/${threadId}`).json()
      console.log('Graph nodes:', JSON.stringify(graphResponse.graph?.nodes?.length || 0))
      console.log('Graph edges:', JSON.stringify(graphResponse.graph?.edges?.length || 0))
    } catch (_error) {
      console.log('⚠️  Could not fetch workflow graph (may not be available yet)')
    }
  } catch (error) {
    console.error('❌ Test failed:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message)
    }
  }
}

// Run the test
console.log('🚀 Claude Studio - Conditional Workflow Test\n')
console.log('Prerequisites:')
console.log('- Servers running on ports 3456 and 3457')
console.log('- Mock AI mode enabled (USE_MOCK_AI=true)')
console.log('- Developer agent available\n')

testConditionalWorkflow()
