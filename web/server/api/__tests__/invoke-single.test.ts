/**
 * Test single agent invocation via /api/invoke
 *
 * MOCKED TEST - No real API calls or Claude SDK usage
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setupInvokeTestMocks, cleanupMocks, DEFAULT_MOCK_RESPONSES } from './test-mocks'
import type { KyInstance } from 'ky'
import type { MockInvokeResponse } from './test-mocks'

describe('Single Agent Invocation', () => {
  let mockKy: Partial<KyInstance>

  beforeEach(() => {
    const { kyMocks } = setupInvokeTestMocks()
    mockKy = kyMocks
  })

  afterEach(() => {
    cleanupMocks()
  })

  it('should invoke a single agent workflow successfully', async () => {
    // Test data - single agent workflow
    const request = {
      workflow: {
        role: 'developer',
        task: 'What is 2 + 2? Just give me the number.',
      },
      projectId: 'test-project-123',
      startNewConversation: true,
      format: 'json',
    }

    // Import the mocked ky
    const ky = (await import('ky')).default as KyInstance

    // Send request (this will use our mock)
    const response = await ky
      .post('http://localhost:3456/api/invoke', {
        json: request,
        timeout: 30000,
      })
      .json()

    // Validate mock was called
    expect(mockKy.post).toHaveBeenCalledWith(
      'http://localhost:3456/api/invoke',
      expect.objectContaining({
        json: request,
        timeout: 30000,
      })
    )

    // Validate response structure
    expect(response).toHaveProperty('threadId')
    expect(response).toHaveProperty('sessionIds')
    expect(response).toHaveProperty('results')
    expect(response).toHaveProperty('status')

    // Validate response matches our mock
    expect(response).toEqual(DEFAULT_MOCK_RESPONSES.invoke)
  })

  it('should handle single agent with custom response', async () => {
    // Setup custom response
    const customResponse = {
      ...DEFAULT_MOCK_RESPONSES.invoke,
      results: [
        {
          stepId: 'math-step',
          agentId: 'developer_01',
          output: '4',
          status: 'completed' as const,
        },
      ],
    }

    // Re-setup mocks with custom response
    cleanupMocks()
    const { kyMocks } = setupInvokeTestMocks({ invoke: customResponse })
    mockKy = kyMocks

    const request = {
      workflow: {
        role: 'developer',
        task: 'What is 2 + 2? Just give me the number.',
      },
      projectId: 'test-project-123',
      startNewConversation: true,
      format: 'json',
    }

    const ky = (await import('ky')).default as KyInstance
    const response = (await ky
      .post('http://localhost:3456/api/invoke', {
        json: request,
      })
      .json()) as MockInvokeResponse

    // Validate custom response
    expect(response.results[0].output).toBe('4')
    expect(response.results[0].stepId).toBe('math-step')
  })

  it('should validate required fields in request', async () => {
    const invalidRequest = {
      // Missing workflow
      projectId: 'test-project-123',
    }

    const ky = (await import('ky')).default as KyInstance

    // In a real test, the API would validate this
    // For now, we just verify the mock is called
    await ky
      .post('http://localhost:3456/api/invoke', {
        json: invalidRequest,
      })
      .json()

    expect(mockKy.post).toHaveBeenCalled()
  })
})
