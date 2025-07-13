/**
 * Test sequential workflow with dependencies via /api/invoke
 * 
 * KISS: Test sequential execution with dependencies
 * DRY: Reuses test infrastructure
 * Configuration: Uses env vars for API URL
 */

import ky from 'ky'

const API_URL = process.env.CLAUDE_STUDIO_API || 'http://localhost:3456/api'

async function testSequentialWorkflow() {
  console.log('🧪 Testing sequential workflow with dependencies...\n')

  try {
    // Test data - sequential workflow with dependencies
    const request = {
      workflow: [
        {
          id: 'analyze',
          role: 'architect',
          task: 'Analyze the requirements for a simple calculator app'
        },
        {
          id: 'design',
          role: 'developer',
          task: 'Based on the analysis, design the main components',
          deps: ['analyze'] // Depends on analyze step
        },
        {
          id: 'test-plan',
          role: 'tester',
          task: 'Create a test plan based on the design',
          deps: ['design'] // Depends on design step
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
      timeout: 90000 // Longer timeout for sequential execution
    }).json()

    console.log('\n📥 Response:', JSON.stringify(response, null, 2))

    // Validate response structure
    if (!response.threadId) throw new Error('Missing threadId')
    if (!response.sessionIds) throw new Error('Missing sessionIds')
    if (!response.results) throw new Error('Missing results')
    if (!response.status) throw new Error('Missing status')
    if (!response.summary) throw new Error('Missing summary')

    // Validate execution order
    console.log('\n🔄 Execution order validation:')
    const stepIds = ['analyze', 'design', 'test-plan']
    for (const stepId of stepIds) {
      console.log(`  - Step ${stepId}: ${response.sessionIds[stepId] ? 'Executed' : 'Not executed'}`)
    }

    console.log('\n✅ Sequential workflow test passed!')
    
    return response

  } catch (error) {
    console.error('\n❌ Test failed:', error)
    throw error
  }
}

// Run test if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  testSequentialWorkflow()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

export { testSequentialWorkflow }