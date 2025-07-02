/**
 * ErrorMonitor - Client-side diagnostic monitoring service
 *
 * KISS: Uses WebSocket for real-time diagnostics
 * Library First: Uses socket.io-client
 * SOLID: Single responsibility - bridge between server diagnostics and client store
 */

import type { Diagnostic } from '../stores/diagnostics'
import { io, Socket } from 'socket.io-client'

// Global singleton instance
let globalMonitorInstance: ErrorMonitor | null = null

type DiagnosticUpdateHandler = (data: {
  source: string
  diagnostics: Diagnostic[]
  timestamp: Date
}) => void

type MonitoringEventHandler = (data?: any) => void

export class ErrorMonitor {
  // Static method to get singleton instance
  static getInstance(): ErrorMonitor {
    if (!globalMonitorInstance) {
      console.log('[ErrorMonitor] Creating global singleton instance')
      globalMonitorInstance = new ErrorMonitor()
    }
    return globalMonitorInstance
  }
  private socket: Socket | null = null
  private updateHandlers: DiagnosticUpdateHandler[] = []
  private startHandlers: MonitoringEventHandler[] = []
  private stopHandlers: MonitoringEventHandler[] = []
  private currentProjectPath: string | null = null
  isMonitoring = false // Make public for external access

  constructor() {}

  // Event-like API using callbacks
  onDiagnosticsUpdated(handler: DiagnosticUpdateHandler) {
    this.updateHandlers.push(handler)
  }

  onMonitoringStarted(handler: MonitoringEventHandler) {
    this.startHandlers.push(handler)
  }

  onMonitoringStopped(handler: MonitoringEventHandler) {
    this.stopHandlers.push(handler)
  }

  private emit(event: 'diagnostics-updated', data: Parameters<DiagnosticUpdateHandler>[0]): void
  private emit(event: 'monitoring-started' | 'monitoring-stopped', data?: any): void
  private emit(event: string, data?: any) {
    if (event === 'diagnostics-updated') {
      this.updateHandlers.forEach((handler) => handler(data))
    } else if (event === 'monitoring-started') {
      this.startHandlers.forEach((handler) => handler(data))
    } else if (event === 'monitoring-stopped') {
      this.stopHandlers.forEach((handler) => handler(data))
    }
  }

  async startMonitoring(projectPath: string) {
    console.log('[ErrorMonitor] Starting monitoring for:', projectPath)

    // Stop existing monitoring
    await this.stopMonitoring()

    this.currentProjectPath = projectPath

    try {
      // Start server-side monitoring
      const startResponse = await fetch('/api/diagnostics/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath }),
      })

      if (!startResponse.ok) {
        throw new Error(`Failed to start server monitoring: ${startResponse.statusText}`)
      }

      // Connect WebSocket if not connected
      if (!this.socket) {
        this.socket = io()
        this.setupSocketListeners()
      }

      this.isMonitoring = true

      // Request current diagnostics immediately
      const diagnosticsResponse = await fetch('/api/diagnostics')
      if (diagnosticsResponse.ok) {
        const data = await diagnosticsResponse.json()
        if (data.diagnostics && data.diagnostics.length > 0) {
          console.log(`[ErrorMonitor] Initial fetch: ${data.diagnostics.length} diagnostics`)

          // Process initial diagnostics immediately
          const diagnostics = data.diagnostics.map((d: any) => ({
            ...d,
            timestamp: new Date(d.timestamp),
          }))

          // Group by source and emit
          const bySource = new Map<string, Diagnostic[]>()
          diagnostics.forEach((d: Diagnostic) => {
            const existing = bySource.get(d.source) || []
            existing.push(d)
            bySource.set(d.source, existing)
          })

          bySource.forEach((diagnostics, source) => {
            this.emit('diagnostics-updated', {
              source,
              diagnostics,
              timestamp: new Date(),
            })
          })
        }
      }

      this.emit('monitoring-started', { projectPath })
      console.log('[ErrorMonitor] Monitoring started successfully with WebSocket')
    } catch (error) {
      console.error('Failed to start monitoring:', error)
      this.isMonitoring = false
    }
  }

  async stopMonitoring() {
    this.isMonitoring = false
    this.currentProjectPath = null

    try {
      // Stop server-side monitoring
      await fetch('/api/diagnostics/stop', { method: 'POST' })

      // Disconnect socket
      if (this.socket) {
        this.socket.disconnect()
        this.socket = null
      }

      this.emit('monitoring-stopped')
    } catch (error) {
      console.warn('Failed to stop server monitoring:', error)
    }
  }

  private setupSocketListeners() {
    if (!this.socket) return

    // Listen for diagnostic updates
    this.socket.on(
      'diagnostics:updated',
      (data: { source: string; diagnostics: Diagnostic[]; timestamp: string }) => {
        console.log(
          `[ErrorMonitor] Received WebSocket update: ${data.diagnostics.length} diagnostics for ${data.source}`
        )

        // Convert timestamp strings to Date objects
        const diagnostics = data.diagnostics.map((d) => ({
          ...d,
          timestamp: new Date(d.timestamp),
        }))

        this.emit('diagnostics-updated', {
          source: data.source,
          diagnostics,
          timestamp: new Date(data.timestamp),
        })
      }
    )

    // Listen for initial diagnostics on connection
    this.socket.on(
      'diagnostics:current',
      (data: { diagnostics: Diagnostic[]; timestamp: string }) => {
        console.log(`[ErrorMonitor] Received initial diagnostics: ${data.diagnostics.length} items`)

        // Convert and group by source
        const diagnostics = data.diagnostics.map((d) => ({
          ...d,
          timestamp: new Date(d.timestamp),
        }))

        // Group by source
        const bySource = new Map<string, Diagnostic[]>()
        diagnostics.forEach((d) => {
          const existing = bySource.get(d.source) || []
          existing.push(d)
          bySource.set(d.source, existing)
        })

        // Emit updates for each source
        bySource.forEach((diagnostics, source) => {
          this.emit('diagnostics-updated', {
            source,
            diagnostics,
            timestamp: new Date(data.timestamp),
          })
        })

        // If no diagnostics, emit empty updates
        if (diagnostics.length === 0) {
          this.emit('diagnostics-updated', {
            source: 'typescript',
            diagnostics: [],
            timestamp: new Date(),
          })
          this.emit('diagnostics-updated', {
            source: 'eslint',
            diagnostics: [],
            timestamp: new Date(),
          })
        }
      }
    )

    // Listen for monitoring events
    this.socket.on('diagnostics:monitoring-started', (data) => {
      console.log('[ErrorMonitor] WebSocket: monitoring started', data)
      if (data.projectPath === this.currentProjectPath) {
        this.emit('monitoring-started', data)
      }
    })

    this.socket.on('diagnostics:monitoring-stopped', () => {
      console.log('[ErrorMonitor] WebSocket: monitoring stopped')
      this.emit('monitoring-stopped')
    })

    // Connection events
    this.socket.on('connect', () => {
      console.log('[ErrorMonitor] WebSocket connected')
    })

    this.socket.on('disconnect', () => {
      console.log('[ErrorMonitor] WebSocket disconnected')
    })

    this.socket.on('error', (error) => {
      console.error('[ErrorMonitor] WebSocket error:', error)
    })
  }
}
