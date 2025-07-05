/**
 * Test script for ResponseTracker
 * Tests timeout handling, resolution, and cleanup
 */

import { ResponseTracker } from '../services/ResponseTracker'

async function testResponseTracker() {
  console.log('🧪 Testing ResponseTracker...\n')
  
  const tracker = new ResponseTracker({
    defaultTimeout: 2000, // 2 seconds for testing
    cleanupInterval: 5000,
    maxPendingResponses: 10
  })

  // Test 1: Basic tracking and resolution
  console.log('Test 1: Basic tracking and resolution')
  try {
    const { correlationId, promise } = await tracker.trackResponse(
      'test-agent-1',
      'test-project-1'
    )
    console.log(`✓ Tracked response with ID: ${correlationId}`)
    
    // Simulate agent response after 500ms
    setTimeout(() => {
      const resolved = tracker.resolveResponse(correlationId, { 
        message: 'Hello from agent!',
        timestamp: new Date()
      })
      console.log(`✓ Response resolved: ${resolved}`)
    }, 500)
    
    const result = await promise
    console.log('✓ Received response:', result)
  } catch (error) {
    console.error('✗ Test 1 failed:', error)
  }

  console.log('\n---\n')

  // Test 2: Timeout handling
  console.log('Test 2: Timeout handling')
  try {
    const { correlationId, promise } = await tracker.trackResponse(
      'test-agent-2',
      'test-project-1',
      1000 // 1 second timeout
    )
    console.log(`✓ Tracked response with ID: ${correlationId}`)
    
    // Don't resolve - let it timeout
    await promise
    console.error('✗ Should have timed out!')
  } catch (error) {
    if (error instanceof Error && error.message.includes('timeout')) {
      console.log('✓ Correctly timed out:', error.message)
    } else {
      console.error('✗ Unexpected error:', error)
    }
  }

  console.log('\n---\n')

  // Test 3: Multiple pending responses
  console.log('Test 3: Multiple pending responses')
  try {
    const pending = []
    
    // Track 3 responses
    for (let i = 1; i <= 3; i++) {
      const { correlationId, promise } = await tracker.trackResponse(
        `agent-${i}`,
        'test-project'
      )
      pending.push({ correlationId, promise, agentId: `agent-${i}` })
    }
    
    console.log(`✓ Tracking ${pending.length} responses`)
    console.log(`✓ Total pending: ${tracker.getPendingCount()}`)
    
    // Resolve them in reverse order
    for (let i = pending.length - 1; i >= 0; i--) {
      const { correlationId, agentId } = pending[i]
      tracker.resolveResponse(correlationId, { 
        from: agentId,
        message: `Response from ${agentId}`
      })
    }
    
    // Wait for all
    const results = await Promise.all(pending.map(p => p.promise))
    console.log('✓ All responses received:', results.length)
  } catch (error) {
    console.error('✗ Test 3 failed:', error)
  }

  console.log('\n---\n')

  // Test 4: Get pending for specific agent
  console.log('Test 4: Agent-specific tracking')
  try {
    const agent1Responses = []
    
    // Track multiple for same agent
    for (let i = 1; i <= 3; i++) {
      const { correlationId } = await tracker.trackResponse(
        'multi-agent',
        'test-project'
      )
      agent1Responses.push(correlationId)
    }
    
    // Track one for different agent
    await tracker.trackResponse('other-agent', 'test-project')
    
    const pendingForAgent = tracker.getPendingForAgent('multi-agent')
    console.log(`✓ Pending for multi-agent: ${pendingForAgent.length}`)
    console.log(`✓ Total pending: ${tracker.getPendingCount()}`)
    
    // Clean up
    agent1Responses.forEach(id => tracker.resolveResponse(id, {}))
  } catch (error) {
    console.error('✗ Test 4 failed:', error)
  }

  console.log('\n---\n')

  // Test 5: Maximum pending responses
  console.log('Test 5: Maximum pending limit')
  try {
    // Try to exceed limit
    const promises = []
    for (let i = 1; i <= 11; i++) {
      try {
        const { correlationId } = await tracker.trackResponse(
          `overflow-agent-${i}`,
          'test-project'
        )
        promises.push(correlationId)
      } catch (error) {
        if (error instanceof Error && error.message.includes('Maximum pending')) {
          console.log(`✓ Correctly rejected at response ${i}: ${error.message}`)
        } else {
          throw error
        }
      }
    }
    
    // Clean up
    promises.forEach(id => tracker.rejectResponse(id, new Error('Cleanup')))
  } catch (error) {
    console.error('✗ Test 5 failed:', error)
  }

  // Cleanup
  tracker.destroy()
  console.log('\n✅ All tests completed!')
}

// Run the tests
testResponseTracker().catch(console.error)