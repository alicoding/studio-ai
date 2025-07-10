/**
 * Concurrency and Race Condition Tests for Workflow API
 * Tests concurrent execution, resource contention, and timing edge cases
 *
 * KISS: Direct tests for concurrency scenarios
 * DRY: Reuses helper functions
 * SOLID: Each test validates one concurrency pattern
 */

import { describe, it, expect } from 'vitest'
import ky from 'ky'
import type { InvokeResponse } from '../../schemas/invoke'

const API_URL = process.env.CLAUDE_STUDIO_API || 'http://localhost:3456/api'

// Helper to run multiple workflows and measure timing
async function runConcurrentWorkflows(
  workflows: Array<{ agentId: string; task: string }>,
  useSync = true
): Promise<{ results: InvokeResponse[]; totalTime: number }> {
  const startTime = Date.now()

  const promises = workflows.map((workflow) =>
    ky
      .post(`${API_URL}/invoke${useSync ? '' : '/async'}`, {
        json: { workflow },
        timeout: 120000,
      })
      .json<InvokeResponse>()
  )

  const results = await Promise.all(promises)
  const totalTime = Date.now() - startTime

  return { results, totalTime }
}

describe('Workflow Concurrency and Race Condition Tests', () => {
  describe('Agent Resource Contention', () => {
    it('should handle multiple workflows using same agent concurrently', async () => {
      const workflows = [
        { agentId: 'developer_01', task: 'Task 1: Count to 3 and say "done1"' },
        { agentId: 'developer_01', task: 'Task 2: Count to 3 and say "done2"' },
        { agentId: 'developer_01', task: 'Task 3: Count to 3 and say "done3"' },
      ]

      const { results, totalTime } = await runConcurrentWorkflows(workflows)

      // All should complete
      results.forEach((result) => {
        expect(result.status).toBe('completed')
      })

      // Should get unique responses
      const outputs = results.map((r) => r.results['step-0'])
      expect(outputs.filter((o) => o.includes('done1')).length).toBe(1)
      expect(outputs.filter((o) => o.includes('done2')).length).toBe(1)
      expect(outputs.filter((o) => o.includes('done3')).length).toBe(1)

      console.log(`Concurrent same-agent workflows completed in ${totalTime}ms`)
    })

    it('should handle workflows across different agents in parallel', async () => {
      const workflows = [
        { agentId: 'developer_01', task: 'Dev task: return "DEV_RESULT"' },
        { agentId: 'reviewer_01', task: 'Review task: return "REVIEW_RESULT"' },
        { agentId: 'orchestrator_01', task: 'Orchestrator task: return "ORCHESTRATOR_RESULT"' },
      ]

      const { results, totalTime } = await runConcurrentWorkflows(workflows)

      // All should complete successfully
      results.forEach((result) => {
        expect(result.status).toBe('completed')
      })

      // Should execute in parallel (faster than sequential)
      expect(totalTime).toBeLessThan(60000) // Should be much faster than 3x single task

      // Verify unique outputs
      const outputs = results.map((r) => r.results['step-0'])
      expect(outputs.some((o) => o.includes('DEV_RESULT'))).toBe(true)
      expect(outputs.some((o) => o.includes('REVIEW_RESULT'))).toBe(true)
      expect(outputs.some((o) => o.includes('ORCHESTRATOR_RESULT'))).toBe(true)
    })
  })

  describe('Session Isolation', () => {
    it('should maintain separate sessions across concurrent workflows', async () => {
      const workflows = [
        { agentId: 'developer_01', task: 'Remember the number 111 and return it' },
        { agentId: 'developer_01', task: 'Remember the number 222 and return it' },
        { agentId: 'developer_01', task: 'Remember the number 333 and return it' },
      ]

      const { results } = await runConcurrentWorkflows(workflows)

      // All should complete
      results.forEach((result) => {
        expect(result.status).toBe('completed')
      })

      // Each should have different session IDs
      const sessionIds = results.map((r) => r.sessionIds['step-0'])
      expect(new Set(sessionIds).size).toBe(3) // All unique

      // Each should remember only their own number
      const outputs = results.map((r) => r.results['step-0'])
      expect(outputs.filter((o) => o.includes('111')).length).toBe(1)
      expect(outputs.filter((o) => o.includes('222')).length).toBe(1)
      expect(outputs.filter((o) => o.includes('333')).length).toBe(1)
    })
  })

  describe('Database Race Conditions', () => {
    it('should handle rapid session creation without conflicts', async () => {
      // Create many workflows rapidly to test session/DB race conditions
      const workflows = Array.from({ length: 5 }, (_, i) => ({
        agentId: 'developer_01',
        task: `Rapid test ${i}: return exactly "RAPID_${i}"`,
      }))

      const { results } = await runConcurrentWorkflows(workflows)

      // All should complete without database conflicts
      results.forEach((result, i) => {
        expect(result.status).toBe('completed')
        expect(result.results['step-0']).toContain(`RAPID_${i}`)
      })

      // All should have unique thread IDs
      const threadIds = results.map((r) => r.threadId)
      expect(new Set(threadIds).size).toBe(5)
    })
  })

  describe('WebSocket Event Broadcasting', () => {
    it('should handle concurrent SSE connections for different workflows', async () => {
      // Start multiple async workflows
      const asyncPromises = Array.from({ length: 3 }, (_, i) =>
        ky
          .post(`${API_URL}/invoke/async`, {
            json: {
              workflow: {
                agentId: 'developer_01',
                task: `Async test ${i}: return "ASYNC_${i}"`,
              },
            },
          })
          .json<{ threadId: string }>()
      )

      const asyncResults = await Promise.all(asyncPromises)
      const threadIds = asyncResults.map((r) => r.threadId)

      // Create SSE connections for each
      const eventSources = threadIds.map((id) => new EventSource(`${API_URL}/invoke/stream/${id}`))

      // Count events received per connection
      const eventCounts = new Array(3).fill(0)
      const receivedEvents: Array<Array<{ type: string; threadId: string }>> = [[], [], []]

      await Promise.all(
        eventSources.map(
          (es, index) =>
            new Promise<void>((resolve) => {
              let eventCount = 0

              es.onmessage = (event) => {
                const data = JSON.parse(event.data)
                receivedEvents[index].push(data)
                eventCount++
                eventCounts[index] = eventCount

                // Close after receiving some events
                if (eventCount >= 2) {
                  es.close()
                  resolve()
                }
              }

              es.onerror = () => {
                es.close()
                resolve()
              }

              // Timeout fallback
              setTimeout(() => {
                es.close()
                resolve()
              }, 10000)
            })
        )
      )

      // Verify events were properly isolated
      receivedEvents.forEach((events, index) => {
        const expectedThreadId = threadIds[index]
        events.forEach((event) => {
          expect(event.threadId).toBe(expectedThreadId)
        })
      })
    })
  })

  describe('Template Variable Race Conditions', () => {
    it('should handle concurrent template resolution without cross-contamination', async () => {
      const workflows = [
        {
          agentId: 'developer_01',
          task: 'Multi-step workflow A',
          steps: [
            { id: 'a1', agentId: 'developer_01', task: 'Return "VALUE_A"' },
            {
              id: 'a2',
              agentId: 'developer_01',
              task: 'Use {a1.output} in response',
              deps: ['a1'],
            },
          ],
        },
        {
          agentId: 'developer_01',
          task: 'Multi-step workflow B',
          steps: [
            { id: 'b1', agentId: 'developer_01', task: 'Return "VALUE_B"' },
            {
              id: 'b2',
              agentId: 'developer_01',
              task: 'Use {b1.output} in response',
              deps: ['b1'],
            },
          ],
        },
      ]

      const promises = workflows.map((w) =>
        ky
          .post(`${API_URL}/invoke`, {
            json: { workflow: w.steps },
            timeout: 120000,
          })
          .json<InvokeResponse>()
      )

      const results = await Promise.all(promises)

      // Both should complete
      results.forEach((result) => {
        expect(result.status).toBe('completed')
      })

      // Template variables should be resolved correctly in each workflow
      expect(results[0].results.a2).toContain('VALUE_A')
      expect(results[1].results.b2).toContain('VALUE_B')

      // No cross-contamination
      expect(results[0].results.a2).not.toContain('VALUE_B')
      expect(results[1].results.b2).not.toContain('VALUE_A')
    })
  })

  describe('Memory and Resource Limits', () => {
    it('should handle many concurrent small workflows', async () => {
      // Test with more workflows to check resource limits
      const workflows = Array.from({ length: 8 }, (_, i) => ({
        agentId: i % 2 === 0 ? 'developer_01' : 'reviewer_01',
        task: `Small task ${i}: return ${i}`,
      }))

      const { results, totalTime } = await runConcurrentWorkflows(workflows)

      // All should complete
      results.forEach((result, i) => {
        expect(result.status).toBe('completed')
        expect(result.results['step-0']).toContain(i.toString())
      })

      console.log(`${workflows.length} concurrent workflows completed in ${totalTime}ms`)

      // Should complete in reasonable time (not be severely bottlenecked)
      expect(totalTime).toBeLessThan(120000) // 2 minutes max
    })
  })

  describe('Error Propagation in Concurrent Scenarios', () => {
    it('should isolate errors between concurrent workflows', async () => {
      const workflows = [
        { agentId: 'developer_01', task: 'Good task: return "SUCCESS"' },
        { agentId: 'non_existent_agent', task: 'Bad task: will fail' },
        { agentId: 'reviewer_01', task: 'Another good task: return "ALSO_SUCCESS"' },
      ]

      const { results } = await runConcurrentWorkflows(workflows)

      // Should have mixed success/failure
      expect(results.filter((r) => r.status === 'completed').length).toBe(2)
      expect(results.filter((r) => r.status === 'failed').length).toBe(1)

      // Successful workflows should not be affected by failed one
      const successfulResults = results.filter((r) => r.status === 'completed')
      expect(successfulResults.some((r) => r.results['step-0']?.includes('SUCCESS'))).toBe(true)
      expect(successfulResults.some((r) => r.results['step-0']?.includes('ALSO_SUCCESS'))).toBe(
        true
      )
    })
  })

  describe('Async/Sync Mixed Execution', () => {
    it('should handle mix of sync and async workflows simultaneously', async () => {
      // Start async workflows
      const asyncPromises = [
        ky
          .post(`${API_URL}/invoke/async`, {
            json: {
              workflow: { agentId: 'developer_01', task: 'Async 1: return "ASYNC_1"' },
            },
          })
          .json<{ threadId: string }>(),
        ky
          .post(`${API_URL}/invoke/async`, {
            json: {
              workflow: { agentId: 'reviewer_01', task: 'Async 2: return "ASYNC_2"' },
            },
          })
          .json<{ threadId: string }>(),
      ]

      // Start sync workflows
      const syncPromises = [
        ky
          .post(`${API_URL}/invoke`, {
            json: {
              workflow: { agentId: 'orchestrator_01', task: 'Sync 1: return "SYNC_1"' },
            },
            timeout: 60000,
          })
          .json<InvokeResponse>(),
        ky
          .post(`${API_URL}/invoke`, {
            json: {
              workflow: { agentId: 'developer_01', task: 'Sync 2: return "SYNC_2"' },
            },
            timeout: 60000,
          })
          .json<InvokeResponse>(),
      ]

      // Wait for both types
      const [asyncResults, syncResults] = await Promise.all([
        Promise.all(asyncPromises),
        Promise.all(syncPromises),
      ])

      // Async should return threadIds
      asyncResults.forEach((result) => {
        expect(result.threadId).toBeDefined()
      })

      // Sync should return completed results
      syncResults.forEach((result) => {
        expect(result.status).toBe('completed')
      })

      expect(syncResults[0].results['step-0']).toContain('SYNC_1')
      expect(syncResults[1].results['step-0']).toContain('SYNC_2')
    })
  })
})
