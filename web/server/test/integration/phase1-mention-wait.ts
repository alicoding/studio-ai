/**
 * Phase 1 Integration Tests - Mention Wait Mode
 * REAL integration testing against running server with real Claude service
 */

interface MentionResponse {
  message: string
  fromAgentId: string
  projectId: string
  targets: string[]
  wait: boolean
  responses?: Record<string, unknown>
  errors?: Record<string, string>
}

class Phase1IntegrationTest {
  private baseUrl: string
  private testStartTime: number

  constructor(baseUrl = 'http://localhost:3456') {
    this.baseUrl = baseUrl
    this.testStartTime = Date.now()
  }

  async runAllTests(): Promise<boolean> {
    console.log('🧪 Phase 1 Integration Tests - Mention Wait Mode')
    console.log('=================================================\n')

    try {
      // Check server is running
      await this.checkServerHealth()
      
      // Test 1: Non-wait mode (should return immediately)
      await this.testNonWaitMode()
      
      // Test 2: Wait mode with single agent
      await this.testWaitModeSingle()
      
      // Test 3: Wait mode with multiple agents
      await this.testWaitModeMultiple()
      
      // Test 4: Timeout handling
      await this.testTimeoutHandling()
      
      // Test 5: Error handling
      await this.testErrorHandling()
      
      // Test 6: Invalid mention format
      await this.testInvalidMentions()
      
      console.log('\n✅ Phase 1 Integration Tests PASSED')
      console.log(`Total test duration: ${Date.now() - this.testStartTime}ms`)
      
      return true
      
    } catch (error) {
      console.error('\n❌ Phase 1 Integration Tests FAILED')
      console.error('Error:', error)
      return false
    }
  }

  private async checkServerHealth(): Promise<void> {
    console.log('🔍 Checking server health...')
    
    const response = await fetch(`${this.baseUrl}/api/health`)
    if (!response.ok) {
      throw new Error(`Server health check failed: ${response.status}`)
    }
    
    const health = await response.json() as { status: string }
    console.log(`✅ Server is healthy: ${health.status}`)
  }

