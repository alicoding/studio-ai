/**
 * MockStepExecutor Tests
 * Comprehensive test suite for the MockStepExecutor implementation
 *
 * SOLID: Tests follow single responsibility - testing mock execution
 * DRY: Reusable test utilities and patterns
 * KISS: Simple, focused test cases
 * Library-First: Using Jest testing framework
 */

import { MockStepExecutor } from '../MockStepExecutor'
import type { WorkflowContext, ExecutorWorkflowStep } from '../StepExecutor'

describe('MockStepExecutor', () => {
  let executor: MockStepExecutor
  let context: WorkflowContext

  beforeEach(() => {
    executor = new MockStepExecutor()
    context = {
      stepOutputs: {},
      threadId: 'test-thread-123',
      sessionIds: {},
      startNewConversation: false,
    }
  })

  describe('canHandle', () => {
    it('should handle steps with type "mock"', () => {
      const step: ExecutorWorkflowStep = {
        id: 'test-step',
        task: 'Test task',
        type: 'mock',
      }

      expect(executor.canHandle(step)).toBe(true)
    })

    it('should handle steps without type when USE_MOCK_AI=true', () => {
      process.env.USE_MOCK_AI = 'true'

      const step: ExecutorWorkflowStep = {
        id: 'test-step',
        task: 'Test task',
      }

      expect(executor.canHandle(step)).toBe(true)

      delete process.env.USE_MOCK_AI
    })

    it('should not handle steps with other types', () => {
      const step: ExecutorWorkflowStep = {
        id: 'test-step',
        task: 'Test task',
        type: 'claude',
      }

      expect(executor.canHandle(step)).toBe(false)
    })
  })

  describe('execute', () => {
    it('should return success result with mock response', async () => {
      const step: ExecutorWorkflowStep = {
        id: 'test-step',
        task: 'Design a system',
        type: 'mock',
      }

      const result = await executor.execute(step, context)

      expect(result).toEqual({
        id: 'test-step',
        status: 'success',
        response: expect.stringContaining('REST API with Express'),
        sessionId: 'mock-session-test-step',
        duration: expect.any(Number),
      })
    })

    it('should use custom mock response when provided', async () => {
      const step: ExecutorWorkflowStep = {
        id: 'test-step',
        task: 'Test task',
        type: 'mock',
        config: {
          mockResponse: 'Custom test response: {timestamp}',
        },
      }

      const result = await executor.execute(step, context)

      expect(result.response).toContain('Custom test response:')
      expect(result.response).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('should respect mock delay configuration', async () => {
      const step: ExecutorWorkflowStep = {
        id: 'test-step',
        task: 'Test task',
        type: 'mock',
        config: {
          mockDelay: 200,
        },
      }

      const startTime = Date.now()
      await executor.execute(step, context)
      const elapsed = Date.now() - startTime

      expect(elapsed).toBeGreaterThanOrEqual(200)
    })

    describe('template variable resolution', () => {
      beforeEach(() => {
        context.stepOutputs = {
          design: 'System architecture with microservices',
          implement: 'TypeScript implementation completed',
        }
        context.projectId = 'test-project'
      })

      it('should resolve {stepId.output} template variables', async () => {
        const step: ExecutorWorkflowStep = {
          id: 'review-step',
          task: 'Review the {design.output} and {implement.output}',
          type: 'mock',
          config: {
            mockResponse: 'Reviewing: {design.output} and {implement.output}',
          },
        }

        const result = await executor.execute(step, context)

        expect(result.response).toContain('System architecture with microservices')
        expect(result.response).toContain('TypeScript implementation completed')
      })

      it('should resolve {stepId} template variables', async () => {
        const step: ExecutorWorkflowStep = {
          id: 'review-step',
          task: 'Review the design and implementation',
          type: 'mock',
          config: {
            mockResponse: 'Based on {design} and {implement}',
          },
        }

        const result = await executor.execute(step, context)

        expect(result.response).toContain('System architecture with microservices')
        expect(result.response).toContain('TypeScript implementation completed')
      })

      it('should resolve special context variables', async () => {
        const step: ExecutorWorkflowStep = {
          id: 'test-step',
          task: 'Test task',
          type: 'mock',
          config: {
            mockResponse: 'Thread: {threadId}, Project: {projectId}, Time: {timestamp}',
          },
        }

        const result = await executor.execute(step, context)

        expect(result.response).toContain('Thread: test-thread-123')
        expect(result.response).toContain('Project: test-project')
        expect(result.response).toMatch(/Time: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      })
    })

    describe('pattern matching', () => {
      const testCases = [
        { task: 'Design a system architecture', expectedPattern: 'design' },
        { task: 'Implement the user authentication', expectedPattern: 'implement' },
        { task: 'Build the API endpoints', expectedPattern: 'implement' },
        { task: 'Create unit tests for the service', expectedPattern: 'test' },
        { task: 'Review the code quality', expectedPattern: 'review' },
        { task: 'Analyze the security vulnerabilities', expectedPattern: 'security' },
        { task: 'Deploy to production environment', expectedPattern: 'deploy' },
        { task: 'Generate API documentation', expectedPattern: 'documentation' },
      ]

      testCases.forEach(({ task, expectedPattern }) => {
        it(`should match "${task}" to ${expectedPattern} pattern`, async () => {
          const step: ExecutorWorkflowStep = {
            id: 'test-step',
            task,
            type: 'mock',
          }

          const result = await executor.execute(step, context)

          // Verify the response contains content typical of the expected pattern
          switch (expectedPattern) {
            case 'design':
              expect(result.response).toContain('architecture')
              break
            case 'implement':
              expect(result.response).toContain('function')
              break
            case 'test':
              expect(result.response).toContain('describe')
              break
            case 'review':
              expect(result.response).toContain('Code Review')
              break
            case 'security':
              expect(result.response).toContain('Security Analysis')
              break
            case 'deploy':
              expect(result.response).toContain('Deployment Status')
              break
            case 'documentation':
              expect(result.response).toContain('API Documentation')
              break
          }
        })
      })
    })

    it('should generate contextual response for unmatched tasks with dependencies', async () => {
      context.stepOutputs = {
        step1: 'First step output',
        step2: 'Second step output',
      }

      const step: ExecutorWorkflowStep = {
        id: 'unknown-step',
        task: 'Some unknown task type',
        type: 'mock',
      }

      const result = await executor.execute(step, context)

      expect(result.response).toContain('Mock response for: "Some unknown task type"')
      expect(result.response).toContain('Based on step1: First step output')
      expect(result.response).toContain('Based on step2: Second step output')
    })

    it('should return default response for unmatched tasks without dependencies', async () => {
      const step: ExecutorWorkflowStep = {
        id: 'unknown-step',
        task: 'Some unknown task type',
        type: 'mock',
      }

      const result = await executor.execute(step, context)

      expect(result.response).toContain('Mock response for task: "Some unknown task type"')
      expect(result.response).toContain('This is a mock implementation for testing purposes')
      expect(result.response).toMatch(/Completed at: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })
})
