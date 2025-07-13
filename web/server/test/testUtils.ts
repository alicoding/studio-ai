/**
 * Test Utilities for Integration Tests
 * 
 * SOLID: Reusable test setup utilities
 * DRY: Common test configuration in one place
 * KISS: Simple test server creation
 */

import express from 'express'
import { createServer } from 'http'
import type { Server } from 'http'

export interface TestApp {
  app: express.Express
  server: Server
  serverUrl: string
}

/**
 * Creates a test Express app with all required middleware and routes
 */
export async function createTestApp(): Promise<TestApp> {
  const app = express()
  
  // Add middleware
  app.use(express.json())
  
  // Import and mount routes
  const storageRouter = (await import('../api/storage')).default
  const messagesRouter = (await import('../api/messages')).default
  const diagnosticsRouter = (await import('../api/diagnostics')).default
  const messagesBatchRouter = (await import('../api/messages-batch')).default
  
  app.use('/api/storage', storageRouter)
  app.use('/api/messages', messagesRouter)
  app.use('/api/diagnostics', diagnosticsRouter)
  app.use('/api/messages', messagesBatchRouter)
  
  // Create server
  const server = createServer(app)
  
  // Start server on random port
  await new Promise<void>((resolve, reject) => {
    server.listen(0, () => resolve())
    server.on('error', reject)
  })
  
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  const serverUrl = `http://localhost:${port}`
  
  return {
    app,
    server,
    serverUrl
  }
}

/**
 * Properly close test server
 */
export async function closeTestApp(testApp: TestApp): Promise<void> {
  return new Promise((resolve, reject) => {
    testApp.server.close((err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}