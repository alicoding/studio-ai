/**
 * LangGraph State Service - Native LangGraph state and checkpoint access
 *
 * SOLID: Single responsibility - LangGraph state management only
 * DRY: Centralizes LangGraph state operations
 * KISS: Simple wrapper around LangGraph's native state APIs
 * Library-First: Uses LangGraph's get_state and get_state_history directly
 */

import type { BaseCheckpointSaver, StateSnapshot } from '@langchain/langgraph'
import type { WorkflowStep } from '../schemas/invoke'
import { WorkflowBuilder } from './WorkflowBuilder'

export interface LangGraphCheckpoint {
  /** Configuration for this checkpoint including thread_id and checkpoint_id */
  config: {
    configurable: {
      thread_id: string
      checkpoint_ns: string
      checkpoint_id: string
    }
  }
  /** Values of the state channels at this checkpoint */
  values: Record<string, unknown>
  /** Metadata associated with this checkpoint */
  metadata: {
    source: string
    writes: Record<string, unknown> | null
    step: number
    [key: string]: unknown
  }
  /** Nodes to execute next in the graph */
  next: string[]
  /** Task information for this checkpoint */
  tasks: Array<{
    id: string
    name: string
    error: unknown | null
    interrupts: unknown[]
  }>
  /** Timestamp when checkpoint was created */
  created_at: string
  /** Parent checkpoint configuration */
  parent_config: {
    configurable: {
      thread_id: string
      checkpoint_ns: string
      checkpoint_id: string
    }
  } | null
}

export interface LangGraphStateInfo {
  /** Thread identifier */
  threadId: string
  /** Current state snapshot */
  currentState: LangGraphCheckpoint | null
  /** Full checkpoint history (most recent first) */
  checkpointHistory: LangGraphCheckpoint[]
  /** Whether workflow can be resumed */
  canResume: boolean
  /** Current execution status based on state */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'aborted'
}

/**
 * Service for accessing LangGraph's native state and checkpoint functionality
 *
 * This service provides a clean interface to LangGraph's built-in persistence
 * capabilities without reimplementing state management.
 */
export class LangGraphStateService {
  constructor(
    private workflowBuilder: WorkflowBuilder,
    private checkpointer: BaseCheckpointSaver
  ) {}

  /**
   * Get current LangGraph state for a workflow thread
   * Uses LangGraph's native get_state() method
   */
  async getCurrentState(
    threadId: string,
    steps: WorkflowStep[]
  ): Promise<LangGraphCheckpoint | null> {
    try {
      // Build workflow to get compiled graph with checkpointer
      const workflow = await this.workflowBuilder.buildWorkflow(steps, this.checkpointer)

      // Use LangGraph's native state retrieval
      const stateSnapshot = await workflow.getState({
        configurable: { thread_id: threadId },
      })

      if (!stateSnapshot) {
        return null
      }

      return this.mapStateSnapshotToCheckpoint(stateSnapshot)
    } catch (error) {
      console.error(`[LangGraphStateService] Error getting state for thread ${threadId}:`, error)
      return null
    }
  }

  /**
   * Get full checkpoint history for a workflow thread
   * Uses LangGraph's native get_state_history() method
   */
  async getStateHistory(threadId: string, steps: WorkflowStep[]): Promise<LangGraphCheckpoint[]> {
    try {
      // Build workflow to get compiled graph with checkpointer
      const workflow = await this.workflowBuilder.buildWorkflow(steps, this.checkpointer)

      // Use LangGraph's native state history retrieval
      const stateHistory = workflow.getStateHistory({
        configurable: { thread_id: threadId },
      })

      const checkpoints: LangGraphCheckpoint[] = []

      // Iterate through the async generator
      for await (const stateSnapshot of stateHistory) {
        checkpoints.push(this.mapStateSnapshotToCheckpoint(stateSnapshot))
      }

      return checkpoints
    } catch (error) {
      console.error(
        `[LangGraphStateService] Error getting state history for thread ${threadId}:`,
        error
      )
      return []
    }
  }

