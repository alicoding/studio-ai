/**
 * Workflow Execution API Endpoint
 *
 * SOLID: Single responsibility - executes workflows
 * DRY: Reuses existing WorkflowOrchestrator
 * KISS: Simple conversion from builder format to invoke format
 * Library-First: Uses existing orchestration infrastructure
 */

import { Router, Request, Response } from 'express'
import {
  WorkflowExecutionRequest,
  WorkflowExecutionResponse,
  isWorkflowDefinition,
} from '../../schemas/workflow-builder'
import { WorkflowStep } from '../../schemas/invoke'
import { WorkflowOrchestrator } from '../../services/WorkflowOrchestrator'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

/**
 * POST /api/workflows/execute
 * Executes a workflow created in the builder
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const request = req.body as WorkflowExecutionRequest

    // Validate request
    if (!request.workflow || !isWorkflowDefinition(request.workflow)) {
      return res.status(400).json({
        status: 'failed',
        error: 'Invalid workflow definition',
      } as WorkflowExecutionResponse)
    }

    // Convert WorkflowDefinition to WorkflowStep[] format for orchestrator
    const workflowSteps: WorkflowStep[] = request.workflow.steps.map((step) => ({
      id: step.id,
      role: step.role,
      agentId: step.agentId,
      task: step.task,
      deps: step.deps.length > 0 ? step.deps : undefined,
    }))

    // Generate thread ID if not provided
    const threadId = request.threadId || `wf-${request.workflow.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')}-${uuidv4().substring(0, 8)}`

    // Get project ID from workflow or request
    const projectId = request.projectId || request.workflow.metadata.projectId

    if (!projectId) {
      return res.status(400).json({
        status: 'failed',
        error: 'Project ID is required',
      } as WorkflowExecutionResponse)
    }

    // Initialize orchestrator and execute
    const orchestrator = new WorkflowOrchestrator()
    
    // Execute the workflow
    console.log('[WorkflowExecute] Starting workflow execution:', {
      threadId,
      projectId,
      steps: workflowSteps.length,
      name: request.workflow.name,
    })

    // Start execution in background (don't await)
    orchestrator.execute({
      workflow: workflowSteps,
      projectId,
      threadId,
      startNewConversation: request.startNewConversation,
    }).then((result) => {
      console.log('[WorkflowExecute] Workflow completed:', {
        threadId,
        finalStatus: result.finalStatus,
      })
    }).catch((error) => {
      console.error('[WorkflowExecute] Workflow failed:', {
        threadId,
        error: error.message,
      })
    })

    // Return immediate response
    const response: WorkflowExecutionResponse = {
      threadId,
      status: 'started',
      message: `Workflow '${request.workflow.name}' started successfully`,
    }

    res.json(response)
  } catch (error) {
    console.error('Workflow execution error:', error)
    res.status(500).json({
      status: 'failed',
      error: error instanceof Error ? error.message : 'Failed to start workflow',
    } as WorkflowExecutionResponse)
  }
})

export default router