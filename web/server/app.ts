import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// Import API routes
import agentsRouter from './api/agents.js'
import agentRolesRouter from './api/agent-roles.js'
import projectsRouter from './api/projects.js'
import teamsRouter from './api/teams.js'
import messagesRouter from './api/messages.js'
import systemRouter from './api/system.js'
import settingsRouter from './api/settings.js'
import studioIntelligenceRouter from './api/studio-intelligence.js'
import diagnosticsRouter from './api/diagnostics.js'
import screenshotRouter from './api/screenshot.js'

// Import WebSocket handler
import { setupWebSocket } from './websocket.js'

// Import process management
import { ProcessManager } from '../../lib/process/ProcessManager.js'
import { ProcessCleaner } from '../../lib/process/ProcessCleaner.js'

// Import Studio Intelligence
import { StudioIntelligence } from './services/studio-intelligence/StudioIntelligence.js'

// Load environment variables
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
})

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Make io available to routes
app.set('io', io)

// Static file serving (for production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../dist')))
}

// API Routes
app.use('/api/agents', agentsRouter)
app.use('/api/agent-roles', agentRolesRouter)
app.use('/api/projects', projectsRouter)
app.use('/api/teams', teamsRouter)
app.use('/api/messages', messagesRouter)
app.use('/api/system', systemRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/studio-intelligence', studioIntelligenceRouter)
app.use('/api/diagnostics', diagnosticsRouter)
app.use('/api/screenshot', screenshotRouter)

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// Setup WebSocket
setupWebSocket(io)

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Initialize Process Management System
async function initializeProcessManagement() {
  try {
    const processManager = ProcessManager.getInstance()
    await processManager.initialize()
    console.log('✅ ProcessManager initialized')

    // Cleanup any zombie processes on startup
    const cleaner = ProcessCleaner.getInstance()
    const cleanup = await cleaner.cleanupZombies()
    if (cleanup.killedProcesses.length > 0) {
      console.log(`🧹 Cleaned up ${cleanup.killedProcesses.length} zombie processes`)
    }
  } catch (error) {
    console.error('Failed to initialize process management:', error)
  }
}

// Initialize Studio Intelligence System
async function initializeStudioIntelligence() {
  try {
    console.log('🎯 Initializing Studio Intelligence...')
    const studioIntelligence = new StudioIntelligence()
    await studioIntelligence.ensureDefaultHooks()
    console.log('✅ Studio Intelligence initialized')
  } catch (error) {
    console.error('Failed to initialize Studio Intelligence:', error)
  }
}

// Start server
const PORT = process.env.PORT || 3456
httpServer.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📡 WebSocket listening on ws://localhost:${PORT}`)

  // Initialize process management after server starts
  await initializeProcessManagement()

  // Initialize Studio Intelligence (smart defaults)
  await initializeStudioIntelligence()
})

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Shutting down gracefully...')

  // Cleanup all processes
  try {
    const processManager = ProcessManager.getInstance()
    await processManager.shutdown()
    console.log('✅ All processes cleaned up')
  } catch (error) {
    console.error('Error during process cleanup:', error)
  }

  httpServer.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

export { app, io }
