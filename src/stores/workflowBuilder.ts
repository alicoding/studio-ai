/**
 * Workflow Builder Store
 *
 * SOLID: Single responsibility - workflow builder state management
 * DRY: Reusable workflow building logic
 * KISS: Simple state management with Zustand
 * Library-First: Uses Zustand for state management
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import ky from 'ky'
import type {
  WorkflowDefinition,
  WorkflowStepDefinition,
  WorkflowValidationResult,
  WorkflowExecutionResponse,
} from '../../web/server/schemas/workflow-builder'

interface WorkflowBuilderStore {
  // Current workflow being built
  workflow: WorkflowDefinition | null
  isDirty: boolean

  // UI state
  selectedStepId: string | null
  validationErrors: Record<string, string>
  isValidating: boolean
  isExecuting: boolean

  // Actions - Workflow management
  initWorkflow: (name: string, description?: string, projectId?: string) => void
  loadWorkflow: (workflow: WorkflowDefinition) => void
  updateWorkflowMetadata: (updates: Partial<WorkflowDefinition>) => void
  
  // Actions - Step management
  addStep: (step?: Partial<WorkflowStepDefinition>) => string
  updateStep: (id: string, updates: Partial<WorkflowStepDefinition>) => void
  removeStep: (id: string) => void
  reorderSteps: (fromIndex: number, toIndex: number) => void
  setDependencies: (stepId: string, deps: string[]) => void
  selectStep: (stepId: string | null) => void

  // Validation
  validateWorkflow: () => Promise<boolean>
  clearValidation: () => void

  // Execution
  executeWorkflow: () => Promise<{ threadId: string }>
  
  // Utility
  reset: () => void
  setDirty: (isDirty: boolean) => void
}

// API base URL - check if we're in a browser environment
const API_BASE = typeof window !== 'undefined' 
  ? (import.meta.env?.VITE_API_URL || 'http://localhost:3456/api')
  : 'http://localhost:3456/api'

export const useWorkflowBuilderStore = create<WorkflowBuilderStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      workflow: null,
      isDirty: false,
      selectedStepId: null,
      validationErrors: {},
      isValidating: false,
      isExecuting: false,

      // Initialize a new workflow
      initWorkflow: (name: string, description?: string, projectId?: string) => {
        const workflow: WorkflowDefinition = {
          id: uuidv4(),
          name,
          description,
          steps: [],
          metadata: {
            createdBy: 'current-user', // TODO: Get from auth context
            createdAt: new Date().toISOString(),
            version: 1,
            tags: [],
            projectId: projectId || '', // Will be set from project context
          },
        }

        set({
          workflow,
          isDirty: false,
          selectedStepId: null,
          validationErrors: {},
        })
      },

      // Load existing workflow
      loadWorkflow: (workflow: WorkflowDefinition) => {
        set({
          workflow,
          isDirty: false,
          selectedStepId: null,
          validationErrors: {},
        })
      },

      // Update workflow metadata
      updateWorkflowMetadata: (updates: Partial<WorkflowDefinition>) => {
        const { workflow } = get()
        if (!workflow) return

        set({
          workflow: { ...workflow, ...updates },
          isDirty: true,
        })
      },

      // Add a new step
      addStep: (step?: Partial<WorkflowStepDefinition>) => {
        const { workflow } = get()
        if (!workflow) return ''

        const newStep: WorkflowStepDefinition = {
          id: step?.id || `step${workflow.steps.length + 1}`,
          type: step?.type || 'task',
          role: step?.role,
          agentId: step?.agentId,
          task: step?.task || '',
          deps: step?.deps || [],
          config: step?.config,
        }

        set({
          workflow: {
            ...workflow,
            steps: [...workflow.steps, newStep],
          },
          isDirty: true,
          selectedStepId: newStep.id,
        })

        return newStep.id
      },

      // Update a step
      updateStep: (id: string, updates: Partial<WorkflowStepDefinition>) => {
        const { workflow } = get()
        if (!workflow) return

        const steps = workflow.steps.map((step) =>
          step.id === id ? { ...step, ...updates } : step
        )

        set({
          workflow: { ...workflow, steps },
          isDirty: true,
        })
      },

      // Remove a step
      removeStep: (id: string) => {
        const { workflow, selectedStepId } = get()
        if (!workflow) return

        // Remove the step
        const steps = workflow.steps.filter((step) => step.id !== id)

        // Remove references to this step from other steps' dependencies
        const updatedSteps = steps.map((step) => ({
          ...step,
          deps: step.deps.filter((dep) => dep !== id),
        }))

        set({
          workflow: { ...workflow, steps: updatedSteps },
          isDirty: true,
          selectedStepId: selectedStepId === id ? null : selectedStepId,
        })
      },

      // Reorder steps
      reorderSteps: (fromIndex: number, toIndex: number) => {
        const { workflow } = get()
        if (!workflow) return

        const steps = [...workflow.steps]
        const [movedStep] = steps.splice(fromIndex, 1)
        steps.splice(toIndex, 0, movedStep)

        set({
          workflow: { ...workflow, steps },
          isDirty: true,
        })
      },

      // Set dependencies for a step
      setDependencies: (stepId: string, deps: string[]) => {
        const { workflow } = get()
        if (!workflow) return

        const steps = workflow.steps.map((step) =>
          step.id === stepId ? { ...step, deps } : step
        )

        set({
          workflow: { ...workflow, steps },
          isDirty: true,
        })
      },

      // Select a step
      selectStep: (stepId: string | null) => {
        set({ selectedStepId: stepId })
      },

      // Validate the workflow
      validateWorkflow: async () => {
        const { workflow } = get()
        if (!workflow) return false

        set({ isValidating: true, validationErrors: {} })

        try {
          const response = await ky
            .post(`${API_BASE}/workflows/validate`, {
              json: workflow,
            })
            .json<WorkflowValidationResult>()

          // Convert errors to a map for easy lookup
          const errors: Record<string, string> = {}
          response.errors.forEach((error) => {
            const key = error.stepId || error.field || 'general'
            errors[key] = error.message
          })

          set({
            validationErrors: errors,
            isValidating: false,
          })

          return response.valid
        } catch (error) {
          console.error('Validation failed:', error)
          set({
            validationErrors: {
              general: 'Failed to validate workflow',
            },
            isValidating: false,
          })
          return false
        }
      },

      // Clear validation errors
      clearValidation: () => {
        set({ validationErrors: {} })
      },

      // Execute the workflow
      executeWorkflow: async () => {
        const { workflow } = get()
        if (!workflow) throw new Error('No workflow to execute')

        // Validate first
        const isValid = await get().validateWorkflow()
        if (!isValid) {
          throw new Error('Workflow validation failed')
        }

        set({ isExecuting: true })

        try {
          const response = await ky
            .post(`${API_BASE}/workflows/execute`, {
              json: { workflow },
            })
            .json<WorkflowExecutionResponse>()

          if (response.status === 'failed') {
            throw new Error(response.error || 'Failed to execute workflow')
          }

          set({ isExecuting: false, isDirty: false })
          return { threadId: response.threadId }
        } catch (error) {
          console.error('Execution failed:', error)
          set({ isExecuting: false })
          throw error
        }
      },

      // Reset the store
      reset: () => {
        set({
          workflow: null,
          isDirty: false,
          selectedStepId: null,
          validationErrors: {},
          isValidating: false,
          isExecuting: false,
        })
      },

      // Set dirty flag
      setDirty: (isDirty: boolean) => {
        set({ isDirty })
      },
    }),
    {
      name: 'workflow-builder',
    }
  )
)