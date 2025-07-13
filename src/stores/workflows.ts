import { create } from 'zustand'

export interface WorkflowStep {
  id: string
  role?: string
  agentId?: string
  task: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startTime?: string
  endTime?: string
  error?: string
  dependencies?: string[]
  output?: string // Store actual step output for audit and UI display
}

export interface WorkflowInfo {
  threadId: string
  status: 'running' | 'completed' | 'failed' | 'aborted'
  startedBy: string
  invocation: string
  projectId: string
  projectName?: string
  webhook?: string
  webhookType?: string
  currentStep?: string
  steps: WorkflowStep[]
  lastUpdate: string
  sessionIds: Record<string, string>
  results?: Record<string, string> // Add results field to store step outputs
}

interface WorkflowStore {
  workflows: Record<string, WorkflowInfo>
  workflowList: WorkflowInfo[] // Stable array reference
  selectedWorkflows: Set<string> // For bulk operations
  totalCount: number // Total workflows in database
  addWorkflow: (workflow: WorkflowInfo) => void
  updateWorkflow: (threadId: string, updates: Partial<WorkflowInfo>) => void
  updateStep: (threadId: string, stepId: string, updates: Partial<WorkflowStep>) => void
  removeWorkflow: (threadId: string) => void
  getWorkflow: (threadId: string) => WorkflowInfo | undefined
  getActiveWorkflows: () => WorkflowInfo[]
  clearCompletedWorkflows: () => void
  deleteWorkflow: (threadId: string) => Promise<boolean>
  bulkDeleteWorkflows: (threadIds: string[]) => Promise<number>
  cleanupOldWorkflows: (daysOld: number) => Promise<number>
  fetchWorkflows: (projectId?: string) => Promise<void>
  // Selection methods
  toggleWorkflowSelection: (threadId: string) => void
  selectAllWorkflows: () => void
  clearSelection: () => void
  deleteSelected: () => Promise<number>
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  workflows: {},
  workflowList: [],
  selectedWorkflows: new Set<string>(),
  totalCount: 0,

  addWorkflow: (workflow) =>
    set((state) => {
      const workflows = {
        ...state.workflows,
        [workflow.threadId]: workflow,
      }
      return {
        workflows,
        workflowList: Object.values(workflows),
      }
    }),

  updateWorkflow: (threadId, updates) =>
    set((state) => {
      const existing = state.workflows[threadId]
      if (!existing) return state

      const workflows = {
        ...state.workflows,
        [threadId]: {
          ...existing,
          ...updates,
          lastUpdate: new Date().toISOString(),
        },
      }

      return {
        workflows,
        workflowList: Object.values(workflows),
      }
    }),

  updateStep: (threadId, stepId, updates) =>
    set((state) => {
      const workflow = state.workflows[threadId]
      if (!workflow) return state

      const stepIndex = workflow.steps.findIndex((step) => step.id === stepId)
      if (stepIndex === -1) return state

      const updatedSteps = [...workflow.steps]
      updatedSteps[stepIndex] = {
        ...updatedSteps[stepIndex],
        ...updates,
      }

      const workflows = {
        ...state.workflows,
        [threadId]: {
          ...workflow,
          steps: updatedSteps,
          lastUpdate: new Date().toISOString(),
        },
      }

      return {
        workflows,
        workflowList: Object.values(workflows),
      }
    }),

  removeWorkflow: (threadId) =>
    set((state) => {
      const workflows = Object.fromEntries(
        Object.entries(state.workflows).filter(([id]) => id !== threadId)
      )
      return {
        workflows,
        workflowList: Object.values(workflows),
      }
    }),

  getWorkflow: (threadId) => get().workflows[threadId],

  getActiveWorkflows: () =>
    Object.values(get().workflows).filter((workflow) => workflow.status === 'running'),

  clearCompletedWorkflows: () =>
    set((state) => {
      const workflows = Object.fromEntries(
        Object.entries(state.workflows).filter(([, workflow]) => workflow.status === 'running')
      )
      return {
        workflows,
        workflowList: Object.values(workflows),
      }
    }),

