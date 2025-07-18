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
import teamsRouter from './api/teams'
import messagesRouter from './api/messages'
import systemRouter from './api/system'
import settingsRouter from './api/settings'
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
import workflowGraphRouter from './api/workflow-graph'
import workflowStateRouter from './api/workflow-state'
import operatorRouter from './api/operator'
import sessionSearchRouter from './api/session-search'
import claudeProjectsRouter from './api/claude-projects.js'
import claudeLaunchRouter from './api/claude-launch.js'
import studioProjectsRouter from './api/studio-projects.js'
import toolPermissionsRouter from './api/tool-permissions.js'
import healthRouter from './api/health'
import toolsRouter from './api/tools'
import workflowsRouter from './api/workflows'
import apiDocsRouter from './api/api-docs'
import approvalsRouter from './api/approvals'
// import configRouter from './api/config.js' // Temporarily disabled due to client-side dependency

// Import WebSocket handler
import { setupWebSocket } from './websocket'
import { WorkflowMonitor } from './services/WorkflowMonitor'

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
    origin: [
      process.env.CLIENT_URL || 'http://localhost:5173',
      'http://localhost:3456', // Stable server
      'http://localhost:3457', // Dev server
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
})

// Note: Cluster adapter removed - requires Node.js cluster setup
// Using Redis adapter instead for cross-server communication

// Middleware
app.use(
  cors({
    origin: [
      process.env.CLIENT_URL || 'http://localhost:5173',
      'http://localhost:3456', // Stable server
      'http://localhost:3457', // Dev server
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Make io available to routes
app.set('io', io)

// Initialize EventSystem with Redis adapter for cross-server communication
import { eventSystem } from './services/EventSystem'
eventSystem
  .initialize({
    type: 'redis-adapter',
    socketIO: io,
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
  })
  .then(() => {
    console.log('✅ EventSystem initialized with Redis adapter for cross-server communication')
  })
  .catch((err) => {
    console.error('Failed to initialize EventSystem:', err)
    // Fallback to in-memory if Redis is not available
    console.log('⚠️  Falling back to in-memory transport (no cross-server communication)')
    return eventSystem.initialize({
      type: 'in-memory',
      socketIO: io,
    })
  })

// Static file serving - conditional based on server type
const SERVER_PORT = process.env.PORT || 3456
const isDevServer = SERVER_PORT === '3457'

if (isDevServer) {
  // Dev server (3457): Configure Vite Express for HMR
  const { configureViteExpress } = await import('./middleware/vite-dev.js')
  configureViteExpress()
} else {
  // Stable server (3456): Serve built UI static files
  const distPath = path.join(__dirname, '../../dist')
  app.use(express.static(distPath))

  // Serve index.html for all non-API routes (SPA routing)
  // Note: This must be placed AFTER all API routes to avoid conflicts
  app.get('/', (req, res) => {
    const indexPath = path.join(distPath, 'index.html')
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Failed to serve index.html:', err)
        res.status(404).json({ error: 'UI not built. Run: npm run build' })
      }
    })
  })
}

// API Routes
app.use('/api/agents', agentsRouter)
app.use('/api/agent-roles', agentRolesRouter)
app.use('/api/teams', teamsRouter)
app.use('/api/messages/batch', messagesBatchRouter)
app.use('/api/messages', messagesRouter)
app.use('/api/invoke', invokeRouter)
app.use('/api/invoke-status', invokeStatusRouter)
app.use('/api/workflow-graph', workflowGraphRouter)
app.use('/api/workflow-state', workflowStateRouter)
app.use('/api/operator', operatorRouter)
app.use('/api/system', systemRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/settings/mcp', settingsMcpRouter)
app.use('/api/mcp-config', mcpConfigRouter)
app.use('/api/screenshot', screenshotRouter)
app.use('/api/ai', aiRouter)
app.use('/api/langchain', langchainRouter)
app.use('/api/storage', storageRouter)
app.use('/api/workspace', workspaceRouter)
app.use('/api/session-search', sessionSearchRouter)
app.use('/api/claude-projects', claudeProjectsRouter)
app.use('/api/claude-launch', claudeLaunchRouter)
app.use('/api/studio-projects', studioProjectsRouter)
app.use('/api/tool-permissions', toolPermissionsRouter)
app.use('/api/tools', toolsRouter)
app.use('/api/workflows', workflowsRouter)
app.use('/api/approvals', approvalsRouter)
app.use('/api/health', healthRouter)
app.use('/api/api-docs', apiDocsRouter)
// app.use('/api/config', configRouter) // Temporarily disabled due to client-side dependency

// Health check endpoint is now handled by healthRouter

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

// 404 handler - only for stable server
// ViteExpress handles 404s for dev server
if (!isDevServer) {
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' })
  })
}

// Start server - conditional based on server type
const PORT = process.env.PORT || 3456

async function startServer() {
  // Start workflow monitoring for auto-resume
  const monitor = WorkflowMonitor.getInstance()

  // Check for orphaned workflows from previous server sessions
  await monitor.checkOrphanedWorkflows()

  monitor.start()
  console.log('🔍 Workflow monitoring started for auto-resume')

  // Discover available tools from Claude SDK
  const { ToolDiscoveryService } = await import('./services/ToolDiscoveryService.js')
  const toolDiscovery = ToolDiscoveryService.getInstance()
  await toolDiscovery.discoverTools()
}

if (isDevServer) {
  // Dev server (3457): Use ViteExpress for HMR
  const { startViteExpressServer } = await import('./middleware/vite-dev.js')
  startViteExpressServer(app, httpServer, Number(PORT))
  await startServer()
} else {
  // Stable server (3456): Use regular Express
  httpServer.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`)
    console.log(`📡 WebSocket listening on ws://localhost:${PORT}`)
    await startServer()
  })
}

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
