/**
 * Tool Discovery API Tests
 *
 * SOLID: Single responsibility - Testing tool discovery functionality
 * DRY: Reusable test utilities and mocks
 * KISS: Simple, focused test cases
 * Library-First: Uses vitest and existing patterns
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import { app } from '../../app'
import { ToolDiscoveryService } from '../../services/ToolDiscoveryService'
import type { SDKMessage, SDKSystemMessage } from '@anthropic-ai/claude-code'

// Mock Claude SDK
vi.mock('@anthropic-ai/claude-code', () => ({
  query: vi.fn(),
}))

// Mock the import to get the mocked query function
const mockClaudeCode = await import('@anthropic-ai/claude-code')
const mockQuery = vi.mocked(mockClaudeCode.query)

// Helper function to create proper SDKSystemMessage
function createMockSystemMessage(tools: string[]): SDKSystemMessage {
  return {
    type: 'system',
    subtype: 'init',
    apiKeySource: 'user',
    cwd: '/test',
    session_id: 'test-session',
    tools,
    mcp_servers: [],
    model: 'claude-3-opus',
    permissionMode: 'default',
  }
}

// Helper function to create mock async iterator
function createMockAsyncIterator(messages: SDKMessage[]): AsyncGenerator<SDKMessage> {
  return (async function* () {
    for (const message of messages) {
      yield message
    }
  })()
}

describe('Tool Discovery API', () => {
  let toolDiscoveryService: ToolDiscoveryService

  beforeEach(() => {
    toolDiscoveryService = ToolDiscoveryService.getInstance()
    toolDiscoveryService.reset() // Reset cache
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('ToolDiscoveryService', () => {
    it('should create singleton instance', () => {
      const service1 = ToolDiscoveryService.getInstance()
      const service2 = ToolDiscoveryService.getInstance()
      expect(service1).toBe(service2)
    })

    it('should discover tools from Claude SDK successfully', async () => {
      const mockTools = ['Read', 'Write', 'Bash', 'Grep', 'Glob']
      const mockMessage = createMockSystemMessage(mockTools)
      const mockAsyncIterator = createMockAsyncIterator([mockMessage])

      mockQuery.mockResolvedValueOnce(mockAsyncIterator)

      const discoveredTools = await toolDiscoveryService.discoverTools()

      expect(discoveredTools).toEqual(mockTools)
      expect(mockQuery).toHaveBeenCalledWith({
        prompt: 'test',
        abortController: expect.any(AbortController),
        options: {
          maxTurns: 1,
          cwd: process.cwd(),
        },
      })
    })

    it('should handle SDK query failure with fallback', async () => {
      const mockError = new Error('SDK query failed')
      mockQuery.mockRejectedValueOnce(mockError)

      const discoveredTools = await toolDiscoveryService.discoverTools()

      // Should return fallback tools
      expect(discoveredTools).toContain('Read')
      expect(discoveredTools).toContain('Write')
      expect(discoveredTools).toContain('Bash')
      expect(discoveredTools.length).toBeGreaterThan(0)
    })

    it('should handle AbortError correctly', async () => {
      const mockTools = ['Read', 'Write', 'Edit']
      const mockMessage = createMockSystemMessage(mockTools)

      const mockAsyncIterator = (async function* () {
        yield mockMessage
        // Simulate abort after getting tools
        throw new DOMException('Aborted', 'AbortError')
      })()

      mockQuery.mockResolvedValueOnce(mockAsyncIterator)

      const discoveredTools = await toolDiscoveryService.discoverTools()

      expect(discoveredTools).toEqual(mockTools)
    })

    it('should use cache on subsequent calls', async () => {
      const mockTools = ['Read', 'Write', 'Bash']
      const mockMessage = createMockSystemMessage(mockTools)
      const mockAsyncIterator = createMockAsyncIterator([mockMessage])

      mockQuery.mockResolvedValueOnce(mockAsyncIterator)

      // First call
      const firstResult = await toolDiscoveryService.discoverTools()
      expect(firstResult).toEqual(mockTools)
      expect(mockQuery).toHaveBeenCalledTimes(1)

      // Second call should use cache
      const secondResult = await toolDiscoveryService.discoverTools()
      expect(secondResult).toEqual(mockTools)
      expect(mockQuery).toHaveBeenCalledTimes(1) // Still only called once
    })

    it('should check tool availability correctly', async () => {
      const mockTools = ['Read', 'Write', 'Bash']
      const mockMessage = createMockSystemMessage(mockTools)
      const mockAsyncIterator = createMockAsyncIterator([mockMessage])

      mockQuery.mockResolvedValueOnce(mockAsyncIterator)

      await toolDiscoveryService.discoverTools()

      expect(toolDiscoveryService.isToolAvailable('Read')).toBe(true)
      expect(toolDiscoveryService.isToolAvailable('Write')).toBe(true)
      expect(toolDiscoveryService.isToolAvailable('NonExistent')).toBe(false)
    })

    it('should convert tools to ToolPermission format', async () => {
      const mockTools = ['Read', 'Write']
      const mockMessage = createMockSystemMessage(mockTools)
      const mockAsyncIterator = createMockAsyncIterator([mockMessage])

      mockQuery.mockResolvedValueOnce(mockAsyncIterator)

      await toolDiscoveryService.discoverTools()

      const permissions = toolDiscoveryService.getToolPermissions()
      expect(permissions).toEqual([
        { name: 'Read', enabled: true },
        { name: 'Write', enabled: true },
      ])
    })

    it('should handle empty tools array', async () => {
      const mockMessage = createMockSystemMessage([])
      const mockAsyncIterator = createMockAsyncIterator([mockMessage])

      mockQuery.mockResolvedValueOnce(mockAsyncIterator)

      const discoveredTools = await toolDiscoveryService.discoverTools()

      expect(discoveredTools).toEqual([])
    })

    it('should handle message without tools field', async () => {
      const mockMessage = createMockSystemMessage([])
      const mockAsyncIterator = createMockAsyncIterator([mockMessage])

      mockQuery.mockResolvedValueOnce(mockAsyncIterator)

      const discoveredTools = await toolDiscoveryService.discoverTools()

      // Should return empty array for empty tools
      expect(discoveredTools).toEqual([])
    })

    it('should return empty array when tools not discovered', () => {
      const freshService = ToolDiscoveryService.getInstance()
      freshService.reset()

      const tools = freshService.getTools()
      expect(tools).toEqual([])
    })
  })

  describe('GET /api/tools', () => {
    it('should return all available tools', async () => {
      const mockTools = ['Read', 'Write', 'Bash', 'Grep']
      const mockMessage = createMockSystemMessage(mockTools)
      const mockAsyncIterator = createMockAsyncIterator([mockMessage])

      mockQuery.mockResolvedValueOnce(mockAsyncIterator)

      // Trigger discovery
      await toolDiscoveryService.discoverTools()

      const response = await request(app).get('/api/tools').expect(200)

      expect(response.body).toEqual({
        tools: mockTools,
        toolPermissions: mockTools.map((tool) => ({ name: tool, enabled: true })),
        count: mockTools.length,
      })
    })

    it('should handle tool discovery failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Discovery failed'))

      const response = await request(app).get('/api/tools').expect(200)

      expect(response.body.tools).toBeDefined()
      expect(response.body.toolPermissions).toBeDefined()
      expect(response.body.count).toBeGreaterThan(0)
      expect(response.body.tools).toContain('Read')
    })

    it('should handle service initialization errors', async () => {
      // Mock service to throw error
      const originalGetInstance = ToolDiscoveryService.getInstance
      vi.spyOn(ToolDiscoveryService, 'getInstance').mockImplementationOnce(() => {
        throw new Error('Service initialization failed')
      })

      const response = await request(app).get('/api/tools').expect(500)

      expect(response.body.error).toBe('Failed to get tools')

      // Restore original
      ToolDiscoveryService.getInstance = originalGetInstance
    })
  })

  describe('GET /api/tools/permissions', () => {
    it('should return tools in ToolPermission format', async () => {
      const mockTools = ['Read', 'Write', 'Edit']
      const mockMessage = createMockSystemMessage(mockTools)
      const mockAsyncIterator = createMockAsyncIterator([mockMessage])

      mockQuery.mockResolvedValueOnce(mockAsyncIterator)

      await toolDiscoveryService.discoverTools()

      const response = await request(app).get('/api/tools/permissions').expect(200)

      expect(response.body).toEqual([
        { name: 'Read', enabled: true },
        { name: 'Write', enabled: true },
        { name: 'Edit', enabled: true },
      ])
    })

    it('should handle empty tools array', async () => {
      const mockMessage = createMockSystemMessage([])
      const mockAsyncIterator = createMockAsyncIterator([mockMessage])

      mockQuery.mockResolvedValueOnce(mockAsyncIterator)

      await toolDiscoveryService.discoverTools()

      const response = await request(app).get('/api/tools/permissions').expect(200)

      expect(response.body).toEqual([])
    })

    it('should handle service errors', async () => {
      const originalGetInstance = ToolDiscoveryService.getInstance
      vi.spyOn(ToolDiscoveryService, 'getInstance').mockImplementationOnce(() => {
        throw new Error('Service error')
      })

      const response = await request(app).get('/api/tools/permissions').expect(500)

      expect(response.body.error).toBe('Failed to get tool permissions')

      ToolDiscoveryService.getInstance = originalGetInstance
    })
  })

  describe('GET /api/tools/check/:toolName', () => {
    it('should check tool availability correctly', async () => {
      const mockTools = ['Read', 'Write', 'Bash']
      const mockMessage = createMockSystemMessage(mockTools)
      const mockAsyncIterator = createMockAsyncIterator([mockMessage])

      mockQuery.mockResolvedValueOnce(mockAsyncIterator)

      await toolDiscoveryService.discoverTools()

      // Check existing tool
      const response1 = await request(app).get('/api/tools/check/Read').expect(200)

      expect(response1.body).toEqual({
        tool: 'Read',
        available: true,
      })

      // Check non-existing tool
      const response2 = await request(app).get('/api/tools/check/NonExistent').expect(200)

      expect(response2.body).toEqual({
        tool: 'NonExistent',
        available: false,
      })
    })

    it('should handle URL encoded tool names', async () => {
      const mockTools = ['mcp__special-tool']
      const mockMessage = createMockSystemMessage(mockTools)
      const mockAsyncIterator = createMockAsyncIterator([mockMessage])

      mockQuery.mockResolvedValueOnce(mockAsyncIterator)

      await toolDiscoveryService.discoverTools()

      const response = await request(app).get('/api/tools/check/mcp__special-tool').expect(200)

      expect(response.body).toEqual({
        tool: 'mcp__special-tool',
        available: true,
      })
    })

    it('should handle service errors', async () => {
      const originalGetInstance = ToolDiscoveryService.getInstance
      vi.spyOn(ToolDiscoveryService, 'getInstance').mockImplementationOnce(() => {
        throw new Error('Service error')
      })

      const response = await request(app).get('/api/tools/check/Read').expect(500)

      expect(response.body.error).toBe('Failed to check tool availability')

      ToolDiscoveryService.getInstance = originalGetInstance
    })
  })

  describe('Caching Behavior', () => {
    it('should cache discovery results across API calls', async () => {
      const mockTools = ['Read', 'Write']
      const mockMessage = createMockSystemMessage(mockTools)
      const mockAsyncIterator = createMockAsyncIterator([mockMessage])

      mockQuery.mockResolvedValueOnce(mockAsyncIterator)

      // First API call
      await request(app).get('/api/tools').expect(200)

      expect(mockQuery).toHaveBeenCalledTimes(1)

      // Second API call should use cache
      await request(app).get('/api/tools').expect(200)

      expect(mockQuery).toHaveBeenCalledTimes(1) // Still only called once
    })

    it('should maintain cache consistency across different endpoints', async () => {
      const mockTools = ['Read', 'Write', 'Edit']
      const mockMessage = createMockSystemMessage(mockTools)
      const mockAsyncIterator = createMockAsyncIterator([mockMessage])

      mockQuery.mockResolvedValueOnce(mockAsyncIterator)

      // Call different endpoints
      const response1 = await request(app).get('/api/tools').expect(200)

      const response2 = await request(app).get('/api/tools/permissions').expect(200)

      const response3 = await request(app).get('/api/tools/check/Read').expect(200)

      // Should only call discovery once
      expect(mockQuery).toHaveBeenCalledTimes(1)

      // Results should be consistent
      expect(response1.body.tools).toEqual(mockTools)
      expect(response2.body.length).toBe(mockTools.length)
      expect(response3.body.available).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle multiple discovery failures gracefully', async () => {
      // Mock multiple failures
      mockQuery
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockRejectedValueOnce(new Error('Third failure'))

      // Multiple calls should all use fallback
      const response1 = await request(app).get('/api/tools').expect(200)

      const response2 = await request(app).get('/api/tools/permissions').expect(200)

      expect(response1.body.tools).toBeDefined()
      expect(response2.body).toBeDefined()
    })

    it('should handle malformed SDK messages', async () => {
      // Create a malformed message that still has the required fields
      const malformedMessage: SDKSystemMessage = {
        type: 'system',
        subtype: 'init',
        apiKeySource: 'user',
        cwd: '/test',
        session_id: 'test-session',
        tools: [] as string[], // Empty tools array
        mcp_servers: [],
        model: 'claude-3-opus',
        permissionMode: 'default',
      }

      const mockAsyncIterator = createMockAsyncIterator([malformedMessage])
      mockQuery.mockResolvedValueOnce(mockAsyncIterator)

      const response = await request(app).get('/api/tools').expect(200)

      // Should handle empty tools array
      expect(response.body.tools).toEqual([])
      expect(response.body.count).toBe(0)
    })
  })

  describe('Performance', () => {
    it('should handle concurrent requests efficiently', async () => {
      const mockTools = ['Read', 'Write', 'Bash']
      const mockMessage = createMockSystemMessage(mockTools)
      const mockAsyncIterator = createMockAsyncIterator([mockMessage])

      mockQuery.mockResolvedValueOnce(mockAsyncIterator)

      // Make multiple concurrent requests
      const requests = Array.from({ length: 10 }, () => request(app).get('/api/tools'))

      const responses = await Promise.all(requests)

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200)
        expect(response.body.tools).toEqual(mockTools)
      })

      // Should only call discovery once due to caching
      expect(mockQuery).toHaveBeenCalledTimes(1)
    })
  })
})
