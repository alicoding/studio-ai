/**
 * Tool Discovery Service
 *
 * SOLID: Single responsibility - Discovers available tools from Claude SDK
 * DRY: Centralizes tool discovery logic
 * KISS: Simple approach to get tools dynamically
 * Library-First: Uses Claude SDK directly
 */

import { query, type SDKMessage } from '@anthropic-ai/claude-code'
import { ToolPermission } from '../../../src/types/tool-permissions'

export class ToolDiscoveryService {
  private static instance: ToolDiscoveryService
  private discoveredTools: string[] = []
  private isDiscovered = false

  private constructor() {}

  static getInstance(): ToolDiscoveryService {
    if (!ToolDiscoveryService.instance) {
      ToolDiscoveryService.instance = new ToolDiscoveryService()
    }
    return ToolDiscoveryService.instance
  }

  /**
   * Discovers available tools from Claude SDK
   * Makes a quick query and aborts after getting the system message
   */
  async discoverTools(): Promise<string[]> {
    if (this.isDiscovered) {
      return this.discoveredTools
    }

    console.log('🔍 Discovering available tools from Claude SDK...')

    try {
      const abortController = new AbortController()

      // Start a query with minimal prompt
      const queryPromise = query({
        prompt: 'test',
        abortController,
        options: {
          maxTurns: 1,
          cwd: process.cwd(),
        },
      })

      // Process messages until we get the system message
      for await (const message of queryPromise) {
        if (message.type === 'system' && message.subtype === 'init') {
          // Extract tools from system message
          const systemMessage = message as SDKMessage & {
            tools?: string[]
          }

          if (systemMessage.tools && Array.isArray(systemMessage.tools)) {
            this.discoveredTools = systemMessage.tools
            this.isDiscovered = true
            console.log(`✅ Discovered ${this.discoveredTools.length} tools:`, this.discoveredTools)

            // Abort immediately after getting tools
            abortController.abort()
            break
          }
        }
      }
    } catch (error) {
      // Check if it's an abort error (expected)
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('✅ Tool discovery completed (aborted as expected)')
      } else {
        console.error('❌ Failed to discover tools:', error)
        // Fallback to hardcoded list if discovery fails
        this.discoveredTools = [
          'Task',
          'Bash',
          'Glob',
          'Grep',
          'LS',
          'exit_plan_mode',
          'Read',
          'Edit',
          'MultiEdit',
          'Write',
          'NotebookRead',
          'NotebookEdit',
          'WebFetch',
          'TodoRead',
          'TodoWrite',
          'WebSearch',
        ]
        this.isDiscovered = true
      }
    }

    return this.discoveredTools
  }

  /**
   * Get discovered tools (must call discoverTools first)
   */
  getTools(): string[] {
    if (!this.isDiscovered) {
      console.warn('⚠️ Tools not discovered yet, returning empty array')
      return []
    }
    return [...this.discoveredTools]
  }

  /**
   * Convert discovered tools to ToolPermission format
   */
  getToolPermissions(): ToolPermission[] {
    return this.discoveredTools.map((tool) => ({
      name: tool,
      enabled: true,
    }))
  }

  /**
   * Check if a tool is available
   */
  isToolAvailable(toolName: string): boolean {
    return this.discoveredTools.includes(toolName)
  }

  /**
   * Reset discovered tools (for testing)
   */
  reset(): void {
    this.discoveredTools = []
    this.isDiscovered = false
  }
}
