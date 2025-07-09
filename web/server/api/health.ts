import { Router } from 'express'
import { checkPostgresHealth } from '../services/database/postgres'

const router = Router()

/**
 * Health check endpoint for various services
 */
router.get('/checkpointer', async (req, res) => {
  try {
    const usePostgres = process.env.USE_POSTGRES_SAVER === 'true'

    if (usePostgres) {
      const isHealthy = await checkPostgresHealth()
      res.json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        checkpointer: 'PostgresSaver',
        postgres: {
          connected: isHealthy,
          connectionString: process.env.POSTGRES_CONNECTION_STRING?.replace(/:[^@]+@/, ':***@'),
          schema: process.env.POSTGRES_SCHEMA || 'workflow_checkpoints',
        },
      })
    } else {
      res.json({
        status: 'healthy',
        checkpointer: 'MemorySaver',
        message: 'Using in-memory checkpointer',
      })
    }
  } catch (error) {
    console.error('[Health] Checkpointer health check failed:', error)
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * General health check
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

export default router
