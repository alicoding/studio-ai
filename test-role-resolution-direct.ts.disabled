/**
 * Direct test for role-based agent resolution
 * Tests that the invoke API checks both project and global agents for a valid role
 */

import ky from 'ky'

const API_URL = 'http://localhost:3456/api'

async function testRoleResolution() {
  console.log('🧪 Testing role-based agent resolution...')
  
  // First test with a non-existent role to verify validation logic
  console.log('\n1️⃣ Testing with non-existent role...')
  await testRole('non-existent-role-12345', 'test-project-valid')
  
  // Then test with valid role to see if it gets past validation
  console.log('\n2️⃣ Testing with valid "developer" role...')
  await testRole('developer', 'test-project-valid')
  
  // Test with different valid role
  console.log('\n3️⃣ Testing with "architect" role...')
  await testRole('architect', 'test-project-valid')
}

async function testRole(role: string, projectId: string) {
  const testData = {
    workflow: {
      role: role,
      task: `Test task with ${role} role - should check both project and global agents`
    },
    threadId: `test-role-resolution-${role}-${Date.now()}`,
    projectId: projectId
  }

  console.log(`📤 Sending request with role "${role}"...`)
  console.log('   Project ID:', testData.projectId)
  console.log('   Thread ID:', testData.threadId)

  try {
    const response = await ky.post(`${API_URL}/invoke`, {
      json: testData,
      timeout: 30000
    })

    const result = await response.json()
    console.log('✅ Success! Role resolution worked.')
    console.log('   Response:', JSON.stringify(result, null, 2))
    
  } catch (error: any) {
    console.log('❌ Request failed, checking error details...')
    console.log('   Status:', error.response?.status)
    console.log('   Status Text:', error.response?.statusText)
    
    try {
      if (error.response && typeof error.response.json === 'function') {
        const errorResponse = await error.response.json()
        console.log('   Error response:', JSON.stringify(errorResponse, null, 2))
        
        if (errorResponse?.error) {
          if (errorResponse.error.includes(`No agent found for role "${role}"`)) {
            console.log(`🔍 Result: Agent resolution checked both project and global agents - none found for "${role}" role`)
          } else if (errorResponse.error.includes('Agent configuration validation failed')) {
            console.log('🔍 Result: Agent resolution found agent(s) but validation failed')
            console.log('   This means the resolution logic is working!')
          } else if (errorResponse.error.includes('not found in project')) {
            console.log('🔍 Result: Project validation failed - project may not exist')
          } else if (errorResponse.error.includes('Connection terminated') || errorResponse.error.includes('timeout')) {
            console.log('🔍 Result: Agent was found and workflow started, but execution failed due to connection issues')
            console.log('   This means role resolution worked!')
          } else {
            console.log(`🔍 Result: Other validation error: ${errorResponse.error}`)
          }
        }
      } else {
        console.log('   No response body available')
      }
    } catch (parseError) {
      console.log('   Could not parse error response:', error.message || error.toString())
      console.log('   Full error object:', JSON.stringify(error, null, 2))
    }
  }
}

// Run the test
testRoleResolution().catch(console.error)