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

export interface AgentConfig {
  systemPrompt?: string
  tools?: string[]
  model?: string
  temperature?: number
  maxTokens?: number
}

export class ClaudeAgent {
  private agent: Agent
  private abortController?: AbortController
  private sessionId?: string
  private onSessionUpdate?: (sessionId: string) => void
  private config?: AgentConfig

  constructor(id: string, role: Role, sessionId?: string | null, configOverrides?: AgentConfig) {
    this.agent = {
      id,
      role,
      status: 'online',
      sessionId: sessionId || null,
    }
    // Keep internal sessionId in sync
    this.sessionId = sessionId || undefined
    // Store configuration
    this.config = configOverrides
  }

  setSessionUpdateCallback(callback: (sessionId: string) => void): void {
    this.onSessionUpdate = callback
  }

  setStreamCallback(_callback: (data: string) => void): void {
    // Stream callbacks not implemented in this simplified version
  }

  private mapToValidModel(model?: string): string | undefined {
    if (!model) return undefined

    // Only two valid Claude Code models: sonnet and opus
    if (model.includes('opus')) return 'opus'
    return 'sonnet' // Default to sonnet for everything else
  }

  async sendMessage(
    content: string,
    projectPath?: string,
    io?: any,
    sessionId?: string,
    forceNewSession?: boolean
  ): Promise<string> {
    try {
      this.agent.status = 'busy'
      console.log('Sending message to Claude SDK:', content)
      console.log('Project path:', projectPath)
      console.log('Current sessionId:', this.sessionId)
      console.log('Agent sessionId:', this.agent.sessionId)
      console.log('Force new session:', forceNewSession)
      console.log('Agent config:', this.config)

      // Create abort controller for this request
      this.abortController = new AbortController()

      const messages: SDKMessage[] = []
      let resultText = ''
      let hasError = false
      let errorMessage = ''

      // Build query options
      const queryOptions = {
        maxTurns: 3, // Limit turns for safety
        outputFormat: 'stream-json', // Use streaming JSON format
        verbose: true, // Enable verbose mode to see all system messages and debug issues
        cwd: projectPath || process.cwd(), // Set working directory to project path
        resume: forceNewSession ? undefined : this.sessionId || this.agent.sessionId || undefined, // Don't resume if forcing new session
        allowedTools: this.config?.tools ? this.formatToolsForSDK(this.config.tools) : undefined, // Pass allowed tools in CLI format
        model: this.mapToValidModel(this.config?.model), // Use valid Claude Code model name
        customSystemPrompt: this.config?.systemPrompt, // Pass agent's system prompt
      }

      console.log('Query options:', JSON.stringify(queryOptions, null, 2))

      // Query returns an async generator that yields messages
      for await (const message of query({
        prompt: content,
        abortController: this.abortController,
        options: queryOptions,
      })) {
        console.log('Received message:', message.type, {
          type: message.type,
          parentUuid: (message as any).parentUuid,
          sessionId: (message as any).sessionId,
          uuid: (message as any).uuid,
          hasSession: !!(message as any).session_id || !!(message as any).sessionId,
          hasContent: !!(message as any).message?.content,
          contentLength:
            message.type === 'assistant' ? JSON.stringify(message.message?.content).length : 0,
        })
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
          // ALWAYS use agent instance ID for consistent WebSocket routing
          // This eliminates timing issues with Claude session ID updates
          const effectiveSessionId = sessionId // sessionId = agent instance ID

          // Emit different message types appropriately
          if (message.type === 'user' || message.type === 'assistant') {
            // Pass content as-is - let frontend handle rendering
            const content = message.message?.content || ''

            io.emit('message:new', {
              sessionId: effectiveSessionId,
              message: {
                role: message.type,
                content: content,
                timestamp: new Date().toISOString(),
                isMeta: message.isMeta || false,
                isStreaming: true, // Indicate this is a streaming message
                ...(message.type === 'assistant' && {
                  model: message.message?.model,
                  usage: message.message?.usage,
                }),
              },
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
                type: 'error',
              },
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

        // Extract sessionId from ANY message type to track checkpoints
        const messageSessionId = (message as any).sessionId || (message as any).session_id
        if (messageSessionId && messageSessionId !== this.sessionId) {
          console.log('📍 Session checkpoint update:', {
            from: this.sessionId,
            to: messageSessionId,
            messageType: message.type,
            parentUuid: (message as any).parentUuid,
          })
          this.sessionId = messageSessionId
          this.agent.sessionId = messageSessionId

          // Notify session update callback
          if (this.onSessionUpdate) {
            this.onSessionUpdate(messageSessionId)
          }
        }

        // Handle result message
        if (message.type === 'result' && message.subtype === 'success') {
          resultText = message.result || resultText
          // Session ID is already handled above for all message types
        }
      }

      // Throw error if we encountered one during processing
      if (hasError) {
        throw new Error(`Claude Code error: ${errorMessage}`)
      }

      console.log('Final response:', resultText)
      console.log('Session ID after query:', this.sessionId)

      this.agent.status = 'online'
      // Session ID is already updated in the result handler above

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

  /**
   * Format tools array for Claude Code SDK
   * SDK expects array of capitalized tool names: ["Bash", "Read", "Write"]
   */
  private formatToolsForSDK(tools: string[]): string[] {
    return tools.map((tool) => {
      // Map to proper CLI tool names
      const toolMap: { [key: string]: string } = {
        bash: 'Bash',
        read: 'Read',
        write: 'Write',
        edit: 'Edit',
        grep: 'Grep',
        glob: 'Glob',
        ls: 'LS',
      }
      return toolMap[tool.toLowerCase()] || tool.charAt(0).toUpperCase() + tool.slice(1)
    })
  }
}
