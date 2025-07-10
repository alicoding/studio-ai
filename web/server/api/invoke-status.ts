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
 * Get all workflow statuses from database
 */
router.get('/workflows', async (req: Request, res: Response) => {
  try {
    const registry = WorkflowRegistry.getInstance()
    const workflows = await registry.listWorkflows()

    res.json({ workflows })
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
  const handleWorkflowUpdate = (data: WorkflowEvent) => {
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
    } else if (data.type === 'workflow_complete' || data.type === 'workflow_failed') {
      res.write(
        `event: workflow_status\ndata: ${JSON.stringify({
          ...data,
          status: data.type.replace('workflow_', ''),
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
    steps: Array<{
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
