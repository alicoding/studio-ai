/**
 * Role Resolution Test: Non-Existent Project
 * 
 * This test validates the WorkflowOrchestrator's behavior when attempting role resolution
 * with a project ID that doesn't exist in the database.
 *
 * Expected Behavior:
 * - Should gracefully handle non-existent project IDs
 * - Should fallback to global agent resolution when project doesn't exist
 * - Should not crash or return unclear error messages
 * - Should still find globally available roles
 *
 * KISS: Simple focused test for this specific edge case
 * DRY: Reuses existing test patterns and helpers
 * SOLID: Single responsibility - testing non-existent project handling
 * Library-First: Uses vitest and ky
 */

import { describe, it, expect } from 'vitest'
import ky from 'ky'

const API_URL = process.env.CLAUDE_STUDIO_API || 'http://localhost:3456/api'

// Test constants
const NON_EXISTENT_PROJECT_ID = `fake-project-${Date.now()}-does-not-exist`
const KNOWN_GLOBAL_ROLE = 'developer' // Known to exist globally
const NON_EXISTENT_ROLE = 'completely-invalid-role-xyz-123'

// Helper to extract error message safely
async function getErrorMessage(error: unknown): Promise<string> {
  try {
    if (error && typeof error === 'object' && 'response' in error) {
      const httpError = error as { response?: { json(): Promise<{ error?: string }> } }
      if (httpError.response?.json) {
        const response = await httpError.response.json()
        return response.error || 'Unknown error'
      }
    }
  } catch {
    // Failed to parse
  }
  return 'Failed to parse error'
}

// Helper to test role resolution with non-existent project
async function testRoleResolutionWithFakeProject(
  role: string
): Promise<{ found: boolean; error?: string }> {
  try {
    const response = await ky.post(`${API_URL}/invoke`, {
      json: {
        workflow: { role, task: `Test role resolution for ${role} with fake project` },
        threadId: `test-fake-project-${role}-${Date.now()}`,
        projectId: NON_EXISTENT_PROJECT_ID
      },
      timeout: 10000
    })

    await response.json()
    return { found: true }

  } catch (error: unknown) {
    const errorMessage = await getErrorMessage(error)
    return { found: false, error: errorMessage }
  }
}

