/**
 * Tests for Claude Agent interruption handling
 * 
 * SOLID: Single responsibility - test interruption behavior
 * KISS: Simple test cases for abort functionality
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { ClaudeAgent } from '../claude-agent'
import { Server } from 'socket.io'
import type { SDKMessage, SDKSystemMessage } from '@anthropic-ai/claude-code'

// Mock the query function from Claude SDK
jest.mock('@anthropic-ai/claude-code', () => ({
  query: jest.fn(),
}))

describe('ClaudeAgent Interruption Handling', () => {
  let agent: ClaudeAgent
  let mockIo: Server
  
  beforeEach(() => {
    // Create a fresh agent instance
    agent = new ClaudeAgent('test-agent-1', 'dev')
    
    // Mock Socket.io server
    mockIo = {
      emit: jest.fn(),
    } as unknown as Server
  })
  
  describe('abort() method', () => {
    it('should set isAborted flag when abort is called', () => {
      agent.abort()
      expect(agent['isAborted']).toBe(true)
    })
    
    it('should call abort on the AbortController if one exists', () => {
      // Create a mock AbortController
      const mockAbort = jest.fn()
      const mockAbortController = {
        abort: mockAbort,
        signal: {} as AbortSignal,
      }
      
      // Set the mock controller on the agent
      agent['abortController'] = mockAbortController as AbortController
      
      // Call abort
      agent.abort()
      
      // Verify abort was called
      expect(mockAbort).toHaveBeenCalled()
      expect(agent['isAborted']).toBe(true)
    })
    
    it('should handle abort when no AbortController exists', () => {
      // Ensure no controller is set
      agent['abortController'] = undefined
      
      // Call abort - should not throw
      expect(() => agent.abort()).not.toThrow()
      expect(agent['isAborted']).toBe(true)
    })
  })
  
  describe('sendMessage() with abort', () => {
    it('should throw "Query was aborted by user" when aborted', async () => {
      // Mock the query function to simulate an abort
      const { query } = await import('@anthropic-ai/claude-code')
      const mockQuery = query as jest.MockedFunction<typeof query>
      
      mockQuery.mockImplementation(async function* (): AsyncGenerator<SDKMessage> {
        // Simulate some messages before abort
        yield {
          type: 'system',
          subtype: 'init',
          apiKeySource: 'user',
          cwd: '/test',
          session_id: 'test-session',
          tools: [],
          mcp_servers: [],
          model: 'claude-3-sonnet',
          permissionMode: 'default',
        } as SDKSystemMessage
        
        // Throw abort error
        throw new Error('Claude Code process exited with code 143')
      })
      
      // Start a message
      const messagePromise = agent.sendMessage('test message', '/test', mockIo, 'test-session')
      
      // Abort the agent
      agent.abort()
      
      // Expect the promise to reject with abort message
      await expect(messagePromise).rejects.toThrow('Query was aborted by user')
    })
    
    it('should handle process exit code 143 as abort', async () => {
      // Mock the query function to throw exit code 143
      const { query } = await import('@anthropic-ai/claude-code')
      const mockQuery = query as jest.MockedFunction<typeof query>
      
      mockQuery.mockImplementation(async function* (): AsyncGenerator<SDKMessage> {
        throw new Error('Claude Code process exited with code 143')
      })
      
      // Try to send a message
      await expect(agent.sendMessage('test', '/test', mockIo, 'test-session'))
        .rejects.toThrow('Query was aborted by user')
    })
    
    it('should emit status change to online after abort', async () => {
      // Mock the query function
      const { query } = await import('@anthropic-ai/claude-code')
      const mockQuery = query as jest.MockedFunction<typeof query>
      
      mockQuery.mockImplementation(async function* (): AsyncGenerator<SDKMessage> {
        throw new Error('Query was aborted by user')
      })
      
      // Try to send a message
      try {
        await agent.sendMessage('test', '/test', mockIo, 'test-session')
      } catch (_error) {
        // Expected to throw
      }
      
      // Verify status was changed back to online
      expect(mockIo.emit).toHaveBeenCalledWith('agent:status-changed', {
        agentId: 'test-agent-1',
        status: 'online',
      })
    })
    
    it('should clear AbortController after abort', async () => {
      // Mock the query function
      const { query } = await import('@anthropic-ai/claude-code')
      const mockQuery = query as jest.MockedFunction<typeof query>
      
      mockQuery.mockImplementation(async function* (): AsyncGenerator<SDKMessage> {
        // Check that abort controller exists during query
        expect(agent['abortController']).toBeDefined()
        throw new Error('Query was aborted by user')
      })
      
      // Try to send a message
      try {
        await agent.sendMessage('test', '/test', mockIo, 'test-session')
      } catch (_error) {
        // Expected to throw
      }
      
      // Verify abort controller was cleared
      expect(agent['abortController']).toBeUndefined()
    })
  })
  
  describe('Process error handling', () => {
    it('should not crash on unhandled SDK errors', async () => {
      // Mock the query function to throw various errors
      const { query } = await import('@anthropic-ai/claude-code')
      const mockQuery = query as jest.MockedFunction<typeof query>
      
      mockQuery.mockImplementation(async function* (): AsyncGenerator<SDKMessage> {
        throw new Error('Some unexpected SDK error')
      })
      
      // Should throw but with a wrapped error
      await expect(agent.sendMessage('test', '/test', mockIo, 'test-session'))
        .rejects.toThrow('Claude Code failed: Some unexpected SDK error')
    })
    
    it('should handle non-Error objects thrown by SDK', async () => {
      // Mock the query function to throw a non-Error
      const { query } = await import('@anthropic-ai/claude-code')
      const mockQuery = query as jest.MockedFunction<typeof query>
      
      mockQuery.mockImplementation(async function* (): AsyncGenerator<SDKMessage> {
        throw 'String error' // Non-Error object
      })
      
      // Should handle gracefully
      await expect(agent.sendMessage('test', '/test', mockIo, 'test-session'))
        .rejects.toThrow('Claude Code failed with unknown error: String error')
    })
  })
})