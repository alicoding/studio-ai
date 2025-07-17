/**
 * Invoke Status API - Track workflow execution status
 *
 * SOLID: Single responsibility - status tracking
 * DRY: Reuses existing schemas
 * KISS: Simple status endpoint
 */

import { Router } from 'express'
import type { Request, Response } from 'express'
import { EventEmitter } from 'events'
import { WorkflowOrchestrator } from '../services/WorkflowOrchestrator'
import type { WorkflowStep } from '../schemas/invoke'

// Workflow event types
interface WorkflowEvent {
  type:
    | 'workflow_created'
    | 'step_start'
    | 'step_complete'
    | 'step_failed'
    | 'workflow_complete'
    | 'workflow_failed'
    | 'workflow_aborted'
    | 'graph_update'
  threadId: string
  stepId?: string
  sessionId?: string
  retry?: number
  status?: string
  lastStep?: string
  projectId?: string
  error?: string
}

// Import WorkflowRegistry for persistent storage
import { WorkflowRegistry } from '../services/WorkflowRegistry'

const router = Router()

/**
 * Get workflow status by threadId using LangGraph state
 */
router.post('/status/:threadId', async (req: Request, res: Response) => {
  const { threadId } = req.params
  const { steps } = req.body as { steps: WorkflowStep[] }

  if (!steps || !Array.isArray(steps)) {
    return res.status(400).json({ error: 'Steps array is required in request body' })
  }

  try {
    const orchestrator = new WorkflowOrchestrator()
    const state = await orchestrator.getWorkflowState(threadId, steps)
    res.json(state)
  } catch (error) {
    console.error('Error getting workflow status:', error)
    res.status(500).json({ error: 'Failed to get workflow status' })
  }
})

/**
 * Get workflow statuses from database, optionally filtered by project
 */
router.get('/workflows', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query as { projectId?: string }
    const registry = WorkflowRegistry.getInstance()

    // Build filter options
    const filterOptions: { limit?: number; projectId?: string } = { limit: 100 }
    if (projectId) {
      filterOptions.projectId = projectId
    }

    // First get total count (with same filter)
    const totalFilterOptions = projectId ? { projectId } : {}
    const allWorkflows = await registry.listWorkflows(totalFilterOptions) // No limit to get true count
    console.log(
      '[Workflows API] Total workflows in database:',
      allWorkflows.length,
      projectId ? `for project ${projectId}` : ''
    )

    // Then get limited results for response (to prevent huge responses)
    const workflows = await registry.listWorkflows(filterOptions) // Limit to 100 recent workflows
    console.log(
      '[Workflows API] Returning',
      workflows.length,
      'workflows (limited)',
      projectId ? `for project ${projectId}` : ''
    )

    res.json({ workflows, totalCount: allWorkflows.length })
  } catch (error) {
    console.error('[Workflows API] Error listing workflows:', error)
    res.status(500).json({
      error: 'Failed to list workflows',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * SSE endpoint for global workflow events
 */
router.get('/events', (req: Request, res: Response) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  // Send initial connection event
  res.write(`event: connected\ndata: {}\n\n`)

  // Get or create workflow events emitter
  let workflowEvents = req.app.get('workflowEvents')

  if (!workflowEvents) {
    // Create the event emitter if it doesn't exist yet
    workflowEvents = new EventEmitter()
    workflowEvents.setMaxListeners(100)
    req.app.set('workflowEvents', workflowEvents)
    console.log('[WorkflowEvents] Created workflow event emitter')
  }

  // Send heartbeat every 30 seconds to keep connection alive
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(':heartbeat\n\n')
    } catch {
      // Connection closed, stop heartbeat
      clearInterval(heartbeatInterval)
    }
  }, 30000)

  // Listen for workflow events
  const handleWorkflowUpdate = (data: WorkflowEvent & { graph?: unknown }) => {
    // Emit different event types based on the data
    if (data.type === 'workflow_created') {
      res.write(`event: workflow_created\ndata: ${JSON.stringify(data)}\n\n`)
    } else if (
      data.type === 'step_start' ||
      data.type === 'step_complete' ||
      data.type === 'step_failed'
    ) {
      res.write(
        `event: step_update\ndata: ${JSON.stringify({
          ...data,
          status: data.type.replace('step_', ''),
        })}\n\n`
      )
    } else if (
      data.type === 'workflow_complete' ||
      data.type === 'workflow_failed' ||
      data.type === 'workflow_aborted'
    ) {
      // Map event types to status strings to match WorkflowInfo interface
      const status =
        data.type === 'workflow_complete'
          ? 'completed'
          : data.type === 'workflow_failed'
            ? 'failed'
            : 'aborted'
      res.write(
        `event: workflow_status\ndata: ${JSON.stringify({
          ...data,
          status,
        })}\n\n`
      )
    } else if (data.type === 'graph_update' && data.graph) {
      res.write(
        `event: graph_update\ndata: ${JSON.stringify({
          threadId: data.threadId,
          graph: data.graph,
        })}\n\n`
      )
    }
  }

  workflowEvents.on('workflow:update', handleWorkflowUpdate)

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(heartbeatInterval)
    workflowEvents.off('workflow:update', handleWorkflowUpdate)
  })
})

/**
 * Get workflow status by threadId from database
 */
