/**
 * Workflow State API - Native LangGraph state and checkpoint endpoints
 *
 * SOLID: Single responsibility - LangGraph state management only
 * DRY: Reuses LangGraphStateService for all state operations
 * KISS: Simple REST endpoints for state access
 * Library-First: Uses LangGraph's native state capabilities
 */

import { Router } from 'express'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { LangGraphStateService } from '../services/LangGraphStateService'
import { WorkflowBuilder } from '../services/WorkflowBuilder'
import { getCheckpointer } from '../services/database/checkpointer'
import { WorkflowNodeFactory } from '../services/WorkflowNodeFactory'
import { StepExecutorRegistry } from '../services/executors'
import { WorkflowEventEmitter } from '../services/WorkflowEventEmitter'
import { WorkflowStateManager } from '../services/WorkflowStateManager'
import { ConditionEvaluator } from '../services/ConditionEvaluator'
import type { WorkflowStep } from '../schemas/invoke'

const router = Router()

// Request schemas for validation following type safety principles
const GetStateRequestSchema = z.object({
  steps: z.array(
    z.object({
      id: z.string(),
      task: z.string(),
      role: z.string().optional(),
      agentId: z.string().optional(),
      type: z.string().optional(),
      deps: z.array(z.string()).optional(),
      condition: z.union([z.string(), z.object({})]).optional(),
      trueBranch: z.string().optional(),
      falseBranch: z.string().optional(),
    })
  ),
})

/**
 * Get current LangGraph state for a workflow thread
 * Uses LangGraph's native getState() method
 */
