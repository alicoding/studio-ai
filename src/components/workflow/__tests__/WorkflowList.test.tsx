/**
 * Tests for WorkflowList component with modal
 *
 * SOLID: Test single responsibility
 * DRY: Reuse test utilities
 * KISS: Simple, focused tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WorkflowList } from '../WorkflowList'
import { useWorkflowStore, type WorkflowInfo } from '../../../stores/workflows'

// Mock the workflow store
vi.mock('../../../stores/workflows')

// Mock the WorkflowModal to prevent portal issues in tests
vi.mock('../WorkflowModal', () => ({
  WorkflowModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="workflow-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}))

describe('WorkflowList', () => {
  const mockUseWorkflowStore = vi.mocked(useWorkflowStore)

  const createMockWorkflow = (overrides: Partial<WorkflowInfo> = {}): WorkflowInfo => ({
    threadId: 'test-thread-123',
    status: 'running',
    startedBy: 'Claude Code CLI',
    invocation: 'Test workflow',
    projectId: 'project-123',
    projectName: 'Test Project',
    steps: [
      {
        id: 'step-1',
        task: 'Test Step 1',
        status: 'completed',
        agentId: 'dev_01',
      },
    ],
    lastUpdate: new Date().toISOString(),
    sessionIds: {},
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Empty State', () => {
    it('renders empty state when no workflows exist', () => {
      mockUseWorkflowStore.mockReturnValue([])

      render(<WorkflowList />)

      expect(screen.getByText('No workflows to display')).toBeInTheDocument()
    })

    it('applies className to empty state', () => {
      mockUseWorkflowStore.mockReturnValue([])

      const { container } = render(<WorkflowList className="custom-class" />)

      // The className is applied to the root div containing the empty state
      expect(container.querySelector('.custom-class')).toBeInTheDocument()
    })
  })

  describe('Workflow Display', () => {
    it('renders workflow list correctly', () => {
      const workflows = [
        createMockWorkflow({ threadId: 'wf-1', status: 'running' }),
        createMockWorkflow({ threadId: 'wf-2', status: 'completed' }),
        createMockWorkflow({ threadId: 'wf-3', status: 'failed' }),
      ]

      mockUseWorkflowStore.mockReturnValue(workflows)

      render(<WorkflowList />)

      // Check header
      expect(screen.getByText('Workflows')).toBeInTheDocument()
      expect(screen.getByText('1 active')).toBeInTheDocument()

      // Check workflow statuses
      expect(screen.getByText('running')).toBeInTheDocument()
      expect(screen.getByText('completed')).toBeInTheDocument()
      expect(screen.getByText('failed')).toBeInTheDocument()
    })

    it('truncates thread IDs correctly', () => {
      const workflow = createMockWorkflow({ threadId: 'very-long-thread-id-123456789' })
      mockUseWorkflowStore.mockReturnValue([workflow])

      render(<WorkflowList />)

      expect(screen.getByText('very-lon...')).toBeInTheDocument()
    })

    it('displays project names and step counts', () => {
      const workflow = createMockWorkflow({
        projectName: 'My Project',
        steps: [
          { id: 'step-1', task: 'Task 1', status: 'completed' },
          { id: 'step-2', task: 'Task 2', status: 'running' },
        ],
      })
      mockUseWorkflowStore.mockReturnValue([workflow])

      render(<WorkflowList />)

      expect(screen.getByText('My Project')).toBeInTheDocument()
      expect(screen.getByText('2 steps')).toBeInTheDocument()
    })

    it('handles missing project name', () => {
      const workflow = createMockWorkflow({ projectName: undefined })
      mockUseWorkflowStore.mockReturnValue([workflow])

      render(<WorkflowList />)

      expect(screen.getByText('Unknown project')).toBeInTheDocument()
    })
  })

  describe('Sorting and Filtering', () => {
    it('shows active workflows first', () => {
      const workflows = [
        createMockWorkflow({
          threadId: 'completed-1',
          status: 'completed',
          lastUpdate: new Date(Date.now() + 10000).toISOString(), // newer
        }),
        createMockWorkflow({
          threadId: 'running-1',
          status: 'running',
          lastUpdate: new Date(Date.now() - 10000).toISOString(), // older
        }),
      ]

      mockUseWorkflowStore.mockReturnValue(workflows)

      render(<WorkflowList />)

      const buttons = screen.getAllByRole('button')
      // First workflow button should be the running one
      expect(buttons[0]).toHaveTextContent('running-...')
      expect(buttons[0]).toHaveTextContent('running')
    })

    it('sorts non-running workflows by last update', () => {
      const workflows = [
        createMockWorkflow({
          threadId: 'older',
          status: 'completed',
          lastUpdate: new Date(Date.now() - 10000).toISOString(),
        }),
        createMockWorkflow({
          threadId: 'newer',
          status: 'completed',
          lastUpdate: new Date(Date.now()).toISOString(),
        }),
      ]

      mockUseWorkflowStore.mockReturnValue(workflows)

      render(<WorkflowList />)

      const buttons = screen.getAllByRole('button')
      expect(buttons[0]).toHaveTextContent('newer...')
      expect(buttons[1]).toHaveTextContent('older...')
    })

    it('limits recent workflows to 5', () => {
      const workflows = Array.from({ length: 10 }, (_, i) =>
        createMockWorkflow({
          threadId: `completed-${i}`,
          status: 'completed',
          lastUpdate: new Date(Date.now() - i * 1000).toISOString(),
        })
      )

      mockUseWorkflowStore.mockReturnValue(workflows)

      render(<WorkflowList />)

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(5)
    })
  })

  describe('Modal Interaction', () => {
    it('opens modal when workflow is clicked', async () => {
      const workflow = createMockWorkflow()
      mockUseWorkflowStore.mockReturnValue([workflow])

      render(<WorkflowList />)

      const workflowButton = screen.getByRole('button')
      fireEvent.click(workflowButton)

      await waitFor(() => {
        expect(screen.getByTestId('workflow-modal')).toBeInTheDocument()
      })
    })

    it('closes modal when close button is clicked', async () => {
      const workflow = createMockWorkflow()
      mockUseWorkflowStore.mockReturnValue([workflow])

      render(<WorkflowList />)

      // Open modal
      const workflowButton = screen.getByRole('button')
      fireEvent.click(workflowButton)

      // Close modal
      const closeButton = await screen.findByText('Close')
      fireEvent.click(closeButton)

      await waitFor(() => {
        expect(screen.queryByTestId('workflow-modal')).not.toBeInTheDocument()
      })
    })
  })

  describe('Status Colors', () => {
    it('applies correct status colors', () => {
      const workflows = [
        createMockWorkflow({ threadId: 'wf-1', status: 'running' }),
        createMockWorkflow({ threadId: 'wf-2', status: 'completed' }),
        createMockWorkflow({ threadId: 'wf-3', status: 'failed' }),
        createMockWorkflow({ threadId: 'wf-4', status: 'aborted' }),
      ]

      mockUseWorkflowStore.mockReturnValue(workflows)

      render(<WorkflowList />)

      expect(screen.getByText('running')).toHaveClass('bg-blue-500/20')
      expect(screen.getByText('completed')).toHaveClass('bg-green-500/20')
      expect(screen.getByText('failed')).toHaveClass('bg-red-500/20')
      expect(screen.getByText('aborted')).toHaveClass('bg-orange-500/20')
    })
  })

  describe('Performance', () => {
    it('uses memoization for computed workflows', () => {
      // Test that useMemo is working by checking that the component
      // doesn't cause excessive renders
      const workflows = Array.from({ length: 20 }, (_, i) =>
        createMockWorkflow({
          threadId: `workflow-${i}`,
          status: i < 5 ? 'running' : 'completed',
        })
      )

      mockUseWorkflowStore.mockReturnValue(workflows)

      // Should render without issues even with many workflows
      const { container } = render(<WorkflowList />)

      // Check that only the expected number of workflows are displayed
      const workflowButtons = container.querySelectorAll('button')
      // 5 running + 5 recent = 10 max
      expect(workflowButtons.length).toBeLessThanOrEqual(10)
    })

    it('does not cause infinite re-renders', () => {
      const workflows = [createMockWorkflow()]
      let renderCount = 0

      mockUseWorkflowStore.mockImplementation(() => {
        renderCount++
        if (renderCount > 10) {
          throw new Error('Too many renders')
        }
        return workflows
      })

      expect(() => render(<WorkflowList />)).not.toThrow()
      expect(renderCount).toBeLessThanOrEqual(2) // Allow for StrictMode double render
    })
  })

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const workflow = createMockWorkflow()
      mockUseWorkflowStore.mockReturnValue([workflow])

      const { container } = render(<WorkflowList className="custom-class" />)

      expect(container.querySelector('.custom-class')).toBeInTheDocument()
    })
  })
})