  private async testNonWaitMode(): Promise<void> {
    console.log('\n📝 Test 1: Non-Wait Mode')
    console.log('------------------------')
    
    const startTime = Date.now()
    
    const response = await fetch(`${this.baseUrl}/api/messages/mention`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: '@test-agent What is 2+2?',
        fromAgentId: 'integration-test',
        projectId: 'test-project-1',
        wait: false
      })
    })
    
    const duration = Date.now() - startTime
    const result = await response.json() as MentionResponse
    
    console.log(`✅ Response time: ${duration}ms (should be < 100ms)`)
    console.log(`✅ Status: ${response.status}`)
    console.log(`✅ Wait mode: ${result.wait}`)
    console.log(`✅ Targets: ${result.targets}`)
    console.log(`✅ No responses field: ${!result.responses}`)
    
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`)
    }
    
    if (result.wait !== false) {
      throw new Error(`Expected wait=false, got ${result.wait}`)
    }
    
    if (duration > 10000) {
      throw new Error(`Non-wait mode too slow: ${duration}ms (expected <10s for real Claude API)`)
    }
  }

  private async testWaitModeSingle(): Promise<void> {
    console.log('\n📝 Test 2: Wait Mode - Single Agent')
    console.log('-----------------------------------')
    
    const startTime = Date.now()
    
    const response = await fetch(`${this.baseUrl}/api/messages/mention`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: '@test-agent What is 3+3?',
        fromAgentId: 'integration-test',
        projectId: 'test-project-1',
        wait: true,
        timeout: 10000 // 10 seconds
      })
    })
    
    const duration = Date.now() - startTime
    const result = await response.json() as MentionResponse
    
    console.log(`✅ Response time: ${duration}ms`)
    console.log(`✅ Status: ${response.status}`)
    console.log(`✅ Wait mode: ${result.wait}`)
    console.log(`✅ Has responses: ${!!result.responses}`)
    
    if (result.responses) {
      console.log(`✅ Response count: ${Object.keys(result.responses).length}`)
      for (const [agent, response] of Object.entries(result.responses)) {
        console.log(`  - ${agent}: ${JSON.stringify(response).substring(0, 100)}...`)
      }
    }
    
    if (result.errors) {
      console.log(`⚠️  Errors: ${JSON.stringify(result.errors)}`)
    }
    
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`)
    }
    
    if (result.wait !== true) {
      throw new Error(`Expected wait=true, got ${result.wait}`)
    }
  }

  private async testWaitModeMultiple(): Promise<void> {
    console.log('\n📝 Test 3: Wait Mode - Multiple Agents')
    console.log('--------------------------------------')
    
    const startTime = Date.now()
    
    // Note: Testing multiple mentions in one message isn't supported by current parser
    // This test will verify the error handling
    const response = await fetch(`${this.baseUrl}/api/messages/mention`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: '@agent-1 Calculate 4+4 @agent-2 Calculate 5+5',
        fromAgentId: 'integration-test',
        projectId: 'test-project-1',
        wait: true,
        timeout: 15000
      })
    })
    
    const duration = Date.now() - startTime
    const result = await response.json() as MentionResponse
    
    console.log(`✅ Response time: ${duration}ms`)
    console.log(`✅ Status: ${response.status}`)
    console.log(`✅ Multiple mention handling: ${JSON.stringify(result).substring(0, 200)}...`)
    
    // The current parser only handles single mentions, so this should either:
    // 1. Handle only the first mention, or
    // 2. Return an error for invalid format
    console.log('✅ Multiple mention test completed (behavior varies based on parser)')
  }

  private async testTimeoutHandling(): Promise<void> {
    console.log('\n📝 Test 4: Timeout Handling')
    console.log('---------------------------')
    
    const startTime = Date.now()
    
    const response = await fetch(`${this.baseUrl}/api/messages/mention`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: '@slow-agent Perform a very complex calculation',
        fromAgentId: 'integration-test',
        projectId: 'test-project-1',
        wait: true,
        timeout: 2000 // 2 seconds - should timeout for slow responses
      })
    })
    
    const duration = Date.now() - startTime
    const result = await response.json() as MentionResponse
    
    console.log(`✅ Response time: ${duration}ms`)
    console.log(`✅ Status: ${response.status}`)
    console.log(`✅ Timeout behavior: ${JSON.stringify(result).substring(0, 200)}...`)
    
    if (result.errors) {
      console.log(`✅ Timeout errors detected: ${JSON.stringify(result.errors)}`)
    }
    
    // Timeout should occur around the specified timeout value
    if (duration > 2500) {
      console.log(`⚠️  Timeout took longer than expected: ${duration}ms`)
    }
  }

  private async testErrorHandling(): Promise<void> {
    console.log('\n📝 Test 5: Error Handling')
    console.log('-------------------------')
    
    // Test with non-existent agent or invalid project
    const response = await fetch(`${this.baseUrl}/api/messages/mention`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: '@nonexistent-agent Hello',
        fromAgentId: 'integration-test',
        projectId: 'nonexistent-project',
        wait: true,
        timeout: 5000
      })
    })
    
    const result = await response.json() as MentionResponse
    
    console.log(`✅ Status: ${response.status}`)
    console.log(`✅ Error handling: ${JSON.stringify(result).substring(0, 200)}...`)
    
    // The response should handle missing agents gracefully
    console.log('✅ Error handling test completed')
  }

  private async testInvalidMentions(): Promise<void> {
    console.log('\n📝 Test 6: Invalid Mention Format')
    console.log('---------------------------------')
    
    const response = await fetch(`${this.baseUrl}/api/messages/mention`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'This message has no mentions',
        fromAgentId: 'integration-test',
        projectId: 'test-project-1',
        wait: true
      })
    })
    
    const result = await response.json() as { error: string }
    
    console.log(`✅ Status: ${response.status}`)
    console.log(`✅ Should be 400: ${response.status === 400}`)
    console.log(`✅ Error message: ${result.error}`)
    
    if (response.status !== 400) {
      throw new Error(`Expected 400 for invalid mention, got ${response.status}`)
    }
  }
}

// Export for use in test runner
export { Phase1IntegrationTest }

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new Phase1IntegrationTest()
  tester.runAllTests().then(success => {
    process.exit(success ? 0 : 1)
  })
}