router.post('/state/:threadId', async (req: Request, res: Response) => {
  const { threadId } = req.params

  try {
    // Validate request body
    const parseResult = GetStateRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: parseResult.error.issues,
      })
    }

    const { steps } = parseResult.data

    // Initialize LangGraph state service with dependencies (DRY principle)
    const stateService = await createLangGraphStateService()

    // Get current state using LangGraph's native capabilities
    const currentState = await stateService.getCurrentState(threadId, steps as WorkflowStep[])

    if (!currentState) {
      return res.status(404).json({
        error: 'No state found for this workflow thread',
        threadId,
      })
    }

    res.json({
      threadId,
      state: currentState,
      message: 'Retrieved current LangGraph state successfully',
    })
  } catch (error) {
    console.error(`[WorkflowState API] Error getting state for thread ${threadId}:`, error)
    res.status(500).json({
      error: 'Failed to get workflow state',
      threadId,
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * Get full checkpoint history for a workflow thread
 * Uses LangGraph's native getStateHistory() method
 */
router.post('/history/:threadId', async (req: Request, res: Response) => {
  const { threadId } = req.params

  try {
    // Validate request body
    const parseResult = GetStateRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: parseResult.error.issues,
      })
    }

    const { steps } = parseResult.data

    // Initialize LangGraph state service (DRY principle)
    const stateService = await createLangGraphStateService()

    // Get state history using LangGraph's native capabilities
    const checkpointHistory = await stateService.getStateHistory(threadId, steps as WorkflowStep[])

    res.json({
      threadId,
      checkpoints: checkpointHistory,
      totalCheckpoints: checkpointHistory.length,
      message: 'Retrieved checkpoint history successfully',
    })
  } catch (error) {
    console.error(`[WorkflowState API] Error getting history for thread ${threadId}:`, error)
    res.status(500).json({
      error: 'Failed to get workflow history',
      threadId,
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * Get specific checkpoint by checkpoint ID
 * Uses LangGraph's native getState() with checkpoint_id
 */
router.post('/checkpoint/:threadId/:checkpointId', async (req: Request, res: Response) => {
  const { threadId, checkpointId } = req.params

  try {
    // Validate request body
    const parseResult = GetStateRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: parseResult.error.issues,
      })
    }

    const { steps } = parseResult.data

    // Initialize LangGraph state service (DRY principle)
    const stateService = await createLangGraphStateService()

    // Get specific checkpoint using LangGraph's native capabilities
    const checkpoint = await stateService.getCheckpoint(
      threadId,
      checkpointId,
      steps as WorkflowStep[]
    )

    if (!checkpoint) {
      return res.status(404).json({
        error: 'Checkpoint not found',
        threadId,
        checkpointId,
      })
    }

    res.json({
      threadId,
      checkpointId,
      checkpoint,
      message: 'Retrieved checkpoint successfully',
    })
  } catch (error) {
    console.error(
      `[WorkflowState API] Error getting checkpoint ${checkpointId} for thread ${threadId}:`,
      error
    )
    res.status(500).json({
      error: 'Failed to get checkpoint',
      threadId,
      checkpointId,
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * Get comprehensive state information for a workflow
 * Combines current state, history, and status analysis
 */
router.post('/info/:threadId', async (req: Request, res: Response) => {
  const { threadId } = req.params

  try {
    // Validate request body
    const parseResult = GetStateRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: parseResult.error.issues,
      })
    }

    const { steps } = parseResult.data

    // Initialize LangGraph state service (DRY principle)
    const stateService = await createLangGraphStateService()

    // Get comprehensive state info using LangGraph's native capabilities
    const stateInfo = await stateService.getStateInfo(threadId, steps as WorkflowStep[])

    res.json({
      threadId,
      stateInfo,
      message: 'Retrieved comprehensive state information successfully',
    })
  } catch (error) {
    console.error(`[WorkflowState API] Error getting state info for thread ${threadId}:`, error)
    res.status(500).json({
      error: 'Failed to get state information',
      threadId,
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * Resume failed workflow from last checkpoint
 * Uses LangGraph's native graph.invoke(None, config) pattern
 */
router.post('/resume/:threadId', async (req: Request, res: Response) => {
  const { threadId } = req.params

  try {
    // Validate request body
    const parseResult = GetStateRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: parseResult.error.issues,
      })
    }

    const { steps } = parseResult.data
    const projectId = req.body.projectId as string | undefined

    // Initialize LangGraph state service (DRY principle)
    const stateService = await createLangGraphStateService()

    // Resume workflow using LangGraph's native capabilities
    const resumeResult = await stateService.resumeWorkflow(
      threadId,
      steps as WorkflowStep[],
      projectId
    )

    if (!resumeResult.success) {
      return res.status(400).json({
        error: resumeResult.error,
        threadId,
        resumed: resumeResult.resumed,
      })
    }

    res.json({
      threadId,
      resumed: resumeResult.resumed,
      message: 'Workflow resumed successfully from last checkpoint',
    })
  } catch (error) {
    console.error(`[WorkflowState API] Error resuming workflow for thread ${threadId}:`, error)
    res.status(500).json({
      error: 'Failed to resume workflow',
      threadId,
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * Resume workflow from specific checkpoint
 * Uses LangGraph's native graph.invoke(None, config) with checkpoint_id
 */
router.post('/resume/:threadId/:checkpointId', async (req: Request, res: Response) => {
  const { threadId, checkpointId } = req.params

  try {
    // Validate request body
    const parseResult = GetStateRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: parseResult.error.issues,
      })
    }

    const { steps } = parseResult.data
    const projectId = req.body.projectId as string | undefined

    // Initialize LangGraph state service (DRY principle)
    const stateService = await createLangGraphStateService()

    // Resume from specific checkpoint using LangGraph's native capabilities
    const resumeResult = await stateService.resumeFromCheckpoint(
      threadId,
      checkpointId,
      steps as WorkflowStep[],
      projectId
    )

    if (!resumeResult.success) {
      return res.status(400).json({
        error: resumeResult.error,
        threadId,
        checkpointId,
        resumed: resumeResult.resumed,
      })
    }

    res.json({
      threadId,
      checkpointId,
      resumed: resumeResult.resumed,
      message: 'Workflow resumed successfully from specified checkpoint',
    })
  } catch (error) {
    console.error(
      `[WorkflowState API] Error resuming from checkpoint ${checkpointId} for thread ${threadId}:`,
      error
    )
    res.status(500).json({
      error: 'Failed to resume from checkpoint',
      threadId,
      checkpointId,
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * Factory function to create LangGraphStateService with required dependencies only
 * Following SOLID and DRY principles by creating only what's needed
 */
async function createLangGraphStateService(): Promise<LangGraphStateService> {
  // Get checkpointer instance (Library-First approach)
  const checkpointer = await getCheckpointer()

  // Create only required dependencies for WorkflowBuilder
  const executorRegistry = new StepExecutorRegistry()
  const eventEmitter = new WorkflowEventEmitter()
  const stateManager = new WorkflowStateManager()
  const conditionEvaluator = ConditionEvaluator.getInstance()
  const nodeFactory = new WorkflowNodeFactory(executorRegistry, eventEmitter)

  // Create WorkflowBuilder with required dependencies only
  const workflowBuilder = new WorkflowBuilder(nodeFactory, conditionEvaluator, stateManager)

  // Return LangGraphStateService instance
  return new LangGraphStateService(workflowBuilder, checkpointer)
}

export default router
