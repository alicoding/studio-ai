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
 * WebSocket server discovery endpoint
 * Returns available Socket.IO servers for multi-server failover
 */
router.get('/websocket', (req, res) => {
  const currentPort = process.env.PORT || '3456'
  const isDevServer = currentPort === '3457'

  // Return servers in priority order (current server first)
  const servers = isDevServer
    ? ['http://localhost:3457', 'http://localhost:3456']
    : ['http://localhost:3456', 'http://localhost:3457']

  res.json({
    status: 'ok',
    currentServer: `http://localhost:${currentPort}`,
    availableServers: servers,
    redisAdapter: process.env.REDIS_URL ? 'enabled' : 'disabled',
    crossServerCommunication: process.env.REDIS_URL ? 'enabled' : 'disabled',
  })
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
