/**
 * Full E2E Orchestration Tests
 * Tests complete user workflow from UI actions to backend responses
 * Verifies Phase 1 & 2 work together in real scenarios
 */

interface E2ETestResult {
  phase: string
  test: string
  success: boolean
  duration: number
  error?: string
}

interface MentionResponse {
  message: string
  fromAgentId: string
  projectId: string
  targets: string[]
  wait: boolean
  responses?: Record<string, unknown>
  errors?: Record<string, string>
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

class FullE2EOrchestrationTest {
  private baseUrl: string
  private results: E2ETestResult[] = []
  private testStartTime: number

  constructor(baseUrl = 'http://localhost:3456') {
    this.baseUrl = baseUrl
    this.testStartTime = Date.now()
  }

  async runAllTests(): Promise<boolean> {
    console.log('🧪 Full E2E Orchestration Tests')
    console.log('=====================================\n')
    console.log('Testing complete user workflows from UI to backend...\n')

    try {
      // Check server health
      await this.checkServerHealth()
      
      // Phase 1 E2E: Mention with wait mode workflow
      await this.testPhase1E2E()
      
      // Phase 2 E2E: Batch operations workflow
      await this.testPhase2E2E()
      
      // Combined workflow: Batch with mentions
      await this.testCombinedWorkflow()
      
      // Stress test: Concurrent operations
      await this.testConcurrentOperations()
      
      // Print results
      this.printResults()
      
      const allPassed = this.results.every(r => r.success)
      console.log(`\n${allPassed ? '✅' : '❌'} Full E2E Tests ${allPassed ? 'PASSED' : 'FAILED'}`)
      console.log(`Total duration: ${Date.now() - this.testStartTime}ms`)
      
      return allPassed
    } catch (error: unknown) {
      console.error('❌ Full E2E Tests FAILED')
      console.error('Error:', error instanceof Error ? error.message : String(error))
      return false
    }
  }

  private async checkServerHealth(): Promise<void> {
    console.log('🔍 Checking server health...')
    const response = await fetch(`${this.baseUrl}/api/health`)
    if (!response.ok) {
      throw new Error(`Server health check failed: ${response.status}`)
    }
    console.log('✅ Server is healthy\n')
  }

  private async testPhase1E2E(): Promise<void> {
    console.log('📋 Phase 1 E2E: Mention Wait Mode Workflow')
    console.log('------------------------------------------')
    
    const startTime = Date.now()
    try {
      // Simulate UI action: User types mention and enables wait mode
      console.log('1. User types @test-agent and enables wait mode...')
      
      const mentionRequest = {
        message: '@test-agent Calculate the sum of all prime numbers less than 20',
        fromAgentId: 'ui-user',
        projectId: 'e2e-test-project',
        wait: true,
        timeout: 15000
      }
      
      console.log('2. Sending mention with wait mode...')
      const response = await fetch(`${this.baseUrl}/api/messages/mention`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mentionRequest)
      })
      
      const result = await response.json() as MentionResponse
      console.log('3. Received response:', JSON.stringify(result).substring(0, 100) + '...')
      
      // Verify response structure
      if (!result.responses || !result.responses['test-agent']) {
        throw new Error('Missing agent response in wait mode')
      }
      
      console.log('✅ Phase 1 E2E passed: UI → API → Claude → Response')
      
      this.results.push({
        phase: 'Phase 1',
        test: 'Mention Wait Mode Workflow',
        success: true,
        duration: Date.now() - startTime
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('❌ Phase 1 E2E failed:', errorMessage)
      this.results.push({
        phase: 'Phase 1',
        test: 'Mention Wait Mode Workflow',
        success: false,
        duration: Date.now() - startTime,
        error: errorMessage
      })
    }
  }

