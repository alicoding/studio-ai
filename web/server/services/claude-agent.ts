// Local Claude Agent implementation using Claude Code SDK
// KISS: Basic agent that can respond to messages

import {
  query,
  type SDKMessage,
  type SDKAssistantMessage,
  type Options,
} from '@anthropic-ai/claude-code'
import type { Server } from 'socket.io'
import { detectAbortError, AbortError } from '../utils/errorUtils'
import { eventSystem } from './EventSystem'
import * as path from 'path'
import * as os from 'os'

export type Role = 'dev' | 'ux' | 'test' | 'pm'

export interface Agent {
  id: string
  role: Role
  status: 'online' | 'busy' | 'offline'
  sessionId: string | null
}

interface ToolPermission {
  name: string
  enabled: boolean
}

export interface AgentConfig {
  systemPrompt?: string
  tools?: string[] | ToolPermission[]
  model?: string
  temperature?: number
  maxTokens?: number
  maxTurns?: number
  verbose?: boolean
}

export class ClaudeAgent {
  private agent: Agent
  private abortController?: AbortController
  private isAborted: boolean = false
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
    console.log(`[SYSTEM PROMPT DEBUG] ClaudeAgent created with config:`, configOverrides)
    console.log(`[SYSTEM PROMPT DEBUG] System prompt:`, configOverrides?.systemPrompt)
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
    io?: Server,
    sessionId?: string,
    forceNewSession?: boolean
  ): Promise<string> {
    try {
      this.agent.status = 'busy'
      this.isAborted = false // Reset abort flag

      // Clear session IDs if forcing new session
      if (forceNewSession) {
        console.log('Forcing new session - clearing existing session IDs')
        this.sessionId = undefined
        this.agent.sessionId = null
      }

      // Emit status update via EventSystem
      console.log(`[ClaudeAgent] Emitting status change to busy for agent ${this.agent.id}`)
      await eventSystem.emitAgentStatus(this.agent.id, 'busy')

      console.log('Sending message to Claude SDK:', content)
      console.log('Project path:', projectPath)
      console.log('Current sessionId:', this.sessionId)
      console.log('Agent sessionId:', this.agent.sessionId)
      console.log('Force new session:', forceNewSession)
      console.log('Agent config:', this.config)
      console.log('[SYSTEM PROMPT DEBUG] Agent system prompt:', this.config?.systemPrompt)

      // Create abort controller for this request
      this.abortController = new AbortController()
      console.log(`[ClaudeAgent] Created new AbortController for agent ${this.agent.id}`)

      const messages: SDKMessage[] = []
      let resultText = ''
      let hasError = false
      let errorMessage = ''

      // Expand tilde in project path if present
      const expandedProjectPath = projectPath?.startsWith('~/')
        ? path.join(os.homedir(), projectPath.slice(2))
        : projectPath

      // Build query options from agent configuration
      const queryOptions: Options = {
        maxTurns: this.config?.maxTurns || 500, // Use configured maxTurns or default to 500
        cwd: expandedProjectPath || process.cwd(), // Set working directory to project path
        resume: forceNewSession ? undefined : this.sessionId || this.agent.sessionId || undefined, // Don't resume if forcing new session
        allowedTools: this.getToolRestrictions('allowed'), // Pass allowed tools if any restrictions
        disallowedTools: this.getToolRestrictions('disallowed'), // Pass disallowed tools if any restrictions
        model: this.mapToValidModel(this.config?.model), // Use valid Claude Code model name
        customSystemPrompt: this.config?.systemPrompt, // Pass agent's system prompt
        // Not supported by SDK: verbose, temperature, maxTokens, outputFormat
      }

      console.log('Query options:', JSON.stringify(queryOptions, null, 2))
      console.log(
        '[SYSTEM PROMPT DEBUG] customSystemPrompt being passed to SDK:',
        queryOptions.customSystemPrompt
      )
      console.log('Project path:', projectPath)
      console.log('Process cwd:', process.cwd())

      // Query returns an async generator that yields messages
      try {
        console.log('CLAUDE SDK QUERY PARAMS:', {
          prompt: content,
          hasAbortController: !!this.abortController,
          options: queryOptions,
        })

        let isFirstResponse = true
        for await (const message of query({
          prompt: content,
          abortController: this.abortController,
          options: queryOptions,
        })) {
          // Log first response in detail
          if (isFirstResponse) {
            console.log('=== FIRST RESPONSE FROM CLAUDE AGENT ===')
            console.log('Message type:', message.type)
            console.log('Full message:', JSON.stringify(message, null, 2))
            console.log('Config tools:', JSON.stringify(this.config?.tools, null, 2))
            console.log('Allowed tools:', queryOptions.allowedTools)
            console.log('Disallowed tools:', queryOptions.disallowedTools)
            console.log('=======================================')
            isFirstResponse = false
          }

          console.log('Received message:', message.type, {
            type: message.type,
            sessionId: 'session_id' in message ? message.session_id : undefined,
            hasSession: 'session_id' in message,
            hasContent: 'message' in message && !!message.message,
            contentLength:
              message.type === 'assistant'
                ? JSON.stringify((message as SDKAssistantMessage).message?.content).length
                : 0,
          })
          messages.push(message)

          // Note: There is no 'error' type in SDKMessage union
          // Errors are handled via result messages with error subtypes

          // Check for result with error
          if (
            message.type === 'result' &&
            (message.subtype === 'error_max_turns' || message.subtype === 'error_during_execution')
          ) {
            hasError = true
            errorMessage = 'Query failed: ' + message.subtype
            console.error('Claude query failed:', message)
          }

          // Check if we've been aborted before processing messages
          if (this.isAborted) {
            console.log(
              `[ClaudeAgent] Skipping message processing - agent ${this.agent.id} was aborted`
            )
            break
          }

          // Emit all messages through WebSocket if io is provided
          if (io && sessionId && !this.isAborted) {
            // ALWAYS use agent instance ID for consistent WebSocket routing
            // This eliminates timing issues with Claude session ID updates
            const effectiveSessionId = sessionId // sessionId = agent instance ID

            // Emit different message types appropriately
            if (message.type === 'user' || message.type === 'assistant') {
              // Pass content as-is - let frontend handle rendering
              const content = message.message?.content || ''

              console.log(`[WebSocket] Emitting message:new with sessionId: ${effectiveSessionId}`)
              await eventSystem.emitNewMessage(effectiveSessionId, {
                role: message.type,
                content: content,
                timestamp: new Date().toISOString(),
                isMeta: false, // SDK messages don't have isMeta property
                isStreaming: true, // Indicate this is a streaming message
                ...(message.type === 'assistant' && {
                  model: message.message?.model,
                  usage: message.message?.usage,
                }),
              })
            }

            // Note: There is no 'error' type in SDKMessage union
            // Errors are handled via result messages with error subtypes
          }

          // Extract text from assistant messages
          if (message.type === 'assistant' && message.message?.content && !this.isAborted) {
            for (const content of message.message.content) {
              if (content.type === 'text') {
                resultText += content.text
              }
            }

            // Emit token usage update if available
            if (message.message?.usage) {
              const totalTokens =
                (message.message.usage.input_tokens || 0) +
                (message.message.usage.output_tokens || 0)
              await eventSystem.emitTokenUsage(
                this.agent.id,
                totalTokens,
                this.config?.maxTokens || 200000
              )
            }
          }

          // Extract sessionId from message to track checkpoints
          const messageSessionId = 'session_id' in message ? message.session_id : undefined
          if (messageSessionId && messageSessionId !== this.sessionId) {
            console.log('📍 Session checkpoint update:', {
              from: this.sessionId,
              to: messageSessionId,
              messageType: message.type,
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
      } catch (error) {
        // Check if this is an abort error from the for-await loop
        const abortInfo = detectAbortError(error)
        if (this.isAborted || abortInfo.isAbort) {
          console.log(`[ClaudeAgent] Query loop was aborted for agent ${this.agent.id}`)
          console.log(`[ClaudeAgent] Last known sessionId: ${this.sessionId}`)
          // Create a proper AbortError with sessionId for recovery
          throw new AbortError('Query was aborted by user', this.sessionId, abortInfo.type)
        }
        throw error
      }

      // Check if aborted before throwing errors
      if (this.isAborted) {
        console.log(`[ClaudeAgent] Query was aborted, not processing errors`)
        throw new Error('Query was aborted by user')
      }

      // Throw error if we encountered one during processing
      if (hasError) {
        throw new Error(`Claude Code error: ${errorMessage}`)
      }

      console.log('Final response:', resultText)
      console.log('Session ID after query:', this.sessionId)

      this.agent.status = 'online'

      // Emit status update via EventSystem
      console.log(`[ClaudeAgent] Emitting status change to online for agent ${this.agent.id}`)
      await eventSystem.emitAgentStatus(this.agent.id, 'online')

      // Clear abort controller after completion
      this.abortController = undefined
      console.log(
        `[ClaudeAgent] Cleared AbortController for agent ${this.agent.id} after successful completion`
      )

      // Session ID is already updated in the result handler above

      return resultText
    } catch (error) {
      this.agent.status = 'online'

      // Emit status update via EventSystem
      console.log(`[ClaudeAgent] Emitting status change to online for agent ${this.agent.id}`)
      await eventSystem.emitAgentStatus(this.agent.id, 'online')

      // Clear abort controller after error
      this.abortController = undefined
      console.log(`[ClaudeAgent] Cleared AbortController for agent ${this.agent.id} after error`)

      console.error('Error in Claude query:', error)

      // Check if this is an abort error using centralized detection
      const abortInfo = detectAbortError(error)
      if (abortInfo.isAbort) {
        console.log(
          `[ClaudeAgent] Query was aborted for agent ${this.agent.id} - type: ${abortInfo.type}`
        )
        console.log(`[ClaudeAgent] Preserving sessionId for resume: ${this.sessionId}`)
        // Re-throw as AbortError to preserve sessionId
        if (error instanceof AbortError) {
          throw error // Already has sessionId
        }
        throw new AbortError(abortInfo.message, this.sessionId, abortInfo.type)
      }

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
    console.log(`[ClaudeAgent] Abort called for agent ${this.agent.id}`)
    this.isAborted = true // Set abort flag immediately

    if (this.abortController) {
      console.log(`[ClaudeAgent] AbortController exists, calling abort()`)
      this.abortController.abort()
      console.log(`[ClaudeAgent] Abort signal sent`)
    } else {
      console.log(
        `[ClaudeAgent] No AbortController found - agent might not be processing a message`
      )
    }
  }

  getInfo() {
    return this.agent
  }

  /**
   * Get tool restrictions for Claude SDK based on agent permissions
   */
  private getToolRestrictions(type: 'allowed' | 'disallowed'): string[] | undefined {
    if (!this.config?.tools || !Array.isArray(this.config.tools)) {
      console.log(`[TOOLS DEBUG] No tools configured for agent ${this.agent.id}`)
      return undefined
    }

    console.log(
      `[TOOLS DEBUG] Processing ${type} tools for agent ${this.agent.id}:`,
      this.config.tools
    )
    const restrictions: string[] = []

    for (const tool of this.config.tools) {
      // Handle both string format and ToolPermission object format
      if (typeof tool === 'string') {
        // Legacy string format - if we have restrictions, treat as allowed list
        if (type === 'allowed') {
          restrictions.push(tool)
        }
      } else if (this.isToolPermission(tool)) {
        // ToolPermission object format
        if (type === 'allowed' && tool.enabled) {
          restrictions.push(tool.name)
        } else if (type === 'disallowed' && !tool.enabled) {
          restrictions.push(tool.name)
        }
      }
    }

    console.log(`[TOOLS DEBUG] ${type} restrictions for agent ${this.agent.id}:`, restrictions)
    return restrictions.length > 0 ? restrictions : undefined
  }

  /**
   * Type guard to check if an object is a ToolPermission
   */
  private isToolPermission(tool: unknown): tool is ToolPermission {
    return (
      typeof tool === 'object' &&
      tool !== null &&
      'name' in tool &&
      'enabled' in tool &&
      typeof (tool as Record<string, unknown>).name === 'string' &&
      typeof (tool as Record<string, unknown>).enabled === 'boolean'
    )
  }
}
