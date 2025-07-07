import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import createGracefulShutdown from 'http-graceful-shutdown'

// Import API routes
import agentsRouter from './api/agents'
import agentRolesRouter from './api/agent-roles'
import projectsRouter from './api/projects'
import teamsRouter from './api/teams'
import messagesRouter from './api/messages'
import systemRouter from './api/system'
import settingsRouter from './api/settings'
import studioIntelligenceRouter from './api/studio-intelligence'
import screenshotRouter from './api/screenshot'
import aiRouter from './api/ai'
import langchainRouter from './api/langchain'
import storageRouter from './api/storage'
import workspaceRouter from './api/workspace'
import messagesBatchRouter from './api/messages-batch'
import settingsMcpRouter from './api/settings-mcp'
import mcpConfigRouter from './api/mcp-config'
import invokeRouter from './api/invoke'
import invokeStatusRouter from './api/invoke-status'
import operatorRouter from './api/operator'

// Import WebSocket handler
import { setupWebSocket } from './websocket'

// Process management removed - using Claude SDK instances instead

// Global error handlers to prevent server crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  // Don't exit the process - let it continue running
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  // Don't exit the process - let it continue running
})

// Import Studio Intelligence
import { StudioIntelligence } from './services/studio-intelligence/StudioIntelligence'

// Import Project Diagnostics

// Load environment variables
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const httpServer = createServer(app)

// Set server timeout to 1 hour for long-running Claude Code operations
httpServer.timeout = 3600000 // 1 hour
httpServer.keepAliveTimeout = 3600000 // 1 hour
httpServer.requestTimeout = 3600000 // 1 hour

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
app.use('/api/messages/batch', messagesBatchRouter)
app.use('/api/invoke', invokeRouter)
app.use('/api', invokeStatusRouter)
app.use('/api/operator', operatorRouter)
app.use('/api/system', systemRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/settings/mcp', settingsMcpRouter)
app.use('/api/mcp-config', mcpConfigRouter)
app.use('/api/studio-intelligence', studioIntelligenceRouter)
app.use('/api/screenshot', screenshotRouter)
app.use('/api/ai', aiRouter)
app.use('/api/langchain', langchainRouter)
app.use('/api/storage', storageRouter)
app.use('/api/workspace', workspaceRouter)

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
app.use(
  (
    err: Error & { status?: number },
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('Server error:', err)
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    })
  }
)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

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

  // Initialize Studio Intelligence (smart defaults)
  await initializeStudioIntelligence()
})

// Setup graceful shutdown using the library
createGracefulShutdown(httpServer, {
  signals: 'SIGINT SIGTERM',
  timeout: 30000, // 30 seconds timeout
  development: process.env.NODE_ENV !== 'production',
  onShutdown: async () => {
    console.log('🛑 Shutting down gracefully...')

    // Close all WebSocket connections
    try {
      io.disconnectSockets()
      console.log('✅ All WebSocket connections closed')
    } catch (error) {
      console.error('Error closing WebSocket connections:', error)
    }
  },
  finally: () => {
    console.log('✅ Server shutdown complete')
  },
})

export { app, io }
