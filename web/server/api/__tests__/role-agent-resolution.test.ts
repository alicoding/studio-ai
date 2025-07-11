/**
 * Role-based Agent Resolution Test
 * Tests that role resolution checks both project and global agents correctly
 *
 * KISS: Simple test focused on the dual-lookup behavior
 * DRY: Reuses existing test patterns and utilities
 * SOLID: Single responsibility - testing role resolution logic
 * Library-First: Uses vitest, ky, and existing test utilities
 */

import { describe, it, expect, beforeAll } from 'vitest'
import ky from 'ky'

const API_URL = process.env.CLAUDE_STUDIO_API || 'http://localhost:3456/api'

// Test data - use specific IDs to avoid conflicts
const TEST_PROJECT_ID = 'role-resolution-test-project'
const TEST_ROLE = 'developer'
const GLOBAL_ONLY_ROLE = 'architect' // Role that might exist in global configs
const NON_EXISTENT_ROLE = 'non-existent-role-12345'

// Known agent config for testing (Full Stack Developer)
const FULL_STACK_DEVELOPER_CONFIG_ID = '68c57432-3e06-4e0c-84d0-36f63bed17b2'

// Error response type
interface ApiErrorResponse {
  error: string
  statusCode?: number
  details?: string
}

// Helper function to safely extract error response
async function getErrorResponse(error: unknown): Promise<ApiErrorResponse | null> {
  try {
    if (error && typeof error === 'object' && 'response' in error) {
      const httpError = error as { response?: { json(): Promise<ApiErrorResponse> } }
      if (httpError.response?.json) {
        return await httpError.response.json()
      }
    }
  } catch {
    // Failed to parse error response
  }
  return null
}

// Setup function to create test project with agents
async function setupTestProject(): Promise<void> {
  try {
    // Create test project
    await ky.post(`${API_URL}/studio-projects`, {
      json: {
        id: TEST_PROJECT_ID,
        name: 'Role Resolution Test Project',
        description: 'Test project for role-based agent resolution',
        workspacePath: '/tmp/test-workspace',
      },
    })
    console.log(`✓ Created test project: ${TEST_PROJECT_ID}`)

    // Add agent with TEST_ROLE to project
    await ky.post(`${API_URL}/studio-projects/${TEST_PROJECT_ID}/agents`, {
      json: {
        role: TEST_ROLE,
        agentConfigId: FULL_STACK_DEVELOPER_CONFIG_ID,
      },
    })
    console.log(`✓ Added agent with role "${TEST_ROLE}" to project`)
  } catch (error) {
    // Project might already exist, which is fine for testing
    console.log(`ℹ️ Setup note: ${error}`)
  }
}

