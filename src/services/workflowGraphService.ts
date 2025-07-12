/**
 * Workflow Graph Service
 * API client for workflow graph visualization data
 *
 * SOLID: Single responsibility - workflow graph data fetching
 * DRY: Reuses existing API patterns
 * KISS: Simple service interface
 * Library-First: Uses ky for HTTP requests
 */

import ky from 'ky'
import type { WorkflowGraph } from '../../web/server/schemas/workflow-graph'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3457/api'

export interface WorkflowGraphResponse {
  threadId: string
  status: string
  projectId?: string
  projectName?: string
  graph: WorkflowGraph
  metadata: {
    totalSteps: number
    completedSteps: number
    failedSteps: number
    blockedSteps: number
  }
}

export class WorkflowGraphService {
  /**
   * Get workflow graph data for visualization
   */
  static async getWorkflowGraph(threadId: string, consolidateLoops = false): Promise<WorkflowGraphResponse> {
    try {
      const url = `${API_BASE}/workflow-graph/${threadId}${consolidateLoops ? '?consolidateLoops=true' : ''}`
      const response = await ky
        .get(url)
        .json<WorkflowGraphResponse>()
      return response
    } catch (error) {
      console.error('Failed to fetch workflow graph:', error)
      throw new Error(`Failed to fetch workflow graph: ${error}`)
    }
  }

  /**
   * Resume a workflow from its resume points
   */
  static async resumeWorkflow(threadId: string, originalSteps: Array<{ id: string; role?: string; task: string; deps?: string[] }>): Promise<{ threadId: string; status: string }> {
    try {
      const response = await ky
        .post(`${API_BASE}/invoke`, {
          json: {
            threadId,
            workflow: originalSteps
          }
        })
        .json<{ threadId: string; status: string }>()
      return response
    } catch (error) {
      console.error('Failed to resume workflow:', error)
      throw new Error(`Failed to resume workflow: ${error}`)
    }
  }

  /**
   * Check if workflow graph is available for a thread
   */
  static async isGraphAvailable(threadId: string): Promise<boolean> {
    try {
      await ky.head(`${API_BASE}/workflow-graph/${threadId}`)
      return true
    } catch {
      return false
    }
  }
}
