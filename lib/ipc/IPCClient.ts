/**
 * IPCClient - Unix Socket Client with Retry Logic
 * 
 * SOLID: Single Responsibility - only handles IPC client connections
 * DRY: Reuses retry logic from existing codebase
 * KISS: Simple connect/send/retry pattern with 2s timeout
 */

import { Socket } from 'net'
import * as path from 'path'
import * as os from 'os'
import { IPCMessage, IPCClientOptions } from './types.js'

export class IPCClient {
  private readonly timeout: number
  private readonly retryDelay: number
  private readonly maxRetries: number

  constructor(options: IPCClientOptions = {}) {
    this.timeout = options.timeout || 2000 // 2s timeout from plan.md
    this.retryDelay = options.retryDelay || 500
    this.maxRetries = options.maxRetries || 3
  }

  /**
   * Send message to target agent with retry logic
   */
  public async sendMessage(
    targetAgentId: string, 
    message: IPCMessage
  ): Promise<IPCMessage | null> {
    const socketPath = path.join(os.tmpdir(), `claude-agents.${targetAgentId}`)
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.attemptConnection(socketPath, message)
        console.log(`IPC message sent to ${targetAgentId} successfully`)
        return response
        
      } catch (error: any) {
        console.warn(`IPC attempt ${attempt}/${this.maxRetries} failed for ${targetAgentId}:`, error.message)
        
        if (attempt === this.maxRetries) {
          console.error(`Failed to send IPC message to ${targetAgentId} after ${this.maxRetries} attempts`)
          throw error
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.retryDelay))
      }
    }
    
    return null
  }

  /**
   * Attempt single connection to target agent
   */
  private async attemptConnection(
    socketPath: string, 
    message: IPCMessage
  ): Promise<IPCMessage | null> {
    return new Promise((resolve, reject) => {
      const socket = new Socket()
      let responseReceived = false
      
      // Connection timeout
      const timeout = setTimeout(() => {
        if (!responseReceived) {
          socket.destroy()
          reject(new Error(`Connection timeout after ${this.timeout}ms`))
        }
      }, this.timeout)

      // Handle connection success
      socket.on('connect', () => {
        try {
          // Send message
          const data = JSON.stringify(message)
          socket.write(data)
          console.log(`IPC message sent to ${message.to}:`, message.content)
        } catch (error) {
          clearTimeout(timeout)
          socket.destroy()
          reject(error)
        }
      })

      // Handle response
      socket.on('data', (data) => {
        try {
          responseReceived = true
          clearTimeout(timeout)
          
          const response: IPCMessage = JSON.parse(data.toString())
          console.log(`IPC response received from ${response.from}:`, response.content)
          
          socket.destroy()
          resolve(response)
        } catch (error) {
          socket.destroy()
          reject(new Error('Invalid response format'))
        }
      })

      // Handle connection errors
      socket.on('error', (error) => {
        clearTimeout(timeout)
        if (!responseReceived) {
          reject(error)
        }
      })

      // Handle connection close
      socket.on('close', () => {
        clearTimeout(timeout)
        if (!responseReceived) {
          resolve(null) // No response received
        }
      })

      // Connect to target socket
      socket.connect(socketPath)
    })
  }  /**
   * Send @mention message to target agent
   */
  public async sendMention(
    fromAgentId: string,
    targetAgentId: string,
    content: string,
    projectId: string
  ): Promise<boolean> {
    const message: IPCMessage = {
      from: fromAgentId,
      to: targetAgentId,
      content,
      type: 'mention',
      timestamp: Date.now(),
      metadata: {
        projectId,
        originalMessage: content
      }
    }

    try {
      await this.sendMessage(targetAgentId, message)
      return true
    } catch (error) {
      console.error(`Failed to send @mention to ${targetAgentId}:`, error)
      return false
    }
  }

  /**
   * Send broadcast message to multiple agents
   */
  public async sendBroadcast(
    fromAgentId: string,
    targetAgentIds: string[],
    content: string,
    projectId: string
  ): Promise<{success: string[], failed: string[]}> {
    const results = {
      success: [] as string[],
      failed: [] as string[]
    }

    const promises = targetAgentIds.map(async (targetId) => {
      const message: IPCMessage = {
        from: fromAgentId,
        to: targetId,
        content,
        type: 'broadcast',
        timestamp: Date.now(),
        metadata: {
          projectId,
          originalMessage: content
        }
      }

      try {
        await this.sendMessage(targetId, message)
        results.success.push(targetId)
      } catch (error) {
        console.error(`Broadcast failed for ${targetId}:`, error)
        results.failed.push(targetId)
      }
    })

    await Promise.allSettled(promises)
    
    console.log(`Broadcast complete: ${results.success.length} succeeded, ${results.failed.length} failed`)
    return results
  }

  /**
   * Check if agent is reachable via IPC
   */
  public async ping(targetAgentId: string): Promise<boolean> {
    const message: IPCMessage = {
      from: 'system',
      to: targetAgentId,
      content: 'ping',
      type: 'command',
      timestamp: Date.now()
    }

    try {
      const response = await this.sendMessage(targetAgentId, message)
      return response !== null
    } catch (error) {
      return false
    }
  }
}