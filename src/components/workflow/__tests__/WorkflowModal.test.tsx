/**
 * WorkflowModal Tests - Ensures empty state behavior is expected, not a bug
 *
 * SOLID: Single responsibility - testing modal behavior
 * DRY: Reuses test utilities
 * KISS: Simple test cases covering key scenarios
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WorkflowModal } from '../WorkflowModal'
import type { WorkflowInfo } from '../../../stores/workflows'

const mockWorkflow: WorkflowInfo = {
  threadId: 'test-thread-123',
  status: 'completed',
  startedBy: 'Claude Code CLI',
  invocation: 'Test workflow',
  projectId: 'test-project-123',
  projectName: 'Test Project',
  lastUpdate: '2025-01-10T14:00:00Z',
  sessionIds: { 'step-1': 'session-123' },
  steps: [
    {
      id: 'step-1',
      role: 'developer',
      task: 'Test task',
      status: 'completed',
      dependencies: [],
    },
  ],
}

describe('WorkflowModal', () => {
  it('should not render when isOpen is false', () => {
    render(<WorkflowModal workflow={mockWorkflow} isOpen={false} onClose={vi.fn()} />)
    expect(screen.queryByText('Workflow Details')).not.toBeInTheDocument()
  })

  it('should render workflow details when workflow is provided', () => {
    render(<WorkflowModal workflow={mockWorkflow} isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText('Workflow Details')).toBeInTheDocument()
    expect(screen.getByText('Thread ID: test-thread-123')).toBeInTheDocument()
    expect(screen.getByText('Test Project')).toBeInTheDocument()
    expect(screen.getByText('Test task')).toBeInTheDocument()
  })

  it('should render empty state when no workflow is provided - this is expected behavior', () => {
    render(<WorkflowModal workflow={null} isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText('Workflow History')).toBeInTheDocument()
    expect(screen.getByText('No workflows found')).toBeInTheDocument()
    expect(screen.getByText('No Workflows Yet')).toBeInTheDocument()
    expect(
      screen.getByText('This is expected behavior when no workflows have been created.')
    ).toBeInTheDocument()
  })

  it('should call onClose when close button is clicked in empty state', () => {
    const onCloseMock = vi.fn()
    render(<WorkflowModal workflow={null} isOpen={true} onClose={onCloseMock} />)

    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)

    expect(onCloseMock).toHaveBeenCalledTimes(1)
  })

  it('should call onClose when background is clicked in empty state', () => {
    const onCloseMock = vi.fn()
    render(<WorkflowModal workflow={null} isOpen={true} onClose={onCloseMock} />)

    const backdrop = screen.getByText('No Workflows Yet').closest('.fixed')
    fireEvent.click(backdrop!)

    expect(onCloseMock).toHaveBeenCalledTimes(1)
  })

  it('should call onClose when close button is clicked with workflow', () => {
    const onCloseMock = vi.fn()
    render(<WorkflowModal workflow={mockWorkflow} isOpen={true} onClose={onCloseMock} />)

    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)

    expect(onCloseMock).toHaveBeenCalledTimes(1)
  })

  it('should not call onClose when modal content is clicked', () => {
    const onCloseMock = vi.fn()
    render(<WorkflowModal workflow={mockWorkflow} isOpen={true} onClose={onCloseMock} />)

    const modalContent = screen.getByText('Workflow Details').closest('.bg-background')
    fireEvent.click(modalContent!)

    expect(onCloseMock).not.toHaveBeenCalled()
  })

  it('should display step status correctly', () => {
    render(<WorkflowModal workflow={mockWorkflow} isOpen={true} onClose={vi.fn()} />)

    // Check for the specific step summary text
    expect(screen.getByText('1 of 1 steps completed')).toBeInTheDocument()
    // Check that step status shows as completed
    expect(screen.getByText('Test task')).toBeInTheDocument()
  })

  it('should handle multiple steps', () => {
    const multiStepWorkflow: WorkflowInfo = {
      ...mockWorkflow,
      sessionIds: { 'step-1': 'session-123', 'step-2': 'session-456' },
      steps: [
        {
          id: 'step-1',
          role: 'developer',
          task: 'First task',
          status: 'completed',
          dependencies: [],
        },
        {
          id: 'step-2',
          role: 'reviewer',
          task: 'Second task',
          status: 'pending',
          dependencies: ['step-1'],
        },
      ],
    }

    render(<WorkflowModal workflow={multiStepWorkflow} isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText('First task')).toBeInTheDocument()
    expect(screen.getByText('Second task')).toBeInTheDocument()
    expect(screen.getByText('1 of 2 steps completed')).toBeInTheDocument()
    expect(screen.getByText('Dependencies: step-1')).toBeInTheDocument()
  })

  it('should show error messages when present', () => {
    const errorWorkflow: WorkflowInfo = {
      ...mockWorkflow,
      status: 'failed',
      sessionIds: { 'step-1': 'session-123' },
      steps: [
        {
          id: 'step-1',
          role: 'developer',
          task: 'Failed task',
          status: 'failed',
          dependencies: [],
          error: 'Something went wrong',
        },
      ],
    }

    render(<WorkflowModal workflow={errorWorkflow} isOpen={true} onClose={vi.fn()} />)

    expect(screen.getByText('Error: Something went wrong')).toBeInTheDocument()
  })
})
