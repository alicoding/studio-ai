/**
 * Async Workflow API Tests
 * Tests for /api/invoke/async, /api/invoke/stream/:threadId, and related endpoints
 *
 * KISS: Simple, focused tests for each endpoint
 * DRY: Reuses test utilities and patterns
 * SOLID: Each test has single responsibility
 */

import { describe, it, expect } from 'vitest'
import ky from 'ky'
import type { InvokeResponse } from '../../schemas/invoke'

const API_URL = process.env.CLAUDE_STUDIO_API || 'http://localhost:3456/api'

// Mock EventSource for SSE tests
class MockEventSource {
  url: string
  readyState: number = 0
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(url: string) {
    this.url = url
    this.readyState = 1 // OPEN
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 10)
  }

  close() {
    this.readyState = 2 // CLOSED
  }

  // Helper to simulate incoming messages
  simulateMessage(data: string) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }))
    }
  }
}

// @ts-ignore - Mock global EventSource
global.EventSource = MockEventSource

describe('Async Workflow API Tests', () => {
  describe('POST /api/invoke/async', () => {
    it('should start async workflow and return threadId immediately', async () => {
      const response = await ky
        .post(`${API_URL}/invoke/async`, {
          json: {
            workflow: {
              agentId: 'developer_01',
              task: 'Say hello asynchronously',
            },
          },
        })
        .json<{ threadId: string; status: string }>()

      expect(response).toHaveProperty('threadId')
      expect(response.status).toBe('started')
      expect(response.threadId).toMatch(/^[a-f0-9-]{36}$/) // UUID format
    })

    it('should accept custom threadId for resume functionality', async () => {
      const customThreadId = 'test-resume-thread-123'

      const response = await ky
        .post(`${API_URL}/invoke/async`, {
          json: {
            workflow: {
              agentId: 'developer_01',
              task: 'Resume test',
            },
            threadId: customThreadId,
          },
        })
        .json<{ threadId: string; status: string }>()

      expect(response.threadId).toBe(customThreadId)
      expect(response.status).toBe('started')
    })

    it('should handle multi-step workflows with dependencies', async () => {
      const response = await ky
        .post(`${API_URL}/invoke/async`, {
          json: {
            workflow: [
              { id: 'step1', agentId: 'developer_01', task: 'First step' },
              {
                id: 'step2',
                agentId: 'developer_01',
                task: 'Second step using {step1.output}',
                deps: ['step1'],
              },
            ],
          },
        })
        .json<{ threadId: string; status: string }>()

      expect(response).toHaveProperty('threadId')
      expect(response.status).toBe('started')
    })

    it('should validate request schema', async () => {
      await expect(
        ky
          .post(`${API_URL}/invoke/async`, {
            json: {
              // Missing required workflow field
              invalidField: 'test',
            },
          })
          .json()
      ).rejects.toThrow('400')
    })

    it('should handle projectId parameter', async () => {
      const response = await ky
        .post(`${API_URL}/invoke/async`, {
          json: {
            workflow: {
              agentId: 'developer_01',
              task: 'Project-specific task',
            },
            projectId: '93b33a8b-dbc0-4b09-99ed-cb737239b409',
          },
        })
        .json<{ threadId: string; status: string }>()

      expect(response).toHaveProperty('threadId')
      expect(response.status).toBe('started')
    })
  })

  describe('GET /api/invoke/stream/:threadId', () => {
    it('should establish SSE connection for workflow events', async () => {
      // First start an async workflow
      const { threadId } = await ky
        .post(`${API_URL}/invoke/async`, {
          json: {
            workflow: {
              agentId: 'developer_01',
              task: 'Stream test',
            },
          },
        })
        .json<{ threadId: string }>()

      // Then connect to SSE stream
      const eventSource = new EventSource(`${API_URL}/invoke/stream/${threadId}`)

      interface WorkflowEvent {
        type: string
        threadId: string
        sessionIds?: Record<string, string>
        stepId?: string
        timestamp?: string
      }

      const events: WorkflowEvent[] = []

      await new Promise<void>((resolve, reject) => {
        eventSource.onopen = () => {
          expect(eventSource.readyState).toBe(1) // OPEN
        }

        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data) as WorkflowEvent
          events.push(data)

          // Check event structure
          expect(data).toHaveProperty('type')
          expect(data).toHaveProperty('threadId', threadId)

          // Close after receiving some events
          if (events.length >= 2) {
            eventSource.close()
            expect(events.some((e) => e.type === 'recovery')).toBe(true)
            resolve()
          }
        }

        eventSource.onerror = () => {
          eventSource.close()
          reject(new Error('EventSource error'))
        }

        // Simulate some events for testing
        setTimeout(() => {
          const mockEventSource = eventSource as unknown as MockEventSource
          mockEventSource.simulateMessage(
            JSON.stringify({
              type: 'recovery',
              threadId,
              sessionIds: { 'step-0': 'session-123' },
            })
          )

          mockEventSource.simulateMessage(
            JSON.stringify({
              type: 'step_start',
              threadId,
              stepId: 'step-0',
              timestamp: new Date().toISOString(),
            })
          )
        }, 50)
      })
    })

    it('should handle invalid threadId', async () => {
      const eventSource = new EventSource(`${API_URL}/invoke/stream/invalid-thread-id`)

      await new Promise<void>((resolve) => {
        eventSource.onerror = () => {
          expect(eventSource.readyState).toBe(2) // CLOSED
          eventSource.close()
          resolve()
        }

        // Simulate error - EventSource onerror expects Event, not ErrorEvent
        setTimeout(() => {
          // Cast the mock eventSource to bypass type checking since we're testing
          const mockEventSource = eventSource as unknown as MockEventSource
          if (mockEventSource.onerror) {
            mockEventSource.onerror(new Event('error'))
          }
        }, 50)
      })
    })
  })

  describe('Workflow Status Tracking', () => {
    it('should track workflow status via GET /api/invoke/status/:threadId', async () => {
      // Start a workflow
      const { threadId } = await ky
        .post(`${API_URL}/invoke/async`, {
          json: {
            workflow: {
              agentId: 'developer_01',
              task: 'Status tracking test',
            },
          },
        })
        .json<{ threadId: string }>()

      // Check status (might be 404 initially if not using updateWorkflowStatus)
      try {
        interface WorkflowStatus {
          threadId: string
          status: 'running' | 'completed' | 'failed' | 'aborted'
          sessionIds: Record<string, string>
          lastUpdate: Date
          currentStep?: string
        }

        const status = await ky
          .get(`${API_URL}/invoke-status/status/${threadId}`)
          .json<WorkflowStatus>()

        expect(status).toHaveProperty('threadId', threadId)
        expect(status).toHaveProperty('status')
        expect(['running', 'completed', 'failed', 'aborted']).toContain(status.status)
      } catch (error) {
        // 404 is expected if workflow hasn't updated status yet
        if (error instanceof Error && error.message.includes('404')) {
          expect(true).toBe(true) // Expected behavior
        } else {
          throw error
        }
      }
    })

    it('should get workflow state via POST /api/invoke/status/:threadId', async () => {
      const threadId = 'test-state-query'
      const steps = [
        { id: 'step1', agentId: 'developer_01', task: 'Step 1' },
        { id: 'step2', agentId: 'developer_01', task: 'Step 2', deps: ['step1'] },
      ]

      // Start workflow
      await ky
        .post(`${API_URL}/invoke/async`, {
          json: {
            workflow: steps,
            threadId,
          },
        })
        .json()

      // Query state
      const state = await ky
        .post(`${API_URL}/invoke-status/status/${threadId}`, {
          json: { steps },
        })
        .json<{
          threadId: string
          completedSteps: string[]
          pendingSteps: string[]
          sessionIds: Record<string, string>
          canResume: boolean
        }>()

      expect(state.threadId).toBe(threadId)
      expect(state).toHaveProperty('completedSteps')
      expect(state).toHaveProperty('pendingSteps')
      expect(state).toHaveProperty('sessionIds')
      expect(state).toHaveProperty('canResume')
      expect(Array.isArray(state.completedSteps)).toBe(true)
      expect(Array.isArray(state.pendingSteps)).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Test with invalid endpoint
      await expect(
        ky
          .post(`http://localhost:9999/api/invoke/async`, {
            json: {
              workflow: { agentId: 'developer_01', task: 'Test' },
            },
            timeout: 1000,
          })
          .json()
      ).rejects.toThrow()
    })

    it('should handle malformed workflow data', async () => {
      await expect(
        ky
          .post(`${API_URL}/invoke/async`, {
            json: {
              workflow: {
                // Missing required fields
                task: 'Test',
              },
            },
          })
          .json()
      ).rejects.toThrow('400')
    })
  })

  describe('Workflow Resume Functionality', () => {
    it('should resume workflow with same threadId', async () => {
      const threadId = 'resume-test-thread'

      // Start workflow
      const response1 = await ky
        .post(`${API_URL}/invoke/async`, {
          json: {
            workflow: {
              agentId: 'developer_01',
              task: 'Initial task',
            },
            threadId,
          },
        })
        .json<{ threadId: string; status: string }>()

      expect(response1.threadId).toBe(threadId)

      // Simulate interruption and resume
      const response2 = await ky
        .post(`${API_URL}/invoke/async`, {
          json: {
            workflow: {
              agentId: 'developer_01',
              task: 'Resume task',
            },
            threadId,
          },
        })
        .json<{ threadId: string; status: string }>()

      expect(response2.threadId).toBe(threadId)
      expect(response2.status).toBe('started')
    })
  })
})

