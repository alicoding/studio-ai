/**
 * Test single agent invocation via /api/invoke
 * 
 * KISS: Simple API test using real server
 * DRY: Reuses test infrastructure
 * Configuration: Uses env vars for API URL
 */

import ky from 'ky'

const API_URL = process.env.CLAUDE_STUDIO_API || 'http://localhost:3456/api'

async function testSingleAgentInvoke() {
  console.log('🧪 Testing single agent invocation...\n')

  try {
    // Test data - single agent workflow
    const request = {
      workflow: {
        role: 'developer',
        task: 'What is 2 + 2? Just give me the number.'
      },
      projectId: 'test-project-123',
      startNewConversation: true,
      format: 'json'
    }

    console.log('📤 Request:', JSON.stringify(request, null, 2))

    // Send request
    const response = await ky.post(`${API_URL}/invoke`, {
      json: request,
      timeout: 30000
    }).json()

    console.log('\n📥 Response:', JSON.stringify(response, null, 2))

    // Validate response structure
    if (!response.threadId) throw new Error('Missing threadId')
    if (!response.sessionIds) throw new Error('Missing sessionIds')
    if (!response.results) throw new Error('Missing results')
    if (!response.status) throw new Error('Missing status')

    console.log('\n✅ Single agent invocation test passed!')
    
    return response

  } catch (error) {
    console.error('\n❌ Test failed:', error)
    throw error
  }
}

// Run test if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  testSingleAgentInvoke()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

export { testSingleAgentInvoke }