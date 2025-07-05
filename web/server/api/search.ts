/**
 * Search API endpoints for Claude Studio
 * 
 * SOLID: Single responsibility - handles search API routes
 * DRY: Centralizes search API logic
 * KISS: Simple REST API interface
 * Library-First: Uses Breeze as Python library
 */

import { Router, Request, Response } from 'express'
import { SimpleSearchService } from '../services/SimpleSearchService'

const router = Router()

// POST /api/search/index - Index a project directory
router.post('/index', async (req: Request, res: Response) => {
  try {
    const { projectPath, force = false } = req.body
    
    if (!projectPath) {
      return res.status(400).json({
        success: false,
        error: 'Project path is required'
      })
    }
    
    const result = await SimpleSearchService.indexProject(projectPath, force)
    
    if (result.success) {
      res.json({
        success: true,
        task_id: `index_${Date.now()}`,
        message: 'Indexing started',
        stats: result.stats
      })
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to start indexing'
      })
    }
  } catch (error) {
    console.error('Index error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start indexing'
    })
  }
})

// POST /api/search/query - Search for code
router.post('/query', async (req: Request, res: Response) => {
  try {
    const { query, projectPath, limit = 10 } = req.body
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      })
    }
    
    const response = await SimpleSearchService.search(query, projectPath, limit)
    
    res.json({
      success: response.success,
      results: response.results || [],
      total: response.results?.length || 0,
      message: response.message
    })
  } catch (error) {
    console.error('Search error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Search failed'
    })
  }
})

// GET /api/search/stats/:projectId - Get search index statistics
router.get('/stats/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectPath } = req.query
    
    // Use projectPath to get project-specific stats
    const statsResult = await SimpleSearchService.getStats(projectPath as string)
    
    if (statsResult.success && statsResult.stats) {
      res.json({
        success: true,
        stats: {
          total_documents: statsResult.stats.totalDocuments,
          initialized: statsResult.stats.totalDocuments > 0,
          model: 'Xenova/all-MiniLM-L6-v2',
          database_path: projectPath as string
        }
      })
    } else {
      res.json({
        success: false,
        stats: {
          total_documents: 0,
          initialized: false,
          model: 'Xenova/all-MiniLM-L6-v2',
          database_path: projectPath as string
        }
      })
    }
  } catch (error) {
    console.error('Stats error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get stats'
    })
  }
})

export default router