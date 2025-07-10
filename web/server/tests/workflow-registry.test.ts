/**
 * WorkflowRegistry Tests
 *
 * Tests the PostgreSQL-based workflow persistence system
 */

import { WorkflowRegistry } from '../services/WorkflowRegistry'

interface WorkflowsApiResponse {
  workflows: Array<{
    threadId: string
    status: string
    steps: Array<{ id: string; status: string }>
  }>
}

describe('WorkflowRegistry', () => {
  let registry: WorkflowRegistry
  const testThreadId = `test-${Date.now()}`

  beforeAll(async () => {
    registry = WorkflowRegistry.getInstance()
    await registry.initialize()
  })

  afterAll(async () => {
    // Clean up test data
    try {
      await registry.deleteWorkflow(testThreadId)
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('Database Operations', () => {
    it('should initialize database tables', async () => {
      expect(registry).toBeDefined()
      // Registry should be initialized without throwing
    })

    it('should register a new workflow', async () => {
      const workflow = {
        threadId: testThreadId,
        status: 'running' as const,
        projectId: 'test-project',
        projectName: 'Test Project',
        startedBy: 'Test Suite',
        invocation: 'Testing workflow registration',
        currentStep: 'step-1',
        lastUpdate: new Date().toISOString(),
        sessionIds: { 'step-1': 'session-123' },
        steps: [
          {
            id: 'step-1',
            task: 'Test task',
            status: 'running' as const,
            dependencies: [],
          },
        ],
      }

      await expect(registry.registerWorkflow(workflow)).resolves.not.toThrow()
    })

    it('should retrieve an existing workflow', async () => {
      const workflow = await registry.getWorkflow(testThreadId)

      expect(workflow).not.toBeNull()
      expect(workflow?.threadId).toBe(testThreadId)
      expect(workflow?.status).toBe('running')
      expect(workflow?.projectName).toBe('Test Project')
      expect(workflow?.steps).toHaveLength(1)
    })

    it('should update workflow status', async () => {
      await registry.updateWorkflow(testThreadId, {
        status: 'completed',
        currentStep: 'step-2',
      })

      const updated = await registry.getWorkflow(testThreadId)
      expect(updated?.status).toBe('completed')
      expect(updated?.currentStep).toBe('step-2')
    })

    it('should list workflows', async () => {
      const workflows = await registry.listWorkflows()

      expect(Array.isArray(workflows)).toBe(true)
      expect(workflows.some((w) => w.threadId === testThreadId)).toBe(true)
    })

    it('should handle non-existent workflow', async () => {
      const nonExistent = await registry.getWorkflow('non-existent-id')
      expect(nonExistent).toBeNull()
    })
  })

  describe('API Integration', () => {
    it('should be accessible via API endpoint', async () => {
      const response = await fetch('http://localhost:3457/api/invoke-status/workflows')
      expect(response.ok).toBe(true)

      const data = (await response.json()) as WorkflowsApiResponse
      expect(data).toHaveProperty('workflows')
      expect(Array.isArray(data.workflows)).toBe(true)
    })
  })
})