  /**
   * Get specific checkpoint by checkpoint ID
   * Uses LangGraph's native get_state() with checkpoint_id
   */
  async getCheckpoint(
    threadId: string,
    checkpointId: string,
    steps: WorkflowStep[]
  ): Promise<LangGraphCheckpoint | null> {
    try {
      // Build workflow to get compiled graph with checkpointer
      const workflow = await this.workflowBuilder.buildWorkflow(steps, this.checkpointer)

      // Use LangGraph's native state retrieval with specific checkpoint
      const stateSnapshot = await workflow.getState({
        configurable: {
          thread_id: threadId,
          checkpoint_id: checkpointId,
        },
      })

      if (!stateSnapshot) {
        return null
      }

      return this.mapStateSnapshotToCheckpoint(stateSnapshot)
    } catch (error) {
      console.error(
        `[LangGraphStateService] Error getting checkpoint ${checkpointId} for thread ${threadId}:`,
        error
      )
      return null
    }
  }

  /**
   * Get comprehensive state information for a workflow
   * Combines current state, history, and status analysis
   */
  async getStateInfo(threadId: string, steps: WorkflowStep[]): Promise<LangGraphStateInfo> {
    const [currentState, checkpointHistory] = await Promise.all([
      this.getCurrentState(threadId, steps),
      this.getStateHistory(threadId, steps),
    ])

    const canResume = this.determineCanResume(currentState, checkpointHistory)
    const status = this.determineStatus(currentState, checkpointHistory)

    return {
      threadId,
      currentState,
      checkpointHistory,
      canResume,
      status,
    }
  }

