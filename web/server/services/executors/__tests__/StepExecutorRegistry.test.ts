/**
 * StepExecutorRegistry Tests
 * Test suite for the executor registry and routing logic
 *
 * SOLID: Tests follow single responsibility - testing registry functionality
 * DRY: Reusable test executors and patterns
 * KISS: Simple, focused test cases
 * Library-First: Using Jest testing framework
 */

import { StepExecutorRegistry } from '../StepExecutorRegistry'
import { MockStepExecutor } from '../MockStepExecutor'
import type { StepExecutor, WorkflowContext, ExecutorWorkflowStep } from '../StepExecutor'
import type { StepResult } from '../../../schemas/invoke'

// Mock executor for testing
class TestExecutor implements StepExecutor {
  constructor(private handledType: string) {}

  canHandle(step: ExecutorWorkflowStep): boolean {
    return step.type === this.handledType
  }

  async execute(step: ExecutorWorkflowStep, _context: WorkflowContext): Promise<StepResult> {
    return {
      id: step.id!,
      status: 'success',
      response: `Test executor (${this.handledType}) handled: ${step.task}`,
      sessionId: `test-session-${step.id}`,
      duration: 100,
    }
  }
}

describe('StepExecutorRegistry', () => {
  let registry: StepExecutorRegistry

  beforeEach(() => {
    registry = new StepExecutorRegistry()
  })

  describe('register', () => {
    it('should register new executors', () => {
      const mockExecutor = new MockStepExecutor()
      registry.register(mockExecutor)

      expect(registry.getExecutorCount()).toBe(1)
    })

    it('should allow multiple executors to be registered', () => {
      const mockExecutor = new MockStepExecutor()
      const testExecutor = new TestExecutor('test')

      registry.register(mockExecutor)
      registry.register(testExecutor)

      expect(registry.getExecutorCount()).toBe(2)
    })
  })

  describe('getExecutor', () => {
    beforeEach(() => {
      registry.register(new MockStepExecutor())
      registry.register(new TestExecutor('claude'))
      registry.register(new TestExecutor('operator'))
    })

    it('should return correct executor for explicit type', () => {
      const step: ExecutorWorkflowStep = {
        id: 'test-step',
        task: 'Test task',
        type: 'mock',
      }

      const executor = registry.getExecutor(step)
      expect(executor).toBeInstanceOf(MockStepExecutor)
    })

    it('should default to claude type for steps with role', () => {
      const step: ExecutorWorkflowStep = {
        id: 'test-step',
        task: 'Test task',
        role: 'developer',
      }

      const executor = registry.getExecutor(step)
      expect(executor).toBeInstanceOf(TestExecutor)
    })

    it('should default to claude type for steps with agentId', () => {
      const step: ExecutorWorkflowStep = {
        id: 'test-step',
        task: 'Test task',
        agentId: 'dev_01',
      }

      const executor = registry.getExecutor(step)
      expect(executor).toBeInstanceOf(TestExecutor)
    })

    it('should use mock when USE_MOCK_AI environment variable is set', () => {
      process.env.USE_MOCK_AI = 'true'

      const step: ExecutorWorkflowStep = {
        id: 'test-step',
        task: 'Test task',
      }

      const executor = registry.getExecutor(step)
      expect(executor).toBeInstanceOf(MockStepExecutor)

      delete process.env.USE_MOCK_AI
    })

    it('should default to claude for untyped steps', () => {
      const step: ExecutorWorkflowStep = {
        id: 'test-step',
        task: 'Test task',
      }

      const executor = registry.getExecutor(step)
      expect(executor).toBeInstanceOf(TestExecutor)
    })

    it('should throw error when no executor found', () => {
      const step: ExecutorWorkflowStep = {
        id: 'test-step',
        task: 'Test task',
        type: 'unknown' as ExecutorWorkflowStep['type'],
      }

      expect(() => registry.getExecutor(step)).toThrow('No executor found for step type: unknown')
    })

    it('should include available executors in error message', () => {
      const step: ExecutorWorkflowStep = {
        id: 'test-step',
        task: 'Test task',
        type: 'unknown' as ExecutorWorkflowStep['type'],
      }

      try {
        registry.getExecutor(step)
      } catch (error) {
        expect((error as Error).message).toContain('Available executors:')
        expect((error as Error).message).toMatch(/mock.*claude.*operator|claude.*mock.*operator/)
      }
    })
  })

  describe('getAvailableExecutorTypes', () => {
    it('should return empty array when no executors registered', () => {
      expect(registry.getAvailableExecutorTypes()).toEqual([])
    })

    it('should return available executor types', () => {
      registry.register(new MockStepExecutor())
      registry.register(new TestExecutor('claude'))
      registry.register(new TestExecutor('operator'))

      const types = registry.getAvailableExecutorTypes()
      expect(types).toContain('mock')
      expect(types).toContain('claude')
      expect(types).toContain('operator')
    })
  })

  describe('clear', () => {
    it('should remove all registered executors', () => {
      registry.register(new MockStepExecutor())
      registry.register(new TestExecutor('claude'))

      expect(registry.getExecutorCount()).toBe(2)

      registry.clear()

      expect(registry.getExecutorCount()).toBe(0)
      expect(registry.getAvailableExecutorTypes()).toEqual([])
    })
  })

  describe('backward compatibility', () => {
    beforeEach(() => {
      registry.register(new MockStepExecutor())
      registry.register(new TestExecutor('claude'))
    })

    it('should handle WorkflowStep without type field', () => {
      const step = {
        id: 'test-step',
        task: 'Test task',
        role: 'developer',
      }

      // Should not throw even though step doesn't have type field
      const executor = registry.getExecutor(step)
      expect(executor).toBeInstanceOf(TestExecutor)
    })

    it('should preserve original step object while adding type', () => {
      const originalStep = {
        id: 'test-step',
        task: 'Test task',
        role: 'developer',
      }

      registry.getExecutor(originalStep)

      // Original step should be preserved (no mutation)
      expect(originalStep).not.toHaveProperty('type')
    })
  })

  describe('executor priority', () => {
    it('should prefer first registered executor when multiple can handle same type', () => {
      const executor1 = new TestExecutor('test')
      const executor2 = new TestExecutor('test')

      registry.register(executor1)
      registry.register(executor2)

      const step: ExecutorWorkflowStep = {
        id: 'test-step',
        task: 'Test task',
        type: 'test',
      }

      const selectedExecutor = registry.getExecutor(step)
      expect(selectedExecutor).toBe(executor1)
    })
  })
})
