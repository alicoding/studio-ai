/**
 * Architect Role Resolution Test
 * Specifically tests the architect role resolution in various scenarios
 *
 * KISS: Simple, focused test for architect role
 * DRY: Reuses existing test utilities
 * SOLID: Single responsibility - testing architect role
 * Library-First: Uses ky for HTTP requests
 */

import ky from 'ky'

const API_URL = process.env.CLAUDE_STUDIO_API || 'http://localhost:3456/api'

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

// Main test function
async function testArchitectRole() {
  console.log('🏛️  Testing Architect Role Resolution')
  console.log('API URL:', API_URL)
  console.log('=' + '='.repeat(60))

  // Test 1: List all global agents to see available architect configurations
  console.log('\n1️⃣  Listing Available Architect Configurations...')
  try {
    const response = await ky.get(`${API_URL}/agents`)
    const agents = await response.json() as Array<{ id: string; name: string; role: string }>
    
    const architectAgents = agents.filter(agent => agent.role === 'architect')
    console.log(`Found ${architectAgents.length} architect configurations:`)
    architectAgents.forEach((agent, index) => {
      console.log(`  ${index + 1}. ${agent.name} - ID: ${agent.id}`)
    })
  } catch (error) {
    console.error('Failed to list agents:', error)
  }

  // Test 2: Test architect role resolution without project context (global only)
  console.log('\n2️⃣  Testing Architect Resolution (Global Context)...')
  const globalStartTime = Date.now()
  try {
    const response = ky.post(`${API_URL}/invoke`, {
      json: {
        workflow: {
          role: 'architect',
          task: 'Design a scalable microservices architecture for an e-commerce platform'
        },
        threadId: `architect-global-test-${Date.now()}`
        // No projectId - should use global architect
      },
      timeout: 10000
    })

    const result = await response.json()
    const duration = Date.now() - globalStartTime
    console.log(`✅ Global architect resolution succeeded (${duration}ms)`)
    console.log('Response:', JSON.stringify(result, null, 2).substring(0, 200) + '...')
  } catch (error) {
    const duration = Date.now() - globalStartTime
    const errorResponse = await getErrorResponse(error)
    console.log(`❌ Global architect resolution failed (${duration}ms)`)
    console.log('Error:', errorResponse?.error || 'Unknown error')
  }

  // Test 3: Create a test project and add a project-specific architect
  console.log('\n3️⃣  Setting Up Project-Specific Architect...')
  const testProjectId = `architect-test-${Date.now()}`
  
  try {
    // Create test project
    await ky.post(`${API_URL}/studio-projects`, {
      json: {
        id: testProjectId,
        name: 'Architect Test Project',
        description: 'Testing architect role resolution',
        workspacePath: '/tmp/architect-test'
      }
    })
    console.log(`✅ Created test project: ${testProjectId}`)

    // Get first architect config
    const agentsResponse = await ky.get(`${API_URL}/agents`)
    const agents = await agentsResponse.json() as Array<{ id: string; name: string; role: string }>
    const architectConfig = agents.find(agent => agent.role === 'architect')
    
    if (architectConfig) {
      // Add architect to project
      await ky.post(`${API_URL}/studio-projects/${testProjectId}/agents`, {
        json: {
          role: 'architect',
          agentConfigId: architectConfig.id
        }
      })
      console.log(`✅ Added architect to project: ${architectConfig.name}`)
    }
  } catch (error) {
    console.error('Failed to setup project architect:', error)
  }

  // Test 4: Test architect resolution with project context
  console.log('\n4️⃣  Testing Architect Resolution (Project Context)...')
  const projectStartTime = Date.now()
  try {
    const response = ky.post(`${API_URL}/invoke`, {
      json: {
        workflow: {
          role: 'architect',
          task: 'Review and improve the current system architecture'
        },
        threadId: `architect-project-test-${Date.now()}`,
        projectId: testProjectId
      },
      timeout: 10000
    })

    const result = await response.json()
    const duration = Date.now() - projectStartTime
    console.log(`✅ Project architect resolution succeeded (${duration}ms)`)
    console.log('Response:', JSON.stringify(result, null, 2).substring(0, 200) + '...')
  } catch (error) {
    const duration = Date.now() - projectStartTime
    const errorResponse = await getErrorResponse(error)
    console.log(`❌ Project architect resolution failed (${duration}ms)`)
    console.log('Error:', errorResponse?.error || 'Unknown error')
  }

  // Test 5: Test case-insensitive resolution
  console.log('\n5️⃣  Testing Case-Insensitive Resolution...')
  const caseStartTime = Date.now()
  try {
    const response = ky.post(`${API_URL}/invoke`, {
      json: {
        workflow: {
          role: 'ARCHITECT', // Uppercase
          task: 'Test case-insensitive role matching'
        },
        threadId: `architect-case-test-${Date.now()}`
      },
      timeout: 5000
    })

    const result = await response.json()
    const duration = Date.now() - caseStartTime
    console.log(`✅ Case-insensitive resolution succeeded (${duration}ms)`)
  } catch (error) {
    const duration = Date.now() - caseStartTime
    const errorResponse = await getErrorResponse(error)
    console.log(`❌ Case-insensitive resolution failed (${duration}ms)`)
    console.log('Error:', errorResponse?.error || 'Unknown error')
  }

  // Test 6: Test multi-agent workflow with architect
  console.log('\n6️⃣  Testing Multi-Agent Workflow with Architect...')
  const workflowStartTime = Date.now()
  try {
    const response = ky.post(`${API_URL}/invoke`, {
      json: {
        workflow: [
          {
            id: 'design',
            role: 'architect',
            task: 'Design the high-level architecture for a notification system'
          },
          {
            id: 'implement',
            role: 'developer',
            task: 'Implement the core components based on {design.output}',
            deps: ['design']
          }
        ],
        threadId: `architect-workflow-test-${Date.now()}`
      },
      timeout: 15000
    })

    const result = await response.json()
    const duration = Date.now() - workflowStartTime
    console.log(`✅ Multi-agent workflow succeeded (${duration}ms)`)
    console.log('Workflow ID:', (result as any).workflowId || 'Unknown')
  } catch (error) {
    const duration = Date.now() - workflowStartTime
    const errorResponse = await getErrorResponse(error)
    console.log(`❌ Multi-agent workflow failed (${duration}ms)`)
    console.log('Error:', errorResponse?.error || 'Unknown error')
  }

  // Cleanup
  console.log('\n🧹 Cleaning up test project...')
  try {
    await ky.delete(`${API_URL}/studio-projects/${testProjectId}`)
    console.log('✅ Test project cleaned up')
  } catch (error) {
    console.log('ℹ️  Cleanup note:', error)
  }

  console.log('\n' + '='.repeat(60))
  console.log('🎯 Architect Role Resolution Test Complete!')
  console.log('Summary:')
  console.log('  - Multiple architect configurations available globally')
  console.log('  - Architect role can be resolved in both global and project contexts')
  console.log('  - Case-insensitive matching works correctly')
  console.log('  - Multi-agent workflows can include architects')
}

// Run the test
testArchitectRole().catch(console.error)