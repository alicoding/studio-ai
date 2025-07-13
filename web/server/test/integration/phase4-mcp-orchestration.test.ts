/**
 * Phase 4: MCP Orchestration Integration Tests
 * 
 * Tests MCP server integration with orchestration features.
 * These tests verify that the MCP tool properly supports:
 * - Wait mode for mentions
 * - Batch operations
 * - Cross-project routing
 * - Proper response formatting
 */

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest'
import { handleToolCall, type ToolCallArgs } from '../../mcp/studio-ai/src/server'

// Mock fetch for testing
const mockFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof fetch

describe('Phase 4: MCP Orchestration Integration', () => {
  beforeAll(() => {
    console.log(`
========================================
Phase 4: MCP Orchestration Tests
Testing MCP integration with orchestration
========================================
    `)
  })

  afterEach(() => {
    mockFetch.mockReset()
  })

  describe('1. Mention with Wait Mode', () => {
    it('should handle mention without wait mode', async () => {
      // Mock successful mention response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Mention routed successfully',
          targets: ['agent-1'],
          wait: false
        })
      })

      const args: ToolCallArgs = {
        type: 'mention',
        input: '@agent-1 Please review this code',
        context: {
          projectId: 'test-project',
          metadata: { agentId: 'test-mcp' }
        }
      }

      const result = await handleToolCall(args)
      
      expect(result.type).toBe('text')
      expect(result.text).toContain('Message sent to @agent-1')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/messages/mention'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"wait":false')
        })
      )
    })

    it('should handle mention with wait mode and responses', async () => {
      // Mock successful mention response with wait mode
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Mention processed with responses',
          targets: ['agent-1', 'agent-2'],
          wait: true,
          responses: {
            'agent-1': { content: 'Code looks good!', sessionId: 'sess-1' },
            'agent-2': { content: 'Found an issue on line 42', sessionId: 'sess-2' }
          }
        })
      })

      const args: ToolCallArgs = {
        type: 'mention',
        input: '@agent-1 @agent-2 Review this PR',
        wait: true,
        timeout: 30000,
        context: {
          projectId: 'test-project'
        }
      }

      const result = await handleToolCall(args)
      
      expect(result.type).toBe('text')
      expect(result.text).toContain('Responses received:')
      expect(result.text).toContain('**@agent-1**:')
      expect(result.text).toContain('**@agent-2**:')
      expect(result.text).toContain('Code looks good!')
      expect(result.text).toContain('Found an issue')
    })

    it('should handle cross-project mention', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Cross-project mention routed',
          projectId: 'source-project',
          targets: ['remote-agent']
        })
      })

      const args: ToolCallArgs = {
        type: 'mention',
        input: '@remote-agent Check dependencies',
        context: {
          projectId: 'source-project',
          targetProjectId: 'target-project',
          metadata: { agentId: 'mcp-client' }
        }
      }

      const result = await handleToolCall(args)
      
      expect(result.type).toBe('text')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"targetProjectId":"target-project"')
        })
      )
    })
  })

  describe('2. Batch Operations', () => {
    it('should handle batch operation with all strategy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          batchId: 'batch-123',
          waitStrategy: 'all',
          results: {
            'msg1': {
              id: 'msg1',
              status: 'success',
              response: { content: 'Task 1 completed' },
              duration: 1500
            },
            'msg2': {
              id: 'msg2',
              status: 'success',
              response: { content: 'Task 2 completed' },
              duration: 2000
            }
          },
          summary: {
            total: 2,
            successful: 2,
            failed: 0,
            timedOut: 0,
            duration: 2000
          }
        })
      })

      const args: ToolCallArgs = {
        type: 'batch',
        input: 'Execute batch tasks',
        messages: [
          {
            id: 'msg1',
            targetAgentId: 'agent-1',
            content: 'Task 1'
          },
          {
            id: 'msg2',
            targetAgentId: 'agent-2',
            content: 'Task 2'
          }
        ],
        waitStrategy: 'all',
        timeout: 30000,
        context: {
          projectId: 'test-project'
        }
      }

      const result = await handleToolCall(args)
      
      expect(result.type).toBe('text')
      expect(result.text).toContain('Batch operation completed')
      expect(result.text).toContain('Summary:')
      expect(result.text).toContain('Total: 2')
      expect(result.text).toContain('Successful: 2')
      expect(result.text).toContain('Results:')
      expect(result.text).toContain('msg1 (success)')
      expect(result.text).toContain('msg2 (success)')
    })

    it('should handle batch with dependencies', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          batchId: 'batch-456',
          results: {
            'setup': { id: 'setup', status: 'success', duration: 1000 },
            'process': { id: 'process', status: 'success', duration: 2000 }
          },
          summary: {
            total: 2,
            successful: 2,
            failed: 0,
            timedOut: 0,
            duration: 3000
          }
        })
      })

      const args: ToolCallArgs = {
        type: 'batch',
        input: 'Run dependent tasks',
        messages: [
          {
            id: 'setup',
            targetAgentId: 'setup-agent',
            content: 'Initialize'
          },
          {
            id: 'process',
            targetAgentId: 'process-agent',
            content: 'Process data',
            dependencies: ['setup']
          }
        ],
        waitStrategy: 'all',
        context: {
          projectId: 'test-project'
        }
      }

      const result = await handleToolCall(args)
      
      expect(result.type).toBe('text')
      expect(result.text).toContain('Duration: 3000ms')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/messages/batch'),
        expect.objectContaining({
          body: expect.stringContaining('"dependencies":["setup"]')
        })
      )
    })

    it('should handle batch with cross-project messages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          batchId: 'batch-789',
          results: {
            'local': { id: 'local', status: 'success', duration: 1000 },
            'remote': { id: 'remote', status: 'success', duration: 1500 }
          },
          summary: {
            total: 2,
            successful: 2,
            failed: 0,
            timedOut: 0,
            duration: 1500
          }
        })
      })

      const args: ToolCallArgs = {
        type: 'batch',
        input: 'Cross-project batch',
        messages: [
          {
            id: 'local',
            targetAgentId: 'local-agent',
            content: 'Local task'
          },
          {
            id: 'remote',
            targetAgentId: 'remote-agent',
            content: 'Remote task',
            projectId: 'other-project'
          }
        ],
        context: {
          projectId: 'main-project'
        }
      }

      const result = await handleToolCall(args)
      
      expect(result.type).toBe('text')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"projectId":"other-project"')
        })
      )
    })
  })

  describe('3. Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Internal server error'
      })

      const args: ToolCallArgs = {
        type: 'mention',
        input: '@agent-1 Test error',
        context: {
          projectId: 'test-project'
        }
      }

      const result = await handleToolCall(args)
      
      expect(result.type).toBe('text')
      expect(result.text).toContain('Error:')
      expect(result.text).toContain('Mention failed')
    })

    it('should validate batch requires messages', async () => {
      const args: ToolCallArgs = {
        type: 'batch',
        input: 'Empty batch',
        messages: [], // Empty messages array
        context: {
          projectId: 'test-project'
        }
      }

      const result = await handleToolCall(args)
      
      expect(result.type).toBe('text')
      expect(result.text).toContain('Error:')
      expect(result.text).toContain('requires messages array')
    })

    it('should handle timeout errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Mention processed with responses',
          wait: true,
          responses: {},
          errors: {
            'agent-1': 'Operation timed out after 1000ms'
          }
        })
      })

      const args: ToolCallArgs = {
        type: 'mention',
        input: '@agent-1 Quick test',
        wait: true,
        timeout: 1000,
        context: {
          projectId: 'test-project'
        }
      }

      const result = await handleToolCall(args)
      
      expect(result.type).toBe('text')
      // Should still return a response, even if empty due to timeout
      expect(result.text).toBeDefined()
    })
  })

  describe('4. Command and Chat Operations', () => {
    it('should pass through command operations unchanged', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: 'Research results...',
          metadata: {
            capabilityId: 'research',
            model: 'perplexity-sonar'
          }
        })
      })

      const args: ToolCallArgs = {
        type: 'command',
        capability: 'research',
        input: 'Latest TypeScript features',
        context: {
          projectId: 'test-project'
        }
      }

      const result = await handleToolCall(args)
      
      expect(result.type).toBe('text')
      expect(result.text).toContain('Research results')
      expect(result.text).toContain('Model Info:')
      expect(result.text).toContain('perplexity-sonar')
    })

    it('should maintain backward compatibility for chat', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: 'Chat response',
          metadata: {
            model: 'gpt-4'
          }
        })
      })

      const args: ToolCallArgs = {
        type: 'chat',
        input: 'Hello, how are you?',
        context: {
          projectId: 'test-project'
        }
      }

      const result = await handleToolCall(args)
      
      expect(result.type).toBe('text')
      expect(result.text).toContain('Chat response')
    })
  })
})