router.get('/status/:threadId', async (req: Request, res: Response) => {
  const { threadId } = req.params

  try {
    const registry = WorkflowRegistry.getInstance()
    const workflow = await registry.getWorkflow(threadId)

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' })
    }

    res.json(workflow)
  } catch (error) {
    console.error('[Status API] Error getting workflow:', error)
    res.status(500).json({
      error: 'Failed to get workflow status',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * Delete specific workflow by threadId
 */
router.delete('/workflows/:threadId', async (req: Request, res: Response) => {
  const { threadId } = req.params

  try {
    const registry = WorkflowRegistry.getInstance()

    // Check if workflow exists first
    const existing = await registry.getWorkflow(threadId)
    if (!existing) {
      return res.status(404).json({ error: 'Workflow not found' })
    }

    // Delete the workflow
    await registry.deleteWorkflow(threadId)
    res.json({ success: true, threadId })
  } catch (error) {
    console.error('[Delete API] Error deleting workflow:', error)
    res.status(500).json({
      error: 'Failed to delete workflow',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * Bulk delete workflows or cleanup old workflows
 */
router.delete('/workflows', async (req: Request, res: Response) => {
  const { threadIds, daysOld } = req.body as {
    threadIds?: string[]
    daysOld?: number
  }

  try {
    const registry = WorkflowRegistry.getInstance()
    let deletedCount = 0

    if (threadIds && Array.isArray(threadIds)) {
      // Bulk delete specific workflows
      for (const threadId of threadIds) {
        try {
          // Check if workflow exists before deleting
          const existing = await registry.getWorkflow(threadId)
          if (existing) {
            await registry.deleteWorkflow(threadId)
            deletedCount++
          }
        } catch (error) {
          console.error(`[Bulk Delete] Failed to delete workflow ${threadId}:`, error)
          // Continue with other deletions
        }
      }
      res.json({ success: true, deletedCount, message: `Deleted ${deletedCount} workflows` })
    } else if (typeof daysOld === 'number' && daysOld > 0) {
      // Cleanup old workflows
      deletedCount = await registry.cleanupOldWorkflows(daysOld)
      res.json({
        success: true,
        deletedCount,
        message: `Cleaned up ${deletedCount} workflows older than ${daysOld} days`,
      })
    } else {
      res.status(400).json({
        error: 'Invalid request body',
        message: 'Provide either threadIds array or daysOld number',
      })
    }
  } catch (error) {
    console.error('[Bulk Delete API] Error deleting workflows:', error)
    res.status(500).json({
      error: 'Failed to delete workflows',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * Abort workflow execution
 */
router.post('/abort/:threadId', async (req: Request, res: Response) => {
  const { threadId } = req.params

  try {
    // Import WorkflowOrchestrator to check if workflow is active and abort it
    const { WorkflowOrchestrator } = await import('../services/WorkflowOrchestrator')

    // Check if workflow is currently active
    if (!WorkflowOrchestrator.isWorkflowActive(threadId)) {
      return res.status(404).json({
        error: 'Workflow not found or not currently running',
        threadId,
      })
    }

    // Abort the workflow by calling the static abort method
    await WorkflowOrchestrator.abortWorkflow(threadId)

    // Update workflow status in database
    const registry = WorkflowRegistry.getInstance()
    await registry.updateWorkflow(threadId, {
      status: 'aborted',
      lastUpdate: new Date().toISOString(),
    })

    // Emit workflow aborted event via SSE
    const workflowEvents = req.app.get('workflowEvents')
    if (workflowEvents) {
      workflowEvents.emit('workflow:update', {
        type: 'workflow_aborted',
        threadId,
        status: 'aborted',
        timestamp: new Date().toISOString(),
      })
    }

    // Also emit via WebSocket if available
    const io = req.app.get('io')
    if (io) {
      io.emit('workflow:aborted', {
        threadId,
        status: 'aborted',
        timestamp: new Date().toISOString(),
      })
    }

    console.log(`[Abort API] Successfully aborted workflow ${threadId}`)

    res.json({
      success: true,
      threadId,
      status: 'aborted',
      message: 'Workflow aborted successfully',
    })
  } catch (error) {
    console.error(`[Abort API] Error aborting workflow ${threadId}:`, error)
    res.status(500).json({
      error: 'Failed to abort workflow',
      threadId,
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * Update workflow status in database (internal use)
 */
export async function updateWorkflowStatus(
  threadId: string,
  update: Partial<{
    sessionIds: Record<string, string>
    status: 'running' | 'completed' | 'aborted' | 'failed'
    currentStep: string
    startedBy: string
    invocation: string
    projectId: string
    projectName: string
    webhook: string
    webhookType: string
    savedWorkflowId: string
    steps: Array<{
      id: string
      role?: string
      agentId?: string
      task: string
      status:
        | 'pending'
        | 'running'
        | 'completed'
        | 'failed'
        | 'blocked'
        | 'not_executed'
        | 'skipped'
        | 'aborted'
      startTime?: string
      endTime?: string
      error?: string
      dependencies?: string[]
    }>
  }>
) {
  try {
    const registry = WorkflowRegistry.getInstance()

    // Check if workflow exists, if not create it
    const existing = await registry.getWorkflow(threadId)

    if (!existing) {
      // Create new workflow entry
      await registry.registerWorkflow({
        threadId,
        savedWorkflowId: update.savedWorkflowId,
        status: update.status || 'running',
        projectId: update.projectId,
        projectName: update.projectName,
        startedBy: update.startedBy,
        invocation: update.invocation,
        webhook: update.webhook,
        webhookType: update.webhookType,
        currentStep: update.currentStep,
        lastUpdate: new Date().toISOString(),
        sessionIds: update.sessionIds || {},
        steps: update.steps || [],
      })
    } else {
      // Update existing workflow
      await registry.updateWorkflow(threadId, update)
    }
  } catch (error) {
    console.error('[updateWorkflowStatus] Failed to update workflow:', error)
    throw error
  }
}

export default router