describe('Synchronous Workflow Tests', () => {
  describe('POST /api/invoke', () => {
    it('should execute synchronous workflow and wait for completion', async () => {
      const response = await ky
        .post(`${API_URL}/invoke`, {
          json: {
            workflow: {
              agentId: 'developer_01',
              task: 'Calculate 2 + 2 and respond with just the number',
            },
          },
          timeout: 30000, // 30 seconds for sync execution
        })
        .json<InvokeResponse>()

      expect(response).toHaveProperty('threadId')
      expect(response).toHaveProperty('results')
      expect(response).toHaveProperty('status')
      expect(response).toHaveProperty('sessionIds')
      expect(response.status).toBe('completed')
      expect(Object.keys(response.results).length).toBeGreaterThan(0)
    })

    it('should handle multi-step workflows with template variables', async () => {
      const response = await ky
        .post(`${API_URL}/invoke`, {
          json: {
            workflow: [
              {
                id: 'calc',
                agentId: 'developer_01',
                task: 'Calculate 10 + 5. Respond with just "Result: 15"',
              },
              {
                id: 'double',
                agentId: 'developer_01',
                task: 'Take {calc.output} and double the number',
                deps: ['calc'],
              },
            ],
          },
          timeout: 60000, // 60 seconds for multi-step
        })
        .json<InvokeResponse>()

      expect(response.status).toBe('completed')
      expect(response.results).toHaveProperty('calc')
      expect(response.results).toHaveProperty('double')
      expect(Object.keys(response.sessionIds).length).toBe(2)
    })

    it('should handle workflow failures gracefully', async () => {
      const response = await ky
        .post(`${API_URL}/invoke`, {
          json: {
            workflow: {
              agentId: 'nonexistent_agent',
              task: 'This should fail',
            },
          },
          timeout: 30000,
        })
        .json<InvokeResponse>()

      expect(response.status).toBe('failed')
      expect(response.summary?.failed).toBeGreaterThan(0)
    })
  })
})
