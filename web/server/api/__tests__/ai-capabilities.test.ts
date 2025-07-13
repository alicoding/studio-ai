/**
 * AI Capabilities Unit Tests
 * 
 * SOLID: Single responsibility - testing AI capabilities logic
 * DRY: Reusable test utilities and mocks
 * KISS: Simple, focused test cases
 * Library-First: Uses vitest and existing patterns
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import { app } from '../../app'
import { createStorage } from '../../../../src/lib/storage/UnifiedStorage'
import { LangChainAIService } from '../../services/LangChainAIService'
import { LangGraphOrchestrator } from '../../services/LangGraphOrchestrator'
import { ContextBuilder } from '../../services/ContextBuilder'
import { CancellableApiClient } from '../../services/CancellableApiClient'
import type { CapabilityConfig } from '../../../../src/lib/ai/orchestration/capability-config'

// Mock all external dependencies
vi.mock('@langchain/openai')
vi.mock('@langchain/langgraph')

const mockFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof fetch

describe('AI Capabilities Core Logic', () => {
  const testSessionId = `test-session-${Date.now()}`
  const testCapabilityId = 'test-capability'
  
  const testCapability: CapabilityConfig = {
    id: testCapabilityId,
    name: 'Test Capability',
    description: 'Test capability for API testing',
    category: 'custom',
    prompts: {
      system: 'You are a test assistant.',
      user: 'Process this input: {input}'
    },
    models: {
      primary: 'gpt-4',
      fallback: ['gpt-3.5-turbo']
    },
    context: {
      includeFiles: false,
      includeProject: false,
      includeHistory: true,
      maxHistoryTurns: 10,
      maxTokens: 5000
    },
    interaction: {
      allowFollowUp: true,
      maxTurns: 10,
      delegationEnabled: false
    },
    output: {
      format: 'text'
    },
    advanced: {
      temperature: 0.7,
      maxTokens: 1000,
      topP: 1.0,
      frequencyPenalty: 0,
      presencePenalty: 0
    },
    command: {
      enabled: true,
      trigger: 'test',
      aliases: ['t']
    },
    metadata: {
      version: '1.0.0',
      author: 'test',
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    }
  }

  // Test storage
  const testStorage = createStorage({
    namespace: 'test-ai-capabilities',
    type: 'session'
  })

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup environment variables for tests
    process.env.ELECTRONHUB_API_KEY = 'test-key'
    process.env.ELECTRONHUB_API_URL = 'https://test.api.com'
  })

  afterEach(async () => {
    await testStorage.clear()
    vi.resetAllMocks()
  })

  describe('CancellableApiClient', () => {
    it('should create instance with proper configuration', () => {
      const client = new CancellableApiClient({
        name: 'test-client',
        baseUrl: 'https://test.api.com',
        timeout: 5000
      })
      
      expect(client).toBeDefined()
      expect(client.getActiveRequestsCount()).toBe(0)
    })

    it('should track active sessions', () => {
      const client = new CancellableApiClient({
        name: 'test-client',
        baseUrl: 'https://test.api.com'
      })
      
      expect(client.getActiveSessions()).toEqual([])
      expect(client.getSessionRequestCount('nonexistent')).toBe(0)
    })

    it('should handle session cancellation', () => {
      const client = new CancellableApiClient({
        name: 'test-client',
        baseUrl: 'https://test.api.com'
      })
      
      const result = client.cancelSession('test-session')
      expect(result.cancelled).toBe(false) // No active requests
      expect(result.sessionId).toBe('test-session')
      expect(result.requestsCancelled).toBe(0)
    })
  })

  describe('ContextBuilder', () => {
    it('should create singleton instance', () => {
      const builder1 = ContextBuilder.getInstance()
      const builder2 = ContextBuilder.getInstance()
      
      expect(builder1).toBe(builder2)
    })

    it('should build empty context for invalid request', async () => {
      const builder = ContextBuilder.getInstance()
      
      const context = await builder.buildContext({
        projectId: 'test-project',
        filePaths: [], // Empty files
        maxTokens: 1000
      })
      
      expect(context.files).toEqual([])
      expect(context.totalFiles).toBe(0)
      expect(context.truncated).toBe(false)
      expect(context.metadata.contextType).toBe('files')
    })

    it('should handle cache operations', async () => {
      const builder = ContextBuilder.getInstance()
      
      // Should not throw on cache operations
      await expect(builder.getCachedContext('test-project')).resolves.toBeNull()
      await expect(builder.clearCache('test-project')).resolves.toBeUndefined()
    })
  })

  describe('LangChainAIService', () => {
    it('should create singleton instance', () => {
      const service1 = LangChainAIService.getInstance()
      const service2 = LangChainAIService.getInstance()
      
      expect(service1).toBe(service2)
    })

    it('should manage conversation history', async () => {
      const service = LangChainAIService.getInstance()
      
      // Should return null for non-existent conversation
      const history = await service.getConversationHistory('nonexistent')
      expect(history).toBeNull()
      
      // Should handle clear operation
      const cleared = await service.clearConversationHistory('test-session')
      expect(cleared).toBe(true)
    })

    it('should get active conversations', async () => {
      const service = LangChainAIService.getInstance()
      
      const conversations = await service.getActiveConversations()
      expect(Array.isArray(conversations)).toBe(true)
    })
  })

  describe('LangGraphOrchestrator', () => {
    it('should create singleton instance', () => {
      const orchestrator1 = LangGraphOrchestrator.getInstance()
      const orchestrator2 = LangGraphOrchestrator.getInstance()
      
      expect(orchestrator1).toBe(orchestrator2)
    })

    it('should manage conversation history', async () => {
      const orchestrator = LangGraphOrchestrator.getInstance()
      
      // Should return default state for new session
      const history = await orchestrator.getConversationHistory('new-session')
      expect(history.messages).toEqual([])
      expect(history.sessionId).toBe('new-session')
      expect(history.turnCount).toBe(0)
    })

    it('should clear conversation history', async () => {
      const orchestrator = LangGraphOrchestrator.getInstance()
      
      const cleared = await orchestrator.clearConversationHistory('test-session')
      expect(cleared).toBe(true)
    })

    it('should get active sessions', async () => {
      const orchestrator = LangGraphOrchestrator.getInstance()
      
      const sessions = await orchestrator.getActiveSessions()
      expect(Array.isArray(sessions)).toBe(true)
    })
  })

  describe('Integration Tests', () => {
    it('should handle capability configuration validation', () => {
      // Test that our capability config is valid
      expect(testCapability.id).toBe(testCapabilityId)
      expect(testCapability.name).toBe('Test Capability')
      expect(testCapability.category).toBe('custom')
      expect(testCapability.models.primary).toBe('gpt-4')
      expect(testCapability.prompts.system).toBeDefined()
      expect(testCapability.context.maxTokens).toBe(5000)
      expect(testCapability.advanced?.temperature).toBe(0.7)
      expect(testCapability.command?.enabled).toBe(true)
      expect(testCapability.metadata?.version).toBe('1.0.0')
    })

    it('should handle storage operations', async () => {
      // Test storage can save and retrieve capability configs
      await testStorage.set('test-capability', testCapability)
      
      const retrieved = await testStorage.get<CapabilityConfig>('test-capability')
      expect(retrieved?.id).toBe(testCapabilityId)
      expect(retrieved?.name).toBe('Test Capability')
      
      // Cleanup
      await testStorage.delete('test-capability')
      const deleted = await testStorage.get('test-capability')
      expect(deleted).toBeNull()
    })

    it('should handle session management', async () => {
      const sessionKey = `session:${testSessionId}`
      const sessionData = {
        sessionId: testSessionId,
        messages: [
          { role: 'user' as const, content: 'Hello', timestamp: new Date() }
        ],
        metadata: { test: true }
      }
      
      await testStorage.set(sessionKey, sessionData)
      
      const retrieved = await testStorage.get(sessionKey)
      expect(retrieved).toBeDefined()
      expect((retrieved as typeof sessionData).sessionId).toBe(testSessionId)
      
      // Cleanup
      await testStorage.delete(sessionKey)
    })

    it('should validate service initialization', () => {
      // Ensure all services can be instantiated without errors
      expect(() => LangChainAIService.getInstance()).not.toThrow()
      expect(() => LangGraphOrchestrator.getInstance()).not.toThrow()
      expect(() => ContextBuilder.getInstance()).not.toThrow()
      
      expect(() => new CancellableApiClient({
        name: 'test',
        baseUrl: 'https://test.com'
      })).not.toThrow()
    })
  })

  beforeAll(async () => {
    // Setup test capability
    await request(app)
      .post('/api/ai/capabilities')
      .send(testCapability)
      .expect(200)
  })

  afterAll(async () => {
    // Cleanup test data
    await testStorage.clear()
    await request(app)
      .delete(`/api/ai/capabilities/${testCapabilityId}`)
      .expect(200)
  })

  describe('GET /api/ai/capabilities', () => {
    it('should return all capabilities', async () => {
      const response = await request(app)
        .get('/api/ai/capabilities')
        .expect(200)

      expect(response.body).toBeDefined()
      expect(typeof response.body).toBe('object')
      expect(response.body[testCapabilityId]).toBeDefined()
      expect(response.body[testCapabilityId].name).toBe(testCapability.name)
    })

    it('should return specific capability by trigger', async () => {
      const response = await request(app)
        .get('/api/ai/capabilities?trigger=test')
        .expect(200)

      expect(response.body.id).toBe(testCapabilityId)
      expect(response.body.name).toBe(testCapability.name)
    })

    it('should return 404 for non-existent trigger', async () => {
      await request(app)
        .get('/api/ai/capabilities?trigger=nonexistent')
        .expect(404)
    })
  })

  describe('POST /api/ai/capabilities', () => {
    const newCapability: CapabilityConfig = {
      id: 'new-test-capability',
      name: 'New Test Capability',
      description: 'Another test capability',
      prompts: {
        system: 'You are helpful.',
        user: '{input}'
      },
      models: {
        primary: 'gpt-4'
      }
    }

    afterEach(async () => {
      // Cleanup after each test
      await request(app)
        .delete(`/api/ai/capabilities/${newCapability.id}`)
        .catch(() => {}) // Ignore errors if already deleted
    })

    it('should create new capability', async () => {
      const response = await request(app)
        .post('/api/ai/capabilities')
        .send(newCapability)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.capability.id).toBe(newCapability.id)
    })

    it('should require id and name', async () => {
      await request(app)
        .post('/api/ai/capabilities')
        .send({ description: 'Missing required fields' })
        .expect(400)
    })
  })

  describe('POST /api/ai/execute', () => {
    it('should execute simple capability', async () => {
      const response = await request(app)
        .post('/api/ai/execute')
        .send({
          capabilityId: testCapabilityId,
          input: 'Hello, test!',
          context: {
            sessionId: testSessionId
          }
        })
        .expect(200)

      expect(response.body.content).toBeDefined()
      expect(typeof response.body.content).toBe('string')
      expect(response.body.sessionId).toBe(testSessionId)
      expect(response.body.metadata).toBeDefined()
      expect(response.body.metadata.capabilityId).toBe(testCapabilityId)
    })

    it('should handle orchestrated requests', async () => {
      const response = await request(app)
        .post('/api/ai/execute')
        .send({
          capabilityId: 'research', // Triggers orchestration
          input: 'Research AI best practices',
          context: {
            sessionId: `orchestration-${testSessionId}`
          }
        })
        .expect(200)

      expect(response.body.content).toBeDefined()
      expect(response.body.metadata.orchestrated).toBe(true)
      expect(response.body.metadata.agentUsed).toBeDefined()
    })

    it('should require capabilityId and input', async () => {
      await request(app)
        .post('/api/ai/execute')
        .send({ capabilityId: testCapabilityId })
        .expect(400)

      await request(app)
        .post('/api/ai/execute')
        .send({ input: 'test' })
        .expect(400)
    })

    it('should return 404 for non-existent capability', async () => {
      await request(app)
        .post('/api/ai/execute')
        .send({
          capabilityId: 'nonexistent',
          input: 'test'
        })
        .expect(404)
    })
  })

  describe('Cancellation Support', () => {
    let cancelSessionId: string

    beforeEach(() => {
      cancelSessionId = `cancel-test-${Date.now()}`
    })

    it('should accept cancellation requests', async () => {
      const response = await request(app)
        .post('/api/ai/cancel')
        .send({
          sessionId: cancelSessionId,
          reason: 'Testing cancellation'
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.cancellation).toBeDefined()
      expect(response.body.cancellation.sessionId).toBe(cancelSessionId)
    })

    it('should require sessionId for cancellation', async () => {
      await request(app)
        .post('/api/ai/cancel')
        .send({ reason: 'No session ID' })
        .expect(400)
    })

    it('should provide operation status', async () => {
      const response = await request(app)
        .get('/api/ai/status')
        .expect(200)

      expect(response.body.activeRequests).toBeDefined()
      expect(response.body.activeSessions).toBeDefined()
      expect(typeof response.body.activeRequests).toBe('number')
      expect(Array.isArray(response.body.activeSessions)).toBe(true)
    })
  })

  describe('Multi-turn Conversations', () => {
    const conversationSessionId = `conversation-${Date.now()}`

    it('should maintain conversation context across multiple requests', async () => {
      // First request
      const response1 = await request(app)
        .post('/api/ai/execute')
        .send({
          capabilityId: testCapabilityId,
          input: 'Remember my name is Alice',
          context: {
            sessionId: conversationSessionId
          }
        })
        .expect(200)

      expect(response1.body.sessionId).toBe(conversationSessionId)

      // Second request - should remember context
      const response2 = await request(app)
        .post('/api/ai/execute')
        .send({
          capabilityId: testCapabilityId,
          input: 'What is my name?',
          context: {
            sessionId: conversationSessionId
          }
        })
        .expect(200)

      expect(response2.body.sessionId).toBe(conversationSessionId)
      // Note: Actual content verification would depend on AI model behavior
      expect(response2.body.content).toBeDefined()
    })
  })

  describe('Context Building', () => {
    it('should handle file context in requests', async () => {
      const response = await request(app)
        .post('/api/ai/execute')
        .send({
          capabilityId: testCapabilityId,
          input: 'Analyze these files',
          context: {
            sessionId: `context-${testSessionId}`,
            files: ['package.json', 'README.md'], // Common files
            projectPath: process.cwd()
          }
        })
        .expect(200)

      expect(response.body.content).toBeDefined()
      expect(response.body.metadata).toBeDefined()
    })

    it('should handle missing files gracefully', async () => {
      const response = await request(app)
        .post('/api/ai/execute')
        .send({
          capabilityId: testCapabilityId,
          input: 'Analyze these files',
          context: {
            sessionId: `missing-files-${testSessionId}`,
            files: ['nonexistent-file.txt'],
            projectPath: process.cwd()
          }
        })
        .expect(200)

      // Should still respond even with missing files
      expect(response.body.content).toBeDefined()
    })
  })

  describe('PUT /api/ai/capabilities/:id', () => {
    it('should update existing capability', async () => {
      const updatedCapability = {
        ...testCapability,
        name: 'Updated Test Capability',
        description: 'Updated description'
      }

      const response = await request(app)
        .put(`/api/ai/capabilities/${testCapabilityId}`)
        .send(updatedCapability)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.capability.name).toBe('Updated Test Capability')
    })

    it('should return 404 for non-existent capability', async () => {
      await request(app)
        .put('/api/ai/capabilities/nonexistent')
        .send({ name: 'Test' })
        .expect(404)
    })
  })

  describe('DELETE /api/ai/capabilities/:id', () => {
    it('should delete existing capability', async () => {
      // Create a capability to delete
      const tempCapability: CapabilityConfig = {
        id: 'temp-capability',
        name: 'Temporary Capability',
        description: 'Will be deleted',
        models: { primary: 'gpt-4' }
      }

      await request(app)
        .post('/api/ai/capabilities')
        .send(tempCapability)
        .expect(200)

      // Delete it
      const response = await request(app)
        .delete('/api/ai/capabilities/temp-capability')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.deleted).toBe('temp-capability')

      // Verify it's gone
      await request(app)
        .get('/api/ai/capabilities?trigger=temp')
        .expect(404)
    })

    it('should return 404 for non-existent capability', async () => {
      await request(app)
        .delete('/api/ai/capabilities/nonexistent')
        .expect(404)
    })
  })

  describe('GET /api/ai/models', () => {
    it('should return available models', async () => {
      // This test may fail if ELECTRONHUB_API_KEY is not set
      // Skip in CI/test environments without API key
      if (!process.env.ELECTRONHUB_API_KEY) {
        console.log('Skipping models test - no API key')
        return
      }

      const response = await request(app)
        .get('/api/ai/models')
        .expect(200)

      expect(response.body).toBeDefined()
      // The exact structure depends on ElectronHub API
    })

    it('should handle missing API key gracefully', async () => {
      // Temporarily remove API key
      const originalKey = process.env.ELECTRONHUB_API_KEY
      delete process.env.ELECTRONHUB_API_KEY

      await request(app)
        .get('/api/ai/models')
        .expect(500)

      // Restore API key
      if (originalKey) {
        process.env.ELECTRONHUB_API_KEY = originalKey
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid JSON in requests', async () => {
      await request(app)
        .post('/api/ai/execute')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400)
    })

    it('should handle large payloads gracefully', async () => {
      const largeInput = 'x'.repeat(100000) // 100KB string

      const response = await request(app)
        .post('/api/ai/execute')
        .send({
          capabilityId: testCapabilityId,
          input: largeInput,
          context: {
            sessionId: `large-${testSessionId}`
          }
        })

      // Should either succeed or fail gracefully with proper error
      expect([200, 413, 500]).toContain(response.status)
    })
  })

  describe('Rate Limiting & Performance', () => {
    it('should handle concurrent requests', async () => {
      const concurrentRequests = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/api/ai/execute')
          .send({
            capabilityId: testCapabilityId,
            input: `Concurrent request ${i}`,
            context: {
              sessionId: `concurrent-${i}-${testSessionId}`
            }
          })
      )

      const responses = await Promise.allSettled(concurrentRequests)
      
      // At least some should succeed
      const successful = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      )
      expect(successful.length).toBeGreaterThan(0)
    })
  })
})

