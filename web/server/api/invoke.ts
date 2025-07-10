/**
 * Invoke API - Unified agent invocation endpoint
 *
 * SOLID: Single endpoint for single/multi agent workflows
 * DRY: Replaces separate mention/batch endpoints
 * KISS: Simple request/response with workflow orchestrator
 * Configuration: All behavior configurable via request
 */

import { Router, Request, Response } from 'express'
import { WorkflowOrchestrator } from '../services/WorkflowOrchestrator'
import { WorkflowExecutor } from '../services/WorkflowExecutor'
import { InvokeRequestSchema } from '../schemas/invoke'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { updateWorkflowStatus } from './invoke-status'
import { EventEmitter } from 'events'

// SSE event types for workflow updates
interface WorkflowEvent {
  type: 'step_start' | 'step_complete' | 'step_failed' | 'workflow_complete' | 'workflow_failed'
  threadId: string
  stepId?: string
  sessionId?: string
  retry?: number
  status?: string
  lastStep?: string
}

const router = Router()

// POST /api/invoke - Execute single agent or multi-agent workflow
router.post('/', async (req: Request, res: Response) => {
  try {
    console.log('Invoke API received request:', JSON.stringify(req.body, null, 2))

    // Validate request
    const parseResult = InvokeRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      console.error('Invoke validation failed:', parseResult.error.flatten())
      return res.status(400).json({
        error: 'Invalid request',
        details: parseResult.error.flatten(),
      })
    }

    const request = parseResult.data

    // Get socket.io instance for real-time updates
    const io = req.app.get('io')

    // Get or create the shared workflow event emitter
    let workflowEvents = req.app.get('workflowEvents')
    if (!workflowEvents) {
      workflowEvents = new EventEmitter()
      workflowEvents.setMaxListeners(100)
      req.app.set('workflowEvents', workflowEvents)
    }

    // Create orchestrator with socket.io and EventEmitter support
    const orchestrator = new WorkflowOrchestrator(io, workflowEvents)

    // Execute workflow
    const response = await orchestrator.execute(request)

    // Return response
    res.json(response)
  } catch (error) {
    console.error('Invoke API error:', error)

    // Send appropriate error response
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.flatten(),
      })
    } else if (error instanceof Error && error.message.includes('No agent configured')) {
      res.status(404).json({
        error: 'Role not found',
        message: error.message,
      })
    } else {
      res.status(500).json({
        error: 'Workflow execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
})

// GET /api/invoke/roles - Get available roles for the project
router.get('/roles/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' })
    }

    // Import service dynamically to avoid circular dependencies
    const { UnifiedAgentConfigService } = await import('../services/UnifiedAgentConfigService')
    const configService = UnifiedAgentConfigService.getInstance()

    // Get role assignments for project
    const roleAssignments = await configService.getProjectRoleAssignments(projectId)

    // Transform to simple role list
    const roles = roleAssignments.map((assignment) => ({
      role: assignment.role,
      agentId: assignment.agentConfigId,
    }))

    res.json({ roles })
  } catch (error) {
    console.error('Get roles error:', error)
    res.status(500).json({
      error: 'Failed to get roles',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// POST /api/invoke/async - Start workflow asynchronously
router.post('/async', async (req: Request, res: Response) => {
  try {
    console.log('[DEBUG] Async invoke received body:', JSON.stringify(req.body, null, 2))
    console.log('[DEBUG] Body type:', typeof req.body)
    console.log('[DEBUG] Workflow type:', typeof req.body?.workflow)

    // Handle workflow as string (MCP tools send JSON strings)
    let body = { ...req.body }
    if (typeof body.workflow === 'string') {
      console.log('[DEBUG] Parsing workflow string...')
      try {
        body.workflow = JSON.parse(body.workflow)
        console.log('[DEBUG] Parsed workflow:', JSON.stringify(body.workflow, null, 2))
      } catch (e) {
        console.log('[DEBUG] Failed to parse workflow string:', e)
        return res.status(400).json({
          error: 'Invalid workflow format',
          message: 'Workflow must be valid JSON object or string',
        })
      }
    }

    const parseResult = InvokeRequestSchema.safeParse(body)
    if (!parseResult.success) {
      console.log('[DEBUG] Schema validation failed:', parseResult.error.flatten())
      return res.status(400).json({
        error: 'Invalid request',
        details: parseResult.error.flatten(),
      })
    }

    const request = parseResult.data
    const threadId = request.threadId || uuidv4()

    // Get socket.io for real-time updates
    const io = req.app.get('io')

    // Get or create the shared workflow event emitter
    let workflowEvents = req.app.get('workflowEvents')
    if (!workflowEvents) {
      workflowEvents = new EventEmitter()
      workflowEvents.setMaxListeners(100)
      req.app.set('workflowEvents', workflowEvents)
    }

    // Use WorkflowExecutor to manage async execution
    const executor = WorkflowExecutor.getInstance()
    executor.setSocketIO(io)
    executor.setWorkflowEvents(workflowEvents)

    // Start workflow in background - properly managed
    executor.executeAsync({ ...request, threadId }).catch(async (error) => {
      console.error(`Async workflow ${threadId} failed:`, error)
      await updateWorkflowStatus(threadId, { status: 'failed' })
    })

    // Return immediately with threadId
    res.json({ threadId, status: 'started' })
  } catch (error) {
    console.error('Async invoke error:', error)
    res.status(500).json({
      error: 'Failed to start workflow',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// GET /api/invoke/stream - SSE endpoint for real-time progress
router.get('/stream/:threadId', (req: Request, res: Response) => {
  const { threadId } = req.params

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  })

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', threadId })}\n\n`)

  // Recovery-focused event handler - only essential info
  const handleWorkflowEvent = (data: WorkflowEvent) => {
    if (data.threadId !== threadId) return

    // Filter to only recovery-essential events
    const recoveryEvent = {
      type: data.type,
      threadId: data.threadId,
      // Only include what's needed for resume
      ...(data.type === 'step_start' && { stepId: data.stepId }),
      ...(data.type === 'step_complete' && { stepId: data.stepId, sessionId: data.sessionId }),
      ...(data.type === 'step_failed' && { stepId: data.stepId, retry: data.retry }),
      ...(data.type === 'workflow_complete' && { status: data.status }),
      ...(data.type === 'workflow_failed' && { lastStep: data.lastStep }),
    }

    res.write(`data: ${JSON.stringify(recoveryEvent)}\n\n`)
  }

  // Get the shared workflow event emitter
  let workflowEvents = req.app.get('workflowEvents')

  if (!workflowEvents) {
    workflowEvents = new EventEmitter()
    workflowEvents.setMaxListeners(100) // Allow many SSE connections
    req.app.set('workflowEvents', workflowEvents)
  }

  // Listen to workflow events via the event emitter
  workflowEvents.on('workflow:update', handleWorkflowEvent)

  // Handle client disconnect
  req.on('close', () => {
    workflowEvents.off('workflow:update', handleWorkflowEvent)
  })
})

export default router
