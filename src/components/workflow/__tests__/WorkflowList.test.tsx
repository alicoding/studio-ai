/**
 * Comprehensive tests for WorkflowList component
 *
 * SOLID: Single responsibility - test workflow list display and interactions
 * DRY: Reusable mock factories and test utilities
 * KISS: Clear test scenarios with descriptive names
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WorkflowList } from '../WorkflowList'
import { useWorkflowStore, WorkflowInfo } from '../../../stores/workflows'
import { useWorkflowSSE } from '../../../hooks/useWorkflowSSE'

// Mock the workflow store
vi.mock('../../../stores/workflows', () => ({
  useWorkflowStore: vi.fn(),
}))

// Mock the useWorkflowSSE hook
vi.mock('../../../hooks/useWorkflowSSE', () => ({
  useWorkflowSSE: vi.fn(),
}))

// Mock fetch for retry functionality
global.fetch = vi.fn()

// Mock console methods to avoid test noise
const consoleSpy = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
}

describe('WorkflowList', () => {
  let mockWorkflows: Record<string, WorkflowInfo>
  let mockFetch: Mock

  // Type for mocked workflow store
  type MockWorkflowStore = {
    workflows: Record<string, WorkflowInfo>
  }

  const mockStore = (workflows: Record<string, WorkflowInfo>): MockWorkflowStore => ({
    workflows,
  })

  const createMockWorkflow = (overrides: Partial<WorkflowInfo> = {}): WorkflowInfo => ({
    threadId: 'test-thread-123',
    status: 'running',
    startedBy: 'Claude Code CLI',
    invocation: 'Test workflow invocation',
    projectId: 'project-123',
    projectName: 'Test Project',
    webhook: 'http://localhost:8080/webhook',
    webhookType: 'tmux send-keys',
    currentStep: 'step1',
    steps: [
      {
        id: 'step1',
        role: 'developer',
        agentId: 'dev_01',
        task: 'Create test files',
        status: 'running',
        startTime: '2025-01-09T10:00:00Z',
        dependencies: [],
      },
    ],
    lastUpdate: '2025-01-09T10:00:00Z',
    sessionIds: { dev_01: 'session-123' },
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()

    mockWorkflows = {}
    mockFetch = vi.mocked(fetch)

    // Setup store mock
    vi.mocked(useWorkflowStore).mockReturnValue(mockStore(mockWorkflows))

    // Setup SSE hook mock
    vi.mocked(useWorkflowSSE).mockReturnValue({
      isConnected: true,
      error: null,
      disconnect: vi.fn(),
      reconnect: vi.fn(),
    })
  })

  afterEach(() => {
    consoleSpy.log.mockClear()
    consoleSpy.error.mockClear()
  })

  describe('Empty State', () => {
    it('should display empty state when no workflows exist', () => {
      // Act
      render(<WorkflowList />)

      // Assert
      expect(screen.getByText('No workflows to display')).toBeInTheDocument()
    })

    it('should apply custom className to empty state', () => {
      // Act
      render(<WorkflowList className="custom-class" />)

      // Assert
      const emptyState = screen.getByText('No workflows to display')
      expect(emptyState).toHaveClass('custom-class')
    })
  })

  describe('Workflow Display', () => {
    beforeEach(() => {
      const workflow = createMockWorkflow()
      mockWorkflows = { [workflow.threadId]: workflow }

      vi.mocked(useWorkflowStore).mockReturnValue(mockStore(mockWorkflows))
    })

    it('should display workflow header information', () => {
      // Act
      render(<WorkflowList />)

      // Assert
      expect(screen.getByText('Workflow test-thr...')).toBeInTheDocument()
      expect(screen.getByText('(running)')).toBeInTheDocument()
      expect(screen.getByText('Workflows (1)')).toBeInTheDocument()
    })

    it('should display workflow context information', () => {
      // Act
      render(<WorkflowList />)

      // Assert
      expect(screen.getByText(/Invocation:/)).toBeInTheDocument()
      expect(screen.getByText(/Test workflow invocation/)).toBeInTheDocument()
      expect(screen.getByText(/Started by:/)).toBeInTheDocument()
      expect(screen.getByText(/Claude Code CLI/)).toBeInTheDocument()
      expect(screen.getByText(/Project:/)).toBeInTheDocument()
      expect(screen.getByText(/Test Project/)).toBeInTheDocument()
    })

    it('should display webhook information when configured', () => {
      // Act
      render(<WorkflowList />)

      // Assert
      expect(screen.getByText(/Webhook:/)).toBeInTheDocument()
      expect(screen.getByText(/http:\/\/localhost:8080\/webhook/)).toBeInTheDocument()
      expect(screen.getByText(/(tmux send-keys)/)).toBeInTheDocument()
    })

    it('should display "Not configured" when webhook is missing', () => {
      // Arrange
      const workflow = createMockWorkflow({ webhook: undefined, webhookType: undefined })
      mockWorkflows = { [workflow.threadId]: workflow }

      vi.mocked(useWorkflowStore).mockReturnValue(mockStore(mockWorkflows))

      // Act
      render(<WorkflowList />)

      // Assert
      expect(screen.getByText(/Webhook:/)).toBeInTheDocument()
      expect(screen.getByText(/Not configured/)).toBeInTheDocument()
    })

    it('should truncate long invocation text', () => {
      // Arrange
      const longInvocation =
        'This is a very long workflow invocation that should be truncated because it exceeds the character limit'
      const workflow = createMockWorkflow({ invocation: longInvocation })
      mockWorkflows = { [workflow.threadId]: workflow }

      vi.mocked(useWorkflowStore).mockReturnValue(mockStore(mockWorkflows))

      // Act
      render(<WorkflowList />)

      // Assert
      const truncatedText = screen.getByText(
        /This is a very long workflow invocation that should be\.\.\./
      )
      expect(truncatedText).toBeInTheDocument()
    })
  })

  describe('Step Display', () => {
    it('should display step information with status icons', () => {
      // Act
      render(<WorkflowList />)

      // Assert
      expect(screen.getByText('step1:')).toBeInTheDocument()
      expect(screen.getByText('"Create test files"')).toBeInTheDocument()
      expect(screen.getByText('(dev_01)')).toBeInTheDocument()
      expect(screen.getByText('🔄')).toBeInTheDocument() // Running status icon
    })

    it('should display step duration for completed steps', () => {
      // Arrange
      const workflow = createMockWorkflow({
        steps: [
          {
            id: 'step1',
            role: 'developer',
            agentId: 'dev_01',
            task: 'Completed task',
            status: 'completed',
            startTime: '2025-01-09T10:00:00Z',
            endTime: '2025-01-09T10:05:00Z',
            dependencies: [],
          },
        ],
      })
      mockWorkflows = { [workflow.threadId]: workflow }

      vi.mocked(useWorkflowStore).mockReturnValue(mockStore(mockWorkflows))

      // Act
      render(<WorkflowList />)

      // Assert
      expect(screen.getByText('✅')).toBeInTheDocument() // Completed status icon
      expect(screen.getByText('300s')).toBeInTheDocument() // Duration calculation
    })

    it('should display step error messages', () => {
      // Arrange
      const workflow = createMockWorkflow({
        steps: [
          {
            id: 'step1',
            role: 'developer',
            agentId: 'dev_01',
            task: 'Failed task',
            status: 'failed',
            startTime: '2025-01-09T10:00:00Z',
            endTime: '2025-01-09T10:03:00Z',
            error: 'Agent conflict detected',
            dependencies: [],
          },
        ],
      })
      mockWorkflows = { [workflow.threadId]: workflow }

      vi.mocked(useWorkflowStore).mockReturnValue(mockStore(mockWorkflows))

      // Act
      render(<WorkflowList />)

      // Assert
      expect(screen.getByText('❌')).toBeInTheDocument() // Failed status icon
      expect(screen.getByText('Error: Agent conflict detected')).toBeInTheDocument()
    })

    it('should handle multiple steps correctly', () => {
      // Arrange
      const workflow = createMockWorkflow({
        steps: [
          {
            id: 'step1',
            role: 'developer',
            agentId: 'dev_01',
            task: 'First step',
            status: 'completed',
            startTime: '2025-01-09T10:00:00Z',
            endTime: '2025-01-09T10:05:00Z',
            dependencies: [],
          },
          {
            id: 'step2',
            role: 'reviewer',
            agentId: 'reviewer_01',
            task: 'Second step',
            status: 'running',
            startTime: '2025-01-09T10:05:00Z',
            dependencies: ['step1'],
          },
          {
            id: 'step3',
            role: 'tester',
            agentId: 'tester_01',
            task: 'Third step',
            status: 'pending',
            dependencies: ['step2'],
          },
        ],
      })
      mockWorkflows = { [workflow.threadId]: workflow }

      vi.mocked(useWorkflowStore).mockReturnValue(mockStore(mockWorkflows))

      // Act
      render(<WorkflowList />)

      // Assert
      expect(screen.getByText('step1:')).toBeInTheDocument()
      expect(screen.getByText('step2:')).toBeInTheDocument()
      expect(screen.getByText('step3:')).toBeInTheDocument()
      expect(screen.getByText('✅')).toBeInTheDocument() // Completed
      expect(screen.getByText('🔄')).toBeInTheDocument() // Running
      expect(screen.getByText('⏳')).toBeInTheDocument() // Pending
    })
  })

  describe('Live Indicator', () => {
    it('should show live indicator when workflows are running', () => {
      // Arrange
      const workflow1 = createMockWorkflow({ threadId: 'thread-1', status: 'running' })
      const workflow2 = createMockWorkflow({ threadId: 'thread-2', status: 'completed' })
      mockWorkflows = {
        [workflow1.threadId]: workflow1,
        [workflow2.threadId]: workflow2,
      }

      vi.mocked(useWorkflowStore).mockReturnValue(mockStore(mockWorkflows))

      // Act
      render(<WorkflowList />)

      // Assert
      expect(screen.getByText('Live')).toBeInTheDocument()
      expect(screen.getByText('●')).toBeInTheDocument()
    })

    it('should not show live indicator when no workflows are running', () => {
      // Arrange
      const workflow = createMockWorkflow({ status: 'completed' })
      mockWorkflows = { [workflow.threadId]: workflow }

      vi.mocked(useWorkflowStore).mockReturnValue(mockStore(mockWorkflows))

      // Act
      render(<WorkflowList />)

      // Assert
      expect(screen.queryByText('Live')).not.toBeInTheDocument()
    })
  })

  describe('SSE Connection Status', () => {
    it('should show disconnection warning for running workflows', () => {
      // Arrange
      vi.mocked(useWorkflowSSE).mockReturnValue({
        isConnected: false,
        error: null,
        disconnect: vi.fn(),
        reconnect: vi.fn(),
      })

      // Act
      render(<WorkflowList />)

      // Assert
      expect(screen.getByTitle('SSE disconnected')).toBeInTheDocument()
      expect(screen.getByText('📡❌')).toBeInTheDocument()
    })

    it('should show error indicator when SSE has errors', () => {
      // Arrange
      vi.mocked(useWorkflowSSE).mockReturnValue({
        isConnected: true,
        error: 'Connection failed',
        disconnect: vi.fn(),
        reconnect: vi.fn(),
      })

      // Act
      render(<WorkflowList />)

      // Assert
      expect(screen.getByTitle('SSE error: Connection failed')).toBeInTheDocument()
      expect(screen.getByText('⚠️')).toBeInTheDocument()
    })

    it('should not show connection indicators when connected and no errors', () => {
      // Act
      render(<WorkflowList />)

      // Assert
      expect(screen.queryByTitle(/SSE/)).not.toBeInTheDocument()
    })
  })

  describe('Retry Functionality', () => {
    beforeEach(() => {
      const failedWorkflow = createMockWorkflow({
        status: 'failed',
        steps: [
          {
            id: 'step1',
            role: 'developer',
            agentId: 'dev_01',
            task: 'Failed task',
            status: 'failed',
            error: 'Test error',
            dependencies: [],
          },
        ],
      })
      mockWorkflows = { [failedWorkflow.threadId]: failedWorkflow }

      vi.mocked(useWorkflowStore).mockReturnValue(mockStore(mockWorkflows))
    })

    it('should show retry button for failed workflows', () => {
      // Act
      render(<WorkflowList />)

      // Assert
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })

    it('should not show retry button for non-failed workflows', () => {
      // Arrange
      const runningWorkflow = createMockWorkflow({ status: 'running' })
      mockWorkflows = { [runningWorkflow.threadId]: runningWorkflow }

      vi.mocked(useWorkflowStore).mockReturnValue(mockStore(mockWorkflows))

      // Act
      render(<WorkflowList />)

      // Assert
      expect(screen.queryByText('Retry')).not.toBeInTheDocument()
    })

    it('should call retry API when retry button is clicked', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)

      // Act
      render(<WorkflowList />)
      const retryButton = screen.getByText('Retry')
      fireEvent.click(retryButton)

      // Assert
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/invoke/async', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            threadId: 'test-thread-123',
            workflow: [
              {
                id: 'step1',
                role: 'developer',
                agentId: 'dev_01',
                task: 'Failed task',
                dependencies: [],
              },
            ],
          }),
        })
      })
    })

    it('should handle retry API errors gracefully', async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // Act
      render(<WorkflowList />)
      const retryButton = screen.getByText('Retry')
      fireEvent.click(retryButton)

      // Assert
      await waitFor(() => {
        expect(consoleSpy.error).toHaveBeenCalledWith(
          'Failed to retry workflow:',
          expect.any(Error)
        )
      })
    })

    it('should handle retry API response errors', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      } as Response)

      // Act
      render(<WorkflowList />)
      const retryButton = screen.getByText('Retry')
      fireEvent.click(retryButton)

      // Assert
      await waitFor(() => {
        expect(consoleSpy.error).toHaveBeenCalledWith(
          'Failed to retry workflow:',
          expect.any(Error)
        )
      })
    })
  })

  describe('Workflow Sorting', () => {
    it('should sort running workflows first', () => {
      // Arrange
      const completedWorkflow = createMockWorkflow({
        threadId: 'completed-1',
        status: 'completed',
        lastUpdate: '2025-01-09T10:30:00Z',
      })
      const runningWorkflow = createMockWorkflow({
        threadId: 'running-1',
        status: 'running',
        lastUpdate: '2025-01-09T10:00:00Z',
      })

      mockWorkflows = {
        [completedWorkflow.threadId]: completedWorkflow,
        [runningWorkflow.threadId]: runningWorkflow,
      }

      vi.mocked(useWorkflowStore).mockReturnValue(mockStore(mockWorkflows))

      // Act
      render(<WorkflowList />)

      // Assert
      const workflowElements = screen.getAllByText(/Workflow/)
      expect(workflowElements[0]).toHaveTextContent('running-1')
      expect(workflowElements[1]).toHaveTextContent('completed-1')
    })

    it('should sort by lastUpdate for workflows with same status', () => {
      // Arrange
      const olderWorkflow = createMockWorkflow({
        threadId: 'older-1',
        status: 'completed',
        lastUpdate: '2025-01-09T10:00:00Z',
      })
      const newerWorkflow = createMockWorkflow({
        threadId: 'newer-1',
        status: 'completed',
        lastUpdate: '2025-01-09T10:30:00Z',
      })

      mockWorkflows = {
        [olderWorkflow.threadId]: olderWorkflow,
        [newerWorkflow.threadId]: newerWorkflow,
      }

      vi.mocked(useWorkflowStore).mockReturnValue(mockStore(mockWorkflows))

      // Act
      render(<WorkflowList />)

      // Assert
      const workflowElements = screen.getAllByText(/Workflow/)
      expect(workflowElements[0]).toHaveTextContent('newer-1')
      expect(workflowElements[1]).toHaveTextContent('older-1')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and structure', () => {
      // Act
      render(<WorkflowList />)

      // Assert
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Workflows (1)')
    })

    it('should have accessible button for retry functionality', () => {
      // Arrange
      const failedWorkflow = createMockWorkflow({ status: 'failed' })
      mockWorkflows = { [failedWorkflow.threadId]: failedWorkflow }

      vi.mocked(useWorkflowStore).mockReturnValue(mockStore(mockWorkflows))

      // Act
      render(<WorkflowList />)

      // Assert
      const retryButton = screen.getByRole('button', { name: 'Retry' })
      expect(retryButton).toBeInTheDocument()
      expect(retryButton).toHaveClass('hover:bg-blue-600')
    })
  })

  describe('Custom Styling', () => {
    it('should apply custom className to container', () => {
      // Act
      const { container } = render(<WorkflowList className="custom-workflow-list" />)

      // Assert
      expect(container.firstChild).toHaveClass('custom-workflow-list')
    })

    it('should maintain default styling alongside custom className', () => {
      // Act
      const { container } = render(<WorkflowList className="custom-class" />)

      // Assert
      const element = container.firstChild as HTMLElement
      expect(element.className).toContain('custom-class')
      expect(element.className).toContain('text-center') // Default empty state class
    })
  })
})
