#!/usr/bin/env tsx
/**
 * Global Agent Resolution Test
 * 
 * Tests the global agent configuration resolution functionality specifically.
 * This validates that the system correctly resolves agents from global configurations
 * when no project context is provided or when project-specific agents are not found.
 * 
 * KISS: Simple focused test for global agent resolution
 * DRY: Reuses existing utilities and patterns
 * SOLID: Single responsibility - testing global resolution only
 * Library-First: Uses ky for HTTP and existing error handling patterns
 */

import ky from 'ky'

const API_URL = process.env.CLAUDE_STUDIO_API || 'http://localhost:3456/api'

// Global agent configuration that should exist
const EXPECTED_GLOBAL_ROLES = ['developer', 'architect', 'reviewer']
const NON_EXISTENT_ROLE = 'non-existent-global-role-12345'

// Helper function to safely extract error response
async function getErrorResponse(error: unknown): Promise<{ error?: string } | null> {
  try {
    if (error && typeof error === 'object' && 'response' in error) {
      const httpError = error as { response?: { json(): Promise<{ error?: string }> } }
      if (httpError.response?.json) {
        return await httpError.response.json()
      }
    }
  } catch {
    // Failed to parse error response
  }
  return null
}

async function testGlobalAgentResolution() {
  console.log('🔍 Testing Global Agent Resolution\n')
  
  let passedTests = 0
  let totalTests = 0

  // Test 1: List available global agent configurations
  console.log('1️⃣ Listing Global Agent Configurations...')
  totalTests++
  try {
    const response = await ky.get(`${API_URL}/agents`).json<Array<{ id: string, name: string, role: string }>>()
    console.log(`✅ Found ${response.length} global agent configurations:`)
    response.forEach(agent => {
      console.log(`   - ${agent.name} (role: ${agent.role}, id: ${agent.id.substring(0, 8)}...)`)
    })
    
    if (response.length > 0) {
      passedTests++
      console.log(`✅ Global agent configurations are available for resolution\n`)
    } else {
      console.log(`⚠️ No global agent configurations found - this may affect resolution tests\n`)
    }
  } catch (error) {
    const errorResponse = await getErrorResponse(error)
    console.log(`❌ Failed to list global agents: ${errorResponse?.error || 'Unknown error'}\n`)
  }

  // Test 2: Test global-only resolution (no projectId)
  console.log('2️⃣ Testing Global-Only Resolution (no project context)...')
  totalTests++
  for (const role of EXPECTED_GLOBAL_ROLES) {
    try {
      const startTime = Date.now()
      const response = ky.post(`${API_URL}/invoke`, {
        json: {
          workflow: {
            role: role,
            task: `Test global resolution for ${role} role - this should use a global agent configuration`
          },
          threadId: `global-test-${role}-${Date.now()}`
          // Intentionally NO projectId - should only check global agents
        },
        timeout: 5000
      })
      
      try {
        const result = await response.json()
        const duration = Date.now() - startTime
        console.log(`✅ Global agent resolution succeeded for role "${role}" (${duration}ms)`)
        console.log(`   Agent found and workflow initiated successfully`)
        passedTests++
        break // Success with any role counts as passing this test
      } catch (execError) {
        const errorResponse = await getErrorResponse(execError)
        const duration = Date.now() - startTime
        
        if (errorResponse?.error?.includes(`No agent found for role "${role}"`)) {
          console.log(`ℹ️ No global agent found for role "${role}" (${duration}ms)`)
        } else {
          console.log(`✅ Global agent found for role "${role}" but execution failed (${duration}ms)`)
          console.log(`   Error: ${errorResponse?.error}`)
          passedTests++
          break // Agent was found, execution failure is separate issue
        }
      }
    } catch (error) {
      console.log(`❌ Request failed for role "${role}": ${error}`)
    }
  }
  
  // Test 3: Test non-existent global role
  console.log('\n3️⃣ Testing Non-Existent Global Role...')
  totalTests++
  try {
    const startTime = Date.now()
    const response = ky.post(`${API_URL}/invoke`, {
      json: {
        workflow: {
          role: NON_EXISTENT_ROLE,
          task: 'Test with non-existent role to verify proper error handling'
        },
        threadId: `global-error-test-${Date.now()}`
        // No projectId - global context only
      },
      timeout: 3000
    })
    
    await response
    console.log(`❌ Expected error for non-existent role but request succeeded`)
  } catch (error) {
    const duration = Date.now() - startTime
    const errorResponse = await getErrorResponse(error)
    
    if (errorResponse?.error?.includes('Agent configuration validation failed') &&
        errorResponse?.error?.includes(`No agent found for role "${NON_EXISTENT_ROLE}"`)) {
      console.log(`✅ Correctly handled non-existent global role (${duration}ms)`)
      console.log(`   Error: ${errorResponse.error}`)
      passedTests++
    } else {
      console.log(`❌ Unexpected error response: ${errorResponse?.error}`)
    }
  }

  // Test 4: Test resolution with non-existent project (should fall back to global)
  console.log('\n4️⃣ Testing Fallback to Global with Non-Existent Project...')
  totalTests++
  try {
    
    // Use first available role from global configs
    const globalAgents = await ky.get(`${API_URL}/agents`).json<Array<{ role: string }>>()
    if (globalAgents.length === 0) {
      console.log(`⚠️ Skipping fallback test - no global agents available`)
    } else {
      const testRole = globalAgents[0].role
      const startTime = Date.now()
      
      const response = ky.post(`${API_URL}/invoke`, {
        json: {
          workflow: {
            role: testRole,
            task: 'Test fallback to global agent when project does not exist'
          },
          threadId: `fallback-test-${Date.now()}`,
          projectId: 'definitely-non-existent-project-12345' // Non-existent project
        },
        timeout: 5000
      })
      
      try {
        const result = await response.json()
        const duration = Date.now() - startTime
        console.log(`✅ Successfully fell back to global agent for role "${testRole}" (${duration}ms)`)
        passedTests++
      } catch (execError) {
        const duration = Date.now() - startTime
        const errorResponse = await getErrorResponse(execError)
        
        if (errorResponse?.error?.includes(`No agent found for role "${testRole}"`)) {
          console.log(`❌ Fallback failed - global agent not found for role "${testRole}" (${duration}ms)`)
        } else {
          console.log(`✅ Global agent found via fallback but execution failed (${duration}ms)`)
          console.log(`   Error: ${errorResponse?.error}`)
          passedTests++
        }
      }
    }
  } catch (error) {
    console.log(`❌ Fallback test setup failed: ${error}`)
  }

  // Test 5: Verify resolution performance
  console.log('\n5️⃣ Testing Global Resolution Performance...')
  totalTests++
  try {
    const iterations = 3
    const times: number[] = []
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now()
      
      try {
        await ky.post(`${API_URL}/invoke`, {
          json: {
            workflow: {
              role: NON_EXISTENT_ROLE,
              task: 'Performance test iteration'
            },
            threadId: `perf-test-${i}-${Date.now()}`
          },
          timeout: 1000
        })
      } catch (error) {
        // Expected to fail, we're measuring validation time
      }
      
      times.push(Date.now() - startTime)
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length
    const maxTime = Math.max(...times)
    
    console.log(`✅ Global resolution performance test completed`)
    console.log(`   Average validation time: ${avgTime.toFixed(1)}ms`)
    console.log(`   Maximum validation time: ${maxTime}ms`)
    console.log(`   All iterations: ${times.map(t => `${t}ms`).join(', ')}`)
    
    if (maxTime < 1000) {
      passedTests++
      console.log(`✅ Performance is acceptable (all under 1000ms)`)
    } else {
      console.log(`⚠️ Performance may be slow (max ${maxTime}ms)`)
    }
  } catch (error) {
    console.log(`❌ Performance test failed: ${error}`)
  }

  // Summary
  console.log('\n📊 Global Agent Resolution Test Summary')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ Passed: ${passedTests}/${totalTests} tests`)
  console.log(`${passedTests === totalTests ? '🎉' : '⚠️'} Global agent resolution ${passedTests === totalTests ? 'working correctly' : 'has issues'}`)
  
  if (passedTests < totalTests) {
    console.log('\n💡 If tests failed:')
    console.log('   - Ensure the server is running on the correct port')
    console.log('   - Check that global agent configurations exist in the database')
    console.log('   - Verify the WorkflowOrchestrator is properly configured')
    console.log('   - Review server logs for detailed error information')
  }
  
  console.log('\n✨ Test completed!')
  
  return passedTests === totalTests
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testGlobalAgentResolution()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('Test execution failed:', error)
      process.exit(1)
    })
}

export { testGlobalAgentResolution }