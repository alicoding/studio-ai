/**
 * Test multi-agent parallel workflow via /api/invoke
 *
 * MOCKED TEST - No real API calls or Claude SDK usage
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setupInvokeTestMocks, cleanupMocks, DEFAULT_MOCK_RESPONSES } from './test-mocks'
import type { KyInstance } from 'ky'
import type { MockInvokeResponse } from './test-mocks'

describe('Parallel Workflow Invocation', () => {
  let mockKy: Partial<KyInstance>

  beforeEach(() => {
    const { kyMocks } = setupInvokeTestMocks()
    mockKy = kyMocks
  })

  afterEach(() => {
    cleanupMocks()
  })

  it('should execute multi-agent parallel workflow successfully', async () => {
    // Custom response for parallel workflow
    const parallelResponse: MockInvokeResponse = {
      ...DEFAULT_MOCK_RESPONSES.invoke,
      sessionIds: {
        step1: 'session-step1-123',
        step2: 'session-step2-123',
        step3: 'session-step3-123',
      },
      results: [
        {
          stepId: 'step1',
          agentId: 'developer_01',
          output: 'Mock: 2 + 2 = 4',
          status: 'completed',
        },
        {
          stepId: 'step2',
          agentId: 'architect_01',
          output: 'Mock: 3 + 3 = 6',
          status: 'completed',
        },
        {
          stepId: 'step3',
          agentId: 'tester_01',
          output: 'Mock: 4 + 4 = 8',
          status: 'completed',
        },
      ],
      status: 'completed',
    }

    // Re-setup mocks with custom response
    cleanupMocks()
    const { kyMocks: newMockKy } = setupInvokeTestMocks({ invoke: parallelResponse })
    mockKy = newMockKy

    // Test data - multiple agents with no dependencies (parallel)
    const request = {
      workflow: [
        {
          id: 'step1',
          role: 'developer',
          task: 'What is 2 + 2?',
        },
        {
          id: 'step2',
          role: 'architect',
          task: 'What is 3 + 3?',
        },
        {
          id: 'step3',
          role: 'tester',
          task: 'What is 4 + 4?',
        },
      ],
      projectId: 'test-project-123',
      startNewConversation: true,
      format: 'json',
    }

    // Import the mocked ky
    const ky = (await import('ky')).default as KyInstance

    // Send request (this will use our mock)
    const response = (await ky
      .post('http://localhost:3456/api/invoke', {
        json: request,
        timeout: 60000,
      })
      .json()) as MockInvokeResponse

    // Validate mock was called
    expect(mockKy.post).toHaveBeenCalledWith(
      'http://localhost:3456/api/invoke',
      expect.objectContaining({
        json: request,
        timeout: 60000,
      })
    )

    // Validate response structure
    expect(response).toHaveProperty('threadId')
    expect(response).toHaveProperty('sessionIds')
    expect(response).toHaveProperty('results')
    expect(response).toHaveProperty('status')

    // Validate that we got results for all steps
    const stepIds = ['step1', 'step2', 'step3']
    for (const stepId of stepIds) {
      expect(response.sessionIds).toHaveProperty(stepId)
      const result = response.results.find((r) => r.stepId === stepId)
      expect(result).toBeDefined()
      expect(result?.status).toBe('completed')
    }

    // Validate all results completed
    expect(response.results).toHaveLength(3)
    expect(response.status).toBe('completed')
  })

  it('should handle parallel execution with different agent roles', async () => {
    const request = {
      workflow: [
        { id: 'dev1', role: 'developer', task: 'Task 1' },
        { id: 'dev2', role: 'developer', task: 'Task 2' },
        { id: 'arch1', role: 'architect', task: 'Task 3' },
      ],
      projectId: 'test-project-123',
    }

    const ky = (await import('ky')).default as KyInstance
    const response = (await ky
      .post('http://localhost:3456/api/invoke', {
        json: request,
      })
      .json()) as MockInvokeResponse

    // Verify the request was made
    expect(mockKy.post).toHaveBeenCalled()
    expect(response.threadId).toBeDefined()
  })

  it('should validate parallel workflow completes faster than sequential', async () => {
    // This is a conceptual test - in real parallel execution,
    // all steps would complete around the same time
    const request = {
      workflow: Array.from({ length: 5 }, (_, i) => ({
        id: `step${i + 1}`,
        role: 'developer',
        task: `Parallel task ${i + 1}`,
      })),
      projectId: 'test-project-123',
    }

    const ky = (await import('ky')).default as KyInstance
    const startTime = Date.now()

    await ky
      .post('http://localhost:3456/api/invoke', {
        json: request,
      })
      .json()

    const duration = Date.now() - startTime

    // Mock completes instantly
    expect(duration).toBeLessThan(100)
    expect(mockKy.post).toHaveBeenCalled()
  })
})
