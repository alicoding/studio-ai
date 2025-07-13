/**
 * Test for orphaned workflow detection on server startup
 */

import { WorkflowMonitor } from '../WorkflowMonitor'
import { WorkflowRegistry } from '../WorkflowRegistry'
import { updateWorkflowStatus } from '../../api/invoke-status'

// Mock dependencies
jest.mock('../WorkflowRegistry')
jest.mock('../../api/invoke-status')

describe('WorkflowMonitor - Orphaned Workflow Detection', () => {
  let monitor: WorkflowMonitor
  let mockRegistry: jest.Mocked<Pick<WorkflowRegistry, 'listWorkflows' | 'updateWorkflow'>>

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks()
    
    // Get singleton instance
    monitor = WorkflowMonitor.getInstance()
    
    // Mock registry with proper typing
    mockRegistry = {
      listWorkflows: jest.fn(),
      updateWorkflow: jest.fn(),
    }
    
    // Mock WorkflowRegistry.getInstance
    ;(WorkflowRegistry.getInstance as jest.Mock).mockReturnValue(mockRegistry)
  })

  describe('checkOrphanedWorkflows', () => {
    it('should do nothing when no running workflows exist', async () => {
      // Mock no running workflows
      mockRegistry.listWorkflows.mockResolvedValue([])

      await monitor.checkOrphanedWorkflows()

      expect(mockRegistry.listWorkflows).toHaveBeenCalledWith({ status: 'running' })
      expect(mockRegistry.updateWorkflow).not.toHaveBeenCalled()
      expect(updateWorkflowStatus).not.toHaveBeenCalled()
    })

    it('should mark running workflows as aborted', async () => {
      // Mock running workflows
      const runningWorkflows = [
        {
          threadId: 'workflow-1',
          status: 'running' as const,
          steps: [
            { id: 'step-1', status: 'completed' as const, task: 'Task 1' },
            { id: 'step-2', status: 'running' as const, task: 'Task 2' },
            { id: 'step-3', status: 'pending' as const, task: 'Task 3' },
          ],
          lastUpdate: new Date().toISOString(),
          sessionIds: {},
          createdAt: new Date().toISOString(),
        },
        {
          threadId: 'workflow-2',
          status: 'running' as const,
          steps: [
            { id: 'step-1', status: 'running' as const, task: 'Task 1' },
          ],
          lastUpdate: new Date().toISOString(),
          sessionIds: {},
          createdAt: new Date().toISOString(),
        },
      ]

      mockRegistry.listWorkflows.mockResolvedValue(runningWorkflows)
      mockRegistry.updateWorkflow.mockResolvedValue(undefined)

      await monitor.checkOrphanedWorkflows()

      // Verify registry was queried for running workflows
      expect(mockRegistry.listWorkflows).toHaveBeenCalledWith({ status: 'running' })

      // Verify each workflow was updated
      expect(mockRegistry.updateWorkflow).toHaveBeenCalledTimes(2)

      // Check workflow-1 update
      expect(mockRegistry.updateWorkflow).toHaveBeenCalledWith('workflow-1', {
        status: 'aborted',
        steps: [
          { id: 'step-1', status: 'completed', task: 'Task 1' },
          { id: 'step-2', status: 'failed', task: 'Task 2', error: 'Aborted due to server restart' },
          { id: 'step-3', status: 'pending', task: 'Task 3' },
        ],
      })

      // Check workflow-2 update
      expect(mockRegistry.updateWorkflow).toHaveBeenCalledWith('workflow-2', {
        status: 'aborted',
        steps: [
          { id: 'step-1', status: 'failed', task: 'Task 1', error: 'Aborted due to server restart' },
        ],
      })

      // Verify in-memory status updates
      expect(updateWorkflowStatus).toHaveBeenCalledTimes(2)
      expect(updateWorkflowStatus).toHaveBeenCalledWith('workflow-1', { status: 'aborted' })
      expect(updateWorkflowStatus).toHaveBeenCalledWith('workflow-2', { status: 'aborted' })
    })

    it('should handle errors gracefully', async () => {
      // Mock registry error
      mockRegistry.listWorkflows.mockRejectedValue(new Error('Database connection failed'))

      // Should not throw
      await expect(monitor.checkOrphanedWorkflows()).resolves.toBeUndefined()

      expect(mockRegistry.updateWorkflow).not.toHaveBeenCalled()
    })

    it('should continue processing even if one workflow update fails', async () => {
      const runningWorkflows = [
        {
          threadId: 'workflow-1',
          status: 'running' as const,
          steps: [],
          lastUpdate: new Date().toISOString(),
          sessionIds: {},
          createdAt: new Date().toISOString(),
        },
        {
          threadId: 'workflow-2',
          status: 'running' as const,
          steps: [],
          lastUpdate: new Date().toISOString(),
          sessionIds: {},
          createdAt: new Date().toISOString(),
        },
      ]

      mockRegistry.listWorkflows.mockResolvedValue(runningWorkflows)
      
      // First update fails, second succeeds
      mockRegistry.updateWorkflow
        .mockRejectedValueOnce(new Error('Update failed'))
        .mockResolvedValueOnce(undefined)

      await monitor.checkOrphanedWorkflows()

      // Both workflows should be attempted
      expect(mockRegistry.updateWorkflow).toHaveBeenCalledTimes(2)
      expect(updateWorkflowStatus).toHaveBeenCalledWith('workflow-2', { status: 'aborted' })
    })
  })
})