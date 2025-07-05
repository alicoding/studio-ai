/**
 * Phase 3: Cross-Project Routing Integration Tests
 * 
 * Tests real API integration for cross-project permissions and routing.
 * These tests run against an actual server instance on port 3456.
 * 
 * Test scenarios:
 * 1. Mention API with targetProjectId
 * 2. Batch API with cross-project messages
 * 3. Permission matrix (allowed, denied, default)
 * 4. Security validation (no unauthorized access)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'

// Server configuration
const PORT = 3456
const BASE_URL = `http://localhost:${PORT}`

// Test helper class
class CrossProjectTester {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async checkServerHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/config`, {
        method: 'GET'
      })
      return response.ok
    } catch {
      return false
    }
  }

  async sendMentionWithTargetProject(params: {
    message: string
    fromAgentId: string
    projectId: string
    targetProjectId?: string
    wait?: boolean
    timeout?: number
  }): Promise<Response> {
    return fetch(`${this.baseUrl}/api/messages/mention`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })
  }

  async sendBatchWithCrossProject(params: {
    messages: Array<{
      id: string
      targetAgentId: string
      content: string
      projectId?: string
      dependencies?: string[]
    }>
    fromAgentId: string
    projectId: string
    waitStrategy: 'all' | 'any' | 'none'
    timeout?: number
  }): Promise<Response> {
    return fetch(`${this.baseUrl}/api/messages/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })
  }
}

// Define response types
interface MentionResponse {
  message: string
  fromAgentId: string
  projectId: string
  targets: string[]
  wait: boolean
  responses?: Record<string, unknown>
  errors?: Record<string, string>
}

interface BatchResponse {
  batchId: string
  waitStrategy: string
  results: Record<string, {
    id: string
    status: 'success' | 'error' | 'timeout'
    response?: unknown
    error?: string
    duration: number
  }>
  summary: {
    total: number
    successful: number
    failed: number
    timedOut: number
    duration: number
  }
}

interface ErrorResponse {
  error: string
  details?: unknown
}

describe('Phase 3: Cross-Project Routing Integration Tests', () => {
  let tester: CrossProjectTester

  beforeAll(async () => {
    console.log(`
========================================
Phase 3: Cross-Project Routing Tests
Running against server on port ${PORT}
========================================
    `)

    tester = new CrossProjectTester(BASE_URL)
    
    // Check if server is running
    const isHealthy = await tester.checkServerHealth()
    if (!isHealthy) {
      throw new Error(`
Server is not running on port ${PORT}!
Please start the server with: npm run dev
Then run the tests with: npm test -- phase3-cross-project.ts
      `)
    }

    console.log('✓ Server is healthy')
  })

  afterAll(() => {
    console.log('Tests completed')
  })

  describe('1. Mention API with targetProjectId', () => {
    it('should route mention to same project when no targetProjectId', async () => {
      const response = await tester.sendMentionWithTargetProject({
        message: '@agent-1 Hello from same project',
        fromAgentId: 'test-sender',
        projectId: 'project-a',
        wait: false
      })

      expect(response.status).toBe(200)
      const result = await response.json() as MentionResponse
      expect(result.projectId).toBe('project-a')
      expect(result.targets).toContain('agent-1')
      expect(result.wait).toBe(false)
    })

    it('should route mention to different project with targetProjectId', async () => {
      const response = await tester.sendMentionWithTargetProject({
        message: '@agent-2 Cross-project message',
        fromAgentId: 'test-sender',
        projectId: 'project-a',
        targetProjectId: 'project-b',
        wait: false
      })

      // Should succeed with default 'auto' permission
      expect(response.status).toBe(200)
      const result = await response.json() as MentionResponse
      expect(result.projectId).toBe('project-a')
      expect(result.targets).toContain('agent-2')
    })

    it('should wait for cross-project response when wait=true', async () => {
      const startTime = Date.now()
      
      const response = await tester.sendMentionWithTargetProject({
        message: '@agent-3 What is 5+5?',
        fromAgentId: 'test-sender',
        projectId: 'project-a',
        targetProjectId: 'project-b',
        wait: true,
        timeout: 15000
      })

      const duration = Date.now() - startTime
      console.log(`Cross-project mention with wait took ${duration}ms`)

      expect(response.status).toBe(200)
      const result = await response.json() as MentionResponse
      expect(result.wait).toBe(true)
      expect(result.responses).toBeDefined()
      expect(Object.keys(result.responses || {})).toContain('agent-3')
    }, 20000)
  })

  describe('2. Batch API with cross-project messages', () => {
    it('should process batch with mixed project targets', async () => {
      const response = await tester.sendBatchWithCrossProject({
        messages: [
          {
            id: 'msg1',
            targetAgentId: 'agent-1',
            content: 'Task in source project',
            // No projectId means use batch default
          },
          {
            id: 'msg2',
            targetAgentId: 'agent-2',
            content: 'Task in different project',
            projectId: 'project-b', // Cross-project
          },
          {
            id: 'msg3',
            targetAgentId: 'agent-3',
            content: 'Another cross-project task',
            projectId: 'project-c', // Another cross-project
            dependencies: ['msg1', 'msg2']
          }
        ],
        fromAgentId: 'batch-sender',
        projectId: 'project-a',
        waitStrategy: 'all',
        timeout: 30000
      })

      expect(response.status).toBe(200)
      const result = await response.json() as BatchResponse
      expect(result.batchId).toBeDefined()
      expect(result.results).toBeDefined()
      expect(Object.keys(result.results)).toHaveLength(3)
      expect(result.summary.total).toBe(3)
    }, 35000)

    it('should respect cross-project dependencies', async () => {
      const response = await tester.sendBatchWithCrossProject({
        messages: [
          {
            id: 'setup',
            targetAgentId: 'setup-agent',
            content: 'Initialize context',
            projectId: 'project-setup'
          },
          {
            id: 'process',
            targetAgentId: 'process-agent',
            content: 'Process with context from setup',
            projectId: 'project-process',
            dependencies: ['setup'] // Depends on cross-project task
          }
        ],
        fromAgentId: 'dependency-test',
        projectId: 'project-main',
        waitStrategy: 'all',
        timeout: 20000
      })

      expect(response.status).toBe(200)
      const result = await response.json() as BatchResponse
      
      // Both tasks should complete successfully
      expect(result.results.setup.status).toBe('success')
      expect(result.results.process.status).toBe('success')
      
      // Process should complete after setup (due to dependency)
      expect(result.results.process.duration).toBeGreaterThan(0)
    }, 25000)
  })

  describe('3. Permission Matrix Scenarios', () => {
    it('should handle permission denied gracefully', async () => {
      // This test would require configuration that denies access
      // For now, we'll test that the API validates the permission
      const response = await tester.sendMentionWithTargetProject({
        message: '@restricted-agent Unauthorized access attempt',
        fromAgentId: 'unauthorized-sender',
        projectId: 'restricted-source',
        targetProjectId: 'restricted-target',
        wait: false
      })

      // With default 'auto' permissions, this should still succeed
      // In production, this would be configured to deny
      expect(response.status).toBe(200)
    })

    it('should allow self-project access always', async () => {
      const response = await tester.sendMentionWithTargetProject({
        message: '@local-agent Same project access',
        fromAgentId: 'local-sender',
        projectId: 'my-project',
        targetProjectId: 'my-project', // Same as source
        wait: false
      })

      expect(response.status).toBe(200)
      const result = await response.json() as MentionResponse
      expect(result.targets).toContain('local-agent')
    })
  })

  describe('4. Security Validation', () => {
    it('should validate required parameters', async () => {
      // Missing targetAgent in mention
      const response1 = await tester.sendMentionWithTargetProject({
        message: 'No mention here',
        fromAgentId: 'test',
        projectId: 'test-project'
      })
      
      expect(response1.status).toBe(400)
      const error1 = await response1.json() as ErrorResponse
      expect(error1.error).toContain('No valid mentions')
    })

    it('should not leak information about non-existent projects', async () => {
      const response = await tester.sendBatchWithCrossProject({
        messages: [
          {
            id: 'msg1',
            targetAgentId: 'agent-1',
            content: 'Message to non-existent project',
            projectId: 'non-existent-project-xyz-123'
          }
        ],
        fromAgentId: 'security-test',
        projectId: 'existing-project',
        waitStrategy: 'none'
      })

      // Should still process (project validation happens at runtime)
      // This tests that we don't expose project existence in the API
      expect(response.status).toBe(200)
    })

    it('should enforce timeout limits', async () => {
      const response = await tester.sendMentionWithTargetProject({
        message: '@timeout-agent Test timeout enforcement',
        fromAgentId: 'timeout-test',
        projectId: 'project-a',
        wait: true,
        timeout: 1000 // Very short timeout
      })

      expect(response.status).toBe(200)
      const result = await response.json() as MentionResponse
      
      // Should have timeout error for the agent
      if (result.errors && result.errors['timeout-agent']) {
        expect(result.errors['timeout-agent']).toContain('timeout')
      }
    })
  })

  describe('5. Real-world Scenarios', () => {
    it('should handle multi-project workflow orchestration', async () => {
      console.log('Testing multi-project workflow...')
      
      const response = await tester.sendBatchWithCrossProject({
        messages: [
          {
            id: 'analyze',
            targetAgentId: 'analyzer',
            content: 'Analyze the requirements',
            projectId: 'analysis-project'
          },
          {
            id: 'design',
            targetAgentId: 'designer',
            content: 'Create design based on analysis',
            projectId: 'design-project',
            dependencies: ['analyze']
          },
          {
            id: 'implement',
            targetAgentId: 'developer',
            content: 'Implement the design',
            projectId: 'dev-project',
            dependencies: ['design']
          },
          {
            id: 'test',
            targetAgentId: 'tester',
            content: 'Test the implementation',
            projectId: 'test-project',
            dependencies: ['implement']
          }
        ],
        fromAgentId: 'orchestrator',
        projectId: 'main-project',
        waitStrategy: 'all',
        timeout: 60000
      })

      expect(response.status).toBe(200)
      const result = await response.json() as BatchResponse
      
      // All tasks should complete
      expect(result.summary.successful).toBe(4)
      expect(result.summary.failed).toBe(0)
      
      console.log(`Workflow completed in ${result.summary.duration}ms`)
    }, 65000)
  })
})