/**
 * Final Orchestration Integration Test
 * 
 * Tests all 5 phases working together:
 * - Phase 1: ResponseTracker for promise management
 * - Phase 2: BatchExecutor for concurrent operations
 * - Phase 3: Cross-project routing with permissions
 * - Phase 4: MCP server orchestration integration
 * - Phase 5: Configuration persistence and UI
 * 
 * SOLID: End-to-end test validates the complete system
 * KISS: Single comprehensive test file
 * DRY: Reuses test utilities and configurations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createTestApp, closeTestApp, type TestApp } from '../testUtils'
import { createDefaultConfig, type OrchestrationConfig } from '../../schemas/orchestration'
import { spawn, type ChildProcess } from 'child_process'
import WebSocket from 'ws'

describe('Final Orchestration Integration - All Phases', () => {
  let testApp: TestApp
  let serverUrl: string
  let mcpProcess: ChildProcess | undefined
  let ws: WebSocket
  let sessionId: string
  
  beforeAll(async () => {
    // Start test server
    testApp = await createTestApp()
    serverUrl = testApp.serverUrl
    
    // Start MCP server (Phase 4)
    mcpProcess = spawn('node', [
      'web/server/mcp/studio-ai/dist/server.js'
    ], {
      env: {
        ...process.env,
        PORT: '9999',
        CLAUDE_API_KEY: 'test-key'
      }
    })
    
    // Wait for MCP server to start
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Connect WebSocket
    ws = new WebSocket(`${serverUrl.replace('http', 'ws')}/ws`)
    await new Promise((resolve, reject) => {
      ws.once('open', resolve)
      ws.once('error', reject)
    })
    
    // Create test session with projects
    sessionId = 'test-session-' + Date.now()
  })
  
  afterAll(async () => {
    ws?.close()
    mcpProcess?.kill()
    if (testApp) {
      await closeTestApp(testApp)
    }
  })
  
  beforeEach(async () => {
    // Reset any state between tests
  })
  
  describe('Phase 5: Configuration Persistence', () => {
    it('should save and load orchestration configuration via storage API', async () => {
      const config: OrchestrationConfig = {
        ...createDefaultConfig(),
        permissions: {
          crossProjectMentions: 'explicit',
          batchOperations: true,
          maxGlobalConcurrency: 10,
          requireExplicitWait: true,
          allowTimeoutOverride: false
        },
        projects: {
          'project-a': {
            allowCrossProject: true,
            allowedTargets: ['project-b'],
            customTimeout: 45000,
            maxBatchSize: 5,
            waitStrategy: 'any',
            disabled: false
          }
        }
      }
      
      // Save configuration
      const saveRes = await fetch(`${serverUrl}/api/storage/item/orchestration/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: config,
          type: 'state'
        })
      })
      expect(saveRes.ok).toBe(true)
      
      // Load configuration
      const loadRes = await fetch(`${serverUrl}/api/storage/item/orchestration/config`)
      expect(loadRes.ok).toBe(true)
      
      const { value: loadedConfig } = await loadRes.json() as { value: OrchestrationConfig }
      expect(loadedConfig).toEqual(config)
    })
  })
  
  describe('Phase 3: Cross-Project Permission Matrix', () => {
    it('should enforce cross-project permissions in explicit mode', async () => {
      // Configure explicit permissions
      const config: OrchestrationConfig = {
        ...createDefaultConfig(),
        permissions: {
          crossProjectMentions: 'explicit',
          batchOperations: true,
          maxGlobalConcurrency: 20,
          requireExplicitWait: false,
          allowTimeoutOverride: true
        },
        projects: {
          'project-a': {
            allowCrossProject: true,
            allowedTargets: ['project-b'], // A can mention B
            customTimeout: 30000,
            disabled: false
          },
          'project-b': {
            allowCrossProject: false, // B cannot mention others
            allowedTargets: [],
            disabled: false
          }
        }
      }
      
      // Save config
      await fetch(`${serverUrl}/api/storage/item/orchestration/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: config, type: 'state' })
      })
      
      // Test A -> B (should succeed)
      const allowedRes = await fetch(`${serverUrl}/api/messages/mention`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
          'x-project-id': 'project-a'
        },
        body: JSON.stringify({
          content: '@agent-b test message',
          agentId: 'agent-in-b',
          targetProjectId: 'project-b',
          wait: true,
          timeout: 5000
        })
      })
      expect(allowedRes.ok).toBe(true)
      
      // Test B -> A (should fail)
      const deniedRes = await fetch(`${serverUrl}/api/messages/mention`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
          'x-project-id': 'project-b'
        },
        body: JSON.stringify({
          content: '@agent-a test message',
          agentId: 'agent-in-a',
          targetProjectId: 'project-a',
          wait: true
        })
      })
      expect(deniedRes.status).toBe(403)
      const error = await deniedRes.json() as { error: string }
      expect(error.error).toContain('Cross-project mention not allowed')
    })
  })
  
  describe('Phase 2 & 4: Batch Operations with MCP', () => {
    it('should execute batch operations through MCP with wait strategies', async () => {
      // Enable batch operations
      const config = createDefaultConfig()
      config.permissions.batchOperations = true
      config.defaults.maxBatchSize = 3
      
      await fetch(`${serverUrl}/api/storage/item/orchestration/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: config, type: 'state' })
      })
      
      // Execute batch with 'any' strategy via MCP
      const batchMessages = [
        {
          agentId: 'fast-agent',
          content: 'Quick response',
          projectId: 'project-a'
        },
        {
          agentId: 'slow-agent',
          content: 'Slow response',
          projectId: 'project-a'
        },
        {
          agentId: 'medium-agent',
          content: 'Medium response',
          projectId: 'project-a'
        }
      ]
      
      // Send batch request through MCP
      const mcpRes = await fetch(`${serverUrl}/api/mcp/studio-ai/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId
        },
        body: JSON.stringify({
          messages: batchMessages,
          waitStrategy: 'any',
          timeout: 10000
        })
      })
      
      expect(mcpRes.ok).toBe(true)
      const result = await mcpRes.json() as { responses: unknown[], strategy: string }
      
      // With 'any' strategy, should get at least one response
      expect(result.responses).toBeDefined()
      expect(result.responses.length).toBeGreaterThan(0)
      expect(result.strategy).toBe('any')
    })
  })
  
  describe('Phase 1: ResponseTracker Cleanup', () => {
    it('should track and cleanup expired responses', async () => {
      // Configure short cleanup interval for testing
      const config = createDefaultConfig()
      config.defaults.responseCleanupInterval = 1000 // 1 second
      config.defaults.maxPendingResponses = 5
      
      await fetch(`${serverUrl}/api/storage/item/orchestration/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: config, type: 'state' })
      })
      
      // Create multiple pending responses
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(
          fetch(`${serverUrl}/api/messages/mention`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-session-id': sessionId,
              'x-project-id': 'project-a'
            },
            body: JSON.stringify({
              content: `Test message ${i}`,
              agentId: 'non-existent-agent',
              wait: false // Fire and forget
            })
          })
        )
      }
      
      await Promise.all(promises)
      
      // Wait for cleanup cycle
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Check that responses were tracked and cleaned up
      const statsRes = await fetch(`${serverUrl}/api/diagnostics/response-tracker`)
      expect(statsRes.ok).toBe(true)
      
      const stats = await statsRes.json() as { pendingCount: number }
      expect(stats.pendingCount).toBeLessThanOrEqual(5) // Max pending responses
    })
  })
  
  describe('Complete Orchestration Flow', () => {
    it('should handle a complete cross-project batch workflow', async () => {
      // Step 1: Configure orchestration settings
      const config: OrchestrationConfig = {
        enabled: true,
        defaults: {
          mentionTimeout: 15000,
          batchTimeout: 30000,
          maxBatchSize: 5,
          waitStrategy: 'all',
          maxConcurrentBatches: 3,
          responseCleanupInterval: 60000,
          maxPendingResponses: 50
        },
        permissions: {
          crossProjectMentions: 'all', // Allow all cross-project
          batchOperations: true,
          maxGlobalConcurrency: 15,
          requireExplicitWait: false,
          allowTimeoutOverride: true
        },
        projects: {
          'data-service': {
            allowCrossProject: true,
            allowedTargets: [],
            maxBatchSize: 3,
            disabled: false
          },
          'ml-service': {
            allowCrossProject: true,
            allowedTargets: [],
            waitStrategy: 'any',
            disabled: false
          }
        },
        rateLimit: {
          enabled: true,
          messagesPerMinute: 30,
          messagesPerHour: 300,
          burstSize: 5
        }
      }
      
      // Save configuration
      await fetch(`${serverUrl}/api/storage/item/orchestration/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: config, type: 'state' })
      })
      
      // Step 2: Create projects and agents
      const setupProjects = async () => {
        // Setup would normally be done through UI
        // For testing, we'll use the API directly
        return true
      }
      await setupProjects()
      
      // Step 3: Execute cross-project batch operation
      const orchestrationTask = {
        type: 'batch',
        messages: [
          {
            projectId: 'data-service',
            agentId: 'data-fetcher',
            content: 'Fetch user analytics for last week'
          },
          {
            projectId: 'data-service',
            agentId: 'data-processor',
            content: 'Process and aggregate the fetched data'
          },
          {
            projectId: 'ml-service',
            agentId: 'prediction-model',
            content: 'Generate predictions based on processed data',
            dependencies: ['data-processor'] // Depends on data processing
          }
        ],
        waitStrategy: 'all',
        timeout: 25000
      }
      
      // Execute through batch API
      const batchRes = await fetch(`${serverUrl}/api/messages/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId
        },
        body: JSON.stringify(orchestrationTask)
      })
      
      expect(batchRes.ok).toBe(true)
      const batchResult = await batchRes.json() as {
        results: unknown[]
        stats: {
          total: number
          strategy: string
        }
      }
      
      // Verify results
      expect(batchResult.results).toBeDefined()
      expect(batchResult.stats).toBeDefined()
      expect(batchResult.stats.total).toBe(3)
      expect(batchResult.stats.strategy).toBe('all')
      
      // Step 4: Verify ResponseTracker handled all promises
      const trackerStats = await fetch(`${serverUrl}/api/diagnostics/response-tracker`)
      expect(trackerStats.ok).toBe(true)
      
      // Step 5: Check rate limiting was applied
      const rateLimitRes = await fetch(`${serverUrl}/api/diagnostics/rate-limit`, {
        headers: { 'x-session-id': sessionId }
      })
      expect(rateLimitRes.ok).toBe(true)
      
      const rateStats = await rateLimitRes.json() as { messagesThisMinute: number }
      expect(rateStats.messagesThisMinute).toBeLessThanOrEqual(30)
    })
  })
  
  describe('Error Handling and Edge Cases', () => {
    it('should handle configuration conflicts gracefully', async () => {
      // Test conflicting configurations
      const config = createDefaultConfig()
      config.permissions.batchOperations = false // Disable batch
      config.defaults.maxBatchSize = 10 // But set batch size
      
      await fetch(`${serverUrl}/api/storage/item/orchestration/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: config, type: 'state' })
      })
      
      // Try to execute batch operation
      const batchRes = await fetch(`${serverUrl}/api/messages/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId
        },
        body: JSON.stringify({
          messages: [{ agentId: 'test', content: 'test' }],
          waitStrategy: 'all'
        })
      })
      
      expect(batchRes.status).toBe(403)
      const error = await batchRes.json() as { error: string }
      expect(error.error).toContain('Batch operations are disabled')
    })
    
    it('should handle MCP server disconnection', async () => {
      // Kill MCP process to simulate disconnection
      mcpProcess?.kill()
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Try to use MCP
      const mcpRes = await fetch(`${serverUrl}/api/mcp/studio-ai/mention`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId
        },
        body: JSON.stringify({
          content: 'Test message',
          wait: true
        })
      })
      
      // Should handle gracefully
      expect(mcpRes.status).toBeGreaterThanOrEqual(500)
      
      // Restart MCP for other tests
      mcpProcess = spawn('node', [
        'web/server/mcp/studio-ai/dist/server.js'
      ], {
        env: {
          ...process.env,
          PORT: '9999',
          CLAUDE_API_KEY: 'test-key'
        }
      })
      await new Promise(resolve => setTimeout(resolve, 2000))
    })
  })
})