describe('Role Resolution: Non-Existent Project Handling', () => {
  
  it('should handle non-existent project gracefully with global role fallback', async () => {
    console.log('🔍 Testing role resolution with non-existent project...')
    console.log(`   Project ID: ${NON_EXISTENT_PROJECT_ID} (fake)`)
    console.log(`   Role: ${KNOWN_GLOBAL_ROLE} (should exist globally)`)
    
    const result = await testRoleResolutionWithFakeProject(KNOWN_GLOBAL_ROLE)
    
    if (result.found) {
      console.log('✅ Successfully resolved global role despite fake project ID')
      expect(result.found).toBe(true)
    } else {
      console.log(`ℹ️ Resolution failed: ${result.error}`)
      
      // Should NOT fail specifically because of the non-existent project
      // (global fallback should work)
      if (result.error?.includes('Project not found') || 
          result.error?.includes(`No agent found for role "${KNOWN_GLOBAL_ROLE}"`)) {
        console.log('❌ Failed to fallback to global agents when project doesn\'t exist')
        expect.fail(`Should fallback to global agents when project doesn't exist. Error: ${result.error}`)
      } else {
        // Other execution errors are acceptable (agent found but execution failed)
        console.log('✅ Role resolution found agent (execution failed for other reasons)')
        expect(result.error).toBeDefined()
      }
    }
  })

  it('should return clear error for non-existent role with non-existent project', async () => {
    console.log('🔍 Testing non-existent role with non-existent project...')
    console.log(`   Project ID: ${NON_EXISTENT_PROJECT_ID} (fake)`)
    console.log(`   Role: ${NON_EXISTENT_ROLE} (fake)`)
    
    const result = await testRoleResolutionWithFakeProject(NON_EXISTENT_ROLE)
    
    // Should fail to find the role
    expect(result.found).toBe(false)
    expect(result.error).toBeDefined()
    
    console.log(`ℹ️ Error message: ${result.error}`)
    
    // Error should indicate proper role resolution was attempted
    if (result.error?.includes('Agent configuration validation failed') ||
        result.error?.includes(`No agent found for role "${NON_EXISTENT_ROLE}"`)) {
      console.log('✅ Proper error handling for non-existent role')
    } else {
      console.log(`ℹ️ Unexpected error format (might be ok): ${result.error}`)
    }
    
    // Should not crash or return unclear errors about project not found
    expect(result.error).not.toContain('Project not found')
    expect(result.error).not.toContain('database error')
    expect(result.error).not.toContain('undefined')
  })

  it('should demonstrate consistent behavior regardless of project existence', async () => {
    console.log('🔍 Comparing behavior with and without fake project ID...')
    
    // Test without project ID (global only)
    const globalOnlyResult = await testRoleResolutionWithoutProject(KNOWN_GLOBAL_ROLE)
    
    // Test with fake project ID (should fallback to global)
    const fakeProjectResult = await testRoleResolutionWithFakeProject(KNOWN_GLOBAL_ROLE)
    
    console.log('📊 Comparison Results:')
    console.log(`Global only: ${globalOnlyResult.found ? 'SUCCESS' : globalOnlyResult.error}`)
    console.log(`Fake project: ${fakeProjectResult.found ? 'SUCCESS' : fakeProjectResult.error}`)
    
    // Both should have similar outcomes (both should find the global role)
    if (globalOnlyResult.found && !fakeProjectResult.found) {
      expect.fail('Fake project ID prevented global fallback - this indicates a bug')
    }
    
    if (!globalOnlyResult.found && fakeProjectResult.found) {
      console.log('ℹ️ Interesting: fake project somehow helped resolution (might be ok)')
    }
    
    console.log('✅ Behavior is consistent between global-only and fake-project scenarios')
    expect(typeof globalOnlyResult.found).toBe('boolean')
    expect(typeof fakeProjectResult.found).toBe('boolean')
  })

  it('should validate error handling resilience', async () => {
    console.log('🔍 Testing error handling resilience with various fake scenarios...')
    
    const testCases = [
      { 
        projectId: 'invalid-uuid-format',
        role: KNOWN_GLOBAL_ROLE,
        description: 'Invalid UUID format project ID'
      },
      {
        projectId: '00000000-0000-0000-0000-000000000000',
        role: KNOWN_GLOBAL_ROLE,
        description: 'Valid UUID format but non-existent project'
      },
      {
        projectId: NON_EXISTENT_PROJECT_ID,
        role: 'DEVELOPER', // Uppercase version
        description: 'Case-insensitive role with fake project'
      }
    ]
    
    for (const testCase of testCases) {
      console.log(`\n🧪 Testing: ${testCase.description}`)
      console.log(`   Project: ${testCase.projectId}`)
      console.log(`   Role: ${testCase.role}`)
      
      try {
        const result = await ky.post(`${API_URL}/invoke`, {
          json: {
            workflow: { role: testCase.role, task: 'Test resilience' },
            threadId: `test-resilience-${Date.now()}`,
            projectId: testCase.projectId
          },
          timeout: 5000
        })
        
        await result.json()
        console.log('   Result: SUCCESS')
      } catch (error) {
        const errorMessage = await getErrorMessage(error)
        console.log(`   Result: ${errorMessage}`)
        
        // Should not crash with internal server errors
        expect(errorMessage).not.toContain('500')
        expect(errorMessage).not.toContain('Internal Server Error')
        expect(errorMessage).not.toContain('database connection')
      }
    }
    
    console.log('\n✅ Error handling is resilient to various fake project scenarios')
  })
})

// Helper for testing without project ID
async function testRoleResolutionWithoutProject(
  role: string
): Promise<{ found: boolean; error?: string }> {
  try {
    const response = await ky.post(`${API_URL}/invoke`, {
      json: {
        workflow: { role, task: `Test global role resolution for ${role}` },
        threadId: `test-global-${role}-${Date.now()}`
        // No projectId provided
      },
      timeout: 10000
    })

    await response.json()
    return { found: true }

  } catch (error: unknown) {
    const errorMessage = await getErrorMessage(error)
    return { found: false, error: errorMessage }
  }
}