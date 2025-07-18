/**
 * Test for Claude Agent MCP Server Configuration
 *
 * SOLID: Single responsibility - Test MCP server configuration passing
 * DRY: Reuse test utilities and mock patterns
 * KISS: Simple, focused tests for MCP configuration
 * Library-First: Uses Vitest testing framework
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ClaudeAgent, type AgentConfig } from '../claude-agent'
import type { McpServerConfig } from '@anthropic-ai/claude-code'

// Mock the ToolDiscoveryService
vi.mock('../ToolDiscoveryService', () => ({
  ToolDiscoveryService: {
    getInstance: vi.fn(),
  },
}))

// Mock Claude Code SDK
vi.mock('@anthropic-ai/claude-code', () => ({
  query: vi.fn(),
}))

// Mock EventSystem
vi.mock('../EventSystem', () => ({
  eventSystem: {
    emitAgentStatus: vi.fn(),
  },
}))

interface MockToolDiscoveryService {
  discoverTools: ReturnType<typeof vi.fn<() => Promise<string[]>>>
}

describe('ClaudeAgent MCP Server Configuration', () => {
  let agent: ClaudeAgent
  let mockToolDiscovery: MockToolDiscoveryService

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks()

    // Mock ToolDiscoveryService instance
    mockToolDiscovery = {
      discoverTools: vi.fn(),
    }

    const { ToolDiscoveryService } = await import('../ToolDiscoveryService')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(ToolDiscoveryService.getInstance).mockReturnValue(mockToolDiscovery as any)

    // Mock discovered tools
    mockToolDiscovery.discoverTools.mockResolvedValue(['Task', 'Bash', 'Read', 'Write'])
  })

  describe('MCP Server Configuration Passing', () => {
    it('should pass mcpServers configuration to Claude SDK query options', async () => {
      const mcpServers: Record<string, McpServerConfig> = {
        'database-server': {
          type: 'stdio',
          command: 'mcp-server-sqlite',
          args: ['--db', '/path/to/db.sqlite'],
          env: { DEBUG: 'true' },
        },
        'api-server': {
          type: 'stdio',
          command: 'mcp-server-api',
          args: ['--port', '3000'],
        },
      }

      const config: AgentConfig = {
        systemPrompt: 'Test system prompt',
        tools: [{ name: 'read', enabled: true }],
        model: 'claude-3-opus',
        mcpServers, // This field should be supported
      }

      agent = new ClaudeAgent('test-agent', 'dev', null, config)

      // Mock the query method to capture the options
      const mockQuery = vi.mocked((await import('@anthropic-ai/claude-code')).query)
      mockQuery.mockImplementation(
        vi.fn(async function* () {
          yield {
            type: 'result' as const,
            subtype: 'success' as const,
            duration_ms: 100,
            duration_api_ms: 50,
            is_error: false,
            num_turns: 1,
            result: 'test response',
            session_id: 'test-session',
            total_cost_usd: 0.01,
            usage: {
              input_tokens: 10,
              output_tokens: 5,
              cache_creation_input_tokens: 0,
              cache_read_input_tokens: 0,
              server_tool_use: {
                web_search_requests: 0,
              },
              service_tier: 'standard' as const,
            },
          }
        })
      )

      try {
        await agent.sendMessage('test message', '/test/path')
      } catch (_error) {
        // Expected to fail due to mocking, but we can check the call
      }

      // Verify that mcpServers was passed to the SDK
      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            mcpServers, // This should be included in the options
            customSystemPrompt: 'Test system prompt',
            allowedTools: ['Read'],
          }),
        })
      )
    })

    it('should handle empty MCP server configuration', async () => {
      const config: AgentConfig = {
        tools: [],
        mcpServers: {}, // Empty MCP servers
      }

      agent = new ClaudeAgent('test-agent', 'dev', null, config)

      const mockQuery = vi.mocked((await import('@anthropic-ai/claude-code')).query)
      mockQuery.mockImplementation(
        vi.fn(async function* () {
          yield {
            type: 'result' as const,
            subtype: 'success' as const,
            duration_ms: 100,
            duration_api_ms: 50,
            is_error: false,
            num_turns: 1,
            result: 'test response',
            session_id: 'test-session',
            total_cost_usd: 0.01,
            usage: {
              input_tokens: 10,
              output_tokens: 5,
              cache_creation_input_tokens: 0,
              cache_read_input_tokens: 0,
              server_tool_use: {
                web_search_requests: 0,
              },
              service_tier: 'standard' as const,
            },
          }
        })
      )

      try {
        await agent.sendMessage('test message', '/test/path')
      } catch (_error) {
        // Expected to fail due to mocking
      }

      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            mcpServers: {}, // Empty object should be passed
          }),
        })
      )
    })

    it('should pass MCP servers with various configuration types', async () => {
      const mcpServers: Record<string, McpServerConfig> = {
        'stdio-server': {
          type: 'stdio',
          command: 'mcp-stdio-server',
          args: ['--verbose'],
        },
        'sse-server': {
          type: 'sse',
          url: 'https://api.example.com/mcp/sse',
          headers: { Authorization: 'Bearer token123' },
        },
        'http-server': {
          type: 'http',
          url: 'https://api.example.com/mcp/http',
          headers: { 'X-API-Key': 'key123' },
        },
      }

      const config: AgentConfig = {
        mcpServers,
      }

      agent = new ClaudeAgent('test-agent', 'dev', null, config)

      const mockQuery = vi.mocked((await import('@anthropic-ai/claude-code')).query)
      mockQuery.mockImplementation(
        vi.fn(async function* () {
          yield {
            type: 'result' as const,
            subtype: 'success' as const,
            duration_ms: 100,
            duration_api_ms: 50,
            is_error: false,
            num_turns: 1,
            result: 'test response',
            session_id: 'test-session',
            total_cost_usd: 0.01,
            usage: {
              input_tokens: 10,
              output_tokens: 5,
              cache_creation_input_tokens: 0,
              cache_read_input_tokens: 0,
              server_tool_use: {
                web_search_requests: 0,
              },
              service_tier: 'standard' as const,
            },
          }
        })
      )

      try {
        await agent.sendMessage('test message', '/test/path')
      } catch (_error) {
        // Expected to fail due to mocking
      }

      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            mcpServers, // All MCP server types should be passed
          }),
        })
      )
    })

    it('should not include mcpServers when not configured', async () => {
      const config: AgentConfig = {
        systemPrompt: 'Test system prompt',
        tools: [{ name: 'read', enabled: true }],
      }
      // Note: No mcpServers field

      agent = new ClaudeAgent('test-agent', 'dev', null, config)

      const mockQuery = vi.mocked((await import('@anthropic-ai/claude-code')).query)
      mockQuery.mockImplementation(
        vi.fn(async function* () {
          yield {
            type: 'result' as const,
            subtype: 'success' as const,
            duration_ms: 100,
            duration_api_ms: 50,
            is_error: false,
            num_turns: 1,
            result: 'test response',
            session_id: 'test-session',
            total_cost_usd: 0.01,
            usage: {
              input_tokens: 10,
              output_tokens: 5,
              cache_creation_input_tokens: 0,
              cache_read_input_tokens: 0,
              server_tool_use: {
                web_search_requests: 0,
              },
              service_tier: 'standard' as const,
            },
          }
        })
      )

      try {
        await agent.sendMessage('test message', '/test/path')
      } catch (_error) {
        // Expected to fail due to mocking
      }

      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.not.objectContaining({
            mcpServers: expect.anything(), // Should not include mcpServers
          }),
        })
      )
    })
  })

  describe('AgentConfig Interface', () => {
    it('should accept mcpServers in AgentConfig type', () => {
      // This test verifies that the TypeScript interface includes mcpServers
      const config: AgentConfig = {
        systemPrompt: 'Test',
        tools: [],
        model: 'claude-3-opus',
        temperature: 0.7,
        maxTokens: 200000,
        maxTurns: 100,
        verbose: true,
        mcpServers: {
          'test-server': {
            type: 'stdio',
            command: 'test-command',
          },
        },
      }

      // If this compiles without TypeScript errors, the interface includes mcpServers
      expect(config.mcpServers).toBeDefined()
      expect(config.mcpServers?.['test-server']).toEqual({
        type: 'stdio',
        command: 'test-command',
      })
    })
  })
})
