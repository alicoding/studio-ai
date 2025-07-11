/**
 * Workflow Graph API
 * Provides graph visualization data for workflows
 *
 * KISS: Simple endpoint that returns graph structure
 * DRY: Reuses WorkflowOrchestrator's graph generation
 * SOLID: Single responsibility - graph data retrieval
 * Library-First: Uses Express router
 */

import { Router, Request, Response } from 'express'
import { WorkflowOrchestrator } from '../services/WorkflowOrchestrator'
import { WorkflowRegistry } from '../services/WorkflowRegistry'
import type { WorkflowGraph } from '../schemas/workflow-graph'
import type { StepResult, WorkflowStep } from '../schemas/invoke'

const router = Router()

/**
 * GET /api/workflow-graph/:threadId
 * Get workflow graph visualization data
 */
router.get('/:threadId', async (req: Request, res: Response) => {
  try {
    const { threadId } = req.params

    // Get workflow from registry
    const registry = WorkflowRegistry.getInstance()
    await registry.initialize()
    const workflow = await registry.getWorkflow(threadId)

    if (!workflow) {
      return res.status(404).json({
        error: 'Workflow not found',
        message: `No workflow found with threadId: ${threadId}`,
      })
    }

    // Convert workflow steps to WorkflowStep format
    const steps: WorkflowStep[] = workflow.steps.map((step) => ({
      id: step.id,
      role: step.role,
      agentId: step.agentId,
      task: step.task,
      deps: step.dependencies,
    }))

    const sessionIds = workflow.sessionIds || {}

    // Build stepResults from workflow steps data
    const stepResults: Record<string, StepResult> = {}
    workflow.steps.forEach((step) => {
      if (step.status !== 'pending' && step.status !== 'running') {
        stepResults[step.id] = {
          id: step.id,
          status:
            step.status === 'completed'
              ? 'success'
              : step.status === 'failed'
                ? 'failed'
                : 'blocked',
          response: '', // We don't store responses in the registry
          sessionId: sessionIds[step.id] || '',
          duration: 0, // We don't track duration in the registry
        }
      }
    })

    // Generate graph using WorkflowOrchestrator
    const orchestrator = new WorkflowOrchestrator()
    const graph: WorkflowGraph = orchestrator.generateWorkflowGraph(steps, stepResults, sessionIds)

    // Add additional metadata
    const response = {
      threadId,
      status: workflow.status,
      projectId: workflow.projectId,
      projectName: workflow.projectName,
      graph,
      metadata: {
        totalSteps: steps.length,
        completedSteps: Object.values(stepResults).filter((r: StepResult) => r.status === 'success')
          .length,
        failedSteps: Object.values(stepResults).filter((r: StepResult) => r.status === 'failed')
          .length,
        blockedSteps: Object.values(stepResults).filter((r: StepResult) => r.status === 'blocked')
          .length,
      },
    }

    res.json(response)
  } catch (error) {
    console.error('Error generating workflow graph:', error)
    res.status(500).json({
      error: 'Failed to generate workflow graph',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

export default router
