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
  addWorkflow: (workflow: WorkflowInfo) => void
  updateWorkflow: (threadId: string, updates: Partial<WorkflowInfo>) => void
  updateStep: (threadId: string, stepId: string, updates: Partial<WorkflowStep>) => void
  removeWorkflow: (threadId: string) => void
  getWorkflow: (threadId: string) => WorkflowInfo | undefined
  getActiveWorkflows: () => WorkflowInfo[]
  clearCompletedWorkflows: () => void
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  workflows: {},

  addWorkflow: (workflow) =>
    set((state) => ({
      workflows: {
        ...state.workflows,
        [workflow.threadId]: workflow,
      },
    })),

  updateWorkflow: (threadId, updates) =>
    set((state) => {
      const existing = state.workflows[threadId]
      if (!existing) return state

      return {
        workflows: {
          ...state.workflows,
          [threadId]: {
            ...existing,
            ...updates,
            lastUpdate: new Date().toISOString(),
          },
        },
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

      return {
        workflows: {
          ...state.workflows,
          [threadId]: {
            ...workflow,
            steps: updatedSteps,
            lastUpdate: new Date().toISOString(),
          },
        },
      }
    }),

  removeWorkflow: (threadId) =>
    set((state) => ({
      workflows: Object.fromEntries(
        Object.entries(state.workflows).filter(([id]) => id !== threadId)
      ),
    })),

  getWorkflow: (threadId) => get().workflows[threadId],

  getActiveWorkflows: () =>
    Object.values(get().workflows).filter((workflow) => workflow.status === 'running'),

  clearCompletedWorkflows: () =>
    set((state) => ({
      workflows: Object.fromEntries(
        Object.entries(state.workflows).filter(([, workflow]) => workflow.status === 'running')
      ),
    })),
}))
