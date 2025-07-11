#!/usr/bin/env npx tsx

/**
 * Test case sensitivity for Architect role
 * This script tests different case variations to ensure proper role resolution
 */

import ky from 'ky'

const API_URL = 'http://localhost:3457/api'

async function testArchitectRoleCaseSensitivity() {
  console.log('=== Testing Architect Role Case Sensitivity ===\n')

  // Test cases with different capitalizations
  const testCases = [
    { role: 'architect', description: 'All lowercase' },
    { role: 'Architect', description: 'Capital first letter' },
    { role: 'ARCHITECT', description: 'All uppercase' },
    { role: 'ArChItEcT', description: 'Mixed case' },
    { role: 'aRcHiTeCt', description: 'Random case' }
  ]

  for (const testCase of testCases) {
    console.log(`\nTesting: ${testCase.description} - "${testCase.role}"`)
    console.log('-'.repeat(50))

    try {
      const response = await ky.post(`${API_URL}/invoke`, {
        json: {
          workflow: {
            role: testCase.role,
            task: 'Design a simple REST API endpoint for user authentication. Include the endpoint path, HTTP method, request/response format, and basic security considerations.'
          }
        },
        timeout: 30000
      }).json()

      console.log('✅ Success!')
      console.log(`Response ID: ${response.id}`)
      console.log(`Role used: ${testCase.role}`)
      
      // Wait a bit to see the response
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Check status
      const statusResponse = await ky.get(`${API_URL}/invoke-status/${response.id}`).json() as any
      console.log(`Status: ${statusResponse.status}`)
      if (statusResponse.workflow?.steps?.[0]) {
        const step = statusResponse.workflow.steps[0]
        console.log(`Agent assigned: ${step.agentId || 'N/A'}`)
        console.log(`Step status: ${step.status}`)
        if (step.error) {
          console.log(`Error: ${step.error}`)
        }
      }

    } catch (error: any) {
      console.log('❌ Failed!')
      if (error.response) {
        const errorBody = await error.response.json()
        console.log(`Error: ${errorBody.error || JSON.stringify(errorBody)}`)
      } else {
        console.log(`Error: ${error.message}`)
      }
    }
  }

  console.log('\n=== Summary ===')
  console.log('The system should handle role names case-insensitively.')
  console.log('All variations above should successfully resolve to the Architect role.')
}

// Run the test
testArchitectRoleCaseSensitivity().catch(console.error)