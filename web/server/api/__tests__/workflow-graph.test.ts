/**
 * Workflow Graph API Tests
 * Tests the graph visualization endpoint with mocked data
 *
 * KISS: Simple tests for graph generation
 * DRY: Reuses mock infrastructure
 * SOLID: Tests single responsibility
 * Library-First: Uses vitest and mocked data
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import workflowGraphRouter from '../workflow-graph'
import { WorkflowRegistry } from '../../services/WorkflowRegistry'
import type { WorkflowMetadata } from '../../services/WorkflowRegistry'

// Mock the WorkflowRegistry
vi.mock('../../services/WorkflowRegistry', () => ({
  WorkflowRegistry: {
    getInstance: vi.fn().mockReturnValue({
      initialize: vi.fn().mockResolvedValue(undefined),
      getWorkflow: vi.fn(),
    }),
  },
}))

// Mock WorkflowOrchestrator
vi.mock('../../services/WorkflowOrchestrator', () => ({
  WorkflowOrchestrator: vi.fn().mockImplementation(() => ({
    generateWorkflowGraph: vi.fn().mockReturnValue({
      nodes: [
        {
          id: 'step-0',
          type: 'step',
          data: {
            agentId: 'dev_01',
            task: 'Write hello world function',
            status: 'completed',
            output: 'function hello() { return "Hello World"; }',
            sessionId: 'session-123',
          },
          position: { x: 100, y: 100 },
        },
        {
          id: 'step-1',
          type: 'step',
          data: {
            agentId: 'reviewer_01',
            task: 'Review code: {step-0.output}',
            status: 'completed',
            output: 'Code looks good!',
            sessionId: 'session-456',
          },
          position: { x: 400, y: 100 },
        },
      ],
      edges: [
        {
          id: 'step-0-step-1',
          source: 'step-0',
          target: 'step-1',
          type: 'dependency',
          animated: false,
        },
      ],
      execution: {
        path: ['step-0', 'step-1'],
        loops: [],
        currentNode: undefined,
        resumePoints: [],
        startTime: Date.now() - 10000,
        endTime: Date.now(),
      },
    }),
  })),
}))

describe('Workflow Graph API', () => {
  let app: express.Application
  let mockRegistry: ReturnType<typeof WorkflowRegistry.getInstance>

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/api/workflow-graph', workflowGraphRouter)

    mockRegistry = WorkflowRegistry.getInstance()
    vi.clearAllMocks()
  })

  it('should return 404 for non-existent workflow', async () => {
    mockRegistry.getWorkflow = vi.fn().mockResolvedValue(null)

    const response = await request(app).get('/api/workflow-graph/non-existent-thread').expect(404)

    expect(response.body).toEqual({
      error: 'Workflow not found',
      message: 'No workflow found with threadId: non-existent-thread',
    })
  })

  it('should generate graph for simple workflow', async () => {
    const mockWorkflow: WorkflowMetadata = {
      threadId: 'test-thread-123',
      status: 'completed',
      projectId: 'test-project',
      projectName: 'Test Project',
      lastUpdate: new Date().toISOString(),
      sessionIds: {
        'step-0': 'session-123',
        'step-1': 'session-456',
      },
      steps: [
        {
          id: 'step-0',
          agentId: 'dev_01',
          task: 'Write hello world function',
          status: 'completed',
        },
        {
          id: 'step-1',
          agentId: 'reviewer_01',
          task: 'Review code: {step-0.output}',
          status: 'completed',
          dependencies: ['step-0'],
        },
      ],
      createdAt: new Date().toISOString(),
    }

    mockRegistry.getWorkflow = vi.fn().mockResolvedValue(mockWorkflow)

    const response = await request(app).get('/api/workflow-graph/test-thread-123').expect(200)

    expect(response.body).toMatchObject({
      threadId: 'test-thread-123',
      status: 'completed',
      projectId: 'test-project',
      projectName: 'Test Project',
      graph: {
        nodes: expect.arrayContaining([
          expect.objectContaining({
            id: 'step-0',
            type: 'step',
          }),
          expect.objectContaining({
            id: 'step-1',
            type: 'step',
          }),
        ]),
        edges: expect.arrayContaining([
          expect.objectContaining({
            source: 'step-0',
            target: 'step-1',
            type: 'dependency',
          }),
        ]),
      },
      metadata: {
        totalSteps: 2,
        completedSteps: 2,
        failedSteps: 0,
        blockedSteps: 0,
      },
    })
  })

  it('should handle workflow with loops', async () => {
    const mockWorkflow: WorkflowMetadata = {
      threadId: 'loop-workflow',
      status: 'completed',
      lastUpdate: new Date().toISOString(),
      sessionIds: {
        coder: 'session-1',
        reviewer: 'session-2',
        revision: 'session-3',
      },
      steps: [
        {
          id: 'coder',
          role: 'developer',
          task: 'Write sorting algorithm',
          status: 'completed',
        },
        {
          id: 'reviewer',
          role: 'reviewer',
          task: 'Review algorithm: {coder.output}',
          status: 'completed',
          dependencies: ['coder'],
        },
        {
          id: 'revision',
          role: 'developer',
          task: 'Revise based on: {reviewer.output}',
          status: 'completed',
          dependencies: ['reviewer'],
        },
      ],
      createdAt: new Date().toISOString(),
    }

    mockRegistry.getWorkflow = vi.fn().mockResolvedValue(mockWorkflow)

    const response = await request(app).get('/api/workflow-graph/loop-workflow').expect(200)

    expect(response.body.graph.nodes).toHaveLength(3)
    expect(response.body.metadata.completedSteps).toBe(3)
  })

  it('should handle workflow with failed steps', async () => {
    const mockWorkflow: WorkflowMetadata = {
      threadId: 'failed-workflow',
      status: 'failed',
      lastUpdate: new Date().toISOString(),
      sessionIds: {
        step1: 'session-1',
        step2: 'session-2',
      },
      steps: [
        {
          id: 'step1',
          task: 'First step',
          status: 'completed',
        },
        {
          id: 'step2',
          task: 'Second step that fails',
          status: 'failed',
          error: 'Something went wrong',
          dependencies: ['step1'],
        },
      ],
      createdAt: new Date().toISOString(),
    }

    mockRegistry.getWorkflow = vi.fn().mockResolvedValue(mockWorkflow)

    const response = await request(app).get('/api/workflow-graph/failed-workflow').expect(200)

    expect(response.body.status).toBe('failed')
    expect(response.body.metadata.failedSteps).toBe(1)
    expect(response.body.metadata.completedSteps).toBe(1)
  })

  it('should handle error during graph generation', async () => {
    mockRegistry.getWorkflow = vi.fn().mockRejectedValue(new Error('Database error'))

    const response = await request(app).get('/api/workflow-graph/error-workflow').expect(500)

    expect(response.body).toEqual({
      error: 'Failed to generate workflow graph',
      message: 'Database error',
    })
  })
})
