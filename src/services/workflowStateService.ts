/**
 * Workflow State Service
 * API client for workflow state operations (pause, resume, abort, history)
 *
 * SOLID: Single responsibility - workflow state management
 * DRY: Reuses existing API patterns from workflowGraphService
 * KISS: Simple service interface with consistent error handling
 * Library-First: Uses ky for HTTP requests
 */

import ky from 'ky'

const API_BASE = `${window.location.origin}/api`

// Types for workflow step definition
export interface WorkflowStep {
  id: string
  role?: string
  agentId?: string
  task: string
  deps?: string[]
  type?: string
  condition?: string
  trueBranch?: string
  falseBranch?: string
}

// Response types for various operations
export interface PauseWorkflowResponse {
  threadId: string
  paused: boolean
  message?: string
  error?: string
}

export interface ResumeWorkflowResponse {
  threadId: string
  resumed: boolean
  message?: string
  error?: string
}

export interface AbortWorkflowResponse {
  threadId: string
  success: boolean
  status: string
  message?: string
  error?: string
}

export interface CheckpointData {
  id: string
  timestamp: string
  status: string
  stepId: string
  data: Record<string, unknown>
}

export interface WorkflowHistoryResponse {
  threadId: string
  checkpoints: CheckpointData[]
  totalCheckpoints: number
  message?: string
}

export interface WorkflowStateInfo {
  threadId: string
  currentState: Record<string, unknown> | null
  completedSteps: string[]
  pendingSteps: string[]
  sessionIds: Record<string, string>
  canResume: boolean
  status: string
  checkpointHistory: CheckpointData[]
}

export interface WorkflowStateInfoResponse {
  threadId: string
  stateInfo: WorkflowStateInfo
  message?: string
}

export class WorkflowStateService {
  /**
   * Pause a running workflow
   */
  static async pauseWorkflow(
    threadId: string,
    steps: WorkflowStep[],
    reason?: string
  ): Promise<PauseWorkflowResponse> {
    try {
      const response = await ky
        .post(`${API_BASE}/workflow-state/pause/${threadId}`, {
          json: {
            steps,
            reason,
          },
        })
        .json<PauseWorkflowResponse>()
      return response
    } catch (error) {
      console.error('Failed to pause workflow:', error)
      throw new Error(`Failed to pause workflow: ${error}`)
    }
  }

  /**
   * Resume a workflow from last checkpoint
   */
  static async resumeWorkflow(
    threadId: string,
    steps: WorkflowStep[],
    projectId?: string
  ): Promise<ResumeWorkflowResponse> {
    try {
      const response = await ky
        .post(`${API_BASE}/workflow-state/resume/${threadId}`, {
          json: {
            steps,
            projectId,
          },
        })
        .json<ResumeWorkflowResponse>()
      return response
    } catch (error) {
      console.error('Failed to resume workflow:', error)
      throw new Error(`Failed to resume workflow: ${error}`)
    }
  }

  /**
   * Resume a workflow from specific checkpoint
   */
  static async resumeFromCheckpoint(
    threadId: string,
    checkpointId: string,
    steps: WorkflowStep[],
    projectId?: string
  ): Promise<ResumeWorkflowResponse> {
    try {
      const response = await ky
        .post(`${API_BASE}/workflow-state/resume/${threadId}/${checkpointId}`, {
          json: {
            steps,
            projectId,
          },
        })
        .json<ResumeWorkflowResponse>()
      return response
    } catch (error) {
      console.error('Failed to resume from checkpoint:', error)
      throw new Error(`Failed to resume from checkpoint: ${error}`)
    }
  }

  /**
   * Abort a running workflow
   */
  static async abortWorkflow(threadId: string): Promise<AbortWorkflowResponse> {
    try {
      const response = await ky
        .post(`${API_BASE}/invoke-status/abort/${threadId}`)
        .json<AbortWorkflowResponse>()
      return response
    } catch (error) {
      console.error('Failed to abort workflow:', error)
      throw new Error(`Failed to abort workflow: ${error}`)
    }
  }

  /**
   * Get workflow checkpoint history
   */
  static async getHistory(
    threadId: string,
    steps: WorkflowStep[]
  ): Promise<WorkflowHistoryResponse> {
    try {
      const response = await ky
        .post(`${API_BASE}/workflow-state/history/${threadId}`, {
          json: {
            steps,
          },
        })
        .json<WorkflowHistoryResponse>()
      return response
    } catch (error) {
      console.error('Failed to get workflow history:', error)
      throw new Error(`Failed to get workflow history: ${error}`)
    }
  }

  /**
   * Get comprehensive workflow state information
   */
  static async getStateInfo(
    threadId: string,
    steps: WorkflowStep[]
  ): Promise<WorkflowStateInfoResponse> {
    try {
      const response = await ky
        .post(`${API_BASE}/workflow-state/info/${threadId}`, {
          json: {
            steps,
          },
        })
        .json<WorkflowStateInfoResponse>()
      return response
    } catch (error) {
      console.error('Failed to get workflow state info:', error)
      throw new Error(`Failed to get workflow state info: ${error}`)
    }
  }

  /**
   * Check if a workflow is currently active (can be paused/aborted)
   */
  static async isWorkflowActive(threadId: string): Promise<boolean> {
    try {
      // Use the existing workflow status API to check if workflow is running
      const response = await ky
        .get(`${API_BASE}/invoke-status/status/${threadId}`)
        .json<{ status: string }>()
      return response.status === 'running'
    } catch {
      return false
    }
  }

  /**
   * Get current workflow state
   */
  static async getCurrentState(
    threadId: string,
    steps: WorkflowStep[]
  ): Promise<Record<string, unknown> | null> {
    try {
      const response = await ky
        .post(`${API_BASE}/workflow-state/state/${threadId}`, {
          json: {
            steps,
          },
        })
        .json<{ state: Record<string, unknown> }>()
      return response.state
    } catch (error) {
      console.error('Failed to get current workflow state:', error)
      return null
    }
  }
}
