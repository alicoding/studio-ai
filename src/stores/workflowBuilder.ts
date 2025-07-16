/**
 * Workflow Builder Store - Single source of truth for workflow creation
 *
 * SOLID: Single responsibility - workflow building state only
 * DRY: Reuses existing patterns from agents store and createPersistentStore
 * KISS: Simple state management with clear actions
 * Library-First: Uses Zustand with persistence like other stores
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { createContextAwareStorage, setWorkflowBuilderContext } from './workflowBuilderStorage'
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

  // Draft and saved state separation
  savedWorkflow: WorkflowDefinition | null // Last saved version
  draftWorkflow: WorkflowDefinition | null // Current draft with changes
  autoSaveEnabled: boolean // Whether auto-save is enabled
  lastSavedAt: string | null // When workflow was last saved
  conflictVersion: string | null // Version that caused a conflict

  // Saved workflow tracking for update vs create
  savedWorkflowDatabaseId: string | null // Database UUID of the saved workflow record

  // UI state
  selectedStepId: string | null // Currently selected step
  selectedStepIds: string[] // Multiple selected steps for bulk operations
  nodePositions: Record<string, { x: number; y: number }> // Store node positions to prevent rearrangement
  validationResult: WorkflowValidationResult | null
  isValidating: boolean // Validation in progress
  isExecuting: boolean // Execution in progress
  isSaving: boolean // Save in progress
  lastError: string | null // Last error message

  // Canvas viewport state
  viewport: { x: number; y: number; zoom: number } | null // Canvas zoom and position

  // Core workflow actions - follow existing store patterns
  initWorkflow: (name: string, description?: string, projectId?: string) => void
  loadWorkflow: (workflow: WorkflowDefinition) => void
  setSavedWorkflowDatabaseId: (id: string | null) => void
  updateWorkflowMeta: (updates: Partial<Pick<WorkflowDefinition, 'name' | 'description'>>) => void
  setDirty: (dirty: boolean) => void
  reset: () => void

  // Draft and saved state management
  createDraft: () => void
  saveDraft: () => void
  loadDraft: () => void
  discardDraft: () => void
  markAsSaved: (workflow: WorkflowDefinition) => void
  setAutoSaveEnabled: (enabled: boolean) => void
  hasUnsavedChanges: () => boolean
  getLastSavedVersion: () => WorkflowDefinition | null

  // Step management - consistent with agents store patterns
  addStep: (step: Partial<WorkflowStepDefinition>) => string // Returns generated step ID
  updateStep: (id: string, updates: Partial<WorkflowStepDefinition>) => void
  removeStep: (id: string) => void
  reorderSteps: (fromIndex: number, toIndex: number) => void
  setDependencies: (stepId: string, deps: string[]) => void

  // UI state management
  setSelectedStep: (stepId: string | null) => void
  setSelectedSteps: (stepIds: string[]) => void
  addToSelection: (stepId: string) => void
  removeFromSelection: (stepId: string) => void
  selectAllSteps: () => void
  clearSelection: () => void
  deleteSelectedSteps: () => void

  // Node position management
  updateNodePosition: (stepId: string, position: { x: number; y: number }) => void
  getNodePosition: (stepId: string) => { x: number; y: number } | null

  // Canvas viewport management
  updateViewport: (viewport: { x: number; y: number; zoom: number }) => void
  getViewport: () => { x: number; y: number; zoom: number } | null

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

  // Persistence management
  clearPersistedState: () => void
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

// Export the context setter for use in components
export { setWorkflowBuilderContext }

export const useWorkflowBuilderStore = create<WorkflowBuilderState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        workflow: null,
        isDirty: false,

        // Draft and saved state separation
        savedWorkflow: null,
        draftWorkflow: null,
        autoSaveEnabled: true,
        lastSavedAt: null,
        conflictVersion: null,

        // Saved workflow tracking
        savedWorkflowDatabaseId: null,

        selectedStepId: null,
        selectedStepIds: [],
        nodePositions: {},
        validationResult: null,
        isValidating: false,
        isExecuting: false,
        isSaving: false,
        lastError: null,
        viewport: null,

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
            positions: {},
          }

          set({
            workflow,
            isDirty: false,
            selectedStepId: null,
            selectedStepIds: [],
            nodePositions: {},
            validationResult: null,
            lastError: null,
          })
        },

        loadWorkflow: (workflow) => {
          console.log('[WorkflowBuilder] Loading workflow:', workflow)
          console.log('[WorkflowBuilder] Workflow positions:', workflow.positions)
          console.log('[WorkflowBuilder] Workflow steps:', workflow.steps)

          // Clear any persisted state immediately and aggressively
          console.log('[WorkflowBuilder] Clearing persisted state before loading workflow')
          if (typeof window !== 'undefined') {
            const storeName = 'studio-ai-workflow-builder'

            // Clear all storage synchronously
            localStorage.removeItem(storeName)
            sessionStorage.removeItem(storeName)

            // Also clear from unified storage (async, but start immediately)
            fetch(`/api/storage/item/workflow-builder/${storeName}`, { method: 'DELETE' }).catch(
              () => {
                // Ignore errors - storage might not exist
              }
            )

            // Set a flag to indicate we're in the middle of loading a workflow
            sessionStorage.setItem('workflow-loading', 'true')
          }

          // Force complete state replacement with loaded workflow data
          // This completely replaces the state to override any persistence
          set({
            // Core workflow data - MUST come from loaded workflow
            workflow,
            isDirty: false,
            selectedStepId: null,
            selectedStepIds: [],
            nodePositions: workflow.positions || {},
            validationResult: null,
            lastError: null,
            isValidating: false,
            isExecuting: false,
            isSaving: false,

            // Draft and saved state - mark as clean since we just loaded
            savedWorkflow: workflow,
            draftWorkflow: null,
            autoSaveEnabled: true,
            lastSavedAt: new Date().toISOString(),
            conflictVersion: null,

            // Clear database ID since this is a fresh load (will be set by route if editing existing)
            savedWorkflowDatabaseId: null,
          })

          // Clear loading flag after a brief delay to prevent race conditions
          setTimeout(() => {
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('workflow-loading')
            }
          }, 500)

          console.log('[WorkflowBuilder] Workflow loaded successfully, steps:', workflow.steps)
        },

        setSavedWorkflowDatabaseId: (id) => {
          set({ savedWorkflowDatabaseId: id })
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
            savedWorkflow: null,
            draftWorkflow: null,
            autoSaveEnabled: true,
            lastSavedAt: null,
            conflictVersion: null,
            selectedStepId: null,
            selectedStepIds: [],
            nodePositions: {},
            validationResult: null,
            isValidating: false,
            isExecuting: false,
            isSaving: false,
            lastError: null,
            viewport: null,
          }),

        // Draft and saved state management
        createDraft: () => {
          const state = get()
          if (!state.workflow) return

          set({
            draftWorkflow: { ...state.workflow },
            savedWorkflow: state.savedWorkflow || { ...state.workflow },
          })
        },

        saveDraft: () => {
          const state = get()
          if (!state.workflow) return

          set({
            draftWorkflow: { ...state.workflow },
            isDirty: true,
          })
        },

        loadDraft: () => {
          const state = get()
          if (!state.draftWorkflow) return

          set({
            workflow: { ...state.draftWorkflow },
            isDirty: true,
          })
        },

        discardDraft: () => {
          const state = get()
          if (!state.savedWorkflow) return

          set({
            workflow: { ...state.savedWorkflow },
            draftWorkflow: null,
            isDirty: false,
          })
        },

        markAsSaved: (workflow) => {
          set({
            savedWorkflow: { ...workflow },
            draftWorkflow: null,
            isDirty: false,
            lastSavedAt: new Date().toISOString(),
          })
        },

        setAutoSaveEnabled: (enabled) => {
          set({ autoSaveEnabled: enabled })
        },

        hasUnsavedChanges: () => {
          const state = get()
          return state.isDirty || (state.draftWorkflow !== null && state.savedWorkflow !== null)
        },

        getLastSavedVersion: () => {
          const state = get()
          return state.savedWorkflow
        },

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

        setSelectedSteps: (stepIds) => set({ selectedStepIds: stepIds }),

        addToSelection: (stepId) => {
          set((state) => ({
            selectedStepIds: state.selectedStepIds.includes(stepId)
              ? state.selectedStepIds
              : [...state.selectedStepIds, stepId],
          }))
        },

        removeFromSelection: (stepId) => {
          set((state) => ({
            selectedStepIds: state.selectedStepIds.filter((id) => id !== stepId),
          }))
        },

        selectAllSteps: () => {
          const state = get()
          if (!state.workflow) return
          set({ selectedStepIds: state.workflow.steps.map((step) => step.id) })
        },

        clearSelection: () => set({ selectedStepIds: [] }),

        deleteSelectedSteps: () => {
          const state = get()
          if (!state.workflow || state.selectedStepIds.length === 0) return

          // Remove all selected steps and their dependencies
          const updatedSteps = state.workflow.steps
            .filter((step) => !state.selectedStepIds.includes(step.id))
            .map((step) => ({
              ...step,
              deps: step.deps.filter((depId) => !state.selectedStepIds.includes(depId)),
            }))

          set({
            workflow: {
              ...state.workflow,
              steps: updatedSteps,
              metadata: {
                ...state.workflow.metadata,
                updatedAt: new Date().toISOString(),
              },
            },
            isDirty: true,
            selectedStepIds: [],
            selectedStepId: state.selectedStepIds.includes(state.selectedStepId || '')
              ? null
              : state.selectedStepId,
          })
        },

        // Node position management
        updateNodePosition: (stepId, position) => {
          set((state) => ({
            nodePositions: {
              ...state.nodePositions,
              [stepId]: position,
            },
            workflow: state.workflow
              ? {
                  ...state.workflow,
                  positions: {
                    ...state.workflow.positions,
                    [stepId]: position,
                  },
                }
              : null,
            isDirty: true,
          }))
        },

        getNodePosition: (stepId) => {
          const state = get()
          return state.nodePositions[stepId] || null
        },

        // Canvas viewport management
        updateViewport: (viewport) => {
          set({ viewport })
        },

        getViewport: () => {
          const state = get()
          return state.viewport
        },

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

            // Include node positions in the workflow definition
            const workflowWithPositions = {
              ...state.workflow,
              positions: state.nodePositions,
            }

            console.log('[WorkflowBuilder] Saving workflow with positions:', state.nodePositions)
            console.log('[WorkflowBuilder] Workflow steps being saved:', state.workflow.steps)

            const saveData = {
              name: workflowName,
              description: workflowDescription,
              definition: workflowWithPositions,
              scope,
              projectId,
              source: 'ui' as const,
              isTemplate: false,
            }

            console.log('[WorkflowBuilder] Save data being sent:', saveData)

            let response
            if (state.savedWorkflowDatabaseId) {
              // UPDATE existing workflow
              console.log(
                '[WorkflowBuilder] Updating existing workflow:',
                state.savedWorkflowDatabaseId
              )
              response = await ky
                .put(`/api/workflows/saved/${state.savedWorkflowDatabaseId}`, {
                  json: saveData,
                })
                .json<{ workflow: { id: string; name: string; createdAt: string } }>()
            } else {
              // CREATE new workflow
              console.log('[WorkflowBuilder] Creating new workflow')
              response = await ky
                .post('/api/workflows/saved', {
                  json: saveData,
                })
                .json<{ workflow: { id: string; name: string; createdAt: string } }>()

              // Set the database ID for future saves
              set({ savedWorkflowDatabaseId: response.workflow.id })
            }

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

        // Persistence management
        clearPersistedState: () => {
          // Clear the browser-persisted state for this store
          if (typeof window !== 'undefined') {
            // Clear from localStorage or whatever storage adapter is being used
            const storeName = 'studio-ai-workflow-builder'
            localStorage.removeItem(storeName)
            sessionStorage.removeItem(storeName)

            // Also clear from our unified storage - use the correct key
            fetch(`/api/storage/item/workflow-builder/${storeName}`, { method: 'DELETE' }).catch(
              () => {
                // Ignore errors - storage might not exist
              }
            )
          }

          // Reset the current state to initial values
          set({
            workflow: null,
            isDirty: false,
            selectedStepId: null,
            selectedStepIds: [],
            nodePositions: {},
            validationResult: null,
            isValidating: false,
            isExecuting: false,
            isSaving: false,
            lastError: null,
          })
        },
      }),
      {
        name: 'studio-ai-workflow-builder',
        version: 1,
        storage: createContextAwareStorage(),
        // Only persist the workflow data and draft/saved state, not UI state
        partialize: (state: WorkflowBuilderState) => {
          // Check if we're in the middle of loading a workflow
          if (typeof window !== 'undefined' && sessionStorage.getItem('workflow-loading')) {
            // Don't persist anything during workflow loading to prevent rehydration conflicts
            return {}
          }

          return {
            workflow: state.workflow,
            isDirty: state.isDirty,
            savedWorkflow: state.savedWorkflow,
            draftWorkflow: state.draftWorkflow,
            autoSaveEnabled: state.autoSaveEnabled,
            lastSavedAt: state.lastSavedAt,
            conflictVersion: state.conflictVersion,
            viewport: state.viewport, // Persist canvas zoom and position
            // DO NOT persist nodePositions separately - they should come from workflow.positions
          }
        },
        // Add custom rehydration logic to respect loading flag and prevent loops
        onRehydrateStorage:
          (_state: WorkflowBuilderState) =>
          (hydratedState?: WorkflowBuilderState, error?: unknown) => {
            if (error) {
              console.error('[WorkflowBuilder] Rehydration error:', error)
              return
            }

            // If we're loading a workflow, skip rehydration
            if (typeof window !== 'undefined' && sessionStorage.getItem('workflow-loading')) {
              console.log('[WorkflowBuilder] Skipping rehydration during workflow load')
              return
            }

            // Set a flag to prevent storage operations during rehydration
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('workflow-rehydrating', 'true')
              // Clear the flag after rehydration is complete
              setTimeout(() => {
                sessionStorage.removeItem('workflow-rehydrating')
              }, 200)
            }

            if (hydratedState) {
              console.log(
                '[WorkflowBuilder] Store rehydrated with workflow:',
                hydratedState.workflow?.name
              )
            }
          },
      }
    ),
    {
      name: 'workflow-builder-store',
      // Enable trace in development for better debugging
      trace: process.env.NODE_ENV === 'development',
    }
  )
)
