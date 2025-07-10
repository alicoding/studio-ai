/**
 * Invoke Status API - Track workflow execution status
 *
 * SOLID: Single responsibility - status tracking
 * DRY: Reuses existing schemas
 * KISS: Simple status endpoint
 */

import { Router } from 'express'
import type { Request, Response } from 'express'
import { WorkflowOrchestrator } from '../services/WorkflowOrchestrator'
import type { WorkflowStep } from '../schemas/invoke'

// In-memory status tracking (could be Redis in production)
const workflowStatus = new Map<
  string,
  {
    threadId: string
    sessionIds: Record<string, string>
    lastUpdate: Date
    status: 'running' | 'completed' | 'aborted' | 'failed'
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
  }
>()

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
 * Get all workflow statuses
 */
router.get('/workflows', (req: Request, res: Response) => {
  const workflows = Array.from(workflowStatus.values())
  res.json({ workflows })
})

/**
 * Get workflow status by threadId (legacy - using in-memory tracking)
 */
router.get('/status/:threadId', (req: Request, res: Response) => {
  const { threadId } = req.params
  const status = workflowStatus.get(threadId)

  if (!status) {
    return res.status(404).json({ error: 'Workflow not found' })
  }

  res.json(status)
})

/**
 * Update workflow status (internal use)
 */
export function updateWorkflowStatus(
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
  const existing = workflowStatus.get(threadId) || {
    threadId,
    sessionIds: {},
    lastUpdate: new Date(),
    status: 'running' as const,
  }

  workflowStatus.set(threadId, {
    ...existing,
    ...update,
    sessionIds: { ...existing.sessionIds, ...update.sessionIds },
    lastUpdate: new Date(),
  })

  // Clean up old entries after 1 hour
  setTimeout(() => {
    const current = workflowStatus.get(threadId)
    if (current && current.lastUpdate.getTime() === existing.lastUpdate.getTime()) {
      workflowStatus.delete(threadId)
    }
  }, 3600000)
}

export default router