  fetchWorkflows: async (projectId?: string) => {
    try {
      // Use window.location.origin (dev server has Redis cross-server communication)
      const url = new URL(`${window.location.origin}/api/invoke-status/workflows`)
      if (projectId) {
        url.searchParams.set('projectId', projectId)
      }
      console.log('[WorkflowStore] Fetching workflows from:', url.toString())
      const response = await fetch(url.toString())
      if (!response.ok) {
        throw new Error(`Failed to fetch workflows: ${response.statusText}`)
      }

      const data = await response.json()
      const workflows = data.workflows || []
      const totalCount = data.totalCount || workflows.length
      console.log(
        '[WorkflowStore] Fetched',
        workflows.length,
        'workflows from server (total in DB:',
        totalCount,
        ')'
      )

      // Transform backend format to frontend format
      const workflowMap: Record<string, WorkflowInfo> = {}
      workflows.forEach(
        (workflow: {
          threadId: string
          status: 'running' | 'completed' | 'failed' | 'aborted'
          sessionIds: Record<string, string>
          lastUpdate: string
          currentStep?: string
          startedBy?: string
          invocation?: string
          projectId?: string
          projectName?: string
          webhook?: string
          webhookType?: string
          steps?: Array<{
            id: string
            role?: string
            agentId?: string
            task: string
            status: 'pending' | 'running' | 'completed' | 'failed'
            startTime?: string
            endTime?: string
            error?: string
            dependencies?: string[]
          }>
        }) => {
          workflowMap[workflow.threadId] = {
            threadId: workflow.threadId,
            status: workflow.status,
            startedBy: workflow.startedBy || 'Claude Code CLI',
            invocation: workflow.invocation || `Workflow ${workflow.threadId.substring(0, 8)}...`,
            projectId: workflow.projectId || 'current-project',
            projectName: workflow.projectName,
            webhook: workflow.webhook,
            webhookType: workflow.webhookType,
            currentStep: workflow.currentStep,
            steps: workflow.steps || [],
            lastUpdate: workflow.lastUpdate,
            sessionIds: workflow.sessionIds,
          }
        }
      )

      set({
        workflows: workflowMap,
        workflowList: Object.values(workflowMap),
        totalCount: totalCount,
      })
    } catch (error) {
      console.error('Failed to fetch workflows:', error)
    }
  },

  deleteWorkflow: async (threadId: string) => {
    try {
      console.log('[WorkflowStore] Deleting workflow:', threadId)
      const response = await fetch(
        `${window.location.origin}/api/invoke-status/workflows/${threadId}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to delete workflow: ${response.statusText}`)
      }

      console.log('[WorkflowStore] Successfully deleted workflow, updating local state')

      // Remove from local state immediately - don't refetch to avoid overriding the deletion
      get().removeWorkflow(threadId)

      return true
    } catch (error) {
      console.error('Failed to delete workflow:', error)
      return false
    }
  },

  bulkDeleteWorkflows: async (threadIds: string[]) => {
    try {
      const response = await fetch(`${window.location.origin}/api/invoke-status/workflows`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ threadIds }),
      })

      if (!response.ok) {
        throw new Error(`Failed to bulk delete workflows: ${response.statusText}`)
      }

      const data = await response.json()

      // Remove successfully deleted workflows from local state
      threadIds.forEach((threadId) => {
        get().removeWorkflow(threadId)
      })

      return data.deletedCount || 0
    } catch (error) {
      console.error('Failed to bulk delete workflows:', error)
      return 0
    }
  },

  cleanupOldWorkflows: async (daysOld: number) => {
    try {
      const response = await fetch(`${window.location.origin}/api/invoke-status/workflows`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ daysOld }),
      })

      if (!response.ok) {
        throw new Error(`Failed to cleanup old workflows: ${response.statusText}`)
      }

      const data = await response.json()

      // Refresh workflows from server to get updated state
      await get().fetchWorkflows()

      return data.deletedCount || 0
    } catch (error) {
      console.error('Failed to cleanup old workflows:', error)
      return 0
    }
  },

  // Selection methods
  toggleWorkflowSelection: (threadId: string) =>
    set((state) => {
      const newSelected = new Set(state.selectedWorkflows)
      if (newSelected.has(threadId)) {
        newSelected.delete(threadId)
      } else {
        newSelected.add(threadId)
      }
      return { selectedWorkflows: newSelected }
    }),

  selectAllWorkflows: () =>
    set((state) => ({
      selectedWorkflows: new Set(state.workflowList.map((w) => w.threadId)),
    })),

  clearSelection: () =>
    set(() => ({
      selectedWorkflows: new Set<string>(),
    })),

  deleteSelected: async () => {
    const { selectedWorkflows, bulkDeleteWorkflows, clearSelection } = get()
    const threadIds = Array.from(selectedWorkflows)

    if (threadIds.length === 0) {
      return 0
    }

    try {
      const deletedCount = await bulkDeleteWorkflows(threadIds)
      clearSelection()
      return deletedCount
    } catch (error) {
      console.error('Failed to delete selected workflows:', error)
      return 0
    }
  },
}))
