/**
 * IPCServer - Unix Socket Server for Agent Communication
 * 
 * SOLID: Single Responsibility - only handles IPC server
 * DRY: Reuses existing socket pattern from plan.md
 * KISS: Simple Unix domain socket with error boundaries
 */

import { Server, Socket } from 'net'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'
import { EventEmitter } from 'events'
import { IPCMessage, IPCServerOptions } from './types.js'

export class IPCServer extends EventEmitter {
  private server: Server | null = null
  private socketPath: string
  private agentId: string
  private connections: Set<Socket> = new Set()
  private isRunning = false

  constructor(options: IPCServerOptions) {
    super()
    this.agentId = options.agentId
    
    // Follow existing pattern: claude-agents.{agentId}
    this.socketPath = path.join(os.tmpdir(), `claude-agents.${this.agentId}`)
  }

  /**
   * Start the IPC server
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.warn(`IPC server already running for agent ${this.agentId}`)
      return
    }

    try {
      // Clean up existing socket file
      await this.cleanup()
      
      this.server = new Server()
      
      // Handle new connections
      this.server.on('connection', (socket: Socket) => {
        this.handleConnection(socket)
      })

      // Server error handling
      this.server.on('error', (error) => {
        console.error(`IPC server error for agent ${this.agentId}:`, error)
        this.emit('error', error)
      })

      // Start listening
      await new Promise<void>((resolve, reject) => {
        this.server!.listen(this.socketPath, (error?: Error) => {
          if (error) {
            reject(error)
          } else {
            this.isRunning = true
            console.log(`IPC server started for agent ${this.agentId} at ${this.socketPath}`)
            resolve()
          }
        })
      })

    } catch (error) {
      console.error(`Failed to start IPC server for agent ${this.agentId}:`, error)
      throw error
    }
  }  /**
   * Handle new client connection
   */
  private handleConnection(socket: Socket): void {
    console.log(`New IPC connection to agent ${this.agentId}`)
    
    this.connections.add(socket)
    
    // Handle incoming messages
    socket.on('data', (data) => {
      try {
        const message: IPCMessage = JSON.parse(data.toString())
        console.log(`IPC message received by ${this.agentId} from ${message.from}:`, message.content)
        
        // Emit message event for agent to handle
        this.emit('message', message)
        
      } catch (error) {
        console.error(`Invalid IPC message received by ${this.agentId}:`, error)
        this.sendError(socket, 'Invalid message format')
      }
    })

    // Handle client disconnect
    socket.on('close', () => {
      console.log(`IPC connection closed to agent ${this.agentId}`)
      this.connections.delete(socket)
    })

    // Handle socket errors
    socket.on('error', (error) => {
      console.error(`IPC socket error for agent ${this.agentId}:`, error)
      this.connections.delete(socket)
    })
  }

  /**
   * Send response back to client
   */
  public sendResponse(message: IPCMessage): void {
    if (this.connections.size === 0) {
      console.warn(`No connections to send response from agent ${this.agentId}`)
      return
    }

    try {
      const data = JSON.stringify(message)
      
      // Send to all connected clients
      for (const socket of this.connections) {
        if (!socket.destroyed) {
          socket.write(data)
        }
      }
    } catch (error) {
      console.error(`Failed to send IPC response from agent ${this.agentId}:`, error)
    }
  }

  /**
   * Send error response
   */
  private sendError(socket: Socket, error: string): void {
    try {
      const errorMessage: IPCMessage = {
        from: this.agentId,
        to: 'unknown',
        content: `Error: ${error}`,
        type: 'response',
        timestamp: Date.now()
      }
      
      socket.write(JSON.stringify(errorMessage))
    } catch (err) {
      console.error(`Failed to send error response:`, err)
    }
  }  /**
   * Stop the IPC server
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    try {
      // Close all connections
      for (const socket of this.connections) {
        socket.destroy()
      }
      this.connections.clear()

      // Close server
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server!.close(() => {
            resolve()
          })
        })
        this.server = null
      }

      // Cleanup socket file
      await this.cleanup()
      
      this.isRunning = false
      console.log(`IPC server stopped for agent ${this.agentId}`)
      
    } catch (error) {
      console.error(`Error stopping IPC server for agent ${this.agentId}:`, error)
      throw error
    }
  }

  /**
   * Clean up socket file
   */
  private async cleanup(): Promise<void> {
    try {
      if (fs.existsSync(this.socketPath)) {
        fs.unlinkSync(this.socketPath)
      }
    } catch (error) {
      // Socket file might not exist or be in use - that's OK
      console.debug(`Socket cleanup for ${this.agentId}:`, error)
    }
  }

  /**
   * Check if server is running
   */
  public isServerRunning(): boolean {
    return this.isRunning
  }

  /**
   * Get socket path
   */
  public getSocketPath(): string {
    return this.socketPath
  }

  /**
   * Get connection count
   */
  public getConnectionCount(): number {
    return this.connections.size
  }
}