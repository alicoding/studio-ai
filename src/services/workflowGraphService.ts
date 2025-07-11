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

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3456/api'

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
  static async getWorkflowGraph(threadId: string): Promise<WorkflowGraphResponse> {
    try {
      const response = await ky
        .get(`${API_BASE}/workflow-graph/${threadId}`)
        .json<WorkflowGraphResponse>()
      return response
    } catch (error) {
      console.error('Failed to fetch workflow graph:', error)
      throw new Error(`Failed to fetch workflow graph: ${error}`)
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
