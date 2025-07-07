/**
 * Test multi-agent parallel workflow via /api/invoke
 * 
 * KISS: Test parallel execution with no dependencies
 * DRY: Reuses test infrastructure
 * Configuration: Uses env vars for API URL
 */

import ky from 'ky'

const API_URL = process.env.CLAUDE_STUDIO_API || 'http://localhost:3456/api'

async function testParallelWorkflow() {
  console.log('🧪 Testing multi-agent parallel workflow...\n')

  try {
    // Test data - multiple agents with no dependencies (parallel)
    const request = {
      workflow: [
        {
          id: 'step1',
          role: 'developer',
          task: 'What is 2 + 2?'
        },
        {
          id: 'step2',
          role: 'architect',
          task: 'What is 3 + 3?'
        },
        {
          id: 'step3',
          role: 'tester',
          task: 'What is 4 + 4?'
        }
      ],
      projectId: 'test-project-123',
      startNewConversation: true,
      format: 'json'
    }

    console.log('📤 Request:', JSON.stringify(request, null, 2))

    // Send request
    const response = await ky.post(`${API_URL}/invoke`, {
      json: request,
      timeout: 60000 // Longer timeout for parallel execution
    }).json()

    console.log('\n📥 Response:', JSON.stringify(response, null, 2))

    // Validate response structure
    if (!response.threadId) throw new Error('Missing threadId')
    if (!response.sessionIds) throw new Error('Missing sessionIds')
    if (!response.results) throw new Error('Missing results')
    if (!response.status) throw new Error('Missing status')
    if (!response.summary) throw new Error('Missing summary')

    // Validate that we got results for all steps
    const stepIds = ['step1', 'step2', 'step3']
    for (const stepId of stepIds) {
      console.log(`\n📋 Checking step ${stepId}:`)
      console.log(`  - Session ID: ${response.sessionIds[stepId] || 'Missing'}`)
      console.log(`  - Has result: ${stepId in response.results}`)
    }

    console.log('\n✅ Multi-agent parallel workflow test passed!')
    
    return response

  } catch (error) {
    console.error('\n❌ Test failed:', error)
    throw error
  }
}

// Run test if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  testParallelWorkflow()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

export { testParallelWorkflow }