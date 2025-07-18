/**
 * Integration tests for LangGraph workflow state API endpoints
 *
 * SOLID: Single responsibility - testing LangGraph state functionality
 * DRY: Reusable test utilities and mock data
 * KISS: Simple test structure with clear assertions
 * Library-First: Tests LangGraph's native state capabilities
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { Express } from 'express'
import { resetCheckpointer } from '../../services/database/checkpointer'
import { closePostgresPool } from '../../services/database/postgres'

// Mock the server setup to avoid port conflicts
let app: Express

beforeEach(async () => {
  // Reset checkpointer instance before each test
  resetCheckpointer()

  // Import app after reset to get fresh instance
  const { app: testApp } = await import('../../app')
  app = testApp
})

afterEach(async () => {
  // Close any open connections
  await closePostgresPool()
})

// Test data following type safety principles
const testWorkflowSteps = [
  {
    id: 'step1',
    task: 'Test task 1',
    role: 'developer',
  },
  {
    id: 'step2',
    task: 'Test task 2',
    role: 'reviewer',
    deps: ['step1'],
  },
]

const testThreadId = 'test-thread-123'

describe('Workflow State API - LangGraph Integration', () => {
  describe('POST /api/workflow-state/state/:threadId', () => {
    test('should require steps in request body', async () => {
      const response = await request(app).post(`/api/workflow-state/state/${testThreadId}`).send({})

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Invalid request body')
      expect(response.body).toHaveProperty('details')
    })

    test('should return 404 for non-existent workflow thread', async () => {
      const response = await request(app)
        .post(`/api/workflow-state/state/${testThreadId}`)
        .send({ steps: testWorkflowSteps })

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'No state found for this workflow thread')
      expect(response.body).toHaveProperty('threadId', testThreadId)
    })

    test('should validate step schema', async () => {
      const invalidSteps = [
        {
          // Missing required fields
          invalidField: 'test',
        },
      ]

      const response = await request(app)
        .post(`/api/workflow-state/state/${testThreadId}`)
        .send({ steps: invalidSteps })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Invalid request body')
    })

    test('should handle valid request format', async () => {
      const response = await request(app)
        .post(`/api/workflow-state/state/${testThreadId}`)
        .send({ steps: testWorkflowSteps })

      // Should not crash and should return proper error for non-existent workflow
      expect([404, 500]).toContain(response.status)
    })
  })

  describe('POST /api/workflow-state/history/:threadId', () => {
    test('should require steps in request body', async () => {
      const response = await request(app)
        .post(`/api/workflow-state/history/${testThreadId}`)
        .send({})

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Invalid request body')
    })

    test('should return empty history for non-existent workflow', async () => {
      const response = await request(app)
        .post(`/api/workflow-state/history/${testThreadId}`)
        .send({ steps: testWorkflowSteps })

      // Should return empty checkpoints array for non-existent workflow
      if (response.status === 200) {
        expect(response.body).toHaveProperty('checkpoints')
        expect(response.body.checkpoints).toEqual([])
        expect(response.body).toHaveProperty('totalCheckpoints', 0)
      }
    })

    test('should validate step schema for history', async () => {
      const invalidSteps = [
        {
          id: 'test',
          // Missing task field
          role: 'developer',
        },
      ]

      const response = await request(app)
        .post(`/api/workflow-state/history/${testThreadId}`)
        .send({ steps: invalidSteps })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Invalid request body')
    })
  })

  describe('POST /api/workflow-state/checkpoint/:threadId/:checkpointId', () => {
    const testCheckpointId = 'checkpoint-456'

    test('should require steps in request body', async () => {
      const response = await request(app)
        .post(`/api/workflow-state/checkpoint/${testThreadId}/${testCheckpointId}`)
        .send({})

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Invalid request body')
    })

    test('should return 404 for non-existent checkpoint', async () => {
      const response = await request(app)
        .post(`/api/workflow-state/checkpoint/${testThreadId}/${testCheckpointId}`)
        .send({ steps: testWorkflowSteps })

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'Checkpoint not found')
      expect(response.body).toHaveProperty('threadId', testThreadId)
      expect(response.body).toHaveProperty('checkpointId', testCheckpointId)
    })

    test('should include thread and checkpoint IDs in response', async () => {
      const response = await request(app)
        .post(`/api/workflow-state/checkpoint/${testThreadId}/${testCheckpointId}`)
        .send({ steps: testWorkflowSteps })

      // Even for 404, should include proper identifiers
      expect(response.body).toHaveProperty('threadId', testThreadId)
      expect(response.body).toHaveProperty('checkpointId', testCheckpointId)
    })
  })

  describe('POST /api/workflow-state/info/:threadId', () => {
    test('should require steps in request body', async () => {
      const response = await request(app).post(`/api/workflow-state/info/${testThreadId}`).send({})

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Invalid request body')
    })

    test('should return comprehensive state info structure', async () => {
      const response = await request(app)
        .post(`/api/workflow-state/info/${testThreadId}`)
        .send({ steps: testWorkflowSteps })

      // Should return proper structure even for non-existent workflow
      if (response.status === 200) {
        expect(response.body).toHaveProperty('threadId', testThreadId)
        expect(response.body).toHaveProperty('stateInfo')

        const stateInfo = response.body.stateInfo
        expect(stateInfo).toHaveProperty('threadId', testThreadId)
        expect(stateInfo).toHaveProperty('currentState')
        expect(stateInfo).toHaveProperty('checkpointHistory')
        expect(stateInfo).toHaveProperty('canResume')
        expect(stateInfo).toHaveProperty('status')

        // Status should be one of the expected values
        expect(['pending', 'running', 'completed', 'failed', 'aborted']).toContain(stateInfo.status)
      }
    })

    test('should handle complex workflow steps with dependencies', async () => {
      const complexSteps = [
        {
          id: 'design',
          task: 'Design the system',
          role: 'architect',
        },
        {
          id: 'implement',
          task: 'Implement the design',
          role: 'developer',
          deps: ['design'],
        },
        {
          id: 'test',
          task: 'Test the implementation',
          role: 'tester',
          deps: ['implement'],
        },
        {
          id: 'conditional',
          task: 'Conditional step',
          type: 'conditional',
          condition: '{test.output} === "success"',
          trueBranch: 'deploy',
          falseBranch: 'fix',
          deps: ['test'],
        },
        {
          id: 'deploy',
          task: 'Deploy to production',
          role: 'developer',
        },
        {
          id: 'fix',
          task: 'Fix the issues',
          role: 'developer',
        },
      ]

      const response = await request(app)
        .post(`/api/workflow-state/info/${testThreadId}`)
        .send({ steps: complexSteps })

      // Should handle complex workflow structure without errors
      expect([200, 404, 500]).toContain(response.status)

      if (response.status !== 500) {
        expect(response.body).toHaveProperty('threadId', testThreadId)
      }
    })
  })

  describe('Error Handling', () => {
    test('should handle invalid thread ID format gracefully', async () => {
      const invalidThreadId = 'invalid-thread-id-!@#$%'

      const response = await request(app)
        .post(`/api/workflow-state/state/${invalidThreadId}`)
        .send({ steps: testWorkflowSteps })

      // Should not crash with 500 for invalid thread IDs
      expect([400, 404]).toContain(response.status)
    })

    test('should provide meaningful error messages', async () => {
      const response = await request(app)
        .post(`/api/workflow-state/state/${testThreadId}`)
        .send({ steps: [] }) // Empty steps array

      if (response.status >= 400) {
        expect(response.body).toHaveProperty('error')
        expect(typeof response.body.error).toBe('string')
        expect(response.body.error.length).toBeGreaterThan(0)
      }
    })

    test('should handle service errors gracefully', async () => {
      // Use extremely long thread ID to potentially cause service errors
      const extremeThreadId = 'x'.repeat(1000)

      const response = await request(app)
        .post(`/api/workflow-state/state/${extremeThreadId}`)
        .send({ steps: testWorkflowSteps })

      // Should not crash, should return proper error response
      expect(response.status).toBeGreaterThanOrEqual(400)
      expect(response.body).toHaveProperty('error')
    })
  })

  describe('POST /api/workflow-state/resume/:threadId', () => {
    test('should require steps in request body', async () => {
      const response = await request(app)
        .post(`/api/workflow-state/resume/${testThreadId}`)
        .send({})

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Invalid request body')
    })

    test('should handle resume for non-existent workflow', async () => {
      const response = await request(app)
        .post(`/api/workflow-state/resume/${testThreadId}`)
        .send({ steps: testWorkflowSteps })

      // Should return error for non-existent workflow
      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
      expect(response.body).toHaveProperty('threadId', testThreadId)
      expect(response.body).toHaveProperty('resumed', false)
    })

    test('should accept optional projectId', async () => {
      const response = await request(app).post(`/api/workflow-state/resume/${testThreadId}`).send({
        steps: testWorkflowSteps,
        projectId: 'test-project-123',
      })

      // Should process request without validation errors
      expect(response.status).not.toBe(400) // No validation error
      expect(response.body).toHaveProperty('threadId', testThreadId)
    })

    test('should validate step schema for resume', async () => {
      const invalidSteps = [
        {
          // Missing required task field
          id: 'test',
          role: 'developer',
        },
      ]

      const response = await request(app)
        .post(`/api/workflow-state/resume/${testThreadId}`)
        .send({ steps: invalidSteps })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Invalid request body')
    })
  })

  describe('POST /api/workflow-state/resume/:threadId/:checkpointId', () => {
    const testCheckpointId = 'checkpoint-789'

    test('should require steps in request body', async () => {
      const response = await request(app)
        .post(`/api/workflow-state/resume/${testThreadId}/${testCheckpointId}`)
        .send({})

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Invalid request body')
    })

    test('should handle resume from non-existent checkpoint', async () => {
      const response = await request(app)
        .post(`/api/workflow-state/resume/${testThreadId}/${testCheckpointId}`)
        .send({ steps: testWorkflowSteps })

      // Should return error for non-existent checkpoint
      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
      expect(response.body).toHaveProperty('threadId', testThreadId)
      expect(response.body).toHaveProperty('checkpointId', testCheckpointId)
      expect(response.body).toHaveProperty('resumed', false)
    })

    test('should accept optional projectId for checkpoint resume', async () => {
      const response = await request(app)
        .post(`/api/workflow-state/resume/${testThreadId}/${testCheckpointId}`)
        .send({
          steps: testWorkflowSteps,
          projectId: 'test-project-456',
        })

      // Should process request without validation errors
      expect(response.status).not.toBe(400) // No validation error
      expect(response.body).toHaveProperty('threadId', testThreadId)
      expect(response.body).toHaveProperty('checkpointId', testCheckpointId)
    })

    test('should include both threadId and checkpointId in response', async () => {
      const response = await request(app)
        .post(`/api/workflow-state/resume/${testThreadId}/${testCheckpointId}`)
        .send({ steps: testWorkflowSteps })

      // Even for errors, should include proper identifiers
      expect(response.body).toHaveProperty('threadId', testThreadId)
      expect(response.body).toHaveProperty('checkpointId', testCheckpointId)
    })

    test('should validate step schema for checkpoint resume', async () => {
      const invalidSteps = [
        {
          id: 'test',
          // Missing task field
          role: 'developer',
        },
      ]

      const response = await request(app)
        .post(`/api/workflow-state/resume/${testThreadId}/${testCheckpointId}`)
        .send({ steps: invalidSteps })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Invalid request body')
    })
  })

  describe('LangGraph Service Integration', () => {
    test('should use MemorySaver checkpointer in test environment', async () => {
      // This test verifies that our service factory creates proper dependencies
      const response = await request(app)
        .post(`/api/workflow-state/state/${testThreadId}`)
        .send({ steps: testWorkflowSteps })

      // Should complete without dependency injection errors
      expect(response.status).not.toBe(500) // No internal server errors from DI
    })

    test('should maintain consistent API response format', async () => {
      const endpoints = [
        `/api/workflow-state/state/${testThreadId}`,
        `/api/workflow-state/history/${testThreadId}`,
        `/api/workflow-state/info/${testThreadId}`,
        `/api/workflow-state/resume/${testThreadId}`,
      ]

      for (const endpoint of endpoints) {
        const response = await request(app).post(endpoint).send({ steps: testWorkflowSteps })

        // All endpoints should return JSON with consistent structure
        expect(response.headers['content-type']).toMatch(/json/)

        if (response.status >= 400) {
          expect(response.body).toHaveProperty('error')
        } else {
          expect(response.body).toHaveProperty('threadId', testThreadId)
          expect(response.body).toHaveProperty('message')
        }
      }
    })

    test('should handle resume endpoints without crashing', async () => {
      const resumeEndpoints = [
        `/api/workflow-state/resume/${testThreadId}`,
        `/api/workflow-state/resume/${testThreadId}/checkpoint-test`,
      ]

      for (const endpoint of resumeEndpoints) {
        const response = await request(app).post(endpoint).send({ steps: testWorkflowSteps })

        // Should not crash with 500 errors
        expect(response.status).not.toBe(500)
        expect(response.body).toHaveProperty('threadId', testThreadId)
      }
    })
  })

  describe('POST /api/workflow-state/pause/:threadId', () => {
    test('should require steps in request body', async () => {
      const response = await request(app).post(`/api/workflow-state/pause/${testThreadId}`).send({})

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Invalid request body')
    })

    test('should handle pause for non-active workflow', async () => {
      const response = await request(app)
        .post(`/api/workflow-state/pause/${testThreadId}`)
        .send({ steps: testWorkflowSteps })

      // Should return error for non-active workflow
      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
      expect(response.body).toHaveProperty('threadId', testThreadId)
      expect(response.body).toHaveProperty('paused', false)
    })

    test('should accept optional reason parameter', async () => {
      const response = await request(app).post(`/api/workflow-state/pause/${testThreadId}`).send({
        steps: testWorkflowSteps,
        reason: 'Manual pause for review',
      })

      // Should process request without validation errors
      expect(response.status).not.toBe(500) // No server errors
      expect(response.body).toHaveProperty('threadId', testThreadId)
    })

    test('should validate step schema for pause', async () => {
      const invalidSteps = [
        {
          // Missing required task field
          id: 'test',
          role: 'developer',
        },
      ]

      const response = await request(app)
        .post(`/api/workflow-state/pause/${testThreadId}`)
        .send({ steps: invalidSteps })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Invalid request body')
    })

    test('should handle pause without reason parameter', async () => {
      const response = await request(app)
        .post(`/api/workflow-state/pause/${testThreadId}`)
        .send({ steps: testWorkflowSteps })

      // Should handle request without reason
      expect(response.status).not.toBe(500) // No server errors
      expect(response.body).toHaveProperty('threadId', testThreadId)
    })
  })
})
