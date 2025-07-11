/**
 * Multi-Agent Workflow Loop Tests
 * Tests complex workflow patterns including coder+reviewer loops with rejection scenarios
 *
 * KISS: Simple test patterns for complex workflow scenarios  
 * DRY: Reuses helper functions for workflow polling
 * SOLID: Each test validates one specific workflow pattern
 * Library-First: Uses vitest, ky, and existing workflow infrastructure
 */

import { describe, it, expect } from 'vitest'
import ky from 'ky'
import type { InvokeResponse } from '../../schemas/invoke'

const API_URL = process.env.CLAUDE_STUDIO_API || 'http://localhost:3456/api'

// Test configuration for multi-agent workflows
const TEST_PROJECT_ID = 'test-multi-agent-project'
const CODER_AGENT_ID = 'developer_01'
const REVIEWER_AGENT_ID = 'reviewer_01'
const TIMEOUT_MS = 180000 // 3 minutes for complex workflows

// Helper to wait for workflow completion with detailed status tracking
async function waitForWorkflowWithStatus(
  threadId: string,
  maxAttempts = 60,
  delayMs = 3000
): Promise<{
  status: string
  results: Record<string, string>
  sessionIds: Record<string, string>
  attempts: number
  finalState: unknown
}> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await ky.get(`${API_URL}/invoke-status/status/${threadId}`).json<{
        status: string
        results?: Record<string, string>
        sessionIds?: Record<string, string>
        steps?: Array<{ id: string; status: string; task: string }>
      }>()

      console.log(`[Attempt ${i + 1}] Workflow ${threadId} status: ${response.status}`)
      
      if (response.steps) {
        console.log('Step details:')
        response.steps.forEach(step => {
          console.log(`  - ${step.id}: ${step.status} (${step.task.substring(0, 50)}...)`)
        })
      }

      if (response.status === 'completed' || response.status === 'failed' || response.status === 'aborted') {
        return {
          status: response.status,
          results: response.results || {},
          sessionIds: response.sessionIds || {},
          attempts: i + 1,
          finalState: response
        }
      }
    } catch (_error) {
      console.log(`[Attempt ${i + 1}] Status not available yet for ${threadId}`)
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  return {
    status: 'timeout',
    results: {},
    sessionIds: {},
    attempts: maxAttempts,
    finalState: null
  }
}

// Helper to analyze workflow results for quality patterns
function analyzeWorkflowResults(results: Record<string, string>): {
  hasCodeGeneration: boolean
  hasReviewFeedback: boolean
  hasRevisions: boolean
  iterationCount: number
  qualityImproved: boolean
} {
  const outputs = Object.values(results)
  const allText = outputs.join(' ').toLowerCase()
  
  return {
    hasCodeGeneration: outputs.some(output => 
      output.includes('function') || 
      output.includes('class') || 
      output.includes('const') ||
      output.includes('def ') ||
      output.includes('public ')
    ),
    hasReviewFeedback: outputs.some(output =>
      output.includes('review') ||
      output.includes('feedback') ||
      output.includes('suggestion') ||
      output.includes('improve') ||
      output.includes('issue')
    ),
    hasRevisions: outputs.some(output =>
      output.includes('revised') ||
      output.includes('updated') ||
      output.includes('fixed') ||
      output.includes('corrected')
    ),
    iterationCount: Math.max(1, outputs.length / 2), // Estimate iteration cycles
    qualityImproved: allText.includes('better') || allText.includes('improved') || allText.includes('enhanced')
  }
}

