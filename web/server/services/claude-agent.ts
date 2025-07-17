// Local Claude Agent implementation using Claude Code SDK
// KISS: Basic agent that can respond to messages

import {
  query,
  type SDKMessage,
  type SDKAssistantMessage,
  type Options,
} from '@anthropic-ai/claude-code'

// Extend Options type to include MCP configuration that's missing from SDK types
interface ExtendedOptions extends Options {
  mcpServers?: Record<string, MCPServerConfig>
}
import type { Server } from 'socket.io'
import { detectAbortError, AbortError } from '../utils/errorUtils'
import { eventSystem } from './EventSystem'
import { SessionService } from './SessionService'
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

export interface MCPServerConfig {
  command: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
}

export interface AgentConfig {
  systemPrompt?: string
  tools?: string[] | ToolPermission[]
  model?: string
  temperature?: number
  maxTokens?: number
  maxTurns?: number
  verbose?: boolean
  mcpServers?: Record<string, MCPServerConfig>
}

export class ClaudeAgent {
  private agent: Agent
  private abortController?: AbortController
  private isAborted: boolean = false
  private onSessionUpdate?: (sessionId: string) => void
  private config?: AgentConfig
  private projectPath?: string
  private projectId?: string

  constructor(
    id: string,
    role: Role,
    projectPath: string,
    projectId: string,
    configOverrides?: AgentConfig
  ) {
    this.agent = {
      id,
      role,
      status: 'online',
      sessionId: null, // Never store session in agent
    }
    // Store configuration
    this.config = configOverrides
    // Store project path for cwd
    this.projectPath = projectPath
    // Store project ID for session lookups
    this.projectId = projectId
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

      // Get current session from SessionService (single source of truth)
      const sessionService = SessionService.getInstance()
      let currentSessionId: string | null = null

      if (!forceNewSession && this.projectId) {
        currentSessionId = await sessionService.getSession(this.projectId, this.agent.id)
        console.log(`[ClaudeAgent] Retrieved session from SessionService: ${currentSessionId}`)
      } else if (forceNewSession && this.projectId) {
        console.log('Forcing new session - clearing session in SessionService')
        await sessionService.clearSession(this.projectId, this.agent.id)
      }

      // Emit status update via EventSystem
      console.log(`[ClaudeAgent] Emitting status change to busy for agent ${this.agent.id}`)
      await eventSystem.emitAgentStatus(this.agent.id, 'busy')

      console.log('Sending message to Claude SDK:', content)
      console.log('Project path:', projectPath)
      console.log('Current sessionId from SessionService:', currentSessionId)
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

      // Prefer passed parameter over stored project path (parameter is more up-to-date)
      const effectiveProjectPath = projectPath || this.projectPath

      // Expand tilde in project path if present
      const expandedProjectPath = effectiveProjectPath?.startsWith('~/')
        ? path.join(os.homedir(), effectiveProjectPath.slice(2))
        : effectiveProjectPath

      console.log('[ClaudeAgent] Project path resolution:', {
        storedProjectPath: this.projectPath,
        paramProjectPath: projectPath,
        effectiveProjectPath,
        expandedProjectPath,
      })

      if (!expandedProjectPath) {
        const errorMsg =
          'Project path is required but not provided. Cannot determine working directory for Claude SDK.'
        console.error('[ClaudeAgent] ERROR:', errorMsg)
        throw new Error(errorMsg)
      }

      // Get tool restrictions (async)
      const allowedTools = await this.getToolRestrictions('allowed')
      const disallowedTools = await this.getToolRestrictions('disallowed')

      // Build query options from agent configuration
      const queryOptions: ExtendedOptions = {
        maxTurns: this.config?.maxTurns || 500, // Use configured maxTurns or default to 500
        cwd: expandedProjectPath, // MUST pass project path - no fallback!
        resume: currentSessionId || undefined, // Use session from SessionService
        allowedTools, // Pass allowed tools if any restrictions
        disallowedTools, // Pass disallowed tools if any restrictions
        model: this.mapToValidModel(this.config?.model), // Use valid Claude Code model name
        customSystemPrompt: this.config?.systemPrompt, // Pass agent's system prompt
        mcpServers: this.config?.mcpServers, // Enable MCP server access for agents
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

          // CRITICAL: Check for session updates FIRST, before any WebSocket emissions
          // This prevents race condition between WebSocket and REST API
          const messageSessionId = 'session_id' in message ? message.session_id : undefined
          if (messageSessionId && messageSessionId !== currentSessionId) {
            console.log('📍 Session checkpoint update:', {
              from: currentSessionId,
              to: messageSessionId,
              messageType: message.type,
            })
            currentSessionId = messageSessionId

            // Update session in SessionService IMMEDIATELY (single source of truth)
            if (this.onSessionUpdate && messageSessionId) {
              await this.onSessionUpdate(messageSessionId)
              console.log('📍 SessionService updated with new session ID before WebSocket emission')
            }
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
              await eventSystem.emitNewMessage(
                effectiveSessionId,
                {
                  role: message.type,
                  content: content,
                  timestamp: new Date().toISOString(),
                  isMeta: false, // SDK messages don't have isMeta property
                  isStreaming: true, // Indicate this is a streaming message
                  ...(message.type === 'assistant' && {
                    model: message.message?.model,
                    usage: message.message?.usage,
                  }),
                },
                this.projectId
              )
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
          console.log(`[ClaudeAgent] Last known sessionId: ${currentSessionId}`)
          // Create a proper AbortError with sessionId for recovery
          throw new AbortError(
            'Query was aborted by user',
            currentSessionId || undefined,
            abortInfo.type
          )
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
      console.log('Session ID after query:', currentSessionId)

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
        // For abort errors, we need to get the latest session from SessionService
        const latestSessionId = this.projectId
          ? await SessionService.getInstance().getSession(this.projectId, this.agent.id)
          : null
        console.log(`[ClaudeAgent] Preserving sessionId for resume: ${latestSessionId}`)
        // Re-throw as AbortError to preserve sessionId
        if (error instanceof AbortError) {
          throw error // Already has sessionId
        }
        throw new AbortError(abortInfo.message, latestSessionId || undefined, abortInfo.type)
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
  private async getToolRestrictions(type: 'allowed' | 'disallowed'): Promise<string[] | undefined> {
    if (!this.config?.tools || !Array.isArray(this.config.tools)) {
      console.log(`[TOOLS DEBUG] No tools configured for agent ${this.agent.id}`)
      return undefined
    }

    console.log(
      `[TOOLS DEBUG] Processing ${type} tools for agent ${this.agent.id}:`,
      this.config.tools
    )

    // Get the correct tool names from ToolDiscoveryService (these have proper capitalization)
    const { ToolDiscoveryService } = await import('./ToolDiscoveryService')
    const toolDiscovery = ToolDiscoveryService.getInstance()
    const availableTools = await toolDiscovery.discoverTools()

    const restrictions: string[] = []

    for (const tool of this.config.tools) {
      let toolName: string
      let shouldInclude: boolean

      // Handle both string format and ToolPermission object format
      if (typeof tool === 'string') {
        toolName = tool
        // Legacy string format - if we have restrictions, treat as allowed list
        shouldInclude = type === 'allowed'
      } else if (this.isToolPermission(tool)) {
        toolName = tool.name
        // ToolPermission object format
        shouldInclude = type === 'allowed' ? tool.enabled : !tool.enabled
      } else {
        continue
      }

      if (shouldInclude) {
        // Find the correct tool name from discovered tools (case-insensitive match)
        const correctToolName = availableTools.find(
          (discoveredTool) => discoveredTool.toLowerCase() === toolName.toLowerCase()
        )

        if (correctToolName) {
          // Use the EXACT name from ToolDiscoveryService - no conversion!
          restrictions.push(correctToolName)
        } else {
          console.warn(
            `[TOOLS DEBUG] Tool ${toolName} not found in discovered tools:`,
            availableTools
          )
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

  /**
   * Get the current Claude session ID from SessionService
   */
  async getCurrentSessionId(): Promise<string | undefined> {
    if (!this.projectId) {
      return undefined
    }
    const sessionId = await SessionService.getInstance().getSession(this.projectId, this.agent.id)
    return sessionId || undefined
  }
}
