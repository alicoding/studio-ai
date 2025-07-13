import { describe, it, expect, beforeEach } from 'vitest'
import { useWorkflowStore, WorkflowInfo } from '../workflows'

describe('Workflow Store', () => {
  beforeEach(() => {
    // Clear store before each test
    useWorkflowStore.setState({ workflows: {}, workflowList: [] })
  })

  describe('Basic Operations', () => {
    it('should add a workflow and update workflowList', () => {
      const store = useWorkflowStore.getState()

      const workflow: WorkflowInfo = {
        threadId: 'test-thread-123',
        status: 'running',
        startedBy: 'Claude Code CLI',
        invocation: 'Test workflow invocation',
        projectId: 'project-123',
        projectName: 'Test Project',
        webhook: 'http://localhost:8080/webhook',
        webhookType: 'tmux send-keys',
        currentStep: 'step1',
        steps: [
          {
            id: 'step1',
            role: 'developer',
            agentId: 'dev_01',
            task: 'Create test files',
            status: 'running',
            startTime: '2025-01-09T10:00:00Z',
            dependencies: [],
          },
        ],
        lastUpdate: '2025-01-09T10:00:00Z',
        sessionIds: { dev_01: 'session-123' },
      }

      store.addWorkflow(workflow)

      const state = useWorkflowStore.getState()
      expect(state.workflows['test-thread-123']).toEqual(workflow)
      expect(state.workflowList).toHaveLength(1)
      expect(state.workflowList[0]).toEqual(workflow)
    })

    it('should update workflow with lastUpdate timestamp', () => {
      const store = useWorkflowStore.getState()

      const workflow: WorkflowInfo = {
        threadId: 'test-thread-123',
        status: 'running',
        startedBy: 'Claude Code CLI',
        invocation: 'Test workflow',
        projectId: 'project-123',
        steps: [],
        lastUpdate: '2025-01-09T10:00:00Z',
        sessionIds: {},
      }

      store.addWorkflow(workflow)

      const beforeUpdate = Date.now()
      store.updateWorkflow('test-thread-123', { status: 'completed' })
      const afterUpdate = Date.now()

      const state = useWorkflowStore.getState()
      const updatedWorkflow = state.workflows['test-thread-123']

      expect(updatedWorkflow.status).toBe('completed')

      const lastUpdateTime = new Date(updatedWorkflow.lastUpdate).getTime()
      expect(lastUpdateTime).toBeGreaterThanOrEqual(beforeUpdate)
      expect(lastUpdateTime).toBeLessThanOrEqual(afterUpdate)
    })

    it('should not update non-existent workflow', () => {
      const store = useWorkflowStore.getState()

      const initialState = useWorkflowStore.getState()
      store.updateWorkflow('non-existent', { status: 'completed' })
      const finalState = useWorkflowStore.getState()

      expect(finalState).toEqual(initialState)
    })

    it('should remove workflow', () => {
      const store = useWorkflowStore.getState()

      const workflow: WorkflowInfo = {
        threadId: 'test-thread-123',
        status: 'running',
        startedBy: 'Claude Code CLI',
        invocation: 'Test workflow',
        projectId: 'project-123',
        steps: [],
        lastUpdate: '2025-01-09T10:00:00Z',
        sessionIds: {},
      }

      store.addWorkflow(workflow)
      expect(useWorkflowStore.getState().workflows['test-thread-123']).toBeDefined()

      store.removeWorkflow('test-thread-123')
      expect(useWorkflowStore.getState().workflows['test-thread-123']).toBeUndefined()
    })

    it('should get workflow by threadId', () => {
      const store = useWorkflowStore.getState()

      const workflow: WorkflowInfo = {
        threadId: 'test-thread-123',
        status: 'running',
        startedBy: 'Claude Code CLI',
        invocation: 'Test workflow',
        projectId: 'project-123',
        steps: [],
        lastUpdate: '2025-01-09T10:00:00Z',
        sessionIds: {},
      }

      store.addWorkflow(workflow)

      const retrieved = store.getWorkflow('test-thread-123')
      expect(retrieved).toEqual(workflow)

      const nonExistent = store.getWorkflow('non-existent')
      expect(nonExistent).toBeUndefined()
    })
  })

  describe('Step Operations', () => {
    const createWorkflowWithSteps = (): WorkflowInfo => ({
      threadId: 'test-thread-123',
      status: 'running',
      startedBy: 'Claude Code CLI',
      invocation: 'Multi-step workflow',
      projectId: 'project-123',
      steps: [
        {
          id: 'step1',
          role: 'developer',
          agentId: 'dev_01',
          task: 'Create tests',
          status: 'completed',
          startTime: '2025-01-09T10:00:00Z',
          endTime: '2025-01-09T10:05:00Z',
          dependencies: [],
        },
        {
          id: 'step2',
          role: 'reviewer',
          agentId: 'reviewer_01',
          task: 'Review tests',
          status: 'running',
          startTime: '2025-01-09T10:05:00Z',
          dependencies: ['step1'],
        },
      ],
      lastUpdate: '2025-01-09T10:00:00Z',
      sessionIds: { dev_01: 'session-123', reviewer_01: 'session-456' },
    })

    it('should update existing step', () => {
      const store = useWorkflowStore.getState()
      const workflow = createWorkflowWithSteps()

      store.addWorkflow(workflow)

      const beforeUpdate = Date.now()
      store.updateStep('test-thread-123', 'step2', {
        status: 'completed',
        endTime: '2025-01-09T10:10:00Z',
      })
      const afterUpdate = Date.now()

      const state = useWorkflowStore.getState()
      const updatedWorkflow = state.workflows['test-thread-123']
      const updatedStep = updatedWorkflow.steps.find((s) => s.id === 'step2')

      expect(updatedStep?.status).toBe('completed')
      expect(updatedStep?.endTime).toBe('2025-01-09T10:10:00Z')

      // Check that lastUpdate was updated
      const lastUpdateTime = new Date(updatedWorkflow.lastUpdate).getTime()
      expect(lastUpdateTime).toBeGreaterThanOrEqual(beforeUpdate)
      expect(lastUpdateTime).toBeLessThanOrEqual(afterUpdate)

      // Check that other step was not affected
      const otherStep = updatedWorkflow.steps.find((s) => s.id === 'step1')
      expect(otherStep?.status).toBe('completed')
      expect(otherStep?.endTime).toBe('2025-01-09T10:05:00Z')
    })

    it('should not update step in non-existent workflow', () => {
      const store = useWorkflowStore.getState()

      const initialState = useWorkflowStore.getState()
      store.updateStep('non-existent', 'step1', { status: 'completed' })
      const finalState = useWorkflowStore.getState()

      expect(finalState).toEqual(initialState)
    })

    it('should not update non-existent step', () => {
      const store = useWorkflowStore.getState()
      const workflow = createWorkflowWithSteps()

      store.addWorkflow(workflow)

      const initialState = useWorkflowStore.getState()
      store.updateStep('test-thread-123', 'non-existent-step', { status: 'completed' })
      const finalState = useWorkflowStore.getState()

      expect(finalState).toEqual(initialState)
    })

    it('should update step with error', () => {
      const store = useWorkflowStore.getState()
      const workflow = createWorkflowWithSteps()

      store.addWorkflow(workflow)

      store.updateStep('test-thread-123', 'step2', {
        status: 'failed',
        error: 'Agent conflict detected',
        endTime: '2025-01-09T10:08:00Z',
      })

      const state = useWorkflowStore.getState()
      const updatedStep = state.workflows['test-thread-123'].steps.find((s) => s.id === 'step2')

      expect(updatedStep?.status).toBe('failed')
      expect(updatedStep?.error).toBe('Agent conflict detected')
      expect(updatedStep?.endTime).toBe('2025-01-09T10:08:00Z')
    })
  })

  describe('Query Operations', () => {
    beforeEach(() => {
      const store = useWorkflowStore.getState()

      // Add multiple workflows with different statuses
      const workflows: WorkflowInfo[] = [
        {
          threadId: 'running-1',
          status: 'running',
          startedBy: 'Claude Code CLI',
          invocation: 'Running workflow 1',
          projectId: 'project-123',
          steps: [],
          lastUpdate: '2025-01-09T10:00:00Z',
          sessionIds: {},
        },
        {
          threadId: 'running-2',
          status: 'running',
          startedBy: 'Claude Code CLI',
          invocation: 'Running workflow 2',
          projectId: 'project-456',
          steps: [],
          lastUpdate: '2025-01-09T10:01:00Z',
          sessionIds: {},
        },
        {
          threadId: 'completed-1',
          status: 'completed',
          startedBy: 'Claude Code CLI',
          invocation: 'Completed workflow',
          projectId: 'project-123',
          steps: [],
          lastUpdate: '2025-01-09T09:00:00Z',
          sessionIds: {},
        },
        {
          threadId: 'failed-1',
          status: 'failed',
          startedBy: 'Claude Code CLI',
          invocation: 'Failed workflow',
          projectId: 'project-789',
          steps: [],
          lastUpdate: '2025-01-09T08:00:00Z',
          sessionIds: {},
        },
      ]

      workflows.forEach((workflow) => store.addWorkflow(workflow))
    })

    it('should get only active workflows', () => {
      const store = useWorkflowStore.getState()
      const activeWorkflows = store.getActiveWorkflows()

      expect(activeWorkflows).toHaveLength(2)
      expect(activeWorkflows.every((w) => w.status === 'running')).toBe(true)
      expect(activeWorkflows.map((w) => w.threadId)).toEqual(['running-1', 'running-2'])
    })

    it('should clear only completed workflows', () => {
      const store = useWorkflowStore.getState()

      // Verify initial state
      const initialState = useWorkflowStore.getState()
      expect(Object.keys(initialState.workflows)).toHaveLength(4)

      store.clearCompletedWorkflows()

      const finalState = useWorkflowStore.getState()
      const remainingWorkflows = Object.values(finalState.workflows)

      expect(remainingWorkflows).toHaveLength(2)
      expect(remainingWorkflows.every((w) => w.status === 'running')).toBe(true)
      expect(remainingWorkflows.map((w) => w.threadId)).toEqual(['running-1', 'running-2'])
    })
  })

  describe('Complex Workflow Scenarios', () => {
    it('should handle workflow with complex dependencies', () => {
      const store = useWorkflowStore.getState()

      const complexWorkflow: WorkflowInfo = {
        threadId: 'complex-workflow',
        status: 'running',
        startedBy: 'Claude Code CLI',
        invocation: 'Complex multi-agent workflow with dependencies',
        projectId: 'project-123',
        projectName: 'Complex Project',
        webhook: 'http://localhost:8080/webhook',
        webhookType: 'tmux send-keys',
        currentStep: 'step3',
        steps: [
          {
            id: 'step1',
            role: 'architect',
            agentId: 'architect_01',
            task: 'Design system architecture',
            status: 'completed',
            startTime: '2025-01-09T10:00:00Z',
            endTime: '2025-01-09T10:15:00Z',
            dependencies: [],
          },
          {
            id: 'step2',
            role: 'developer',
            agentId: 'dev_01',
            task: 'Implement core functionality',
            status: 'completed',
            startTime: '2025-01-09T10:15:00Z',
            endTime: '2025-01-09T10:45:00Z',
            dependencies: ['step1'],
          },
          {
            id: 'step3',
            role: 'developer',
            agentId: 'dev_02',
            task: 'Create test suite',
            status: 'running',
            startTime: '2025-01-09T10:15:00Z',
            dependencies: ['step1'],
          },
          {
            id: 'step4',
            role: 'reviewer',
            agentId: 'reviewer_01',
            task: 'Review implementation and tests',
            status: 'pending',
            dependencies: ['step2', 'step3'],
          },
        ],
        lastUpdate: '2025-01-09T10:45:00Z',
        sessionIds: {
          architect_01: 'session-arch-123',
          dev_01: 'session-dev-456',
          dev_02: 'session-dev-789',
          reviewer_01: 'session-rev-012',
        },
      }

      store.addWorkflow(complexWorkflow)

      const state = useWorkflowStore.getState()
      const workflow = state.workflows['complex-workflow']

      expect(workflow).toEqual(complexWorkflow)
      expect(workflow.steps).toHaveLength(4)
      expect(workflow.steps.filter((s) => s.status === 'completed')).toHaveLength(2)
      expect(workflow.steps.filter((s) => s.status === 'running')).toHaveLength(1)
      expect(workflow.steps.filter((s) => s.status === 'pending')).toHaveLength(1)
    })

    it('should handle rapid step updates correctly', () => {
      const store = useWorkflowStore.getState()

      const workflow: WorkflowInfo = {
        threadId: 'rapid-updates',
        status: 'running',
        startedBy: 'Claude Code CLI',
        invocation: 'Rapid update test',
        projectId: 'project-123',
        steps: [
          {
            id: 'step1',
            role: 'developer',
            agentId: 'dev_01',
            task: 'Quick task',
            status: 'pending',
            dependencies: [],
          },
        ],
        lastUpdate: '2025-01-09T10:00:00Z',
        sessionIds: { dev_01: 'session-123' },
      }

      store.addWorkflow(workflow)

      // Simulate rapid updates
      store.updateStep('rapid-updates', 'step1', {
        status: 'running',
        startTime: '2025-01-09T10:01:00Z',
        agentId: 'dev_01',
      })

      store.updateStep('rapid-updates', 'step1', {
        status: 'completed',
        endTime: '2025-01-09T10:02:00Z',
      })

      const state = useWorkflowStore.getState()
      const updatedStep = state.workflows['rapid-updates'].steps[0]

      expect(updatedStep.status).toBe('completed')
      expect(updatedStep.startTime).toBe('2025-01-09T10:01:00Z')
      expect(updatedStep.endTime).toBe('2025-01-09T10:02:00Z')
      expect(updatedStep.agentId).toBe('dev_01')
    })

    it('should handle workflow failure scenarios', () => {
      const store = useWorkflowStore.getState()

      const workflow: WorkflowInfo = {
        threadId: 'failure-test',
        status: 'running',
        startedBy: 'Claude Code CLI',
        invocation: 'Failure scenario test',
        projectId: 'project-123',
        steps: [
          {
            id: 'step1',
            role: 'developer',
            agentId: 'dev_01',
            task: 'Task that will fail',
            status: 'running',
            startTime: '2025-01-09T10:00:00Z',
            dependencies: [],
          },
        ],
        lastUpdate: '2025-01-09T10:00:00Z',
        sessionIds: { dev_01: 'session-123' },
      }

      store.addWorkflow(workflow)

      // Simulate step failure
      store.updateStep('failure-test', 'step1', {
        status: 'failed',
        endTime: '2025-01-09T10:05:00Z',
        error: 'Agent conflict - dev_01 assigned to multiple parallel tasks',
      })

      // Simulate workflow failure
      store.updateWorkflow('failure-test', {
        status: 'failed',
        currentStep: 'step1',
      })

      const state = useWorkflowStore.getState()
      const failedWorkflow = state.workflows['failure-test']
      const failedStep = failedWorkflow.steps[0]

      expect(failedWorkflow.status).toBe('failed')
      expect(failedWorkflow.currentStep).toBe('step1')
      expect(failedStep.status).toBe('failed')
      expect(failedStep.error).toBe('Agent conflict - dev_01 assigned to multiple parallel tasks')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty workflows object', () => {
      const store = useWorkflowStore.getState()

      expect(store.getActiveWorkflows()).toEqual([])
      expect(store.getWorkflow('any-id')).toBeUndefined()

      // These operations should not throw
      store.clearCompletedWorkflows()
      store.removeWorkflow('non-existent')
      store.updateWorkflow('non-existent', { status: 'completed' })
      store.updateStep('non-existent', 'step1', { status: 'completed' })
    })

    it('should handle workflows without optional fields', () => {
      const store = useWorkflowStore.getState()

      const minimalWorkflow: WorkflowInfo = {
        threadId: 'minimal',
        status: 'running',
        startedBy: 'Test',
        invocation: 'Minimal workflow',
        projectId: 'project-123',
        steps: [],
        lastUpdate: '2025-01-09T10:00:00Z',
        sessionIds: {},
      }

      store.addWorkflow(minimalWorkflow)

      const state = useWorkflowStore.getState()
      const workflow = state.workflows['minimal']

      expect(workflow.projectName).toBeUndefined()
      expect(workflow.webhook).toBeUndefined()
      expect(workflow.webhookType).toBeUndefined()
      expect(workflow.currentStep).toBeUndefined()
    })

    it('should preserve step array order during updates', () => {
      const store = useWorkflowStore.getState()

      const workflow: WorkflowInfo = {
        threadId: 'order-test',
        status: 'running',
        startedBy: 'Claude Code CLI',
        invocation: 'Order preservation test',
        projectId: 'project-123',
        steps: [
          { id: 'step1', task: 'First', status: 'completed', dependencies: [] },
          { id: 'step2', task: 'Second', status: 'running', dependencies: [] },
          { id: 'step3', task: 'Third', status: 'pending', dependencies: [] },
        ],
        lastUpdate: '2025-01-09T10:00:00Z',
        sessionIds: {},
      }

      store.addWorkflow(workflow)

      // Update middle step
      store.updateStep('order-test', 'step2', { status: 'completed' })

      const state = useWorkflowStore.getState()
      const steps = state.workflows['order-test'].steps

      expect(steps.map((s) => s.id)).toEqual(['step1', 'step2', 'step3'])
      expect(steps[1].status).toBe('completed')
    })
  })
})
