/**
 * Workflow Builder Store - Single source of truth for workflow creation
 *
 * SOLID: Single responsibility - workflow building state only
 * DRY: Reuses existing patterns from agents store and createPersistentStore
 * KISS: Simple state management with clear actions
 * Library-First: Uses Zustand with persistence like other stores
 */

import { createPersistentStore } from './createPersistentStore'
import ky from 'ky'
import type {
  WorkflowDefinition,
  WorkflowStepDefinition,
  WorkflowValidationResult,
  WorkflowExecutionResponse,
} from '../../web/server/schemas/workflow-builder'

// UI-specific state that extends the core workflow definition
interface WorkflowBuilderState {
  // Current workflow being built (null = no workflow loaded)
  workflow: WorkflowDefinition | null
  isDirty: boolean // Has unsaved changes

  // UI state
  selectedStepId: string | null // Currently selected step
  validationResult: WorkflowValidationResult | null
  isValidating: boolean // Validation in progress
  isExecuting: boolean // Execution in progress
  isSaving: boolean // Save in progress
  lastError: string | null // Last error message

  // Core workflow actions - follow existing store patterns
  initWorkflow: (name: string, description?: string, projectId?: string) => void
  loadWorkflow: (workflow: WorkflowDefinition) => void
  updateWorkflowMeta: (updates: Partial<Pick<WorkflowDefinition, 'name' | 'description'>>) => void
  setDirty: (dirty: boolean) => void
  reset: () => void

  // Step management - consistent with agents store patterns
  addStep: (step: Partial<WorkflowStepDefinition>) => string // Returns generated step ID
  updateStep: (id: string, updates: Partial<WorkflowStepDefinition>) => void
  removeStep: (id: string) => void
  reorderSteps: (fromIndex: number, toIndex: number) => void
  setDependencies: (stepId: string, deps: string[]) => void

  // UI state management
  setSelectedStep: (stepId: string | null) => void

  // Validation - follows API patterns
  validateWorkflow: () => Promise<boolean>
  clearValidation: () => void

  // Execution - integrates with existing invoke system
  executeWorkflow: () => Promise<WorkflowExecutionResponse>

  // Save workflow to backend storage
  saveWorkflow: (
    name?: string,
    description?: string,
    scope?: 'project' | 'global'
  ) => Promise<string>

  // Load workflows from backend storage
  fetchSavedWorkflows: () => Promise<
    Array<{
      id: string
      name: string
      description?: string
      definition: WorkflowDefinition
      updatedAt: string
    }>
  >

  // Utility getters - eliminates prop drilling like agents store
  getStep: (id: string) => WorkflowStepDefinition | null
  getSelectedStep: () => WorkflowStepDefinition | null
  getStepsByDependency: (depId: string) => WorkflowStepDefinition[]
  getAvailableDependencies: (stepId: string) => WorkflowStepDefinition[]
  hasCircularDependency: (stepId: string, newDeps: string[]) => boolean

  // Template conversion (for future template system)
  toTemplate: () => Omit<WorkflowDefinition, 'id' | 'metadata'>

  // Error handling
  setError: (error: string | null) => void
  clearError: () => void
}

// Helper to generate step IDs consistently
function generateStepId(existingSteps: WorkflowStepDefinition[]): string {
  const maxNum = existingSteps
    .map((s) => s.id)
    .filter((id) => id.startsWith('step'))
    .map((id) => parseInt(id.replace('step', ''), 10))
    .filter((num) => !isNaN(num))
    .reduce((max, num) => Math.max(max, num), 0)

  return `step${maxNum + 1}`
}

