// Local Claude Agent implementation using Claude Code SDK
// KISS: Basic agent that can respond to messages

import { query, type SDKMessage } from '@anthropic-ai/claude-code'

export type Role = 'dev' | 'ux' | 'test' | 'pm'

export interface Agent {
  id: string
  role: Role
  status: 'online' | 'busy' | 'offline'
  sessionId: string | null
}

export class ClaudeAgent {
  private agent: Agent
  private abortController?: AbortController
  private sessionId?: string

  constructor(id: string, role: Role, sessionId?: string | null, configOverrides?: any) {
    this.agent = {
      id,
      role,
      status: 'online',
      sessionId: sessionId || null
    }
  }

  setStreamCallback(callback: (data: string) => void): void {
    // Stream callbacks not implemented in this simplified version
  }

  async sendMessage(content: string, projectPath?: string, io?: any, sessionId?: string, forceNewSession?: boolean): Promise<string> {
    try {
      this.agent.status = 'busy'
      console.log('Sending message to Claude SDK:', content)
      console.log('Project path:', projectPath)
      console.log('Resume session:', this.agent.sessionId)
      
      // Create abort controller for this request
      this.abortController = new AbortController()
      
      const messages: SDKMessage[] = []
      let resultText = ''
      let hasError = false
      let errorMessage = ''
      
      // Query returns an async generator that yields messages
      for await (const message of query({
        prompt: content,
        abortController: this.abortController,
        options: {
          maxTurns: 3, // Limit turns for safety
          outputFormat: 'stream-json', // Use streaming JSON format
          verbose: true, // Enable verbose mode to see all system messages and debug issues
          cwd: projectPath || process.cwd(), // Set working directory to project path
          resume: forceNewSession ? undefined : (this.agent.sessionId || undefined), // Don't resume if forcing new session
        }
      })) {
        console.log('Received message:', message.type, message)
        messages.push(message)
        
        // Check for error messages
        if (message.type === 'error') {
          hasError = true
          errorMessage = message.error || 'Unknown error occurred'
          console.error('Claude SDK error:', message)
        }
        
        // Check for result with error
        if (message.type === 'result' && message.subtype === 'error') {
          hasError = true
          errorMessage = message.error || message.result || 'Query failed'
          console.error('Claude query failed:', message)
        }
        
        // Emit all messages through WebSocket if io is provided
        if (io && sessionId) {
          const effectiveSessionId = sessionId || this.sessionId || 'default'
          
          // Emit different message types appropriately
          if (message.type === 'user' || message.type === 'assistant') {
            io.emit('message:new', {
              sessionId: effectiveSessionId,
              message: {
                role: message.type,
                content: message.message?.content || '',
                timestamp: new Date().toISOString(),
                isMeta: message.isMeta || false,
                ...(message.type === 'assistant' && {
                  model: message.message?.model,
                  usage: message.message?.usage
                })
              }
            })
          }
          
          // Emit error messages to UI
          if (message.type === 'error') {
            io.emit('message:new', {
              sessionId: effectiveSessionId,
              message: {
                role: 'system',
                content: `Error: ${message.error || 'Unknown error'}`,
                timestamp: new Date().toISOString(),
                type: 'error'
              }
            })
          }
        }
        
        // Extract text from assistant messages
        if (message.type === 'assistant' && message.message?.content) {
          for (const content of message.message.content) {
            if (content.type === 'text') {
              resultText += content.text
            }
          }
        }
        
        // Handle result message
        if (message.type === 'result' && message.subtype === 'success') {
          resultText = message.result || resultText
          this.sessionId = message.session_id
        }
      }
      
      // Throw error if we encountered one during processing
      if (hasError) {
        throw new Error(`Claude Code error: ${errorMessage}`)
      }
      
      console.log('Final response:', resultText)
      console.log('Session ID after query:', this.sessionId)
      
      this.agent.status = 'online'
      this.agent.sessionId = this.sessionId || null
      
      return resultText
    } catch (error) {
      this.agent.status = 'online'
      console.error('Error in Claude query:', error)
      
      // Provide more detailed error information
      if (error instanceof Error) {
        const enhancedError = new Error(`Claude Code failed: ${error.message}`)
        enhancedError.stack = error.stack
        throw enhancedError
      }
      
      throw new Error(`Claude Code failed with unknown error: ${String(error)}`)
    }
  }

  abort(): void {
    if (this.abortController) {
      this.abortController.abort()
    }
  }

  getInfo() {
    return this.agent
  }
}