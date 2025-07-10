/**
 * Test for Claude Agent Tool Configuration
 *
 * SOLID: Single responsibility - Test tool name mapping and permissions
 * DRY: Reuse test utilities and mock patterns
 * KISS: Simple, focused tests for tool configuration
 * Library-First: Uses Vitest testing framework
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ClaudeAgent, type AgentConfig } from '../claude-agent'

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

// Type for accessing private method in tests
type ToolRestrictionsMethod = (type: 'allowed' | 'disallowed') => Promise<string[] | undefined>

describe('ClaudeAgent Tool Configuration', () => {
  let agent: ClaudeAgent
  let mockToolDiscovery: MockToolDiscoveryService

  // Helper function to access private method for testing
  const getToolRestrictionsFromAgent = (claudeAgent: ClaudeAgent): ToolRestrictionsMethod => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (claudeAgent as any).getToolRestrictions.bind(claudeAgent)
  }

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

    // Mock discovered tools from Claude SDK (capitalized names)
    mockToolDiscovery.discoverTools.mockResolvedValue([
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
    ])
  })

  describe('Tool Name Mapping', () => {
    it('should map lowercase tool names to correct Claude SDK capitalized names', async () => {
      const config: AgentConfig = {
        tools: [
          { name: 'read', enabled: true },
          { name: 'write', enabled: true },
          { name: 'edit', enabled: true },
          { name: 'ls', enabled: true },
          { name: 'bash', enabled: true },
        ],
      }

      agent = new ClaudeAgent('test-agent', 'dev', null, config)

      const getToolRestrictions = getToolRestrictionsFromAgent(agent)
      const allowedTools = await getToolRestrictions('allowed')

      expect(mockToolDiscovery.discoverTools).toHaveBeenCalled()
      expect(allowedTools).toEqual(['Read', 'Write', 'Edit', 'LS', 'Bash'])
    })

    it('should handle disabled tools in disallowed list', async () => {
      const config: AgentConfig = {
        tools: [
          { name: 'read', enabled: true },
          { name: 'write', enabled: false },
          { name: 'bash', enabled: false },
        ],
      }

      agent = new ClaudeAgent('test-agent', 'dev', null, config)

      const getToolRestrictions = getToolRestrictionsFromAgent(agent)
      const disallowedTools = await getToolRestrictions('disallowed')

      expect(disallowedTools).toEqual(['Write', 'Bash'])
    })

    it('should handle legacy string format for tools', async () => {
      const config: AgentConfig = {
        tools: ['read', 'write', 'edit'],
      }

      agent = new ClaudeAgent('test-agent', 'dev', null, config)

      const getToolRestrictions = getToolRestrictionsFromAgent(agent)
      const allowedTools = await getToolRestrictions('allowed')

      expect(allowedTools).toEqual(['Read', 'Write', 'Edit'])
    })

    it('should return undefined when no tools configured', async () => {
      const config: AgentConfig = {
        tools: [],
      }

      agent = new ClaudeAgent('test-agent', 'dev', null, config)

      const getToolRestrictions = getToolRestrictionsFromAgent(agent)
      const allowedTools = await getToolRestrictions('allowed')

      expect(allowedTools).toBeUndefined()
    })

    it('should warn about unknown tools not found in discovered tools', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const config: AgentConfig = {
        tools: [
          { name: 'read', enabled: true },
          { name: 'unknown-tool', enabled: true },
        ],
      }

      agent = new ClaudeAgent('test-agent', 'dev', null, config)

      const getToolRestrictions = getToolRestrictionsFromAgent(agent)
      await getToolRestrictions('allowed')

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TOOLS DEBUG] Tool unknown-tool not found in discovered tools'),
        expect.any(Array)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Tool Permission Integration', () => {
    it('should properly format tools for Claude SDK query options', async () => {
      const config: AgentConfig = {
        systemPrompt: 'Test system prompt',
        tools: [
          { name: 'read', enabled: true },
          { name: 'write', enabled: true },
          { name: 'bash', enabled: false },
        ],
        model: 'claude-3-opus',
        maxTokens: 200000,
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

      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            allowedTools: ['Read', 'Write'],
            disallowedTools: ['Bash'],
            customSystemPrompt: 'Test system prompt',
          }),
        })
      )
    })

    it('should handle mixed enabled/disabled tools correctly', async () => {
      const config: AgentConfig = {
        tools: [
          { name: 'read', enabled: true },
          { name: 'write', enabled: false },
          { name: 'edit', enabled: true },
          { name: 'bash', enabled: false },
          { name: 'ls', enabled: true },
        ],
      }

      agent = new ClaudeAgent('test-agent', 'dev', null, config)

      const getToolRestrictions = getToolRestrictionsFromAgent(agent)
      const allowedTools = await getToolRestrictions('allowed')
      const disallowedTools = await getToolRestrictions('disallowed')

      expect(allowedTools).toEqual(['Read', 'Edit', 'LS'])
      expect(disallowedTools).toEqual(['Write', 'Bash'])
    })
  })

  describe('Error Handling', () => {
    it('should handle tool discovery service errors gracefully', async () => {
      mockToolDiscovery.discoverTools.mockRejectedValue(new Error('Discovery failed'))

      const config: AgentConfig = {
        tools: [{ name: 'read', enabled: true }],
      }

      agent = new ClaudeAgent('test-agent', 'dev', null, config)

      const getToolRestrictions = getToolRestrictionsFromAgent(agent)

      await expect(getToolRestrictions('allowed')).rejects.toThrow('Discovery failed')
    })

    it('should handle malformed tool configuration', async () => {
      // Create a config with mixed valid and invalid tool formats for testing
      const config = {
        tools: [
          { name: 'read', enabled: true },
          'invalid-tool-format', // This will be skipped by the validation logic
          { name: 'write', enabled: true },
        ],
      } as AgentConfig

      agent = new ClaudeAgent('test-agent', 'dev', null, config)

      const getToolRestrictions = getToolRestrictionsFromAgent(agent)
      const allowedTools = await getToolRestrictions('allowed')

      // Should skip invalid formats and process valid ones
      expect(allowedTools).toEqual(['Read', 'Write'])
    })
  })

  describe('Case Sensitivity', () => {
    it('should handle case-insensitive tool name matching', async () => {
      // Test with uppercase input that should match lowercase discovered tools
      mockToolDiscovery.discoverTools.mockResolvedValue(['Read', 'Write', 'LS'])

      const config: AgentConfig = {
        tools: [
          { name: 'READ', enabled: true },
          { name: 'Write', enabled: true },
          { name: 'ls', enabled: true },
        ],
      }

      agent = new ClaudeAgent('test-agent', 'dev', null, config)

      const getToolRestrictions = getToolRestrictionsFromAgent(agent)
      const allowedTools = await getToolRestrictions('allowed')

      expect(allowedTools).toEqual(['Read', 'Write', 'LS'])
    })
  })
})
