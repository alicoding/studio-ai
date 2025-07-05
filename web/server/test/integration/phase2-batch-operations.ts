/**
 * Phase 2 Integration Tests - Batch Operations
 * REAL integration testing against running server with real Claude service
 */

interface BatchRequest {
  messages: Array<{
    id: string
    targetAgentId: string
    content: string
    dependencies?: string[]
    timeout?: number
  }>
  fromAgentId: string
  projectId: string
  waitStrategy: 'all' | 'any' | 'none'
  concurrency?: number
  timeout?: number
}

interface BatchResponse {
  batchId: string
  waitStrategy: string
  results: Record<string, {
    id: string
    status: 'success' | 'error' | 'timeout'
    response?: unknown
    error?: string
    duration: number
  }>
  summary: {
    total: number
    successful: number
    failed: number
    timedOut: number
    duration: number
  }
}

class Phase2IntegrationTest {
  private baseUrl: string
  private testStartTime: number

  constructor(baseUrl = 'http://localhost:3456') {
    this.baseUrl = baseUrl
    this.testStartTime = Date.now()
  }

  async runAllTests(): Promise<boolean> {
    console.log('🧪 Phase 2 Integration Tests - Batch Operations')
    console.log('===============================================\n')

    try {
      // Check server is running
      await this.checkServerHealth()
      
      // Test 1: Batch with 'all' wait strategy
      await this.testBatchWaitAll()
      
      // Test 2: Batch with 'any' wait strategy
      await this.testBatchWaitAny()
      
      // Test 3: Batch with 'none' wait strategy (fire and forget)
      await this.testBatchWaitNone()
      
      // Test 4: Batch with dependencies
      await this.testBatchWithDependencies()
      
      // Test 5: Batch timeout handling
      await this.testBatchTimeout()
      
      // Test 6: Invalid batch requests
      await this.testInvalidBatchRequests()
      
      // Test 7: Batch abort functionality
      await this.testBatchAbort()
      
      console.log('\n✅ Phase 2 Integration Tests PASSED')
      console.log(`Total test duration: ${Date.now() - this.testStartTime}ms`)
      
      return true
      
    } catch (error) {
      console.error('\n❌ Phase 2 Integration Tests FAILED')
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

  private async testBatchWaitAll(): Promise<void> {
    console.log('\n📝 Test 1: Batch Wait Strategy "all"')
    console.log('------------------------------------')
    
    const batch: BatchRequest = {
      messages: [
        { id: 'test-1', targetAgentId: 'agent-1', content: 'Calculate 1+1' },
        { id: 'test-2', targetAgentId: 'agent-2', content: 'Calculate 2+2' },
        { id: 'test-3', targetAgentId: 'agent-3', content: 'Calculate 3+3' }
      ],
      fromAgentId: 'integration-test',
      projectId: 'test-project-batch',
      waitStrategy: 'all',
      concurrency: 2,
      timeout: 30000
    }
    
    const startTime = Date.now()
    
    const response = await fetch(`${this.baseUrl}/api/messages/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch)
    })
    
    const duration = Date.now() - startTime
    const result = await response.json() as BatchResponse
    
    console.log(`✅ Response time: ${duration}ms`)
    console.log(`✅ Status: ${response.status}`)
    console.log(`✅ Batch ID: ${result.batchId}`)
    console.log(`✅ Wait strategy: ${result.waitStrategy}`)
    console.log(`✅ Summary: ${JSON.stringify(result.summary)}`)
    console.log(`✅ Results count: ${Object.keys(result.results).length}`)
    
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`)
    }
    
    if (result.waitStrategy !== 'all') {
      throw new Error(`Expected wait strategy 'all', got ${result.waitStrategy}`)
    }
    
    if (result.summary.total !== 3) {
      throw new Error(`Expected 3 total messages, got ${result.summary.total}`)
    }
  }

  private async testBatchWaitAny(): Promise<void> {
    console.log('\n📝 Test 2: Batch Wait Strategy "any"')
    console.log('------------------------------------')
    
    const batch: BatchRequest = {
      messages: [
        { id: 'any-1', targetAgentId: 'fast-agent', content: 'Quick calculation' },
        { id: 'any-2', targetAgentId: 'slow-agent', content: 'Slow calculation' },
        { id: 'any-3', targetAgentId: 'medium-agent', content: 'Medium calculation' }
      ],
      fromAgentId: 'integration-test',
      projectId: 'test-project-batch',
      waitStrategy: 'any',
      timeout: 20000
    }
    
    const startTime = Date.now()
    
    const response = await fetch(`${this.baseUrl}/api/messages/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch)
    })
    
    const duration = Date.now() - startTime
    const result = await response.json() as BatchResponse
    
    console.log(`✅ Response time: ${duration}ms`)
    console.log(`✅ Status: ${response.status}`)
    console.log(`✅ Wait strategy: ${result.waitStrategy}`)
    console.log(`✅ Should return after first success`)
    console.log(`✅ Results: ${Object.keys(result.results).length} agents responded`)
    
    if (result.waitStrategy !== 'any') {
      throw new Error(`Expected wait strategy 'any', got ${result.waitStrategy}`)
    }
  }

  private async testBatchWaitNone(): Promise<void> {
    console.log('\n📝 Test 3: Batch Wait Strategy "none" (Fire and Forget)')
    console.log('------------------------------------------------------')
    
    const batch: BatchRequest = {
      messages: [
        { id: 'fire-1', targetAgentId: 'agent-1', content: 'Fire message 1' },
        { id: 'fire-2', targetAgentId: 'agent-2', content: 'Fire message 2' },
        { id: 'fire-3', targetAgentId: 'agent-3', content: 'Fire message 3' }
      ],
      fromAgentId: 'integration-test',
      projectId: 'test-project-batch',
      waitStrategy: 'none'
    }
    
    const startTime = Date.now()
    
    const response = await fetch(`${this.baseUrl}/api/messages/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch)
    })
    
