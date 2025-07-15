/**
 * Vite Development Server Integration - Enables HMR on dev server
 *
 * SOLID: Single responsibility - Vite integration only
 * DRY: Reuses existing Vite config
 * KISS: Simple library integration
 * Library-First: Uses vite-express library instead of manual setup
 */

import type { Express } from 'express'
import type { Server } from 'http'
import ViteExpress from 'vite-express'

/**
 * Configure Vite Express integration for HMR
 * Only used in development mode on port 3457
 */
export function configureViteExpress(): void {
  // Configure vite-express to use existing vite.config.ts
  ViteExpress.config({
    mode: 'development',
    // Use existing Vite config
    viteConfigFile: 'vite.config.ts',
  })

  console.log('✅ Vite Express configured for HMR')
}

/**
 * Start HTTP server with Vite HMR integration
 * Works with existing Socket.IO setup
 */
export function startViteExpressServer(app: Express, httpServer: Server, port: number): void {
  // Use ViteExpress.bind to integrate with our existing httpServer (which has Socket.IO)
  // This ensures WebSocket connections work properly with both Vite HMR and Socket.IO
  ViteExpress.bind(app, httpServer)

  httpServer.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`)
    console.log(`📡 WebSocket listening on ws://localhost:${port}`)
    console.log('🔥 Vite HMR enabled')
  })
}
