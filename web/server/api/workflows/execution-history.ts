/**
 * Execution History API Routes
 *
 * SOLID: Single responsibility - workflow execution history operations
 * DRY: Reuses WorkflowRegistry for data access
 * KISS: Simple REST API pattern
 * Library-First: Uses existing WorkflowRegistry service
 */

import { Router } from 'express'
import { WorkflowRegistry } from '../../services/WorkflowRegistry'

const router = Router()

// GET /api/workflows/execution-history/:savedWorkflowId - Get execution history for a saved workflow
router.get('/:savedWorkflowId', async (req, res) => {
  /*  #swagger.tags = ['Workflow Management']
      #swagger.summary = 'Get execution history for saved workflow'
      #swagger.description = 'Retrieve all executions that were run from a specific saved workflow definition.'
      #swagger.parameters['savedWorkflowId'] = { in: 'path', description: 'ID of the saved workflow' }
      #swagger.responses[200] = {
        description: 'Execution history for the workflow',
        schema: {
          type: 'object',
          properties: {
            savedWorkflowId: { type: 'string' },
            executions: {
              type: 'array',
              items: { $ref: '#/components/schemas/WorkflowMetadata' }
            },
            summary: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                completed: { type: 'number' },
                failed: { type: 'number' },
                running: { type: 'number' },
                lastExecution: { type: 'string' }
              }
            }
          }
        }
      } */
  try {
    const { savedWorkflowId } = req.params

    if (!savedWorkflowId) {
      return res.status(400).json({
        error: 'savedWorkflowId is required',
      })
    }

    const workflowRegistry = WorkflowRegistry.getInstance()
    const executions = await workflowRegistry.getExecutionHistory(savedWorkflowId)

    // Calculate summary statistics
    const summary = {
      total: executions.length,
      completed: executions.filter((e) => e.status === 'completed').length,
      failed: executions.filter((e) => e.status === 'failed').length,
      running: executions.filter((e) => e.status === 'running').length,
      lastExecution: executions.length > 0 ? executions[0].lastUpdate : null,
    }

    res.json({
      savedWorkflowId,
      executions,
      summary,
    })
  } catch (error) {
    console.error('Error fetching execution history:', error)
    res.status(500).json({
      error: 'Failed to fetch execution history',
    })
  }
})

// GET /api/workflows/execution-history/:savedWorkflowId/summary - Get summary statistics only
router.get('/:savedWorkflowId/summary', async (req, res) => {
  /*  #swagger.tags = ['Workflow Management']
      #swagger.summary = 'Get execution summary for saved workflow'
      #swagger.description = 'Get summary statistics for executions of a saved workflow.'
      #swagger.responses[200] = {
        description: 'Execution summary',
        schema: {
          type: 'object',
          properties: {
            savedWorkflowId: { type: 'string' },
            total: { type: 'number' },
            completed: { type: 'number' },
            failed: { type: 'number' },
            running: { type: 'number' },
            lastExecution: { type: 'string' },
            successRate: { type: 'number' }
          }
        }
      } */
  try {
    const { savedWorkflowId } = req.params

    const workflowRegistry = WorkflowRegistry.getInstance()
    const executions = await workflowRegistry.getExecutionHistory(savedWorkflowId)

    const completed = executions.filter((e) => e.status === 'completed').length
    const failed = executions.filter((e) => e.status === 'failed').length
    const total = executions.length

    const summary = {
      savedWorkflowId,
      total,
      completed,
      failed,
      running: executions.filter((e) => e.status === 'running').length,
      lastExecution: executions.length > 0 ? executions[0].lastUpdate : null,
      successRate: total > 0 ? Math.round((completed / (completed + failed)) * 100) : 0,
    }

    res.json(summary)
  } catch (error) {
    console.error('Error fetching execution summary:', error)
    res.status(500).json({
      error: 'Failed to fetch execution summary',
    })
  }
})

export default router
