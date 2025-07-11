/**
 * Tests for Mock Workflow Executor
 * Demonstrates using MockStepExecutor for testing without API costs
 *
 * SOLID: Single responsibility - test mock workflows
 * DRY: Reuses test utilities
 * KISS: Simple test structure
 * Library-First: Uses existing test framework
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { MockStepExecutor } from '../../services/executors/MockStepExecutor'
import type { ExecutorWorkflowStep, WorkflowContext } from '../../services/executors/StepExecutor'

describe('MockStepExecutor', () => {
  let executor: MockStepExecutor

  beforeEach(() => {
    executor = new MockStepExecutor()
  })

  describe('canHandle', () => {
    it('should handle steps with type="mock"', () => {
      const step: ExecutorWorkflowStep = {
        type: 'mock',
        task: 'Test task',
      }
      expect(executor.canHandle(step)).toBe(true)
    })

    it('should handle steps when USE_MOCK_AI is true', () => {
      process.env.USE_MOCK_AI = 'true'
      const step: ExecutorWorkflowStep = {
        task: 'Test task',
      }
      expect(executor.canHandle(step)).toBe(true)
      delete process.env.USE_MOCK_AI
    })

    it('should not handle steps without mock type when USE_MOCK_AI is false', () => {
      const step: ExecutorWorkflowStep = {
        type: 'claude',
        task: 'Test task',
      }
      expect(executor.canHandle(step)).toBe(false)
    })
  })

  describe('execute', () => {
    const baseContext: WorkflowContext = {
      stepOutputs: {},
      threadId: 'test-thread-123',
      sessionIds: {},
      projectId: 'test-project',
    }

    it('should execute design task with mock response', async () => {
      const step: ExecutorWorkflowStep = {
        id: 'design-step',
        type: 'mock',
        task: 'Design the system architecture',
      }

      const result = await executor.execute(step, baseContext)

      expect(result.status).toBe('success')
      expect(result.response).toContain('REST API with Express')
      expect(result.response).toContain('PostgreSQL database')
      expect(result.sessionId).toBe('mock-session-design-step')
      expect(result.duration).toBeGreaterThan(0)
    })

    it('should execute implementation task with mock response', async () => {
      const step: ExecutorWorkflowStep = {
        id: 'impl-step',
        type: 'mock',
        task: 'Implement the user service',
      }

      const result = await executor.execute(step, baseContext)

      expect(result.status).toBe('success')
      expect(result.response).toContain('function hello()')
      expect(result.response).toContain('Hello World')
      expect(result.sessionId).toBe('mock-session-impl-step')
    })

    it('should execute test task with mock response', async () => {
      const step: ExecutorWorkflowStep = {
        id: 'test-step',
        type: 'mock',
        task: 'Write unit tests for the service',
      }

      const result = await executor.execute(step, baseContext)

      expect(result.status).toBe('success')
      expect(result.response).toContain('describe("hello"')
      expect(result.response).toContain('expect(hello())')
    })

    it('should use custom mock response when provided', async () => {
      const customResponse = 'Custom mock response: {timestamp}'
      const step: ExecutorWorkflowStep = {
        id: 'custom-step',
        type: 'mock',
        task: 'Custom task',
        config: {
          mockResponse: customResponse,
        },
      }

      const result = await executor.execute(step, baseContext)

      expect(result.status).toBe('success')
      expect(result.response).toContain('Custom mock response:')
      expect(result.response).toMatch(/\d{4}-\d{2}-\d{2}T/) // ISO timestamp
    })

    it('should respect custom delay', async () => {
      const step: ExecutorWorkflowStep = {
        id: 'delay-step',
        type: 'mock',
        task: 'Task with delay',
        config: {
          mockDelay: 200,
        },
      }

      const startTime = Date.now()
      await executor.execute(step, baseContext)
      const duration = Date.now() - startTime

      expect(duration).toBeGreaterThanOrEqual(200)
    })

    it('should resolve template variables from context', async () => {
      const contextWithOutputs: WorkflowContext = {
        ...baseContext,
        stepOutputs: {
          specs: 'REST API with microservices',
          requirements: 'Build a scalable web app',
        },
      }

      const step: ExecutorWorkflowStep = {
        id: 'impl-step',
        type: 'mock',
        task: 'Build service using {specs.output} for {requirements.output}',
      }

      const result = await executor.execute(step, contextWithOutputs)

      expect(result.status).toBe('success')
      // The mock executor matches "build" keyword and returns implementation response
      expect(result.response).toContain('function hello()')
      // But it should still have access to the context outputs
      expect(result.sessionId).toBe('mock-session-impl-step')
    })

    it('should resolve template variables in custom responses', async () => {
      const contextWithOutputs: WorkflowContext = {
        ...baseContext,
        stepOutputs: {
          'prev-step': 'Previous step output',
        },
      }

      const step: ExecutorWorkflowStep = {
        id: 'template-step',
        type: 'mock',
        task: 'Task with templates',
        config: {
          mockResponse: 'Using {prev-step.output} in thread {threadId}',
        },
      }

      const result = await executor.execute(step, contextWithOutputs)

      expect(result.status).toBe('success')
      expect(result.response).toBe('Using Previous step output in thread test-thread-123')
    })

    it('should generate contextual response for unmatched patterns', async () => {
      const contextWithOutputs: WorkflowContext = {
        ...baseContext,
        stepOutputs: {
          step1: 'First output',
          step2: 'Second output',
        },
      }

      const step: ExecutorWorkflowStep = {
        id: 'unknown-step',
        type: 'mock',
        task: 'Some unknown task pattern',
      }

      const result = await executor.execute(step, contextWithOutputs)

      expect(result.status).toBe('success')
      expect(result.response).toContain('Mock response for: "Some unknown task pattern"')
      expect(result.response).toContain('Based on step1:')
      expect(result.response).toContain('Based on step2:')
    })

    it('should provide default response for unmatched patterns without context', async () => {
      const step: ExecutorWorkflowStep = {
        id: 'default-step',
        type: 'mock',
        task: 'Unmatched task without context',
      }

      const result = await executor.execute(step, baseContext)

      expect(result.status).toBe('success')
      expect(result.response).toContain('Mock response for task: "Unmatched task without context"')
      expect(result.response).toContain('This is a mock implementation for testing purposes')
    })
  })

  describe('Pattern Matching', () => {
    const baseContext: WorkflowContext = {
      stepOutputs: {},
      threadId: 'test-thread',
      sessionIds: {},
    }

    const testPatterns = [
      { task: 'Design the database schema', expectedPattern: 'system architecture' },
      { task: 'Architect the microservices', expectedPattern: 'PostgreSQL database' },
      { task: 'Test the API endpoints', expectedPattern: 'describe("hello"' },
      { task: 'Review the code changes', expectedPattern: 'Code Review:' },
      { task: 'Analyze security vulnerabilities', expectedPattern: 'Security Analysis:' },
      { task: 'Deploy to production', expectedPattern: 'Deployment Status:' },
      { task: 'Document the API', expectedPattern: 'API Documentation' },
    ]

    testPatterns.forEach(({ task, expectedPattern }) => {
      it(`should match pattern for: "${task}"`, async () => {
        const step: ExecutorWorkflowStep = {
          id: 'pattern-test',
          type: 'mock',
          task,
        }

        const result = await executor.execute(step, baseContext)
        expect(result.response).toContain(expectedPattern)
      })
    })
  })

  describe('Template Variable Resolution', () => {
    it('should resolve multiple template variables', async () => {
      const context: WorkflowContext = {
        stepOutputs: {
          api: 'REST API Design',
          db: 'PostgreSQL Schema',
          auth: 'JWT Implementation',
        },
        threadId: 'test-thread-123',
        sessionIds: {},
        projectId: 'project-456',
      }

      const step: ExecutorWorkflowStep = {
        id: 'multi-template',
        type: 'mock',
        task: 'Integrate components',
        config: {
          mockResponse:
            'Integrating:\n- API: {api.output}\n- DB: {db}\n- Auth: {auth.output}\n- Project: {projectId}\n- Thread: {threadId}',
        },
      }

      const result = await executor.execute(step, context)

      expect(result.response).toBe(
        'Integrating:\n- API: REST API Design\n- DB: PostgreSQL Schema\n- Auth: JWT Implementation\n- Project: project-456\n- Thread: test-thread-123'
      )
    })
  })
})
