// Local Claude Agent implementation using Claude Code SDK
// KISS: Basic agent that can respond to messages

import { query, type SDKMessage, type Options } from '@anthropic-ai/claude-code'
import { spawn, type ChildProcess } from 'child_process'

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
  private abortedAt?: string // Timestamp when agent was aborted
  private abortReason?: string // Reason for abort
  private onSessionUpdate?: (sessionId: string) => void
  private config?: AgentConfig
  private projectPath?: string
  private projectId?: string
  private abortCheckInterval?: NodeJS.Timeout // Periodic abort signal checking
  private cliProcess?: ChildProcess // For CLI-based execution

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

  /**
   * CLI-based execution that replicates query() functionality
   * Uses claude CLI for better process control and abort handling
   */
  private async executeViaCLI(
    content: string,
    projectPath: string,
    sessionId?: string
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      // Build CLI arguments
      const args = ['-p', content]
      if (sessionId) {
        args.push('--resume', sessionId)
      }
      if (this.config?.model) {
        args.push('--model', this.mapToValidModel(this.config.model) || 'sonnet')
      }

      // Add maxTurns if configured
      if (this.config?.maxTurns) {
        args.push('--max-turns', this.config.maxTurns.toString())
      }

      // Add tool restrictions
      const allowedTools = await this.getToolRestrictions('allowed')
      const disallowedTools = await this.getToolRestrictions('disallowed')

      if (allowedTools && allowedTools.length > 0) {
        args.push('--allowedTools', ...allowedTools)
      }

      if (disallowedTools && disallowedTools.length > 0) {
        args.push('--disallowedTools', ...disallowedTools)
      }

      args.push('--output-format', 'stream-json')
      args.push('--input-format', 'stream-json')
      args.push('--verbose')

      // Spawn claude CLI process
      this.cliProcess = spawn('claude', args, {
        cwd: projectPath,
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      let output = ''
      let errorOutput = ''

      // Collect stdout
      this.cliProcess.stdout?.on('data', (data) => {
        output += data.toString()
      })

      // Collect stderr
      this.cliProcess.stderr?.on('data', (data) => {
        errorOutput += data.toString()
      })

      // Handle process completion
      this.cliProcess.on('close', (code) => {
        this.cliProcess = undefined

        if (code === 0) {
          resolve(output.trim())
        } else {
          reject(new Error(`Claude CLI failed with code ${code}: ${errorOutput}`))
        }
      })

      // Handle process errors
      this.cliProcess.on('error', (error) => {
        this.cliProcess = undefined
        reject(error)
      })
    })
  }

  async sendMessage(
    content: string,
    projectPath?: string,
    io?: Server,
    sessionId?: string,
    forceNewSession?: boolean,
    externalAbortController?: AbortController
  ): Promise<string> {
    try {
      // Pre-query abort checking
      if (this.isAgentAborted()) {
        throw new Error(`Agent ${this.agent.id} is aborted - cannot process new messages`)
      }

      this.agent.status = 'busy'

      // Get current session from SessionService
      const sessionService = SessionService.getInstance()
      let currentSessionId: string | null = null

      if (!forceNewSession && this.projectId) {
        currentSessionId = await sessionService.getSession(this.projectId, this.agent.id)
      } else if (forceNewSession && this.projectId) {
        await sessionService.clearSession(this.projectId, this.agent.id)
      }

      // Emit status update
      await eventSystem.emitAgentStatus(this.agent.id, 'busy')

      // Use external AbortController if provided, otherwise create new one
      this.abortController = externalAbortController || new AbortController()

      const messages: SDKMessage[] = []
      let resultText = ''
      let hasError = false
      let errorMessage = ''

      // Get effective project path
      const effectiveProjectPath = projectPath || this.projectPath

      // Expand tilde in project path if present
      const expandedProjectPath = effectiveProjectPath?.startsWith('~/')
        ? path.join(os.homedir(), effectiveProjectPath.slice(2))
        : effectiveProjectPath

      if (!expandedProjectPath) {
        throw new Error(
          'Project path is required but not provided. Cannot determine working directory for Claude execution.'
        )
      }

      // Use CLI execution as primary method
      try {
        const response = await this.executeViaCLI(
          content,
          expandedProjectPath,
          currentSessionId || undefined
        )

        // Emit final message via WebSocket if available
        if (io && sessionId) {
          await eventSystem.emitNewMessage(
            sessionId,
            {
              role: 'assistant',
              content: response,
              timestamp: new Date().toISOString(),
              isMeta: false,
              isStreaming: false,
            },
            this.projectId
          )
        }

        this.agent.status = 'online'
        await eventSystem.emitAgentStatus(this.agent.id, 'online')

        // Clear agent abort state on successful completion
        if (this.isAgentAborted()) {
          this.clearAborted()
        }

        return response
      } catch (error) {
        // If CLI fails, fallback to SDK execution
        console.warn('CLI execution failed, falling back to SDK:', error)
      }

      // Fallback to SDK execution
      // Get tool restrictions (async)
      const allowedTools = await this.getToolRestrictions('allowed')
      const disallowedTools = await this.getToolRestrictions('disallowed')

      // Build query options from agent configuration
      const queryOptions: ExtendedOptions = {
        maxTurns: this.config?.maxTurns || 500,
        cwd: expandedProjectPath,
        resume: currentSessionId || undefined,
        allowedTools,
        disallowedTools,
        model: this.mapToValidModel(this.config?.model),
        customSystemPrompt: this.config?.systemPrompt,
        mcpServers: this.config?.mcpServers,
      }

      // Query returns an async generator that yields messages
      // Add timeout fallback as recommended for v1.0.35+ abort issues
      const QUERY_TIMEOUT_MS = 300000 // 5 minutes max per query
      let timeoutId: NodeJS.Timeout | undefined

      try {
        // Create timeout controller for fallback termination
        timeoutId = setTimeout(() => {
          if (this.abortController && !this.abortController.signal.aborted) {
            this.abortController.abort()
          }
        }, QUERY_TIMEOUT_MS)

        for await (const message of query({
          prompt: content,
          abortController: this.abortController,
          options: queryOptions,
        })) {
          // Check agent abort state at start of each message processing
          if (this.isAgentAborted()) {
            break // Exit the message processing loop immediately
          }

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

          // Check AbortController signal directly
          if (this.abortController?.signal.aborted) {
            break
          }

          // CRITICAL: Check for session updates FIRST, before any WebSocket emissions
          // This prevents race condition between WebSocket and REST API
          const messageSessionId = 'session_id' in message ? message.session_id : undefined
          if (messageSessionId && messageSessionId !== currentSessionId) {
            currentSessionId = messageSessionId

            // Update session in SessionService IMMEDIATELY (single source of truth)
            if (this.onSessionUpdate && messageSessionId) {
              await this.onSessionUpdate(messageSessionId)
            }
          }

          // CRITICAL FIX: Emit all messages through WebSocket if io is provided and not aborted
          if (io && sessionId && !this.abortController?.signal.aborted) {
            // ALWAYS use agent instance ID for consistent WebSocket routing
            // This eliminates timing issues with Claude session ID updates
            const effectiveSessionId = sessionId // sessionId = agent instance ID

            // Emit different message types appropriately
            if (message.type === 'user' || message.type === 'assistant') {
              // Pass content as-is - let frontend handle rendering
              const content = message.message?.content || ''

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

          // CRITICAL FIX: Extract text from assistant messages only if not aborted
          if (
            message.type === 'assistant' &&
            message.message?.content &&
            !this.abortController?.signal.aborted
          ) {
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

        // Clear timeout on successful completion
        if (timeoutId) clearTimeout(timeoutId)
      } catch (error) {
        // Clear timeout on error
        if (timeoutId) clearTimeout(timeoutId)
        // CRITICAL FIX: Check AbortController signal first, then fallback to error detection
        const abortInfo = detectAbortError(error)
        const isAbortedByController = this.abortController?.signal.aborted

        if (isAbortedByController || abortInfo.isAbort) {
          throw new AbortError(
            'Query was aborted by user',
            currentSessionId || undefined,
            abortInfo.type
          )
        }
        throw error
      }

      // Check AbortController signal before throwing errors
      if (this.abortController?.signal.aborted) {
        throw new Error('Query was aborted by user')
      }

      // Throw error if we encountered one during processing
      if (hasError) {
        throw new Error(`Claude Code error: ${errorMessage}`)
      }

      this.agent.status = 'online'

      // Emit status update via EventSystem
      await eventSystem.emitAgentStatus(this.agent.id, 'online')

      // Clear agent abort state on successful completion
      if (this.isAgentAborted()) {
        this.clearAborted()
      }

      // Only clear abort controller if we created it (not external)
      if (!externalAbortController) {
        this.abortController = undefined
      }

      // Session ID is already updated in the result handler above

      return resultText
    } catch (error) {
      this.agent.status = 'online'

      // Emit status update via EventSystem
      await eventSystem.emitAgentStatus(this.agent.id, 'online')

      // Only clear abort controller if we created it (not external)
      if (!externalAbortController) {
        this.abortController = undefined
      }

      console.error('Error in Claude query:', error)

      // Check if this is an abort error using centralized detection
      const abortInfo = detectAbortError(error)
      if (abortInfo.isAbort) {
        // For abort errors, we need to get the latest session from SessionService
        const latestSessionId = this.projectId
          ? await SessionService.getInstance().getSession(this.projectId, this.agent.id)
          : null
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

  /**
   * Check if agent is in aborted state (persistent across sessions)
   */
  isAgentAborted(): boolean {
    return !!this.abortedAt
  }

  /**
   * Set agent to aborted state (persistent across sessions)
   */
  setAborted(reason: string = 'User requested abort'): void {
    this.abortedAt = new Date().toISOString()
    this.abortReason = reason
  }

  /**
   * Clear agent abort state (for workflow completion/reset)
   */
  clearAborted(): void {
    this.abortedAt = undefined
    this.abortReason = undefined
  }

  abort(): void {
    // Set persistent agent abort state
    this.setAborted('Workflow abort requested')

    // Kill CLI process if running
    if (this.cliProcess) {
      this.cliProcess.kill('SIGTERM')
      this.cliProcess = undefined
    }

    // Abort SDK controller if exists
    if (this.abortController) {
      this.abortController.abort()
    }

    // Enhanced abort signal checking
    this.enhanceAbortSignalChecking()

    // Set manual flag as backup
    this.isAborted = true
  }

  /**
   * Enhanced abort signal checking for responsive abort handling
   */
  private enhanceAbortSignalChecking(): void {
    // Clear any existing interval
    if (this.abortCheckInterval) {
      clearInterval(this.abortCheckInterval)
    }

    // Set up frequent abort signal checking (every 100ms)
    this.abortCheckInterval = setInterval(() => {
      if (this.abortController?.signal.aborted) {
        // Clear the interval since we're aborting
        if (this.abortCheckInterval) {
          clearInterval(this.abortCheckInterval)
          this.abortCheckInterval = undefined
        }
      }
    }, 100)

    // Auto-cleanup after 30 seconds to prevent memory leaks
    setTimeout(() => {
      if (this.abortCheckInterval) {
        clearInterval(this.abortCheckInterval)
        this.abortCheckInterval = undefined
      }
    }, 30000)
  }

  getInfo() {
    return this.agent
  }

  /**
   * Get tool restrictions for Claude SDK based on agent permissions
   */
  private async getToolRestrictions(type: 'allowed' | 'disallowed'): Promise<string[] | undefined> {
    if (!this.config?.tools || !Array.isArray(this.config.tools)) {
      // When no config, allow all tools (no restrictions) - this is the safe default
      return undefined
    }

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
        }
      }
    }

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
