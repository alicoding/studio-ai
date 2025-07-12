import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'
import path from 'path'

export default defineConfig({
  plugins: [
    react({
      // Enable Fast Refresh to prevent full page reloads
      fastRefresh: true,
      // Exclude store files from Fast Refresh to preserve state
      exclude: [/stores\/.+\.ts$/],
    }),
    TanStackRouterVite(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Improve HMR (Hot Module Replacement) behavior
    hmr: {
      overlay: true, // Show error overlay
      port: 5173, // Use same port as server to avoid conflicts
    },
    // Watch options to reduce unnecessary reloads
    watch: {
      // Ignore files that shouldn't trigger reloads
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/web/server/**'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3457',
        changeOrigin: true,
        timeout: 5000,
        // Fallback to stable server if dev server is unavailable
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            console.log('[Vite Proxy] Dev server unavailable, trying stable server...', err.message)
            // Don't write to response if already sent
            if (!res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ 
                error: 'Backend temporarily unavailable', 
                retryAfter: 5,
                fallbackAvailable: true 
              }))
            }
          })
        },
      },
      '/socket.io': {
        target: 'http://localhost:3457',
        ws: true,
        changeOrigin: true,
        timeout: 5000,
        // Fallback for WebSocket connections
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[Vite Proxy] WebSocket dev server unavailable:', err.message)
          })
        },
      },
      // Fallback proxy for when dev server is down
      '/api-fallback': {
        target: 'http://localhost:3456',
        changeOrigin: true,
        pathRewrite: { '^/api-fallback': '/api' },
      },
    },
  },
  // Optimize dependencies to prevent unnecessary reloads
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-router',
      'socket.io-client',
      'zustand',
    ],
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
