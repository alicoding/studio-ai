/**
 * CommandInterceptor - Server-side Command Detection and Processing
 * 
 * SOLID: Single Responsibility - Detects and processes commands from AI responses
 * DRY: Reusable command detection logic for all message types
 * KISS: Simple interface for command interception
 */

import type { Server as SocketIOServer } from 'socket.io'

export interface CommandDetectionResult {
  isCommand: boolean
  commandType?: 'hash' | 'mention' | 'slash' | 'unknown'
  command?: string
  args?: string
  targets?: string[]
  rawMessage: string
}

export class CommandInterceptor {
  private io: SocketIOServer | null = null

  setSocketIO(io: SocketIOServer) {
    this.io = io
  }

  /**
   * Detect if a message contains any type of command
   * KISS: Simple regex patterns for each command type
   */
  detectCommand(message: string): CommandDetectionResult {
    const trimmedMessage = message.trim()

    // Check for hash commands (#search, #debug, etc.)
    const hashMatch = trimmedMessage.match(/^#(\w+)(.*)/)
    if (hashMatch) {
      return {
        isCommand: true,
        commandType: 'hash',
        command: hashMatch[1],
        args: hashMatch[2]?.trim() || '',
        rawMessage: message
      }
    }

    // Check for mentions (@agent1, @all, etc.)
    const mentionMatch = trimmedMessage.match(/^@(\S+)(.*)/)
    if (mentionMatch) {
      const targets = mentionMatch[1].split(',').map(t => t.trim())
      return {
        isCommand: true,
        commandType: 'mention',
        command: 'mention',
        targets,
        args: mentionMatch[2]?.trim() || '',
        rawMessage: message
      }
    }

    // Check for slash commands (/clear, /help, etc.)
    const slashMatch = trimmedMessage.match(/^\/(\w+)(.*)/)
    if (slashMatch) {
      return {
        isCommand: true,
        commandType: 'slash',
        command: slashMatch[1],
        args: slashMatch[2]?.trim() || '',
        rawMessage: message
      }
    }

    return {
      isCommand: false,
      rawMessage: message
    }
  }

  /**
   * Check if AI response contains a command and process it
   */
  async interceptAIResponse(
    content: string,
    sessionId: string,
    projectId: string,
    agentId: string
  ): Promise<{ shouldIntercept: boolean; commandId?: string }> {
    const detection = this.detectCommand(content)

    if (!detection.isCommand || !this.io) {
      return { shouldIntercept: false }
    }

    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Send processing feedback immediately
    this.sendProcessingFeedback(detection, commandId, sessionId)

    // Schedule command processing
    // We return immediately so the AI response is blocked
    setTimeout(() => {
      this.processCommand(detection, commandId, sessionId, projectId, agentId)
    }, 100)

    return { shouldIntercept: true, commandId }
  }

  /**
   * Send processing state feedback
   */
  private sendProcessingFeedback(
    detection: CommandDetectionResult,
    commandId: string,
    sessionId: string
  ): void {
    if (!this.io) return

    const commandDisplay = detection.commandType === 'mention' 
      ? `@${detection.targets?.join(', @')}`
      : `${detection.commandType === 'hash' ? '#' : '/'}${detection.command}`

    const processingMessage = `🔄 Processing command: ${commandDisplay}
ID: ${commandId}
Args: ${detection.args || '(none)'}
Status: Running...`

    this.io.emit('message:new', {
      sessionId,
      message: {
        role: 'system',
        content: processingMessage,
        timestamp: new Date().toISOString(),
        type: 'command-processing'
      }
    })
  }

  /**
   * Process the detected command
   */
  private async processCommand(
    detection: CommandDetectionResult,
    commandId: string,
    sessionId: string,
    projectId: string,
    agentId: string
  ): Promise<void> {
    if (!this.io) return

    try {
      // Import required services dynamically
      const { default: fetch } = await import('node-fetch')
      
      let response
      let result: { success: boolean; error?: string; response?: string }

      // Route to appropriate endpoint based on command type
      switch (detection.commandType) {
        case 'hash':
          // Send to message handler which will route to AI commands
          response = await fetch(`http://localhost:3000/api/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: detection.rawMessage,
              projectId,
              agentId,
              forceNewSession: false
            })
          })
          result = response.ok 
            ? { success: true, response: 'Command processed' }
            : { success: false, error: 'Failed to process command' }
          break

        case 'mention':
          // Send to mention handler
          response = await fetch(`http://localhost:3000/api/messages/mention`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: detection.rawMessage,
              fromAgentId: agentId,
              projectId
            })
          })
          result = response.ok
            ? { success: true, response: 'Mention sent' }
            : { success: false, error: 'Failed to send mention' }
          break

        case 'slash':
          // Slash commands from AI are not supported
          result = { success: false, error: 'Slash commands are not supported in AI responses' }
          break

        default:
          result = { success: false, error: 'Unknown command type' }
      }

      // Send completion or error feedback
      if (result.success) {
        this.sendCompletionFeedback(detection, commandId, sessionId, result.response || '')
      } else {
        this.sendErrorFeedback(detection, commandId, sessionId, result.error || 'Unknown error')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Command processing failed'
      this.sendErrorFeedback(detection, commandId, sessionId, errorMessage)
    }
  }

  /**
   * Send completion feedback
   */
  private sendCompletionFeedback(
    detection: CommandDetectionResult,
    commandId: string,
    sessionId: string,
    response: string
  ): void {
    if (!this.io) return

    const commandDisplay = detection.commandType === 'mention' 
      ? `@${detection.targets?.join(', @')}`
      : `${detection.commandType === 'hash' ? '#' : '/'}${detection.command}`

    const completionMessage = `Command: ${commandDisplay}
ID: ${commandId}
Status: Complete

${response}`

    this.io.emit('message:new', {
      sessionId,
      message: {
        role: 'system',
        content: completionMessage,
        timestamp: new Date().toISOString(),
        type: 'command-complete'
      }
    })
  }

  /**
   * Send error feedback
   */
  private sendErrorFeedback(
    detection: CommandDetectionResult,
    commandId: string,
    sessionId: string,
    error: string
  ): void {
    if (!this.io) return

    const commandDisplay = detection.commandType === 'mention' 
      ? `@${detection.targets?.join(', @')}`
      : `${detection.commandType === 'hash' ? '#' : '/'}${detection.command}`

    const errorMessage = `Command: ${commandDisplay}
ID: ${commandId}
Status: Failed
Error: ${error}`

    this.io.emit('message:new', {
      sessionId,
      message: {
        role: 'system',
        content: errorMessage,
        timestamp: new Date().toISOString(),
        type: 'command-error'
      }
    })
  }
}

// Singleton instance
export const commandInterceptor = new CommandInterceptor()