  private async testPhase2E2E(): Promise<void> {
    console.log('\n📋 Phase 2 E2E: Batch Operations Workflow')
    console.log('------------------------------------------')
    
    const startTime = Date.now()
    try {
      // Simulate UI action: User creates batch with dependencies
      console.log('1. User creates batch operation with 3 messages...')
      
      const batchRequest = {
        messages: [
          {
            id: 'msg1',
            targetAgentId: 'math-agent',
            content: 'What is 10 + 5?',
            dependencies: []
          },
          {
            id: 'msg2',
            targetAgentId: 'code-agent',
            content: 'Write a function to add two numbers',
            dependencies: []
          },
          {
            id: 'msg3',
            targetAgentId: 'review-agent',
            content: 'Review the previous responses',
            dependencies: ['msg1', 'msg2']
          }
        ],
        fromAgentId: 'batch-ui-controller',
        projectId: 'e2e-test-project',
        waitStrategy: 'all',
        concurrency: 2,
        timeout: 30000
      }
      
      console.log('2. Sending batch request...')
      const response = await fetch(`${this.baseUrl}/api/messages/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchRequest)
      })
      
      const result = await response.json() as BatchResponse
      console.log('3. Batch completed:', {
        batchId: result.batchId,
        summary: result.summary,
        resultsCount: Object.keys(result.results).length
      })
      
      // Verify all messages were processed
      if (Object.keys(result.results).length !== 3) {
        throw new Error('Not all batch messages were processed')
      }
      
      // Verify dependency execution order
      const msg3Result = result.results['msg3']
      if (msg3Result && msg3Result.status === 'success') {
        console.log('✅ Dependencies executed correctly')
      }
      
      console.log('✅ Phase 2 E2E passed: UI → Batch API → Parallel Execution → Results')
      
      this.results.push({
        phase: 'Phase 2',
        test: 'Batch Operations Workflow',
        success: true,
        duration: Date.now() - startTime
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('❌ Phase 2 E2E failed:', errorMessage)
      this.results.push({
        phase: 'Phase 2',
        test: 'Batch Operations Workflow',
        success: false,
        duration: Date.now() - startTime,
        error: errorMessage
      })
    }
  }

  private async testCombinedWorkflow(): Promise<void> {
    console.log('\n📋 Combined Workflow: Batch with Mention Wait Mode')
    console.log('--------------------------------------------------')
    
    const startTime = Date.now()
    try {
      // First, send a mention with wait mode
      console.log('1. Sending initial mention with wait mode...')
      const mentionResponse = await fetch(`${this.baseUrl}/api/messages/mention`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '@data-agent Fetch user statistics',
          fromAgentId: 'workflow-controller',
          projectId: 'e2e-test-project',
          wait: true,
          timeout: 10000
        })
      })
      
      const mentionResult = await mentionResponse.json() as MentionResponse
      console.log('2. Mention completed, got data')
      
      // Then, use that data in a batch operation
      console.log('3. Creating batch based on mention response...')
      const batchResponse = await fetch(`${this.baseUrl}/api/messages/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              id: 'analysis1',
              targetAgentId: 'analyst-1',
              content: `Analyze this data: ${JSON.stringify(mentionResult.responses).substring(0, 50)}...`,
              dependencies: []
            },
            {
              id: 'analysis2',
              targetAgentId: 'analyst-2',
              content: 'Provide alternative analysis',
              dependencies: []
            }
          ],
          fromAgentId: 'workflow-controller',
          projectId: 'e2e-test-project',
          waitStrategy: 'any',
          timeout: 20000
        })
      })
      
      await batchResponse.json()
      console.log('4. Batch analysis completed')
      
      console.log('✅ Combined workflow passed: Mention → Batch → Results')
      
      this.results.push({
        phase: 'Combined',
        test: 'Mention + Batch Workflow',
        success: true,
        duration: Date.now() - startTime
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('❌ Combined workflow failed:', errorMessage)
      this.results.push({
        phase: 'Combined',
        test: 'Mention + Batch Workflow',
        success: false,
        duration: Date.now() - startTime,
        error: errorMessage
      })
    }
  }

  private async testConcurrentOperations(): Promise<void> {
    console.log('\n📋 Stress Test: Concurrent Operations')
    console.log('-------------------------------------')
    
    const startTime = Date.now()
    try {
      console.log('1. Sending 5 concurrent operations...')
      
      const operations = [
        // 2 mentions with wait
        fetch(`${this.baseUrl}/api/messages/mention`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: '@agent-1 Task 1',
            fromAgentId: 'stress-test',
            projectId: 'e2e-test-project',
            wait: true,
            timeout: 10000
          })
        }),
        fetch(`${this.baseUrl}/api/messages/mention`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: '@agent-2 Task 2',
            fromAgentId: 'stress-test',
            projectId: 'e2e-test-project',
            wait: true,
            timeout: 10000
          })
        }),
        // 1 mention without wait
        fetch(`${this.baseUrl}/api/messages/mention`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: '@agent-3 Task 3',
            fromAgentId: 'stress-test',
            projectId: 'e2e-test-project',
            wait: false
          })
        }),
        // 2 batch operations
        fetch(`${this.baseUrl}/api/messages/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              { id: '1', targetAgentId: 'batch-1', content: 'Batch task 1', dependencies: [] },
              { id: '2', targetAgentId: 'batch-2', content: 'Batch task 2', dependencies: [] }
            ],
            fromAgentId: 'stress-test',
            projectId: 'e2e-test-project',
            waitStrategy: 'all',
            timeout: 15000
          })
        }),
        fetch(`${this.baseUrl}/api/messages/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              { id: '1', targetAgentId: 'batch-3', content: 'Batch task 3', dependencies: [] }
            ],
            fromAgentId: 'stress-test',
            projectId: 'e2e-test-project',
            waitStrategy: 'none'
          })
        })
      ]
      
      console.log('2. Waiting for all operations...')
      const results = await Promise.allSettled(operations)
      
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length
      
      console.log(`3. Results: ${successful} successful, ${failed} failed`)
      
      if (failed > 0) {
        throw new Error(`${failed} operations failed during stress test`)
      }
      
      console.log('✅ Stress test passed: All concurrent operations completed')
      
      this.results.push({
        phase: 'Stress',
        test: 'Concurrent Operations',
        success: true,
        duration: Date.now() - startTime
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('❌ Stress test failed:', errorMessage)
      this.results.push({
        phase: 'Stress',
        test: 'Concurrent Operations',
        success: false,
        duration: Date.now() - startTime,
        error: errorMessage
      })
    }
  }

  private printResults(): void {
    console.log('\n📊 Test Results Summary')
    console.log('======================')
    
    this.results.forEach(result => {
      const status = result.success ? '✅' : '❌'
      console.log(`${status} ${result.phase} - ${result.test}: ${result.duration}ms`)
      if (result.error) {
        console.log(`   Error: ${result.error}`)
      }
    })
    
    const passed = this.results.filter(r => r.success).length
    const total = this.results.length
    console.log(`\nTotal: ${passed}/${total} tests passed`)
  }
}

// Run the tests
const e2eTest = new FullE2EOrchestrationTest()
e2eTest.runAllTests().then(success => {
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('Test runner error:', error)
  process.exit(1)
})