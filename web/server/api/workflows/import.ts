/**
 * Import Executed Workflows to Editable Definitions
 *
 * SOLID: Single responsibility - convert executed workflows to editable definitions
 * DRY: Reuses existing workflow storage system
 * KISS: Simple conversion logic
 * Library-First: Uses existing WorkflowStorageService
 */

import { Router } from 'express'
import { WorkflowStorageService } from '../../services/WorkflowStorageService'
import type { CreateWorkflowRequest } from '../../services/WorkflowStorageInterface'

const router = Router()
const workflowStorage = WorkflowStorageService.getInstance()

// POST /api/workflows/import/executed/:threadId - Import executed workflow as editable definition
router.post('/executed/:threadId', async (req, res) => {
  try {
    const { threadId } = req.params
    const { name, description, projectId } = req.body

    if (!projectId) {
      return res.status(400).json({
        error: 'projectId is required',
      })
    }

    // Get the executed workflow from the workflow registry
    const response = await fetch(`http://localhost:3456/api/invoke-status/workflows`)
    const workflowsData = await response.json()

    const executedWorkflow = workflowsData.workflows.find(
      (w: { threadId: string }) => w.threadId === threadId
    )
    if (!executedWorkflow) {
      return res.status(404).json({
        error: 'Executed workflow not found',
      })
    }

    // Convert executed workflow to workflow definition
    const workflowDefinition = {
      name: name || `Imported: ${executedWorkflow.invocation}`,
      description: description || `Imported from executed workflow ${threadId}`,
      steps: executedWorkflow.steps.map(
        (step: {
          id: string
          name?: string
          agentId?: string
          role?: string
          task: string
          deps?: string[]
          dependencies?: string[]
        }) => ({
          id: step.id,
          name: step.name || step.id,
          agentId: step.agentId || step.role || 'dev_01',
          task: step.task,
          dependencies: step.deps || step.dependencies || [],
        })
      ),
    }

    // Create the saved workflow
    const createRequest: CreateWorkflowRequest = {
      projectId: projectId === 'global' ? undefined : projectId,
      name: workflowDefinition.name,
      description: workflowDefinition.description,
      definition: workflowDefinition,
      tags: ['imported', 'executed'],
      source: 'api',
      createdBy: executedWorkflow.startedBy || 'system',
      scope: projectId === 'global' ? 'global' : 'project',
    }

    const savedWorkflow = await workflowStorage.create(createRequest)

    res.status(201).json({
      workflow: savedWorkflow,
      sourceThreadId: threadId,
    })
  } catch (error) {
    console.error('Error importing executed workflow:', error)
    res.status(500).json({
      error: 'Failed to import executed workflow',
    })
  }
})

// POST /api/workflows/import/executed/bulk - Import multiple executed workflows
router.post('/executed/bulk', async (req, res) => {
  try {
    const { projectId, threadIds } = req.body

    if (!projectId || !Array.isArray(threadIds)) {
      return res.status(400).json({
        error: 'projectId and threadIds array are required',
      })
    }

    const response = await fetch(`http://localhost:3456/api/invoke-status/workflows`)
    const workflowsData = await response.json()

    const importedWorkflows = []
    const errors = []

    for (const threadId of threadIds) {
      try {
        const executedWorkflow = workflowsData.workflows.find(
          (w: { threadId: string }) => w.threadId === threadId
        )
        if (!executedWorkflow) {
          errors.push({ threadId, error: 'Workflow not found' })
          continue
        }

        const workflowDefinition = {
          name: `Imported: ${executedWorkflow.invocation}`,
          description: `Imported from executed workflow ${threadId}`,
          steps: executedWorkflow.steps.map(
            (step: {
              id: string
              name?: string
              agentId?: string
              role?: string
              task: string
              deps?: string[]
              dependencies?: string[]
            }) => ({
              id: step.id,
              name: step.name || step.id,
              agentId: step.agentId || step.role || 'dev_01',
              task: step.task,
              dependencies: step.deps || step.dependencies || [],
            })
          ),
        }

        const createRequest: CreateWorkflowRequest = {
          projectId: projectId === 'global' ? undefined : projectId,
          name: workflowDefinition.name,
          description: workflowDefinition.description,
          definition: workflowDefinition,
          tags: ['imported', 'executed'],
          source: 'api',
          createdBy: executedWorkflow.startedBy || 'system',
          scope: projectId === 'global' ? 'global' : 'project',
        }

        const savedWorkflow = await workflowStorage.create(createRequest)
        importedWorkflows.push({ workflow: savedWorkflow, sourceThreadId: threadId })
      } catch (error) {
        errors.push({ threadId, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    res.json({
      imported: importedWorkflows,
      errors: errors,
      summary: {
        total: threadIds.length,
        successful: importedWorkflows.length,
        failed: errors.length,
      },
    })
  } catch (error) {
    console.error('Error bulk importing executed workflows:', error)
    res.status(500).json({
      error: 'Failed to bulk import executed workflows',
    })
  }
})

// GET /api/workflows/import/executed/available - List available executed workflows for import
router.get('/executed/available', async (req, res) => {
  try {
    const { projectId } = req.query

    // Get executed workflows
    const response = await fetch(`http://localhost:3456/api/invoke-status/workflows`)
    const workflowsData = await response.json()

    // Get already imported workflows to avoid duplicates
    let importedThreadIds: string[] = []
    if (projectId && typeof projectId === 'string') {
      const savedWorkflows = await workflowStorage.listByProject(projectId)
      importedThreadIds = savedWorkflows
        .filter((w) => w.tags.includes('imported'))
        .map((w) => w.description?.match(/workflow ([^)]+)/)?.[1])
        .filter(Boolean) as string[]
    }

    // Filter to only show workflows that haven't been imported yet
    const availableWorkflows = workflowsData.workflows
      .filter((w: { threadId: string }) => !importedThreadIds.includes(w.threadId))
      .map(
        (w: {
          threadId: string
          invocation: string
          status: string
          projectName: string
          startedBy: string
          lastUpdate: string
          steps?: unknown[]
        }) => ({
          threadId: w.threadId,
          invocation: w.invocation,
          status: w.status,
          projectName: w.projectName,
          startedBy: w.startedBy,
          lastUpdate: w.lastUpdate,
          stepCount: w.steps?.length || 0,
        })
      )

    res.json({
      workflows: availableWorkflows,
      total: availableWorkflows.length,
    })
  } catch (error) {
    console.error('Error listing available executed workflows:', error)
    res.status(500).json({
      error: 'Failed to list available executed workflows',
    })
  }
})

export default router
