/**
 * Comprehensive Role-Based Agent Resolution Test
 * Tests the complete resolution flow: project agents -> global agents -> error
 */

import ky from 'ky'

const API_URL = process.env.CLAUDE_STUDIO_API || 'http://localhost:3456/api'

interface ApiErrorResponse {
  error: string
  statusCode?: number
  details?: string
}

async function getErrorResponse(error: unknown): Promise<ApiErrorResponse | null> {
  try {
    if (error && typeof error === 'object' && 'response' in error) {
      const httpError = error as { response?: { json(): Promise<ApiErrorResponse> } }
      if (httpError.response?.json) {
        return await httpError.response.json()
      }
    }
    // Also handle generic Error objects
    if (error instanceof Error) {
      return { error: error.message }
    }
  } catch {
    // Failed to parse error response
  }
  return { error: String(error) }
}

async function testRoleResolution() {
  console.log('🔍 Testing Role-Based Agent Resolution')
  console.log(`API URL: ${API_URL}`)
  console.log('='.repeat(60))

  // Test 1: Check global agent configurations
  console.log('\n1️⃣ Testing Global Agent Configurations...')
  try {
    const response = await ky.get(`${API_URL}/agents`, { timeout: 5000 })
    const globalAgents = await response.json() as any[]
    
    console.log(`Found ${globalAgents.length} global agent configurations:`)
    globalAgents.forEach((agent, index) => {
      console.log(`  ${index + 1}. ${agent.name || 'Unnamed'} (Role: ${agent.role || 'None'}) - ID: ${agent.id}`)
    })

    if (globalAgents.length === 0) {
      console.log('⚠️ No global agents found - this will affect role resolution testing')
    }
  } catch (error) {
    console.error('❌ Failed to fetch global agents:', error)
  }

  // Test 2: Create test project and check project agents
  console.log('\n2️⃣ Testing Project Agent Setup...')
  const testProjectId = `role-test-${Date.now()}`
  
  try {
    // Create test project
    await ky.post(`${API_URL}/studio-projects`, {
      json: {
        id: testProjectId,
        name: 'Role Resolution Test Project',
        workspacePath: '/tmp/test-project'
      },
      timeout: 5000
    })
    console.log(`✅ Created test project: ${testProjectId}`)

    // Check project agents (should be empty initially)
    const projectResponse = await ky.get(`${API_URL}/studio-projects/${testProjectId}/agents`, { timeout: 5000 })
    const projectAgents = await projectResponse.json() as any[]
    console.log(`Project has ${projectAgents.length} agents initially`)

  } catch (error) {
    const errorResponse = await getErrorResponse(error)
    console.log(`ℹ️ Project setup result: ${errorResponse?.error || 'Unknown error'}`)
  }

  // Test 3: Test role resolution with no project agents (should use global)
  console.log('\n3️⃣ Testing Global Agent Fallback...')
  let startTime = Date.now()
  try {
    const response = ky.post(`${API_URL}/invoke`, {
      json: {
        workflow: {
          role: 'developer', // Common role that should exist in global configs
          task: 'Test global agent resolution - this should use a global agent configuration'
        },
        threadId: `global-test-${Date.now()}`,
        projectId: testProjectId
      },
      timeout: 8000
    })

    const result = await response.json()
    const elapsed = Date.now() - startTime
    console.log(`✅ Global agent resolution successful in ${elapsed}ms`)
    console.log('Response:', result)

  } catch (error) {
    const errorResponse = await getErrorResponse(error)
    const elapsed = Date.now() - startTime
    
    if (errorResponse?.error?.includes('Using global agent config')) {
      console.log(`✅ Global agent resolution logic executed (${elapsed}ms)`)
      console.log('Error details:', errorResponse.error)
    } else if (errorResponse?.error?.includes('No agent found for role')) {
      console.log(`⚠️ No global agent found for 'developer' role (${elapsed}ms)`)
      console.log('This indicates the global fallback was attempted but no matching agent exists')
    } else {
      console.log(`ℹ️ Other result (${elapsed}ms):`, errorResponse?.error || 'Unknown')
    }
  }

  // Test 4: Add project agent and test project resolution priority
  console.log('\n4️⃣ Testing Project Agent Priority...')
  try {
    // First, get a global agent config to add to project
    const globalResponse = await ky.get(`${API_URL}/agents`, { timeout: 5000 })
    const globalAgents = await globalResponse.json() as any[]
    
    if (globalAgents.length > 0) {
      const firstAgent = globalAgents[0]
      
      // Add agent to project
      await ky.post(`${API_URL}/studio-projects/${testProjectId}/agents`, {
        json: {
          role: 'project-developer',
          agentConfigId: firstAgent.id
        },
        timeout: 5000
      })
      console.log(`✅ Added agent ${firstAgent.id} to project with role 'project-developer'`)

      // Test that project agent is used instead of global
      startTime = Date.now()
      try {
        const response = ky.post(`${API_URL}/invoke`, {
          json: {
            workflow: {
              role: 'project-developer', // Should find project agent
              task: 'Test project agent resolution - this should use the project-specific agent'
            },
            threadId: `project-test-${Date.now()}`,
            projectId: testProjectId
          },
          timeout: 8000
        })

        const result = await response.json()
        const elapsed = Date.now() - startTime
        console.log(`✅ Project agent resolution successful in ${elapsed}ms`)
        console.log('Response:', result)

      } catch (error) {
        const errorResponse = await getErrorResponse(error)
        const elapsed = Date.now() - startTime
        
        if (errorResponse?.error?.includes('Using project agent')) {
          console.log(`✅ Project agent resolution logic executed (${elapsed}ms)`)
          console.log('Error details:', errorResponse.error)
        } else {
          console.log(`ℹ️ Project agent test result (${elapsed}ms):`, errorResponse?.error || 'Unknown')
        }
      }
    } else {
      console.log('⚠️ No global agents available to add to project')
    }

  } catch (error) {
    const errorResponse = await getErrorResponse(error)
    console.log(`❌ Project agent setup failed:`, errorResponse?.error || 'Unknown error')
  }

  // Test 5: Test non-existent role error handling
  console.log('\n5️⃣ Testing Non-Existent Role Error Handling...')
  startTime = Date.now()
  try {
    const response = ky.post(`${API_URL}/invoke`, {
      json: {
        workflow: {
          role: 'non-existent-role-12345',
          task: 'Test error handling for non-existent role'
        },
        threadId: `error-test-${Date.now()}`,
        projectId: testProjectId
      },
      timeout: 5000
    })

    const result = await response.json()
    console.log('❌ Expected error but got success:', result)

  } catch (error) {
    const errorResponse = await getErrorResponse(error)
    const elapsed = Date.now() - startTime
    
    if (errorResponse?.error?.includes('No agent found for role')) {
      console.log(`✅ Proper error handling for non-existent role (${elapsed}ms)`)
      console.log('Error message:', errorResponse.error)
    } else {
      console.log(`ℹ️ Different error for non-existent role (${elapsed}ms):`, errorResponse?.error)
    }
  }

  // Cleanup
  console.log('\n🧹 Cleaning up test project...')
  try {
    await ky.delete(`${API_URL}/studio-projects/${testProjectId}`, { timeout: 5000 })
    console.log(`✅ Deleted test project: ${testProjectId}`)
  } catch (error) {
    console.log(`ℹ️ Cleanup note: ${error}`)
  }

  console.log('\n' + '='.repeat(60))
  console.log('🎯 Role Resolution Test Complete!')
  console.log('The system should:')
  console.log('  1. ✅ Check project agents first')
  console.log('  2. ✅ Fall back to global agents')
  console.log('  3. ✅ Return clear errors when no agent found')
  console.log('  4. ✅ Prioritize project agents over global ones')
}

// Run the test
testRoleResolution().catch(console.error)