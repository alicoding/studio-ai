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
}

interface WorkflowStore {
  workflows: Record<string, WorkflowInfo>
  workflowList: WorkflowInfo[] // Stable array reference
  addWorkflow: (workflow: WorkflowInfo) => void
  updateWorkflow: (threadId: string, updates: Partial<WorkflowInfo>) => void
  updateStep: (threadId: string, stepId: string, updates: Partial<WorkflowStep>) => void
  removeWorkflow: (threadId: string) => void
  getWorkflow: (threadId: string) => WorkflowInfo | undefined
  getActiveWorkflows: () => WorkflowInfo[]
  clearCompletedWorkflows: () => void
  fetchWorkflows: () => Promise<void>
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  workflows: {},
  workflowList: [],

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

  fetchWorkflows: async () => {
    try {
      // Use the existing invoke-status endpoint which has the full workflow metadata
      const response = await fetch(`${window.location.origin}/api/invoke-status/workflows`)
      if (!response.ok) {
        throw new Error(`Failed to fetch workflows: ${response.statusText}`)
      }

      const data = await response.json()
      const workflows = data.workflows || []

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

      set({ workflows: workflowMap, workflowList: Object.values(workflowMap) })
    } catch (error) {
      console.error('Failed to fetch workflows:', error)
    }
  },
}))