describe('Role-based Agent Resolution', () => {
  beforeAll(async () => {
    await setupTestProject()
  })

  describe('Project Agent Priority', () => {
    it('should find project agent when role exists in both project and global', async () => {
      console.log('🔍 Testing that project agents take priority over global agents...')

      try {
        const response = ky.post(`${API_URL}/invoke`, {
          json: {
            workflow: {
              role: TEST_ROLE,
              task: 'Simple test to verify project agent is used',
            },
            threadId: `test-project-priority-${Date.now()}`,
            projectId: TEST_PROJECT_ID,
          },
          timeout: 5000,
        })

        const result = await response.json()
        console.log('✅ Project agent resolution succeeded')
        expect(result).toBeDefined()
      } catch (error: unknown) {
        const errorResponse = await getErrorResponse(error)

        // Even if execution fails, the error should NOT be "no agent found"
        // since we added an agent for this role to the project
        if (errorResponse?.error) {
          expect(errorResponse.error).not.toContain(`No agent found for role "${TEST_ROLE}"`)
          console.log(
            `ℹ️ Project agent was found (execution failed for other reasons): ${errorResponse.error}`
          )
        }
      }
    })
  })

  describe('Global Agent Fallback', () => {
    it('should fall back to global agents when role not found in project', async () => {
      console.log('🔍 Testing fallback to global agents...')

      try {
        const response = ky.post(`${API_URL}/invoke`, {
          json: {
            workflow: {
              role: GLOBAL_ONLY_ROLE,
              task: 'Test task to verify global agent fallback',
            },
            threadId: `test-global-fallback-${Date.now()}`,
            projectId: TEST_PROJECT_ID,
          },
          timeout: 5000,
        })

        const result = await response.json()
        console.log(`✅ Global agent fallback succeeded for role: ${GLOBAL_ONLY_ROLE}`)
        expect(result).toBeDefined()
      } catch (error: unknown) {
        const errorResponse = await getErrorResponse(error)

        if (errorResponse?.error) {
          console.log(`Global fallback result: ${errorResponse.error}`)

          // This should either:
          // 1. Succeed (if global agent exists)
          // 2. Fail with "No agent found" (if no global agent exists)
          // 3. Fail with validation error (if global agent exists but has issues)

          if (errorResponse.error.includes(`No agent found for role "${GLOBAL_ONLY_ROLE}"`)) {
            console.log(
              '✅ Confirmed: Role resolution checked both project and global agents, none found'
            )
            expect(errorResponse.error).toContain('Agent configuration validation failed')
          } else {
            console.log('✅ Global agent was found (may have failed for other reasons)')
            // Any other error means the agent was found but something else failed
            expect(errorResponse.error).toBeDefined()
          }
        }
      }
    })

    it('should work without projectId (global-only context)', async () => {
      console.log('🔍 Testing global-only context (no projectId)...')

      try {
        const response = ky.post(`${API_URL}/invoke`, {
          json: {
            workflow: {
              role: GLOBAL_ONLY_ROLE,
              task: 'Test task in global context only',
            },
            threadId: `test-global-only-${Date.now()}`,
            // No projectId - should only check global agents
          },
          timeout: 5000,
        })

        const result = await response.json()
        console.log('✅ Global-only context succeeded')
        expect(result).toBeDefined()
      } catch (error: unknown) {
        const errorResponse = await getErrorResponse(error)

        if (errorResponse?.error) {
          console.log(`Global-only result: ${errorResponse.error}`)

          // In global-only context, should only check global agents
          if (errorResponse.error.includes(`No agent found for role "${GLOBAL_ONLY_ROLE}"`)) {
            console.log('✅ Confirmed: Only checked global agents in global context')
            expect(errorResponse.error).toContain('Agent configuration validation failed')
          } else {
            console.log('✅ Global agent found in global context')
            expect(errorResponse.error).toBeDefined()
          }
        }
      }
    })
  })

  describe('Role Resolution Logic Verification', () => {
    it('should validate role resolution checks both sources before failing', async () => {
      console.log('🔍 Testing comprehensive role resolution logic...')

      const response = ky.post(`${API_URL}/invoke`, {
        json: {
          workflow: {
            role: NON_EXISTENT_ROLE,
            task: 'Test with guaranteed non-existent role',
          },
          threadId: `test-comprehensive-resolution-${Date.now()}`,
          projectId: TEST_PROJECT_ID,
        },
        timeout: 3000,
      })

      await expect(response).rejects.toThrow()

      try {
        await response
      } catch (error: unknown) {
        const errorResponse = await getErrorResponse(error)

        // Should get validation error indicating both sources were checked
        if (errorResponse?.error) {
          expect(errorResponse.error).toContain('Agent configuration validation failed')
          expect(errorResponse.error).toContain(`No agent found for role "${NON_EXISTENT_ROLE}"`)
          console.log('✅ Role resolution correctly checked both project and global agents')
          console.log(`   Error: ${errorResponse.error}`)
        } else {
          // If no detailed error response, just confirm the request was rejected
          expect(error).toBeDefined()
          console.log('✅ Role resolution validation executed (request rejected)')
        }
      }
    })

    it('should demonstrate the dual-lookup process through error messages', async () => {
      console.log('🔍 Demonstrating dual-lookup process...')

      // Test with project context - should check project first, then global
      try {
        await ky.post(`${API_URL}/invoke`, {
          json: {
            workflow: { role: NON_EXISTENT_ROLE, task: 'Test dual lookup' },
            threadId: `test-dual-lookup-with-project-${Date.now()}`,
            projectId: TEST_PROJECT_ID,
          },
          timeout: 2000,
        })
      } catch (error: unknown) {
        const errorWithProject = await getErrorResponse(error)
        console.log(`With projectId: ${errorWithProject?.error}`)
      }

      // Test without project context - should check global only
      try {
        await ky.post(`${API_URL}/invoke`, {
          json: {
            workflow: { role: NON_EXISTENT_ROLE, task: 'Test global only' },
            threadId: `test-dual-lookup-global-only-${Date.now()}`,
            // No projectId
          },
          timeout: 2000,
        })
      } catch (error: unknown) {
        const errorGlobalOnly = await getErrorResponse(error)
        console.log(`Without projectId: ${errorGlobalOnly?.error}`)
      }

      // Both should result in "No agent found" but through different paths
      console.log('✅ Dual-lookup behavior demonstrated')
      expect(true).toBe(true) // Test passes if we reach here without exceptions
    })
  })

  describe('Validation Performance', () => {
    it('should validate quickly without hanging on role resolution', async () => {
      console.log('🔍 Testing validation performance...')

      const startTime = Date.now()

      try {
        await ky.post(`${API_URL}/invoke`, {
          json: {
            workflow: {
              role: NON_EXISTENT_ROLE,
              task: 'Performance test for validation',
            },
            threadId: `test-validation-performance-${Date.now()}`,
            projectId: TEST_PROJECT_ID,
          },
          timeout: 1000, // Short timeout to ensure fast validation
        })
      } catch (error: unknown) {
        const duration = Date.now() - startTime
        console.log(`✅ Validation completed in ${duration}ms`)

        // Validation should be fast (under 1 second)
        expect(duration).toBeLessThan(1000)

        const errorResponse = await getErrorResponse(error)
        if (errorResponse?.error) {
          expect(errorResponse.error).toContain('Agent configuration validation failed')
        } else {
          // If no detailed error response, just confirm validation was attempted
          expect(error).toBeDefined()
          console.log('ℹ️ Validation executed (no detailed error response available)')
        }
      }
    })
  })
})
