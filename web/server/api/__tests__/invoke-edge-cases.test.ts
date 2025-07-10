/**
 * Edge Cases and Comprehensive Coverage for Workflow API
 * Ensures no bugs in sync/async workflow execution
 *
 * KISS: Focused tests for specific edge cases
 * DRY: Reuses test patterns from invoke-async.test.ts
 * SOLID: Each test validates one specific scenario
 */

import { describe, it, expect } from 'vitest'
import ky from 'ky'
import type { InvokeResponse } from '../../schemas/invoke'

const API_URL = process.env.CLAUDE_STUDIO_API || 'http://localhost:3456/api'

// Helper to wait for workflow completion via polling
async function waitForWorkflowCompletion(
  threadId: string,
  maxAttempts = 30,
  delayMs = 1000
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const status = await ky.get(`${API_URL}/invoke-status/status/${threadId}`).json<{
        status: string
      }>()

      if (status.status === 'completed' || status.status === 'failed') {
        return status.status
      }
    } catch {
      // 404 is expected initially
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  return 'timeout'
}

describe('Workflow Edge Cases and Bug Prevention', () => {
  describe('Template Variable Resolution', () => {
    it('should correctly resolve nested template variables', async () => {
      const response = await ky
        .post(`${API_URL}/invoke`, {
          json: {
            workflow: [
              {
                id: 'data',
                agentId: 'developer_01',
                task: 'Return exactly: {"value": 42, "nested": {"key": "secret"}}',
              },
              {
                id: 'use_nested',
                agentId: 'developer_01',
                task: 'Extract the nested key from {data.output}',
                deps: ['data'],
              },
            ],
          },
          timeout: 60000,
        })
        .json<InvokeResponse>()

      expect(response.status).toBe('completed')
      expect(response.results.data).toBeDefined()
      expect(response.results.use_nested).toBeDefined()
      // Verify template was resolved
      expect(response.results.use_nested).toContain('secret')
    })

    it('should handle missing template variable gracefully', async () => {
      const response = await ky
        .post(`${API_URL}/invoke`, {
          json: {
            workflow: [
              {
                id: 'step1',
                agentId: 'developer_01',
                task: 'Say hello',
              },
              {
                id: 'step2',
                agentId: 'developer_01',
                task: 'Use this non-existent output: {nonexistent.output}',
                deps: ['step1'],
              },
            ],
          },
          timeout: 60000,
        })
        .json<InvokeResponse>()

      expect(response.status).toBe('completed')
      // Template should remain unresolved or handled gracefully
      expect(response.results.step2).toBeDefined()
    })
  })

  describe('Dependency Handling', () => {
    it('should handle circular dependencies', async () => {
      const response = await ky
        .post(`${API_URL}/invoke`, {
          json: {
            workflow: [
              {
                id: 'a',
                agentId: 'developer_01',
                task: 'Task A depends on B',
                deps: ['b'],
              },
              {
                id: 'b',
                agentId: 'developer_01',
                task: 'Task B depends on A',
                deps: ['a'],
              },
            ],
          },
          timeout: 30000,
        })
        .json<InvokeResponse>()

      // Should either fail or handle gracefully
      expect(['failed', 'completed']).toContain(response.status)
      if (response.status === 'failed') {
        expect(response.summary?.failed).toBeGreaterThan(0)
      }
    })

    it('should execute independent steps in parallel', async () => {
      const startTime = Date.now()

      const response = await ky
        .post(`${API_URL}/invoke`, {
          json: {
            workflow: [
              {
                id: 'slow1',
                agentId: 'developer_01',
                task: 'Count to 3 slowly then say "done1"',
              },
              {
                id: 'slow2',
                agentId: 'developer_01',
                task: 'Count to 3 slowly then say "done2"',
              },
              {
                id: 'slow3',
                agentId: 'developer_01',
                task: 'Count to 3 slowly then say "done3"',
              },
            ],
          },
          timeout: 120000,
        })
        .json<InvokeResponse>()

      const duration = Date.now() - startTime

      expect(response.status).toBe('completed')
      expect(Object.keys(response.results).length).toBe(3)
      // If truly parallel, should complete faster than sequential
      // This is a heuristic test - may need adjustment based on actual timing
      expect(duration).toBeLessThan(90000) // Should be much less than 3x single task time
    })
  })

  describe('Session Persistence', () => {
    it('should maintain separate sessions for each step', async () => {
      const response = await ky
        .post(`${API_URL}/invoke`, {
          json: {
            workflow: [
              {
                id: 'setter',
                agentId: 'developer_01',
                task: 'Remember the number 777',
              },
              {
                id: 'getter',
                agentId: 'developer_01',
                task: 'What number did YOU remember? (not from another step)',
              },
            ],
          },
          timeout: 60000,
        })
        .json<InvokeResponse>()

      expect(response.status).toBe('completed')
      expect(Object.keys(response.sessionIds).length).toBe(2)
      // Each step should have its own session
      expect(response.sessionIds['setter']).not.toBe(response.sessionIds['getter'])
      // Second step should NOT know about first step's memory
      expect(response.results.getter).not.toContain('777')
    })

    it('should preserve session when using same agent in dependent steps', async () => {
      const threadId = `session-test-${Date.now()}`

      // First call
      await ky
        .post(`${API_URL}/invoke`, {
          json: {
            workflow: {
              agentId: 'developer_01',
              task: 'Remember this secret code: XYZABC123',
            },
            threadId,
          },
          timeout: 30000,
        })
        .json<InvokeResponse>()

      // Second call with same threadId
      const response2 = await ky
        .post(`${API_URL}/invoke`, {
          json: {
            workflow: {
              agentId: 'developer_01',
              task: 'What was the secret code I told you?',
            },
            threadId,
          },
          timeout: 30000,
        })
        .json<InvokeResponse>()

      expect(response2.status).toBe('completed')
      expect(response2.results['step-0']).toContain('XYZABC123')
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle agent not found error', async () => {
      const response = await ky
        .post(`${API_URL}/invoke`, {
          json: {
            workflow: {
              agentId: 'non_existent_agent_999',
              task: 'This should fail gracefully',
            },
          },
          timeout: 30000,
        })
        .json<InvokeResponse>()

      expect(response.status).toBe('failed')
      expect(response.summary?.failed).toBe(1)
    })

    it('should continue workflow when one step fails in parallel execution', async () => {
      const response = await ky
        .post(`${API_URL}/invoke`, {
          json: {
            workflow: [
              {
                id: 'good1',
                agentId: 'developer_01',
                task: 'Say "success1"',
              },
              {
                id: 'bad',
                agentId: 'non_existent_agent',
                task: 'This will fail',
              },
              {
                id: 'good2',
                agentId: 'developer_01',
                task: 'Say "success2"',
              },
            ],
          },
          timeout: 60000,
        })
        .json<InvokeResponse>()

      expect(response.status).toBe('failed')
      expect(response.summary?.successful).toBe(2)
      expect(response.summary?.failed).toBe(1)
      expect(response.results.good1).toBeDefined()
      expect(response.results.good2).toBeDefined()
    })
  })

  describe('Async Workflow Specific Cases', () => {
    it('should handle concurrent async workflows with same agent', async () => {
      const promises = []

      // Start 3 workflows concurrently
      for (let i = 0; i < 3; i++) {
        promises.push(
          ky
            .post(`${API_URL}/invoke/async`, {
              json: {
                workflow: {
                  agentId: 'developer_01',
                  task: `Concurrent task ${i}: return exactly "${i}"`,
                },
              },
            })
            .json<{ threadId: string }>()
        )
      }

      const results = await Promise.all(promises)

      // All should get different threadIds
      const threadIds = results.map((r) => r.threadId)
      expect(new Set(threadIds).size).toBe(3)

      // Wait for all to complete and verify
      const statuses = await Promise.all(threadIds.map((id) => waitForWorkflowCompletion(id)))

      expect(statuses.every((s) => s === 'completed')).toBe(true)
    })

    it('should handle workflow interruption and resume', async () => {
      const threadId = `interrupt-test-${Date.now()}`

      // Start a workflow
      await ky
        .post(`${API_URL}/invoke/async`, {
          json: {
            workflow: [
              {
                id: 'step1',
                agentId: 'developer_01',
                task: 'First step completed',
              },
              {
                id: 'step2',
                agentId: 'developer_01',
                task: 'This might be interrupted',
                deps: ['step1'],
              },
            ],
            threadId,
          },
        })
        .json()

      // Wait a bit then check state
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Query state
      const state = await ky
        .post(`${API_URL}/invoke-status/status/${threadId}`, {
          json: {
            steps: [
              { id: 'step1', agentId: 'developer_01', task: 'First step completed' },
              {
                id: 'step2',
                agentId: 'developer_01',
                task: 'This might be interrupted',
                deps: ['step1'],
              },
            ],
          },
        })
        .json<{
          completedSteps: string[]
          pendingSteps: string[]
          canResume: boolean
        }>()

      expect(state.canResume).toBe(true)
      expect(Array.isArray(state.completedSteps)).toBe(true)
      expect(Array.isArray(state.pendingSteps)).toBe(true)
    })
  })

  describe('SSE Streaming Edge Cases', () => {
    it('should handle rapid SSE connections and disconnections', async () => {
      // Start a workflow
      const { threadId } = await ky
        .post(`${API_URL}/invoke/async`, {
          json: {
            workflow: {
              agentId: 'developer_01',
              task: 'SSE test task',
            },
          },
        })
        .json<{ threadId: string }>()

      // Rapidly connect and disconnect
      const connections = []
      for (let i = 0; i < 5; i++) {
        const eventSource = new EventSource(`${API_URL}/invoke/stream/${threadId}`)
        connections.push(eventSource)

        // Close after short delay
        setTimeout(() => eventSource.close(), 100 * i)
      }

      // Wait for all to close
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Verify all are closed
      connections.forEach((es) => {
        expect(es.readyState).toBe(2) // CLOSED
      })
    })
  })

  describe('Large Workflow Handling', () => {
    it('should handle workflow with many steps', async () => {
      const steps = []

      // Create a chain of 10 dependent steps
      for (let i = 0; i < 10; i++) {
        steps.push({
          id: `step${i}`,
          agentId: 'developer_01',
          task: i === 0 ? 'Start with 1' : `Add 1 to the number from {step${i - 1}.output}`,
          deps: i === 0 ? undefined : [`step${i - 1}`],
        })
      }

      const response = await ky
        .post(`${API_URL}/invoke`, {
          json: { workflow: steps },
          timeout: 300000, // 5 minutes for large workflow
        })
        .json<InvokeResponse>()

      expect(response.status).toBe('completed')
      expect(Object.keys(response.results).length).toBe(10)
      expect(Object.keys(response.sessionIds).length).toBe(10)
    })
  })

  describe('Special Characters and Encoding', () => {
    it('should handle special characters in task descriptions', async () => {
      const specialChars = '{"test": "value with émojis 🚀 and special chars: <>&\'"}'

      const response = await ky
        .post(`${API_URL}/invoke`, {
          json: {
            workflow: {
              agentId: 'developer_01',
              task: `Echo exactly: ${specialChars}`,
            },
          },
          timeout: 30000,
        })
        .json<InvokeResponse>()

      expect(response.status).toBe('completed')
      expect(response.results['step-0']).toBeDefined()
    })

    it('should handle very long task descriptions', async () => {
      const longText = 'A'.repeat(1000) // 1000 character task

      const response = await ky
        .post(`${API_URL}/invoke`, {
          json: {
            workflow: {
              agentId: 'developer_01',
              task: `Process this long text and return its length: ${longText}`,
            },
          },
          timeout: 30000,
        })
        .json<InvokeResponse>()

      expect(response.status).toBe('completed')
      expect(response.results['step-0']).toContain('1000')
    })
  })
})
