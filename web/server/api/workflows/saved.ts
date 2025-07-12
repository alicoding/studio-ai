/**
 * Saved Workflows API Routes
 *
 * SOLID: Single responsibility - saved workflow CRUD operations
 * DRY: Reuses WorkflowStorageService abstraction
 * KISS: Simple REST API pattern
 * Library-First: Uses WorkflowStorageService for future library migration
 */

import { Router } from 'express'
import { WorkflowStorageService } from '../../services/WorkflowStorageService'
import type {
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
} from '../../services/WorkflowStorageInterface'

const router = Router()
const workflowStorage = WorkflowStorageService.getInstance()

// GET /api/workflows/saved/templates - List workflow templates (MUST be before /:id)
router.get('/templates', async (req, res) => {
  try {
    const templates = await workflowStorage.listTemplates()
    res.json({ templates })
  } catch (error) {
    console.error('Error fetching workflow templates:', error)
    res.status(500).json({
      error: 'Failed to fetch templates',
    })
  }
})

// GET /api/workflows/saved/search?tags=tag1,tag2 - Search by tags (MUST be before /:id)
router.get('/search', async (req, res) => {
  try {
    const { tags } = req.query

    if (!tags || typeof tags !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid tags parameter',
      })
    }

    const tagArray = tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
    const workflows = await workflowStorage.searchByTags(tagArray)
    res.json({ workflows })
  } catch (error) {
    console.error('Error searching workflows:', error)
    res.status(500).json({
      error: 'Failed to search workflows',
    })
  }
})

// GET /api/workflows/saved/health - Health check (MUST be before /:id)
router.get('/health', async (req, res) => {
  try {
    const healthy = await workflowStorage.healthCheck()
    res.json({ healthy })
  } catch (error) {
    console.error('Error checking workflow storage health:', error)
    res.status(500).json({
      error: 'Health check failed',
      healthy: false,
    })
  }
})

// GET /api/workflows/saved?projectId=xxx - List workflows for project
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.query

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid projectId parameter',
      })
    }

    const workflows = await workflowStorage.listByProject(projectId)
    res.json({ workflows })
  } catch (error) {
    console.error('Error fetching saved workflows:', error)
    res.status(500).json({
      error: 'Failed to fetch workflows',
    })
  }
})

// GET /api/workflows/saved/:id - Get specific workflow
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const workflow = await workflowStorage.getById(id)
    if (!workflow) {
      return res.status(404).json({
        error: 'Workflow not found',
      })
    }

    res.json({ workflow })
  } catch (error) {
    console.error('Error fetching workflow:', error)
    res.status(500).json({
      error: 'Failed to fetch workflow',
    })
  }
})

// POST /api/workflows/saved - Create new workflow
router.post('/', async (req, res) => {
  try {
    const createRequest: CreateWorkflowRequest = req.body

    // Basic validation
    if (!createRequest.projectId || !createRequest.name || !createRequest.definition) {
      return res.status(400).json({
        error: 'Missing required fields: projectId, name, definition',
      })
    }

    const workflow = await workflowStorage.create(createRequest)
    res.status(201).json({ workflow })
  } catch (error) {
    console.error('Error creating workflow:', error)
    res.status(500).json({
      error: 'Failed to create workflow',
    })
  }
})

// PUT /api/workflows/saved/:id - Update workflow
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const updateRequest: UpdateWorkflowRequest = req.body

    const workflow = await workflowStorage.update(id, updateRequest)
    if (!workflow) {
      return res.status(404).json({
        error: 'Workflow not found',
      })
    }

    res.json({ workflow })
  } catch (error) {
    console.error('Error updating workflow:', error)
    res.status(500).json({
      error: 'Failed to update workflow',
    })
  }
})

// DELETE /api/workflows/saved/:id - Delete workflow
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const deleted = await workflowStorage.delete(id)
    if (!deleted) {
      return res.status(404).json({
        error: 'Workflow not found',
      })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting workflow:', error)
    res.status(500).json({
      error: 'Failed to delete workflow',
    })
  }
})

// POST /api/workflows/saved/bulk - Bulk create workflows (MUST be before /:id)
router.post('/bulk', async (req, res) => {
  try {
    const { workflows } = req.body

    if (!Array.isArray(workflows)) {
      return res.status(400).json({
        error: 'Expected workflows array',
      })
    }

    const created = await workflowStorage.bulkCreate(workflows)
    res.status(201).json({ workflows: created })
  } catch (error) {
    console.error('Error bulk creating workflows:', error)
    res.status(500).json({
      error: 'Failed to bulk create workflows',
    })
  }
})

// DELETE /api/workflows/saved/bulk - Bulk delete workflows (MUST be before /:id)
router.delete('/bulk', async (req, res) => {
  try {
    const { ids } = req.body

    if (!Array.isArray(ids)) {
      return res.status(400).json({
        error: 'Expected ids array',
      })
    }

    const deletedCount = await workflowStorage.bulkDelete(ids)
    res.json({ deletedCount })
  } catch (error) {
    console.error('Error bulk deleting workflows:', error)
    res.status(500).json({
      error: 'Failed to bulk delete workflows',
    })
  }
})

export default router
