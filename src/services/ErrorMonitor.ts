/**
 * ErrorMonitor - Client-side diagnostic monitoring service
 *
 * KISS: Just listens to WebSocket updates
 * Library First: Uses socket.io-client
 * SOLID: Single responsibility - bridge between server and store
 */

import type { Diagnostic } from '../stores/diagnostics'
import { io, Socket } from 'socket.io-client'

// Global singleton instance
let globalMonitorInstance: ErrorMonitor | null = null

type DiagnosticUpdateHandler = (data: {
  source: string
  diagnostics: Diagnostic[]
}) => void

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
  isConnected = false

  constructor() {
    this.connect()
  }

  // Event-like API using callbacks
  onDiagnosticsUpdated(handler: DiagnosticUpdateHandler) {
    this.updateHandlers.push(handler)
    
    // Return cleanup function
    return () => {
      const index = this.updateHandlers.indexOf(handler)
      if (index > -1) {
        this.updateHandlers.splice(index, 1)
      }
    }
  }

  private emit(data: Parameters<DiagnosticUpdateHandler>[0]) {
    this.updateHandlers.forEach((handler) => handler(data))
  }

  private connect() {
    if (this.socket) return

    this.socket = io()
    this.setupSocketListeners()
    this.isConnected = true
  }

  /**
   * Switch to monitoring a different project
   */
  switchProject(projectId: string, projectPath: string) {
    if (!this.socket) {
      this.connect()
    }

    // Tell server to switch projects
    this.socket?.emit('project:select', { projectId, projectPath })
  }

  private setupSocketListeners() {
    if (!this.socket) return

    // Listen for diagnostic updates
    this.socket.on('diagnostics:updated', (data: { source: string; diagnostics: Diagnostic[] }) => {
      console.log(`[ErrorMonitor] Received ${data.diagnostics.length} diagnostics for ${data.source}`)
      this.emit(data)
    })

    // Listen for initial diagnostics on connection
    this.socket.on('diagnostics:current', (data: { diagnostics: Diagnostic[] }) => {
      console.log(`[ErrorMonitor] Received initial diagnostics: ${data.diagnostics.length} items`)

      // Group by source
      const bySource = new Map<string, Diagnostic[]>()
      data.diagnostics.forEach((d) => {
        const existing = bySource.get(d.source) || []
        existing.push(d)
        bySource.set(d.source, existing)
      })

      // Emit updates for each source
      bySource.forEach((diagnostics, source) => {
        this.emit({ source, diagnostics })
      })

      // If no diagnostics, emit empty updates
      if (data.diagnostics.length === 0) {
        this.emit({ source: 'typescript', diagnostics: [] })
        this.emit({ source: 'eslint', diagnostics: [] })
      }
    })

    // Connection events
    this.socket.on('connect', () => {
      console.log('[ErrorMonitor] WebSocket connected')
      this.isConnected = true
    })

    this.socket.on('disconnect', () => {
      console.log('[ErrorMonitor] WebSocket disconnected')
      this.isConnected = false
    })
  }
}
