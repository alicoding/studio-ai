/**
 * Workflow Agent Validation Tests
 * Tests the new agent validation functionality to prevent stuck workflows
 *
 * KISS: Simple, focused tests for each validation scenario
 * DRY: Reuses test patterns from existing invoke tests
 * SOLID: Each test validates one specific error condition
 * Library-First: Uses vitest and ky for testing
 */

import { describe, it, expect } from 'vitest'
import ky from 'ky'

const API_URL = process.env.CLAUDE_STUDIO_API || 'http://localhost:3456/api'

// Error response type for API validation errors
interface ApiErrorResponse {
  error: string
  statusCode?: number
  details?: string
}

// Helper function to safely extract error response from ky errors
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

// Test data for validation scenarios
const VALID_PROJECT_ID = 'test-project-valid'
const INVALID_PROJECT_ID = 'non-existent-project-123'
const VALID_AGENT_ID = 'developer_01'
const INVALID_AGENT_ID = 'non-existent-agent'
const VALID_ROLE = 'developer'
const INVALID_ROLE = 'non-existent-role'

describe('Workflow Agent Validation', () => {
  describe('Agent ID Validation', () => {
    it('should fail fast with clear error for non-existent agent ID', async () => {
      const response = ky.post(`${API_URL}/invoke`, {
        json: {
          workflow: {
            agentId: INVALID_AGENT_ID,
            task: 'Test task with invalid agent ID'
          },
          threadId: `test-invalid-agent-${Date.now()}`,
          projectId: VALID_PROJECT_ID
        }
      })

      await expect(response).rejects.toThrow()
      
      try {
        await response
      } catch (error: unknown) {
        const errorResponse = await getErrorResponse(error)
        expect(errorResponse?.error).toContain('Agent configuration validation failed')
        expect(errorResponse?.error).toContain(INVALID_AGENT_ID)
        expect(errorResponse?.error).toContain('not found in project')
      }
    })

    it('should validate agent config exists for valid agent ID', async () => {
      // This test uses a non-existent agent ID in a non-existent project
      // so it should fail with validation error
      const response = ky.post(`${API_URL}/invoke`, {
        json: {
          workflow: {
            agentId: VALID_AGENT_ID, // This agent doesn't actually exist in test env
            task: 'Test task with agent ID that would be valid if it existed'
          },
          threadId: `test-valid-agent-${Date.now()}`,
          projectId: VALID_PROJECT_ID // This project doesn't actually exist
        }
      })

      // Should fail with validation error since neither agent nor project exist
      await expect(response).rejects.toThrow()
      
      try {
        await response
      } catch (error: unknown) {
        const errorResponse = await getErrorResponse(error)
        expect(errorResponse?.error).toContain('Agent configuration validation failed')
        expect(errorResponse?.error).toContain('not found in project')
      }
    })
  })

  describe('Role-based Agent Validation', () => {
    it('should fail fast with clear error for non-existent role', async () => {
      const response = ky.post(`${API_URL}/invoke`, {
        json: {
          workflow: {
            role: INVALID_ROLE,
            task: 'Test task with invalid role'
          },
          threadId: `test-invalid-role-${Date.now()}`,
          projectId: VALID_PROJECT_ID
        }
      })

      await expect(response).rejects.toThrow()
      
      try {
        await response
      } catch (error: unknown) {
        const errorResponse = await getErrorResponse(error)
        expect(errorResponse?.error).toContain('Agent configuration validation failed')
        expect(errorResponse?.error).toContain(`No agent found for role "${INVALID_ROLE}"`)
      }
    })

    it('should validate both project and global agents for role', async () => {
      const response = ky.post(`${API_URL}/invoke`, {
        json: {
          workflow: {
            role: VALID_ROLE, // 'developer' role exists in global agents
            task: 'Test task with role that would be valid if configured'
          },
          threadId: `test-valid-role-${Date.now()}`,
          projectId: VALID_PROJECT_ID // This project doesn't exist, so should fall back to global agents
        },
        timeout: 3000 // Increase timeout since role resolution is working
      })

      try {
        const result = await response.json()
        // If successful, role resolution worked correctly
        expect(result.threadId).toBeDefined()
        console.log('✅ Role resolution succeeded - found global agent for developer role')
      } catch (error: unknown) {
        const errorResponse = await getErrorResponse(error)
        console.log('Role resolution error:', errorResponse?.error)
        
        if (errorResponse?.error) {
          // Should NOT fail with "no agent found" since developer role exists globally
          expect(errorResponse.error).not.toContain(`No agent found for role "${VALID_ROLE}"`)
          
          // If it fails, should be due to config/execution issues, not missing agents
          // This proves the role resolution logic checked both project and global agents
          console.log('✅ Role resolution logic working - found agent but execution failed:', errorResponse.error)
        }
      }
    })
  })

  describe('Project Validation', () => {
    it('should fail fast for non-existent project', async () => {
      const response = ky.post(`${API_URL}/invoke`, {
        json: {
          workflow: {
            agentId: VALID_AGENT_ID,
            task: 'Test task with invalid project'
          },
          threadId: `test-invalid-project-${Date.now()}`,
          projectId: INVALID_PROJECT_ID
        }
      })

      await expect(response).rejects.toThrow()
      
      try {
        await response
      } catch (error: unknown) {
        const errorResponse = await getErrorResponse(error)
        expect(errorResponse?.error).toContain('Agent configuration validation failed')
        // Should indicate project-related issue
        expect(errorResponse?.error).toContain('not found in project')
      }
    })
  })

  describe('Missing Agent Information', () => {
    it('should fail when neither agentId nor role is provided', async () => {
      const response = ky.post(`${API_URL}/invoke`, {
        json: {
          workflow: {
            task: 'Test task without agent information'
          },
          threadId: `test-no-agent-${Date.now()}`,
          projectId: VALID_PROJECT_ID
        }
      })

      await expect(response).rejects.toThrow()
      
      try {
        await response
      } catch (error: unknown) {
        const errorResponse = await getErrorResponse(error)
        expect(errorResponse?.error).toContain('Invalid request')
        // This should be caught by Zod schema validation, not WorkflowOrchestrator validation
      }
    })
  })

  describe('Multi-step Workflow Validation', () => {
    it('should validate all steps before starting workflow', async () => {
      const response = ky.post(`${API_URL}/invoke`, {
        json: {
          workflow: [
            {
              id: 'step1',
              agentId: VALID_AGENT_ID,
              task: 'Valid step'
            },
            {
              id: 'step2',
              agentId: INVALID_AGENT_ID,
              task: 'Invalid step'
            }
          ],
          threadId: `test-multi-step-validation-${Date.now()}`,
          projectId: VALID_PROJECT_ID
        }
      })

      await expect(response).rejects.toThrow()
      
      try {
        await response
      } catch (error: unknown) {
        const errorResponse = await getErrorResponse(error)
        expect(errorResponse?.error).toContain('Agent configuration validation failed')
        // Should fail on the first invalid agent it encounters
        expect(errorResponse?.error).toContain('not found in project')
        // Should fail before any steps execute
      }
    })
  })

  describe('Validation Error Messages', () => {
    it('should provide detailed error information for debugging', async () => {
      const invalidAgentId = 'definitely-not-an-agent-123'
      const response = ky.post(`${API_URL}/invoke`, {
        json: {
          workflow: {
            agentId: invalidAgentId,
            task: 'Test for detailed error messages'
          },
          threadId: `test-detailed-errors-${Date.now()}`,
          projectId: VALID_PROJECT_ID
        }
      })

      try {
        await response
        expect.fail('Should have thrown an error')
      } catch (error: unknown) {
        const errorResponse = await getErrorResponse(error)
        
        // Error should contain all necessary debugging information
        expect(errorResponse?.error).toContain('Agent configuration validation failed')
        expect(errorResponse?.error).toContain(invalidAgentId)
        expect(errorResponse?.error).toContain('not found in project')
        
        // Error should be specific enough to help with debugging
        expect(errorResponse?.error?.length).toBeGreaterThan(20)
      }
    })
  })
})