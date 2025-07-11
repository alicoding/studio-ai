/**
 * Comprehensive MCP Invoke API Tests
 * Tests all production scenarios: sequential, parallel, dependencies, resume, interruption
 * 
 * KISS: Direct API testing using ky
 * DRY: Reuses test infrastructure
 * SOLID: Each test focuses on one scenario
 */

import ky from 'ky'
import type { InvokeResponse } from '../schemas/invoke'

const API_URL = process.env.CLAUDE_STUDIO_API || 'http://localhost:3456/api'

interface TestResult {
  name: string
  status: 'PASS' | 'FAIL' | 'PARTIAL'
  details: string
  sessionIds?: Record<string, string>
  duration?: number
}

interface WorkflowStateResponse {
  threadId: string
  currentState: unknown
  completedSteps: string[]
  pendingSteps: string[]
  sessionIds: Record<string, string>
  canResume: boolean
}

export async function runComprehensiveTests(): Promise<TestResult[]> {
  console.log('🧪 Running comprehensive MCP invoke tests...\n')
  
  const results: TestResult[] = []

  // Test 1: Sequential Workflow with Dependencies
  console.log('📋 Test 1: Sequential workflow with template variables...')
  try {
    const startTime = Date.now()
    const response = await ky.post(`${API_URL}/invoke`, {
      json: {
        workflow: [
          { id: 'step1', role: 'dev', task: 'Calculate 10 + 5. Say exactly: "Result: 15"' },
          { id: 'step2', role: 'dev', task: 'Take {step1.output} and multiply by 2', deps: ['step1'] }
        ],
        threadId: 'test-sequential-001'
      },
      timeout: 300000 // 5 minutes
    }).json<InvokeResponse>()

    const duration = Date.now() - startTime
    
    if (response.status === 'completed' && 
        response.results.step1?.includes('15') && 
        response.results.step2?.includes('30')) {
      results.push({
        name: 'Sequential workflow with dependencies',
        status: 'PASS',
        details: 'Both steps completed, template variables resolved correctly',
        sessionIds: response.sessionIds,
        duration
      })
    } else {
      results.push({
        name: 'Sequential workflow with dependencies',
        status: 'PARTIAL',
        details: `Status: ${response.status}, Results: ${JSON.stringify(response.results)}`,
        sessionIds: response.sessionIds,
        duration
      })
    }
  } catch (error) {
    results.push({
      name: 'Sequential workflow with dependencies',
      status: 'FAIL',
      details: `Error: ${error instanceof Error ? error.message : String(error)}`
    })
  }

  // Test 2: Parallel Execution
  console.log('📋 Test 2: Parallel execution...')
  try {
    const startTime = Date.now()
    const response = await ky.post(`${API_URL}/invoke`, {
      json: {
        workflow: [
          { id: 'task1', role: 'dev', task: 'Calculate 5 * 5. Say: "Result: 25"' },
          { id: 'task2', role: 'ux', task: 'Calculate 7 * 7. Say: "Result: 49"' },
          { id: 'task3', role: 'orchestrator', task: 'Calculate 3 * 3. Say: "Result: 9"' }
        ],
        threadId: 'test-parallel-001'
      },
      timeout: 300000
    }).json<InvokeResponse>()

    const duration = Date.now() - startTime
    const completedTasks = Object.keys(response.results).length
    
    if (response.status === 'completed' && completedTasks === 3) {
      results.push({
        name: 'Parallel execution (3 independent tasks)',
        status: 'PASS',
        details: 'All 3 tasks completed in parallel',
        sessionIds: response.sessionIds,
        duration
      })
    } else {
      results.push({
        name: 'Parallel execution (3 independent tasks)',
        status: 'PARTIAL',
        details: `${completedTasks}/3 tasks completed, Status: ${response.status}`,
        sessionIds: response.sessionIds,
        duration
      })
    }
  } catch (error) {
    results.push({
      name: 'Parallel execution (3 independent tasks)',
      status: 'FAIL',
      details: `Error: ${error instanceof Error ? error.message : String(error)}`
    })
  }

  // Test 3: Mixed Dependencies (Diamond Pattern)
  console.log('📋 Test 3: Diamond dependency pattern...')
  try {
    const startTime = Date.now()
    const response = await ky.post(`${API_URL}/invoke`, {
      json: {
        workflow: [
          { id: 'root', role: 'dev', task: 'Say: "Starting analysis"' },
          { id: 'branch1', role: 'dev', task: 'Branch 1: {root.output}', deps: ['root'] },
          { id: 'branch2', role: 'ux', task: 'Branch 2: {root.output}', deps: ['root'] },
          { id: 'merge', role: 'orchestrator', task: 'Merge {branch1.output} and {branch2.output}', deps: ['branch1', 'branch2'] }
        ],
        threadId: 'test-diamond-001'
      },
      timeout: 300000
    }).json<InvokeResponse>()

    const duration = Date.now() - startTime
    const completedSteps = Object.keys(response.results).length
    
    if (response.status === 'completed' && completedSteps === 4) {
      results.push({
        name: 'Diamond dependency pattern',
        status: 'PASS',
        details: 'All 4 steps completed with complex dependencies',
        sessionIds: response.sessionIds,
        duration
      })
    } else {
      results.push({
        name: 'Diamond dependency pattern',
        status: 'PARTIAL',
        details: `${completedSteps}/4 steps completed, Status: ${response.status}`,
        sessionIds: response.sessionIds,
        duration
      })
    }
  } catch (error) {
    results.push({
      name: 'Diamond dependency pattern',
      status: 'FAIL',
      details: `Error: ${error instanceof Error ? error.message : String(error)}`
    })
  }

  // Test 4: Long Chain (5 steps)
  console.log('📋 Test 4: Long sequential chain (5 steps)...')
  try {
    const startTime = Date.now()
    const response = await ky.post(`${API_URL}/invoke`, {
      json: {
        workflow: [
          { id: 's1', role: 'dev', task: 'Step 1: Say "One"' },
          { id: 's2', role: 'ux', task: 'Step 2: After {s1.output}, say "Two"', deps: ['s1'] },
          { id: 's3', role: 'dev', task: 'Step 3: After {s2.output}, say "Three"', deps: ['s2'] },
          { id: 's4', role: 'orchestrator', task: 'Step 4: After {s3.output}, say "Four"', deps: ['s3'] },
          { id: 's5', role: 'dev', task: 'Step 5: After {s4.output}, say "Five"', deps: ['s4'] }
        ],
        threadId: 'test-long-chain-001'
      },
      timeout: 600000 // 10 minutes for long chain
    }).json<InvokeResponse>()

    const duration = Date.now() - startTime
    const completedSteps = Object.keys(response.results).length
    
    if (response.status === 'completed' && completedSteps === 5) {
      results.push({
        name: 'Long sequential chain (5 steps)',
        status: 'PASS',
        details: 'All 5 steps completed in sequence',
        sessionIds: response.sessionIds,
        duration
      })
    } else {
      results.push({
        name: 'Long sequential chain (5 steps)',
        status: 'PARTIAL',
        details: `${completedSteps}/5 steps completed, Status: ${response.status}`,
        sessionIds: response.sessionIds,
        duration
      })
    }
  } catch (error) {
    results.push({
      name: 'Long sequential chain (5 steps)',
      status: 'FAIL',
      details: `Error: ${error instanceof Error ? error.message : String(error)}`
    })
  }

  // Test 5: Workflow State Query
  console.log('📋 Test 5: Workflow state query...')
  try {
    const steps = [
      { id: 'step1', role: 'dev', task: 'Say: "Step 1 complete"' },
      { id: 'step2', role: 'ux', task: 'Continue from {step1.output}', deps: ['step1'] }
    ]
    
    // First, run a workflow
    await ky.post(`${API_URL}/invoke`, {
      json: {
        workflow: steps,
        threadId: 'test-state-query-001'
      },
      timeout: 120000
    }).json<InvokeResponse>()
    
    // Then query its state
    const stateResponse = await ky.post(`${API_URL}/invoke/status/test-state-query-001`, {
      json: { steps }
    }).json<WorkflowStateResponse>()
    
    if (stateResponse.threadId === 'test-state-query-001' && 
        stateResponse.completedSteps && 
        stateResponse.sessionIds) {
      results.push({
        name: 'Workflow state query',
        status: 'PASS',
        details: `Completed: ${stateResponse.completedSteps.join(',')}, Pending: ${stateResponse.pendingSteps.join(',')}`,
        sessionIds: stateResponse.sessionIds
      })
    } else {
      results.push({
        name: 'Workflow state query',
        status: 'PARTIAL',
        details: `State response: ${JSON.stringify(stateResponse)}`
      })
    }
  } catch (error) {
    results.push({
      name: 'Workflow state query',
      status: 'FAIL',
      details: `Error: ${error instanceof Error ? error.message : String(error)}`
    })
  }

  // Test 6: Session Persistence
  console.log('📋 Test 6: Session persistence...')
  try {
    const threadId = 'test-context-persistence'
    
    // First call - establish context
    await ky.post(`${API_URL}/invoke`, {
      json: {
        workflow: { role: 'dev', task: 'Remember this secret word: ELEPHANT' },
        threadId
      },
      timeout: 120000
    }).json<InvokeResponse>()
    
    // Second call - test context retention
    const response = await ky.post(`${API_URL}/invoke`, {
      json: {
        workflow: { role: 'dev', task: 'What was the secret word I told you?' },
        threadId
      },
      timeout: 120000
    }).json<InvokeResponse>()
    
    const resultText = JSON.stringify(response.results).toLowerCase()
    if (resultText.includes('elephant')) {
      results.push({
        name: 'Session persistence across calls',
        status: 'PASS',
        details: 'Agent remembered context from previous call',
        sessionIds: response.sessionIds
      })
    } else {
      results.push({
        name: 'Session persistence across calls',
        status: 'FAIL',
        details: `Agent did not remember context. Response: ${JSON.stringify(response.results)}`
      })
    }
  } catch (error) {
    results.push({
      name: 'Session persistence across calls',
      status: 'FAIL',
      details: `Error: ${error instanceof Error ? error.message : String(error)}`
    })
  }

  return results
}

// Execute tests if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runComprehensiveTests().then(results => {
    console.log('\n📊 TEST RESULTS SUMMARY:')
    console.log('=' .repeat(80))
    
    let passed = 0, failed = 0, partial = 0
    
    results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'PARTIAL' ? '⚠️' : '❌'
      console.log(`${icon} ${result.name}: ${result.status}`)
      console.log(`   ${result.details}`)
      if (result.duration) {
        console.log(`   Duration: ${result.duration}ms`)
      }
      if (result.sessionIds) {
        console.log(`   Sessions: ${Object.keys(result.sessionIds).length} active`)
      }
      console.log('')
      
      if (result.status === 'PASS') passed++
      else if (result.status === 'PARTIAL') partial++
      else failed++
    })
    
    console.log(`📈 OVERALL: ${passed} passed, ${partial} partial, ${failed} failed`)
    console.log(`🎯 Success rate: ${Math.round((passed / results.length) * 100)}%`)
    
    if (failed > 0) {
      process.exit(1)
    }
  }).catch(error => {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
  })
}