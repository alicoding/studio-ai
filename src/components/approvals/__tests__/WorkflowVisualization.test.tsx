/**
 * WorkflowVisualization Component Tests
 *
 * SOLID: Single responsibility - testing workflow visualization
 * DRY: Reusable test utilities
 * KISS: Simple, focused test cases
 * Library-First: Uses Vitest and React Testing Library
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WorkflowVisualization } from '../WorkflowVisualization'
import type { ApprovalContextData } from '../../../../web/server/schemas/approval-types'

describe('WorkflowVisualization', () => {
  const mockWorkflowSteps: ApprovalContextData['workflowSteps'] = [
    {
      id: 'step-1',
      task: 'Build application',
      status: 'completed',
      output: 'Build successful',
      executedAt: '2025-01-14T10:00:00Z',
    },
    {
      id: 'step-2',
      task: 'Run tests',
      status: 'completed',
      output: 'All tests passed',
      executedAt: '2025-01-14T10:05:00Z',
    },
    {
      id: 'step-3',
      task: 'Deploy to production',
      status: 'pending',
      executedAt: '2025-01-14T10:10:00Z',
    },
  ]

  it('should render workflow steps correctly', () => {
    render(<WorkflowVisualization workflowSteps={mockWorkflowSteps} currentStepIndex={2} />)

    expect(screen.getByText('Workflow Progress')).toBeInTheDocument()
    expect(screen.getByText('Step 1: Build application')).toBeInTheDocument()
    expect(screen.getByText('Step 2: Run tests')).toBeInTheDocument()
    expect(screen.getByText('Step 3: Deploy to production')).toBeInTheDocument()
  })

  it('should highlight current step', () => {
    render(<WorkflowVisualization workflowSteps={mockWorkflowSteps} currentStepIndex={2} />)

    const currentStepElement = screen.getByText('Step 3: Deploy to production').closest('div')
    expect(currentStepElement).toHaveClass('ring-2', 'ring-amber-400')
    expect(screen.getByText('Awaiting Approval')).toBeInTheDocument()
  })

  it('should show step outputs', () => {
    render(<WorkflowVisualization workflowSteps={mockWorkflowSteps} currentStepIndex={2} />)

    expect(screen.getByText('Output: Build successful')).toBeInTheDocument()
    expect(screen.getByText('Output: All tests passed')).toBeInTheDocument()
  })

  it('should format timestamps correctly', () => {
    render(<WorkflowVisualization workflowSteps={mockWorkflowSteps} currentStepIndex={2} />)

    // Should show formatted time (exact format may vary by locale)
    expect(screen.getByText(/Jan 14, 10:00 AM/)).toBeInTheDocument()
  })

  it('should show future steps placeholder', () => {
    render(<WorkflowVisualization workflowSteps={mockWorkflowSteps} currentStepIndex={2} />)

    expect(screen.getByText('Future steps will appear here after approval...')).toBeInTheDocument()
  })

  it('should handle empty workflow steps', () => {
    render(<WorkflowVisualization workflowSteps={[]} currentStepIndex={0} />)

    expect(screen.getByText('Workflow Progress')).toBeInTheDocument()
    expect(screen.getByText('Future steps will appear here after approval...')).toBeInTheDocument()
  })

  it('should truncate long outputs', () => {
    const longOutputStep: ApprovalContextData['workflowSteps'] = [
      {
        id: 'step-1',
        task: 'Process data',
        status: 'completed',
        output:
          'This is a very long output that should be truncated because it exceeds the maximum length limit that we have set for display purposes in the UI component',
        executedAt: '2025-01-14T10:00:00Z',
      },
    ]

    render(<WorkflowVisualization workflowSteps={longOutputStep} currentStepIndex={0} />)

    const outputText = screen.getByText(/Output:/)
    expect(outputText.textContent).toContain('...')
    expect(outputText.textContent?.length).toBeLessThan(150) // Should be truncated
  })
})
