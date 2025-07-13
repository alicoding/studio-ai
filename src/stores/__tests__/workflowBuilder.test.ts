/**
 * Workflow Builder Store Tests
 *
 * SOLID: Test each responsibility separately
 * DRY: Reusable test helpers
 * KISS: Simple, focused tests
 * Library-First: Uses Vitest
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useWorkflowBuilderStore } from '../workflowBuilder'
// import type { WorkflowStepDefinition } from '../../../web/server/schemas/workflow-builder'

// Mock the storage client to prevent HTTP requests during tests
vi.mock('../../lib/storage/client', () => ({
  createClientStorage: vi.fn(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    has: vi.fn().mockResolvedValue(false),
    keys: vi.fn().mockResolvedValue([]),
    clear: vi.fn().mockResolvedValue(undefined),
  }))
}))

describe('WorkflowBuilderStore', () => {
  // Reset store before each test
  beforeEach(() => {
    useWorkflowBuilderStore.getState().reset()
  })

  describe('Workflow Management', () => {
    it('should initialize a new workflow', () => {
      const store = useWorkflowBuilderStore.getState()

      store.initWorkflow('Test Workflow', 'A test workflow', 'project-123')

      const state = useWorkflowBuilderStore.getState()
      expect(state.workflow).toBeDefined()
      expect(state.workflow?.name).toBe('Test Workflow')
      expect(state.workflow?.description).toBe('A test workflow')
      expect(state.workflow?.metadata.projectId).toBe('project-123')
      expect(state.workflow?.steps).toHaveLength(0)
    })

    it('should update workflow metadata', () => {
      const store = useWorkflowBuilderStore.getState()

      store.initWorkflow('Test Workflow')
      store.updateWorkflowMeta({
        name: 'Updated Workflow',
        description: 'Updated description',
      })

      const state = useWorkflowBuilderStore.getState()
      expect(state.workflow?.name).toBe('Updated Workflow')
      expect(state.workflow?.description).toBe('Updated description')
      expect(state.isDirty).toBe(true)
    })
  })

  describe('Step Management', () => {
    it('should add a new step', () => {
      const store = useWorkflowBuilderStore.getState()

      store.initWorkflow('Test Workflow')
      const stepId = store.addStep({
        task: 'Test task',
        role: 'developer',
      })

      const state = useWorkflowBuilderStore.getState()
      expect(state.workflow?.steps).toHaveLength(1)
      expect(state.workflow?.steps[0].id).toBe(stepId)
      expect(state.workflow?.steps[0].task).toBe('Test task')
      expect(state.workflow?.steps[0].role).toBe('developer')
      expect(state.selectedStepId).toBe(stepId)
      expect(state.isDirty).toBe(true)
    })

    it('should update a step', () => {
      const store = useWorkflowBuilderStore.getState()

      store.initWorkflow('Test Workflow')
      const stepId = store.addStep({ task: 'Original task' })
      store.updateStep(stepId, { task: 'Updated task', role: 'reviewer' })

      const state = useWorkflowBuilderStore.getState()
      expect(state.workflow?.steps[0].task).toBe('Updated task')
      expect(state.workflow?.steps[0].role).toBe('reviewer')
    })

    it('should remove a step and clean up dependencies', () => {
      const store = useWorkflowBuilderStore.getState()

      store.initWorkflow('Test Workflow')
      const step1 = store.addStep({ task: 'Step 1' })
      const step2 = store.addStep({ task: 'Step 2', deps: [step1] })
      const step3 = store.addStep({ task: 'Step 3', deps: [step1, step2] })

      // Remove step1
      store.removeStep(step1)

      const state = useWorkflowBuilderStore.getState()
      expect(state.workflow?.steps).toHaveLength(2)
      // Check that dependencies were cleaned up
      const remainingStep2 = state.workflow?.steps.find((s) => s.id === step2)
      const remainingStep3 = state.workflow?.steps.find((s) => s.id === step3)
      expect(remainingStep2?.deps).toEqual([])
      expect(remainingStep3?.deps).toEqual([step2]) // step1 removed
    })

    it('should reorder steps', () => {
      const store = useWorkflowBuilderStore.getState()

      store.initWorkflow('Test Workflow')
      const step1 = store.addStep({ task: 'Step 1' })
      const step2 = store.addStep({ task: 'Step 2' })
      const step3 = store.addStep({ task: 'Step 3' })

      // Move step3 to beginning
      store.reorderSteps(2, 0)

      const state = useWorkflowBuilderStore.getState()
      expect(state.workflow?.steps[0].id).toBe(step3)
      expect(state.workflow?.steps[1].id).toBe(step1)
      expect(state.workflow?.steps[2].id).toBe(step2)
    })

    it('should set dependencies', () => {
      const store = useWorkflowBuilderStore.getState()

      store.initWorkflow('Test Workflow')
      const step1 = store.addStep({ task: 'Step 1' })
      const step2 = store.addStep({ task: 'Step 2' })
      const step3 = store.addStep({ task: 'Step 3' })

      store.setDependencies(step3, [step1, step2])

      const state = useWorkflowBuilderStore.getState()
      const step = state.workflow?.steps.find((s) => s.id === step3)
      expect(step?.deps).toEqual([step1, step2])
    })
  })

  describe('Workflow State', () => {
    it('should track dirty state', () => {
      const store = useWorkflowBuilderStore.getState()

      store.initWorkflow('Test Workflow')
      expect(useWorkflowBuilderStore.getState().isDirty).toBe(false)

      store.addStep({ task: 'Test' })
      expect(useWorkflowBuilderStore.getState().isDirty).toBe(true)

      store.setDirty(false)
      expect(useWorkflowBuilderStore.getState().isDirty).toBe(false)
    })

    it('should reset store', () => {
      const store = useWorkflowBuilderStore.getState()

      store.initWorkflow('Test Workflow')
      store.addStep({ task: 'Test' })
      store.setSelectedStep('some-id')
      store.setError('some error')

      store.reset()

      const state = useWorkflowBuilderStore.getState()
      expect(state.workflow).toBeNull()
      expect(state.isDirty).toBe(false)
      expect(state.selectedStepId).toBeNull()
      expect(state.lastError).toBeNull()
      expect(state.validationResult).toBeNull()
    })
  })
})