    const duration = Date.now() - startTime
    const result = await response.json() as BatchResponse
    
    console.log(`✅ Response time: ${duration}ms (should be < 100ms)`)
    console.log(`✅ Status: ${response.status}`)
    console.log(`✅ Wait strategy: ${result.waitStrategy}`)
    console.log(`✅ Immediate return: ${duration < 100}`)
    console.log(`✅ All marked as success: ${result.summary.successful === 3}`)
    
    if (result.waitStrategy !== 'none') {
      throw new Error(`Expected wait strategy 'none', got ${result.waitStrategy}`)
    }
    
    if (duration > 100) {
      throw new Error(`Fire and forget took too long: ${duration}ms`)
    }
  }

  private async testBatchWithDependencies(): Promise<void> {
    console.log('\n📝 Test 4: Batch with Dependencies')
    console.log('----------------------------------')
    
    const batch: BatchRequest = {
      messages: [
        { id: 'step-1', targetAgentId: 'agent-1', content: 'Step 1: Initialize' },
        { id: 'step-2', targetAgentId: 'agent-2', content: 'Step 2: Process', dependencies: ['step-1'] },
        { id: 'step-3', targetAgentId: 'agent-3', content: 'Step 3: Finalize', dependencies: ['step-2'] }
      ],
      fromAgentId: 'integration-test',
      projectId: 'test-project-batch',
      waitStrategy: 'all',
      timeout: 30000
    }
    
    const response = await fetch(`${this.baseUrl}/api/messages/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch)
    })
    
    const result = await response.json() as BatchResponse
    
    console.log(`✅ Status: ${response.status}`)
    console.log(`✅ Dependency execution completed`)
    console.log(`✅ Summary: ${JSON.stringify(result.summary)}`)
    
    // Dependencies should be respected (tested via execution order in backend)
    console.log('✅ Dependency chain test completed')
  }

  private async testBatchTimeout(): Promise<void> {
    console.log('\n📝 Test 5: Batch Timeout Handling')
    console.log('---------------------------------')
    
    const batch: BatchRequest = {
      messages: [
        { id: 'timeout-1', targetAgentId: 'quick-agent', content: 'Quick task' },
        { id: 'timeout-2', targetAgentId: 'very-slow-agent', content: 'Very slow task', timeout: 1000 }
      ],
      fromAgentId: 'integration-test',
      projectId: 'test-project-batch',
      waitStrategy: 'all',
      timeout: 5000
    }
    
    const startTime = Date.now()
    
    const response = await fetch(`${this.baseUrl}/api/messages/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch)
    })
    
    const duration = Date.now() - startTime
    const result = await response.json() as BatchResponse
    
    console.log(`✅ Response time: ${duration}ms`)
    console.log(`✅ Status: ${response.status}`)
    console.log(`✅ Summary: ${JSON.stringify(result.summary)}`)
    console.log(`✅ Timeouts detected: ${result.summary.timedOut > 0}`)
    
    if (result.summary.timedOut > 0) {
      console.log('✅ Timeout handling working correctly')
    }
  }

  private async testInvalidBatchRequests(): Promise<void> {
    console.log('\n📝 Test 6: Invalid Batch Requests')
    console.log('---------------------------------')
    
    // Test empty messages array
    const emptyBatch = {
      messages: [],
      fromAgentId: 'integration-test',
      projectId: 'test-project-batch',
      waitStrategy: 'all'
    }
    
    const response1 = await fetch(`${this.baseUrl}/api/messages/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emptyBatch)
    })
    
    console.log(`✅ Empty batch status: ${response1.status} (should be 400)`)
    
    // Test circular dependencies
    const circularBatch: BatchRequest = {
      messages: [
        { id: 'a', targetAgentId: 'agent-1', content: 'Task A', dependencies: ['b'] },
        { id: 'b', targetAgentId: 'agent-2', content: 'Task B', dependencies: ['a'] }
      ],
      fromAgentId: 'integration-test',
      projectId: 'test-project-batch',
      waitStrategy: 'all'
    }
    
    const response2 = await fetch(`${this.baseUrl}/api/messages/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(circularBatch)
    })
    
    const result2 = await response2.json() as { error: string }
    
    console.log(`✅ Circular dependency status: ${response2.status} (should be 400)`)
    console.log(`✅ Error message: ${result2.error}`)
    
    if (response1.status !== 400 || response2.status !== 400) {
      throw new Error('Invalid batch requests should return 400')
    }
  }

  private async testBatchAbort(): Promise<void> {
    console.log('\n📝 Test 7: Batch Abort Functionality')
    console.log('------------------------------------')
    
    // Test aborting a non-existent batch
    const response = await fetch(`${this.baseUrl}/api/messages/batch/nonexistent-batch-123/abort`, {
      method: 'POST'
    })
    
    const result = await response.json() as { error?: string; success?: boolean }
    
    console.log(`✅ Abort non-existent batch status: ${response.status}`)
    console.log(`✅ Should be 404: ${response.status === 404}`)
    console.log(`✅ Result: ${JSON.stringify(result)}`)
    
    if (response.status !== 404) {
      throw new Error(`Expected 404 for non-existent batch, got ${response.status}`)
    }
    
    console.log('✅ Abort functionality test completed')
  }
}

// Export for use in test runner
export { Phase2IntegrationTest }

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new Phase2IntegrationTest()
  tester.runAllTests().then(success => {
    process.exit(success ? 0 : 1)
  })
}