  /**
   * Resume workflow execution from last checkpoint
   * Uses LangGraph's native graph.invoke(None, config) pattern
   */
  async resumeWorkflow(
    threadId: string,
    steps: WorkflowStep[],
    projectId?: string
  ): Promise<{ success: boolean; error?: string; resumed: boolean }> {
    try {
      // First check if workflow can be resumed
      const stateInfo = await this.getStateInfo(threadId, steps)

      if (!stateInfo.canResume) {
        return {
          success: false,
          error: `Workflow cannot be resumed. Status: ${stateInfo.status}`,
          resumed: false,
        }
      }

      // Build workflow to get compiled graph with checkpointer
      const workflow = await this.workflowBuilder.buildWorkflow(steps, this.checkpointer)

      // Use LangGraph's native resume pattern: invoke(None, config)
      // This resumes from the last checkpoint for the given thread
      const config = {
        configurable: {
          thread_id: threadId,
          ...(projectId && { project_id: projectId }),
        },
      }

      console.log(`[LangGraphStateService] Resuming workflow for thread ${threadId}`)

      // LangGraph will automatically resume from the last checkpoint
      await workflow.invoke(null, config)

      console.log(`[LangGraphStateService] Workflow resumed successfully for thread ${threadId}`)

      return {
        success: true,
        resumed: true,
      }
    } catch (error) {
      console.error(
        `[LangGraphStateService] Error resuming workflow for thread ${threadId}:`,
        error
      )
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during resume',
        resumed: false,
      }
    }
  }

  /**
   * Resume workflow from specific checkpoint
   * Uses LangGraph's native graph.invoke(None, config) with checkpoint_id
   */
  async resumeFromCheckpoint(
    threadId: string,
    checkpointId: string,
    steps: WorkflowStep[],
    projectId?: string
  ): Promise<{ success: boolean; error?: string; resumed: boolean }> {
    try {
      // First verify the checkpoint exists
      const checkpoint = await this.getCheckpoint(threadId, checkpointId, steps)

      if (!checkpoint) {
        return {
          success: false,
          error: `Checkpoint ${checkpointId} not found for thread ${threadId}`,
          resumed: false,
        }
      }

      // Build workflow to get compiled graph with checkpointer
      const workflow = await this.workflowBuilder.buildWorkflow(steps, this.checkpointer)

      // Use LangGraph's native resume pattern with specific checkpoint
      const config = {
        configurable: {
          thread_id: threadId,
          checkpoint_id: checkpointId,
          ...(projectId && { project_id: projectId }),
        },
      }

      console.log(
        `[LangGraphStateService] Resuming workflow from checkpoint ${checkpointId} for thread ${threadId}`
      )

      // LangGraph will resume from the specified checkpoint
      await workflow.invoke(null, config)

      console.log(
        `[LangGraphStateService] Workflow resumed successfully from checkpoint ${checkpointId}`
      )

      return {
        success: true,
        resumed: true,
      }
    } catch (error) {
      console.error(
        `[LangGraphStateService] Error resuming from checkpoint ${checkpointId} for thread ${threadId}:`,
        error
      )
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during checkpoint resume',
        resumed: false,
      }
    }
  }

  /**
   * Map LangGraph StateSnapshot to our checkpoint format
   * Preserves all LangGraph-specific fields while ensuring type safety
   */
  private mapStateSnapshotToCheckpoint(stateSnapshot: StateSnapshot): LangGraphCheckpoint {
    // Safely access configurable properties with null checks
    const configurable = stateSnapshot.config?.configurable || {}
    const parentConfigurable = stateSnapshot.parentConfig?.configurable || {}

    return {
      config: {
        configurable: {
          thread_id: (configurable.thread_id as string) || '',
          checkpoint_ns: (configurable.checkpoint_ns as string) || '',
          checkpoint_id: (configurable.checkpoint_id as string) || '',
        },
      },
      values: stateSnapshot.values || {},
      metadata: {
        source: stateSnapshot.metadata?.source || 'unknown',
        writes: stateSnapshot.metadata?.writes || null,
        step: stateSnapshot.metadata?.step || 0,
        ...stateSnapshot.metadata,
      },
      next: Array.isArray(stateSnapshot.next) ? stateSnapshot.next : [],
      tasks: (stateSnapshot.tasks || []).map((task) => ({
        id: task.id || '',
        name: task.name || '',
        error: task.error || null,
        interrupts: task.interrupts || [],
      })),
      created_at: stateSnapshot.createdAt || new Date().toISOString(),
      parent_config: stateSnapshot.parentConfig
        ? {
            configurable: {
              thread_id: (parentConfigurable.thread_id as string) || '',
              checkpoint_ns: (parentConfigurable.checkpoint_ns as string) || '',
              checkpoint_id: (parentConfigurable.checkpoint_id as string) || '',
            },
          }
        : null,
    }
  }

  /**
   * Determine if workflow can be resumed based on LangGraph state
   */
  private determineCanResume(
    currentState: LangGraphCheckpoint | null,
    history: LangGraphCheckpoint[]
  ): boolean {
    if (!currentState) {
      return false
    }

    // Can resume if there are next steps to execute or if we have checkpoint history
    return currentState.next.length > 0 || history.length > 0
  }

  /**
   * Determine workflow status based on LangGraph state
   */
  private determineStatus(
    currentState: LangGraphCheckpoint | null,
    _history: LangGraphCheckpoint[]
  ): 'pending' | 'running' | 'completed' | 'failed' | 'aborted' {
    if (!currentState) {
      return 'pending'
    }

    // Check if there are next steps to execute
    if (currentState.next.length > 0) {
      return 'running'
    }

    // Check for error indicators in tasks
    const hasErrors = currentState.tasks.some((task) => task.error !== null)
    if (hasErrors) {
      return 'failed'
    }

    // Check metadata for status indicators
    if (currentState.metadata.source === 'loop' && currentState.next.length === 0) {
      return 'completed'
    }

    // Default to completed if no next steps and no errors
    return 'completed'
  }
}