// Helper to generate workflow ID consistently
function generateWorkflowId(): string {
  return `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export const useWorkflowBuilderStore = createPersistentStore<WorkflowBuilderState>(
  'workflow-builder',
  (set, get) => ({
    // Initial state
    workflow: null,
    isDirty: false,
    selectedStepId: null,
    validationResult: null,
    isValidating: false,
    isExecuting: false,
    isSaving: false,
    lastError: null,

    // Core workflow actions
    initWorkflow: (name, description, projectId) => {
      const workflow: WorkflowDefinition = {
        id: generateWorkflowId(),
        name,
        description: description || '',
        steps: [],
        metadata: {
          createdBy: 'current-user', // TODO: Get from auth context
          createdAt: new Date().toISOString(),
          version: 1,
          tags: [],
          projectId: projectId || '', // Empty string if no projectId provided
        },
      }

      set({
        workflow,
        isDirty: false,
        selectedStepId: null,
        validationResult: null,
        lastError: null,
      })
    },

    loadWorkflow: (workflow) => {
      set({
        workflow,
        isDirty: false,
        selectedStepId: null,
        validationResult: null,
        lastError: null,
      })
    },

    updateWorkflowMeta: (updates) => {
      set((state) => {
        if (!state.workflow) return state

        return {
          workflow: {
            ...state.workflow,
            ...updates,
            metadata: {
              ...state.workflow.metadata,
              updatedAt: new Date().toISOString(),
            },
          },
          isDirty: true,
        }
      })
    },

    setDirty: (dirty) => set({ isDirty: dirty }),

    reset: () =>
      set({
        workflow: null,
        isDirty: false,
        selectedStepId: null,
        validationResult: null,
        isValidating: false,
        isExecuting: false,
        isSaving: false,
        lastError: null,
      }),

    // Step management - follows agents store patterns
    addStep: (stepData) => {
      const state = get()
      if (!state.workflow) throw new Error('No workflow loaded')

      const stepId = generateStepId(state.workflow.steps)
      const newStep: WorkflowStepDefinition = {
        id: stepId,
        type: 'task',
        task: '',
        deps: [],
        ...stepData,
      }

      set((state) => ({
        workflow: state.workflow
          ? {
              ...state.workflow,
              steps: [...state.workflow.steps, newStep],
              metadata: {
                ...state.workflow.metadata,
                updatedAt: new Date().toISOString(),
              },
            }
          : null,
        isDirty: true,
        selectedStepId: stepId,
      }))

      return stepId
    },

    updateStep: (id, updates) => {
      set((state) => {
        if (!state.workflow) return state

        return {
          workflow: {
            ...state.workflow,
            steps: state.workflow.steps.map((step) =>
              step.id === id ? { ...step, ...updates } : step
            ),
            metadata: {
              ...state.workflow.metadata,
              updatedAt: new Date().toISOString(),
            },
          },
          isDirty: true,
        }
      })
    },

    removeStep: (id) => {
      set((state) => {
        if (!state.workflow) return state

        // Remove the step and update dependencies in other steps
        const updatedSteps = state.workflow.steps
          .filter((step) => step.id !== id)
          .map((step) => ({
            ...step,
            deps: step.deps.filter((depId) => depId !== id),
          }))

        return {
          workflow: {
            ...state.workflow,
            steps: updatedSteps,
            metadata: {
              ...state.workflow.metadata,
              updatedAt: new Date().toISOString(),
            },
          },
          isDirty: true,
          selectedStepId: state.selectedStepId === id ? null : state.selectedStepId,
        }
      })
    },

    reorderSteps: (fromIndex, toIndex) => {
      set((state) => {
        if (!state.workflow) return state

        const steps = [...state.workflow.steps]
        const [movedStep] = steps.splice(fromIndex, 1)
        steps.splice(toIndex, 0, movedStep)

        return {
          workflow: {
            ...state.workflow,
            steps,
            metadata: {
              ...state.workflow.metadata,
              updatedAt: new Date().toISOString(),
            },
          },
          isDirty: true,
        }
      })
    },

    setDependencies: (stepId, deps) => {
      get().updateStep(stepId, { deps })
    },

    // UI state management
    setSelectedStep: (stepId) => set({ selectedStepId: stepId }),

    // Validation - integrates with backend API
    validateWorkflow: async () => {
      const state = get()
      if (!state.workflow) return false

      set({ isValidating: true, lastError: null })

      try {
        const result = await ky
          .post('/api/workflows/validate', {
            json: state.workflow,
          })
          .json<WorkflowValidationResult>()

        set({
          validationResult: result,
          isValidating: false,
        })

        return result.valid
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Validation failed'
        set({
          isValidating: false,
          lastError: errorMessage,
          validationResult: {
            valid: false,
            errors: [{ message: errorMessage, code: 'validation_error' }],
            warnings: [],
          },
        })
        return false
      }
    },

    clearValidation: () => set({ validationResult: null }),

    // Execution - integrates with existing invoke system
    executeWorkflow: async () => {
      const state = get()
      if (!state.workflow) throw new Error('No workflow to execute')

      // Validate projectId is present
      if (!state.workflow.metadata.projectId) {
        const errorMessage = 'Cannot execute workflow without a project context'
        set({
          lastError: errorMessage,
          validationResult: {
            valid: false,
            errors: [{ message: errorMessage, code: 'missing_project_id' }],
            warnings: [],
          },
        })
        throw new Error(errorMessage)
      }

      set({ isExecuting: true, lastError: null })

      try {
        const response = await ky
          .post('/api/workflows/execute', {
            json: { workflow: state.workflow },
          })
          .json<WorkflowExecutionResponse>()

        set({
          isExecuting: false,
          isDirty: false, // Mark as saved after successful execution
        })

        return response
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Execution failed'
        set({
          isExecuting: false,
          lastError: errorMessage,
        })
        throw error
      }
    },

    // Save workflow to backend storage
    saveWorkflow: async (name, description, scope = 'project') => {
      const state = get()
      if (!state.workflow) throw new Error('No workflow to save')

      set({ isSaving: true, lastError: null })

      try {
        // Use provided name/description or current workflow values
        const workflowName = name || state.workflow.name
        const workflowDescription = description || state.workflow.description

        // Get current project ID from project store
        // Import dynamically to avoid circular dependencies
        const { useProjectStore } = await import('./projects')
        const projectStore = useProjectStore.getState()
        const projectId = scope === 'project' ? projectStore.activeProjectId : null

        const saveData = {
          name: workflowName,
          description: workflowDescription,
          definition: state.workflow,
          scope,
          projectId,
          source: 'ui' as const,
          isTemplate: false,
        }

        const response = await ky
          .post('/api/workflows/saved', {
            json: saveData,
          })
          .json<{ workflow: { id: string; name: string; createdAt: string } }>()

        // Update workflow metadata with saved information
        set((state) => ({
          workflow: state.workflow
            ? {
                ...state.workflow,
                name: workflowName,
                description: workflowDescription,
                metadata: {
                  ...state.workflow.metadata,
                  updatedAt: new Date().toISOString(),
                },
              }
            : null,
          isDirty: false,
          isSaving: false,
        }))

        console.log('Workflow saved successfully:', response.workflow.id)
        return response.workflow.id
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to save workflow'
        set({ isSaving: false, lastError: errorMessage })
        throw error
      }
    },

    // Load workflows from backend storage
    fetchSavedWorkflows: async () => {
      try {
        // Get current project ID from project store
        const { useProjectStore } = await import('./projects')
        const projectStore = useProjectStore.getState()
        const projectId = projectStore.activeProjectId

        // Fetch workflows (project-specific + global)
        const url = projectId
          ? `/api/workflows/saved?projectId=${projectId}`
          : '/api/workflows/saved?global=true'

        const response = await ky.get(url).json<{
          workflows: Array<{
            id: string
            name: string
            description?: string
            definition: WorkflowDefinition
            updatedAt: string
          }>
        }>()

        return response.workflows
      } catch (error) {
        console.error('Failed to fetch saved workflows:', error)
        throw error
      }
    },

    // Utility getters - eliminate prop drilling
    getStep: (id) => {
      const state = get()
      return state.workflow?.steps.find((step) => step.id === id) || null
    },

    getSelectedStep: () => {
      const state = get()
      if (!state.selectedStepId || !state.workflow) return null
      return state.workflow.steps.find((step) => step.id === state.selectedStepId) || null
    },

    getStepsByDependency: (depId) => {
      const state = get()
      if (!state.workflow) return []
      return state.workflow.steps.filter((step) => step.deps.includes(depId))
    },

    getAvailableDependencies: (stepId) => {
      const state = get()
      if (!state.workflow) return []

      // Get all steps except the current one and any that depend on it
      const dependentSteps = new Set<string>()

      // Recursively find all steps that depend on this step
      const findDependents = (id: string) => {
        const deps = state.workflow!.steps.filter((step) => step.deps.includes(id))
        deps.forEach((dep) => {
          dependentSteps.add(dep.id)
          findDependents(dep.id)
        })
      }

      findDependents(stepId)

      return state.workflow.steps.filter(
        (step) => step.id !== stepId && !dependentSteps.has(step.id)
      )
    },

    hasCircularDependency: (stepId, newDeps) => {
      const state = get()
      if (!state.workflow) return false

      // Check if any of the new dependencies eventually depend on this step
      const visited = new Set<string>()

      const checkCircular = (currentId: string): boolean => {
        if (currentId === stepId) return true
        if (visited.has(currentId)) return false

        visited.add(currentId)

        const step = state.workflow!.steps.find((s) => s.id === currentId)
        if (!step) return false

        return step.deps.some((depId) => checkCircular(depId))
      }

      return newDeps.some((depId) => checkCircular(depId))
    },

    // Template conversion
    toTemplate: () => {
      const state = get()
      if (!state.workflow) throw new Error('No workflow to convert to template')

      // Remove instance-specific data for template creation
      const template: Omit<WorkflowDefinition, 'id' | 'metadata'> = {
        name: state.workflow.name,
        description: state.workflow.description,
        steps: state.workflow.steps,
      }
      return template
    },

    // Error handling
    setError: (error) => set({ lastError: error }),
    clearError: () => set({ lastError: null }),
  }),
  {
    // Only persist the workflow data, not UI state
    partialize: (state) => ({
      workflow: state.workflow,
      isDirty: state.isDirty,
    }),
  }
)
