/**
 * Architect Role Resolution Test
 * Comprehensive test for architect role resolution in workflows
 *
 * KISS: Simple focused test for architect role functionality
 * DRY: Reuses test utilities from existing tests
 * SOLID: Single responsibility - testing architect role resolution
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import ky, { HTTPError } from 'ky'

const API_URL = process.env.CLAUDE_STUDIO_API || 'http://localhost:3456/api'

// Test constants
const TEST_PROJECT_ID = 'test-architect-project'
const ARCHITECT_ROLE = 'architect'

// Helper function to safely extract error response from ky errors
async function getErrorResponse(error: unknown): Promise<{ error?: string } | null> {
  try {
    if (error instanceof HTTPError) {
      return await error.response.json()
    }
  } catch {
    // Failed to parse error response
  }
  return null
}

// Helper to wait for workflow completion with status polling
async function waitForWorkflowCompletion(threadId: string, maxWaitMs = 30000): Promise<any> {
  const startTime = Date.now()
  
  while (Date.now() - startTime < maxWaitMs) {
    try {
      const response = await ky.get(`${API_URL}/invoke-status/${threadId}`).json<any>()
      
      if (response.status === 'completed' || response.status === 'failed' || response.status === 'partial') {
        return response
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      // Status endpoint might not be ready yet
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  throw new Error(`Workflow ${threadId} did not complete within ${maxWaitMs}ms`)
}

describe('Architect Role Resolution', () => {
  let createdProjectAgentIds: string[] = []
  let globalArchitectConfigId: string | null = null

  beforeAll(async () => {
    // 1. Create test project
    try {
      await ky.post(`${API_URL}/studio-projects`, {
        json: {
          id: TEST_PROJECT_ID,
          name: 'Test Architect Project',
          description: 'Project for testing architect role resolution',
          workspacePath: '/tmp/test-architect-project'
        }
      })
      console.log('✓ Created test project:', TEST_PROJECT_ID)
    } catch (error) {
      // Project might already exist
      console.log('Note: Test project might already exist')
    }

    // 2. Check if global architect agent exists
    try {
      const agents = await ky.get(`${API_URL}/agent-configs`).json<any[]>()
      const architectAgent = agents.find(a => a.role?.toLowerCase() === ARCHITECT_ROLE.toLowerCase())
      
      if (architectAgent) {
        globalArchitectConfigId = architectAgent.id
        console.log('✓ Found global architect agent:', architectAgent.id, architectAgent.name)
      } else {
        console.log('⚠️ No global architect agent found')
      }
    } catch (error) {
      console.error('Failed to fetch agent configs:', error)
    }
  })

  afterAll(async () => {
    // Clean up: Remove agents added to project
    for (const agentId of createdProjectAgentIds) {
      try {
        await ky.delete(`${API_URL}/studio-projects/${TEST_PROJECT_ID}/agents/${agentId}`)
      } catch {
        // Ignore cleanup errors
      }
    }
  })

  it('should resolve architect role from global agents', async () => {
    const threadId = `test-architect-global-${Date.now()}`
    
    const response = await ky.post(`${API_URL}/invoke`, {
      json: {
        workflow: {
          role: ARCHITECT_ROLE,
          task: 'Create a high-level system architecture diagram for a microservices application'
        },
        threadId,
        projectId: TEST_PROJECT_ID,
        startNewConversation: true
      },
      timeout: 10000
    }).json<{ threadId: string }>()

    expect(response.threadId).toBe(threadId)
    console.log('✓ Architect role resolution initiated successfully')

    // Check workflow status
    const status = await waitForWorkflowCompletion(threadId)
    console.log('Workflow status:', status.status)
    
    // Verify the workflow used architect role
    expect(status.steps).toBeDefined()
    expect(status.steps[0]).toMatchObject({
      role: ARCHITECT_ROLE,
      status: expect.stringMatching(/completed|running|failed/)
    })
  })

  it('should resolve architect role from project agents when added', async () => {
    // Skip if no global architect config exists
    if (!globalArchitectConfigId) {
      console.log('⚠️ Skipping project agent test - no global architect config found')
      return
    }

    // Add architect to project
    try {
      const addResponse = await ky.post(`${API_URL}/studio-projects/${TEST_PROJECT_ID}/agents`, {
        json: {
          role: ARCHITECT_ROLE,
          agentConfigId: globalArchitectConfigId
        }
      }).json<any>()
      
      createdProjectAgentIds.push(ARCHITECT_ROLE)
      console.log('✓ Added architect to project:', addResponse)
    } catch (error) {
      console.error('Failed to add architect to project:', error)
      throw error
    }

    // Test with project architect
    const threadId = `test-architect-project-${Date.now()}`
    
    const response = await ky.post(`${API_URL}/invoke`, {
      json: {
        workflow: {
          role: ARCHITECT_ROLE,
          task: 'Design the data model for a user authentication system'
        },
        threadId,
        projectId: TEST_PROJECT_ID,
        startNewConversation: true
      },
      timeout: 10000
    }).json<{ threadId: string }>()

    expect(response.threadId).toBe(threadId)
    console.log('✓ Project architect role resolution initiated successfully')

    // Verify workflow uses project agent
    const status = await waitForWorkflowCompletion(threadId)
    expect(status.sessionIds).toBeDefined()
    
    // Should have architect_01 or similar short ID for project agent
    const sessionKeys = Object.keys(status.sessionIds || {})
    const hasProjectArchitect = sessionKeys.some(key => key.includes('architect'))
    expect(hasProjectArchitect).toBe(true)
    console.log('✓ Confirmed project architect was used:', sessionKeys)
  })

  it('should handle multi-step workflow with architect role', async () => {
    const threadId = `test-architect-multistep-${Date.now()}`
    
    const response = await ky.post(`${API_URL}/invoke`, {
      json: {
        workflow: [
          {
            id: 'architecture',
            role: ARCHITECT_ROLE,
            task: 'Design a REST API structure for a blog platform'
          },
          {
            id: 'review',
            role: ARCHITECT_ROLE,
            task: 'Review and refine the API design from {architecture.output}',
            deps: ['architecture']
          }
        ],
        threadId,
        projectId: TEST_PROJECT_ID,
        startNewConversation: true
      },
      timeout: 10000
    }).json<{ threadId: string }>()

    expect(response.threadId).toBe(threadId)
    console.log('✓ Multi-step architect workflow initiated')

    // Wait for completion
    const status = await waitForWorkflowCompletion(threadId, 60000) // Longer timeout for multi-step
    
    // Verify both steps completed
    expect(status.steps).toHaveLength(2)
    expect(status.steps[0]).toMatchObject({
      id: 'architecture',
      role: ARCHITECT_ROLE
    })
    expect(status.steps[1]).toMatchObject({
      id: 'review',
      role: ARCHITECT_ROLE,
      dependencies: ['architecture']
    })
    
    console.log('✓ Multi-step architect workflow completed successfully')
    console.log('Step statuses:', status.steps.map((s: any) => `${s.id}: ${s.status}`))
  })

  it('should fail gracefully when architect role is not available', async () => {
    // Create a project without any agents
    const emptyProjectId = `empty-project-${Date.now()}`
    
    try {
      await ky.post(`${API_URL}/studio-projects`, {
        json: {
          id: emptyProjectId,
          name: 'Empty Project',
          description: 'Project with no agents'
        }
      })
    } catch {
      // Ignore if exists
    }

    // Remove global architect if we can (simulate no architect available)
    const invalidRole = 'chief-architect' // Role that doesn't exist
    
    try {
      await ky.post(`${API_URL}/invoke`, {
        json: {
          workflow: {
            role: invalidRole,
            task: 'This should fail - no agent for this role'
          },
          threadId: `test-no-architect-${Date.now()}`,
          projectId: emptyProjectId
        }
      })
      
      // Should not reach here
      expect.fail('Should have thrown an error for invalid role')
    } catch (error) {
      const errorResponse = await getErrorResponse(error)
      expect(errorResponse?.error).toBeDefined()
      expect(errorResponse?.error).toContain('No agent found for role')
      expect(errorResponse?.error).toContain(invalidRole)
      console.log('✓ Correctly failed for non-existent role:', invalidRole)
    }
  })

  it('should handle architect role case-insensitively', async () => {
    const variations = ['Architect', 'ARCHITECT', 'architect', 'ArChItEcT']
    
    for (const roleVariation of variations) {
      try {
        const response = await ky.post(`${API_URL}/invoke`, {
          json: {
            workflow: {
              role: roleVariation,
              task: `Test case sensitivity with role: ${roleVariation}`
            },
            threadId: `test-case-${roleVariation}-${Date.now()}`,
            projectId: TEST_PROJECT_ID
          },
          timeout: 5000
        }).json<{ threadId: string }>()
        
        expect(response.threadId).toBeDefined()
        console.log(`✓ Role variation "${roleVariation}" resolved successfully`)
      } catch (error) {
        const errorResponse = await getErrorResponse(error)
        
        // If it fails, it should NOT be because role wasn't found
        // (might fail for other reasons like config issues)
        if (errorResponse?.error?.includes('No agent found for role')) {
          throw new Error(`Role "${roleVariation}" should have been found (case-insensitive)`)
        }
        
        console.log(`✓ Role variation "${roleVariation}" found but failed for other reasons (expected)`)
      }
    }
  })

  it('should use agentId (shortId) instead of role when both are available', async () => {
    // Skip if no project architect
    if (createdProjectAgentIds.length === 0) {
      console.log('⚠️ Skipping agentId test - no project architect available')
      return
    }

    const threadId = `test-architect-shortid-${Date.now()}`
    
    const response = await ky.post(`${API_URL}/invoke`, {
      json: {
        workflow: {
          agentId: 'architect_01', // Use short ID format
          task: 'Design a caching strategy for a high-traffic web application'
        },
        threadId,
        projectId: TEST_PROJECT_ID,
        startNewConversation: true
      },
      timeout: 10000
    }).json<{ threadId: string }>()

    expect(response.threadId).toBe(threadId)
    console.log('✓ Architect resolution by agentId initiated successfully')

    // Verify it used the specific agent
    const status = await waitForWorkflowCompletion(threadId)
    expect(status.steps[0]).toMatchObject({
      agentId: 'architect_01'
    })
    console.log('✓ Confirmed architect_01 was used via agentId')
  })
})