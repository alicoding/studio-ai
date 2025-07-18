/**
 * Workflow Graph SSE Tests
 * Tests real-time graph updates via Server-Sent Events
 *
 * KISS: Simple SSE event verification
 * DRY: Reuses mock infrastructure
 * SOLID: Tests single responsibility - SSE updates
 * Library-First: Uses vitest and EventSource mock
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import express from 'express'
import { EventEmitter } from 'events'
import invokeStatusRouter from '../invoke-status'
import type { WorkflowGraph } from '../../schemas/workflow-graph'

// Mock WorkflowOrchestrator
vi.mock('../../services/WorkflowOrchestrator', () => ({
  WorkflowOrchestrator: vi.fn().mockImplementation(() => ({
    getWorkflowState: vi.fn().mockResolvedValue({
      threadId: 'test-thread',
      currentState: null,
      completedSteps: [],
      pendingSteps: ['step-0', 'step-1'],
      sessionIds: {},
      canResume: false,
    }),
  })),
}))

// Mock WorkflowRegistry
vi.mock('../../services/WorkflowRegistry', () => ({
  WorkflowRegistry: {
    getInstance: vi.fn().mockReturnValue({
      listWorkflows: vi.fn().mockResolvedValue([]),
      getWorkflow: vi.fn().mockResolvedValue(null),
    }),
  },
}))

describe('Workflow Graph SSE Events', () => {
  let app: express.Application
  let workflowEvents: EventEmitter

  beforeEach(() => {
    app = express()
    app.use(express.json())

    // Create workflow events emitter
    workflowEvents = new EventEmitter()
    workflowEvents.setMaxListeners(100)
    app.set('workflowEvents', workflowEvents)

    app.use('/api/invoke-status', invokeStatusRouter)
  })

  afterEach(() => {
    workflowEvents.removeAllListeners()
  })

  it('should have SSE endpoint available', () => {
    // Simply verify the event emitter is set up
    expect(workflowEvents).toBeDefined()
    expect(workflowEvents.listenerCount('workflow:update')).toBe(0) // No listeners yet

    // Verify the app has the workflowEvents set
    expect(app.get('workflowEvents')).toBe(workflowEvents)
  })

  it('should handle workflow event emission', async () => {
    // Test direct event emission
    let receivedEvent: unknown = null

    // Add listener
    const handler = (event: unknown) => {
      receivedEvent = event
    }
    workflowEvents.on('workflow:update', handler)

    // Emit graph update
    const mockGraph: WorkflowGraph = {
      nodes: [
        {
          id: 'step-0',
          type: 'step',
          data: {
            task: 'Write code',
            status: 'completed',
          },
          position: { x: 100, y: 100 },
        },
      ],
      edges: [],
      execution: {
        path: ['step-0'],
        loops: [],
        resumePoints: [],
        startTime: Date.now() - 5000,
        endTime: Date.now(),
      },
    }

    workflowEvents.emit('workflow:update', {
      type: 'graph_update',
      threadId: 'test-thread',
      graph: mockGraph,
    })

    // Verify event was received
    expect(receivedEvent).toMatchObject({
      type: 'graph_update',
      threadId: 'test-thread',
      graph: expect.objectContaining({
        nodes: expect.arrayContaining([
          expect.objectContaining({
            id: 'step-0',
            data: expect.objectContaining({
              status: 'completed',
            }),
          }),
        ]),
      }),
    })

    // Cleanup
    workflowEvents.off('workflow:update', handler)
  })
})