describe('Multi-Agent Workflow Loop Tests', () => {
  describe('Coder + Reviewer Loop Workflow', () => {
    it('should handle coder-reviewer iteration with potential rejection', async () => {
      const threadId = `coder-reviewer-loop-${Date.now()}`
      
      console.log(`\n=== Starting Coder+Reviewer Loop Test (${threadId}) ===`)
      
      // Complex workflow: coder writes, reviewer reviews, coder revises based on feedback
      const workflow = [
        {
          id: 'initial_code',
          agentId: CODER_AGENT_ID,
          task: 'Write a simple hello world function in JavaScript with proper error handling. Make it intentionally have a small issue that a reviewer might catch.',
        },
        {
          id: 'code_review',
          agentId: REVIEWER_AGENT_ID,
          task: 'Review this code: {initial_code.output}. Provide constructive feedback on any issues, improvements, or best practices that could be applied. Be thorough but fair.',
          deps: ['initial_code'],
        },
        {
          id: 'code_revision',
          agentId: CODER_AGENT_ID,
          task: 'Based on this review feedback: {code_review.output}, revise the original code: {initial_code.output}. Address all the reviewer concerns and improve the code quality.',
          deps: ['initial_code', 'code_review'],
        },
        {
          id: 'final_review',
          agentId: REVIEWER_AGENT_ID,
          task: 'Review the revised code: {code_revision.output}. Compare it with the original: {initial_code.output} and the feedback given: {code_review.output}. Confirm if the issues were addressed.',
          deps: ['code_revision'],
        }
      ]

      // Start async workflow to test real-time monitoring
      const { threadId: workflowThreadId } = await ky
        .post(`${API_URL}/invoke/async`, {
          json: {
            workflow,
            threadId,
            projectId: TEST_PROJECT_ID,
          },
        })
        .json<{ threadId: string }>()

      expect(workflowThreadId).toBe(threadId)
      console.log(`Workflow started successfully: ${workflowThreadId}`)

      // Monitor workflow progress with detailed logging
      const result = await waitForWorkflowWithStatus(threadId)
      
      console.log(`\n=== Workflow Completed ===`)
      console.log(`Status: ${result.status}`)
      console.log(`Attempts: ${result.attempts}`)
      console.log(`Results count: ${Object.keys(result.results).length}`)
      console.log(`Session IDs: ${Object.keys(result.sessionIds).length}`)

      // Verify workflow completed successfully
      expect(result.status).toBe('completed')
      expect(Object.keys(result.results).length).toBe(4) // All 4 steps should complete

      // Analyze the results for workflow quality
      const analysis = analyzeWorkflowResults(result.results)
      console.log('\n=== Workflow Analysis ===')
      console.log(`Has code generation: ${analysis.hasCodeGeneration}`)
      console.log(`Has review feedback: ${analysis.hasReviewFeedback}`)
      console.log(`Has revisions: ${analysis.hasRevisions}`)
      console.log(`Estimated iterations: ${analysis.iterationCount}`)
      console.log(`Quality improved: ${analysis.qualityImproved}`)

      // Verify workflow patterns
      expect(analysis.hasCodeGeneration).toBe(true)
      expect(analysis.hasReviewFeedback).toBe(true)
      expect(analysis.iterationCount).toBeGreaterThan(1)

      // Verify step sequence
      expect(result.results.initial_code).toBeDefined()
      expect(result.results.code_review).toBeDefined()
      expect(result.results.code_revision).toBeDefined()
      expect(result.results.final_review).toBeDefined()

      // Verify each step has session ID for UI tracking
      expect(result.sessionIds.initial_code).toBeDefined()
      expect(result.sessionIds.code_review).toBeDefined()
      expect(result.sessionIds.code_revision).toBeDefined()
      expect(result.sessionIds.final_review).toBeDefined()

      console.log('\n=== Step Results ===')
      Object.entries(result.results).forEach(([stepId, output]) => {
        console.log(`${stepId}: ${output.substring(0, 100)}...`)
      })

    }, TIMEOUT_MS)

    it('should handle parallel multi-agent workflows', async () => {
      const threadId = `parallel-agents-${Date.now()}`
      
      console.log(`\n=== Starting Parallel Multi-Agent Test (${threadId}) ===`)
      
      // Parallel workflow: multiple agents working simultaneously
      const workflow = [
        {
          id: 'frontend_task',
          agentId: CODER_AGENT_ID,
          task: 'Create a React component for a user profile card with name, email, and avatar',
        },
        {
          id: 'backend_task', 
          agentId: REVIEWER_AGENT_ID, // Use reviewer as second developer
          task: 'Create a REST API endpoint for user profile data with validation',
        },
        {
          id: 'integration_task',
          agentId: CODER_AGENT_ID,
          task: 'Create integration code that connects the frontend: {frontend_task.output} with the backend: {backend_task.output}',
          deps: ['frontend_task', 'backend_task'],
        }
      ]

      const response = await ky
        .post(`${API_URL}/invoke`, {
          json: {
            workflow,
            threadId,
            projectId: TEST_PROJECT_ID,
          },
          timeout: TIMEOUT_MS,
        })
        .json<InvokeResponse>()

      console.log(`Parallel workflow completed: ${response.status}`)
      
      expect(response.status).toBe('completed')
      expect(Object.keys(response.results).length).toBe(3)
      expect(response.results.frontend_task).toBeDefined()
      expect(response.results.backend_task).toBeDefined()
      expect(response.results.integration_task).toBeDefined()

      // Verify parallel execution - frontend and backend should be independent
      expect(response.results.integration_task).toContain(response.results.frontend_task.substring(0, 20))
      expect(response.results.integration_task).toContain(response.results.backend_task.substring(0, 20))

      console.log('Parallel workflow verification passed')

    }, TIMEOUT_MS)

    it('should handle workflow with conditional branching based on review outcome', async () => {
      const threadId = `conditional-workflow-${Date.now()}`
      
      console.log(`\n=== Starting Conditional Workflow Test (${threadId}) ===`)
      
      // Conditional workflow: different paths based on review outcome
      const workflow = [
        {
          id: 'write_algorithm',
          agentId: CODER_AGENT_ID,
          task: 'Write a sorting algorithm in Python. Make it functional but not optimal - use bubble sort.',
        },
        {
          id: 'performance_review',
          agentId: REVIEWER_AGENT_ID,
          task: 'Review this algorithm for performance: {write_algorithm.output}. Rate it as "good", "needs_improvement", or "poor" and explain why.',
          deps: ['write_algorithm'],
        },
        {
          id: 'optimization',
          agentId: CODER_AGENT_ID,
          task: 'Based on this performance review: {performance_review.output}, optimize the algorithm: {write_algorithm.output}. If the review said it was already good, just add comments. If it needs improvement, make it more efficient.',
          deps: ['write_algorithm', 'performance_review'],
        },
        {
          id: 'final_validation',
          agentId: REVIEWER_AGENT_ID,
          task: 'Compare the original: {write_algorithm.output} with optimized: {optimization.output} and review: {performance_review.output}. Validate that appropriate improvements were made.',
          deps: ['optimization'],
        }
      ]

      const response = await ky
        .post(`${API_URL}/invoke`, {
          json: {
            workflow,
            threadId,
            projectId: TEST_PROJECT_ID,
          },
          timeout: TIMEOUT_MS,
        })
        .json<InvokeResponse>()

      console.log(`Conditional workflow completed: ${response.status}`)
      
      expect(response.status).toBe('completed')
      expect(Object.keys(response.results).length).toBe(4)

      // Verify workflow logic
      const reviewText = response.results.performance_review.toLowerCase()
      const optimizationText = response.results.optimization.toLowerCase()
      
      // Check that optimization responded appropriately to review
      if (reviewText.includes('poor') || reviewText.includes('needs_improvement')) {
        // Should have made significant changes
        expect(optimizationText.length).toBeGreaterThan(response.results.write_algorithm.length * 0.8)
      } else if (reviewText.includes('good')) {
        // Should have at least added comments or minor improvements
        expect(optimizationText).toBeDefined()
      }

      console.log('Conditional workflow verification passed')

    }, TIMEOUT_MS)
  })

  describe('Workflow Visual Activity Tests', () => {
    it('should provide real-time status updates for workflow monitoring', async () => {
      const threadId = `visual-activity-${Date.now()}`
      
      console.log(`\n=== Starting Visual Activity Test (${threadId}) ===`)
      
      // Simple workflow for testing real-time updates
      const workflow = [
        {
          id: 'step1',
          agentId: CODER_AGENT_ID,
          task: 'Count to 3 slowly, saying each number clearly',
        },
        {
          id: 'step2', 
          agentId: REVIEWER_AGENT_ID,
          task: 'Acknowledge the counting from step1: {step1.output} and count from 4 to 6',
          deps: ['step1'],
        }
      ]

      // Start async to test status monitoring
      const { threadId: workflowThreadId } = await ky
        .post(`${API_URL}/invoke/async`, {
          json: {
            workflow,
            threadId,
            projectId: TEST_PROJECT_ID,
          },
        })
        .json<{ threadId: string }>()

      expect(workflowThreadId).toBe(threadId)

      // Track status changes over time
      const statusHistory: Array<{ timestamp: number; status: string; currentStep?: string }> = []
      let finalResult = null

      // Poll for status with detailed tracking
      for (let i = 0; i < 30; i++) {
        try {
          const statusResponse = await ky.get(`${API_URL}/invoke-status/status/${threadId}`).json<{
            status: string
            currentStep?: string
            steps?: Array<{ id: string; status: string }>
          }>()

          statusHistory.push({
            timestamp: Date.now(),
            status: statusResponse.status,
            currentStep: statusResponse.currentStep
          })

          console.log(`[${i}] Status: ${statusResponse.status}, Current: ${statusResponse.currentStep}`)

          if (statusResponse.status === 'completed' || statusResponse.status === 'failed') {
            finalResult = statusResponse
            break
          }
        } catch {
          // Status not available yet
        }

        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      // Verify we captured status progression
      expect(statusHistory.length).toBeGreaterThan(0)
      expect(finalResult).not.toBeNull()
      expect(finalResult!.status).toBe('completed')

      // Verify status progression pattern
      const statuses = statusHistory.map(h => h.status)
      expect(statuses).toContain('running')
      expect(statuses[statuses.length - 1]).toBe('completed')

      console.log('Visual activity monitoring verification passed')
      console.log(`Status progression: ${statuses.join(' -> ')}`)

    }, TIMEOUT_MS)
  })

  describe('Complex Dependency Scenarios', () => {
    it('should handle diamond dependency pattern', async () => {
      const threadId = `diamond-deps-${Date.now()}`
      
      console.log(`\n=== Starting Diamond Dependency Test (${threadId}) ===`)
      
      // Diamond pattern: A -> B,C -> D
      const workflow = [
        {
          id: 'requirements',
          agentId: REVIEWER_AGENT_ID,
          task: 'Define requirements for a simple calculator: basic operations (add, subtract, multiply, divide)',
        },
        {
          id: 'math_logic',
          agentId: CODER_AGENT_ID,
          task: 'Implement the core math functions based on: {requirements.output}',
          deps: ['requirements'],
        },
        {
          id: 'user_interface',
          agentId: REVIEWER_AGENT_ID, // Use as UI designer
          task: 'Design a simple interface specification based on: {requirements.output}',
          deps: ['requirements'],
        },
        {
          id: 'integration',
          agentId: CODER_AGENT_ID,
          task: 'Integrate the math logic: {math_logic.output} with the interface: {user_interface.output}',
          deps: ['math_logic', 'user_interface'],
        }
      ]

      const response = await ky
        .post(`${API_URL}/invoke`, {
          json: {
            workflow,
            threadId,
            projectId: TEST_PROJECT_ID,
          },
          timeout: TIMEOUT_MS,
        })
        .json<InvokeResponse>()

      expect(response.status).toBe('completed')
      expect(Object.keys(response.results).length).toBe(4)

      // Verify diamond dependency resolution
      expect(response.results.requirements).toBeDefined()
      expect(response.results.math_logic).toBeDefined()
      expect(response.results.user_interface).toBeDefined()
      expect(response.results.integration).toBeDefined()

      // Verify template resolution worked
      expect(response.results.integration).toContain('calculator')

      console.log('Diamond dependency verification passed')

    }, TIMEOUT_MS)
  })
})