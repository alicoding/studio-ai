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

  async sendMessage(content: string, projectPath?: string, io?: any, sessionId?: string): Promise<string> {
    try {
      this.agent.status = 'busy'
      console.log('Sending message to Claude SDK:', content)
      console.log('Project path:', projectPath)
      
      // Create abort controller for this request
      this.abortController = new AbortController()
      
      const messages: SDKMessage[] = []
      let resultText = ''
      
      // Query returns an async generator that yields messages
      for await (const message of query({
        prompt: content,
        abortController: this.abortController,
        options: {
          maxTurns: 3, // Limit turns for safety
          outputFormat: 'stream-json', // Use streaming JSON format
          verbose: true, // Enable verbose mode to see all system messages
          cwd: projectPath || process.cwd(), // Set working directory to project path
          resume: this.agent.sessionId || undefined, // Resume session if we have a sessionId
        }
      })) {
        console.log('Received message:', message.type, message)
        messages.push(message)
        
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
      
      console.log('Final response:', resultText)
      
      this.agent.status = 'online'
      this.agent.sessionId = this.sessionId || null
      
      return resultText
    } catch (error) {
      this.agent.status = 'online'
      console.error('Error in Claude query:', error)
      throw error
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