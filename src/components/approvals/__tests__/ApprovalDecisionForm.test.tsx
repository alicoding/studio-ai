/**
 * ApprovalDecisionForm Component Tests
 *
 * SOLID: Single responsibility - testing decision form
 * DRY: Reusable test utilities
 * KISS: Simple, focused test cases
 * Library-First: Uses Vitest and React Testing Library
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApprovalDecisionForm } from '../ApprovalDecisionForm'

describe('ApprovalDecisionForm', () => {
  const mockOnDecision = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render quick action buttons by default', () => {
    render(<ApprovalDecisionForm onDecision={mockOnDecision} />)

    expect(screen.getByText('Approve')).toBeInTheDocument()
    expect(screen.getByText('Reject')).toBeInTheDocument()
    expect(screen.getByTitle('Add comment')).toBeInTheDocument()
  })

  it('should handle quick approval', async () => {
    render(<ApprovalDecisionForm onDecision={mockOnDecision} />)

    const approveButton = screen.getByText('Approve')
    await userEvent.click(approveButton)

    expect(mockOnDecision).toHaveBeenCalledWith('approved')
  })

  it('should handle quick rejection', async () => {
    render(<ApprovalDecisionForm onDecision={mockOnDecision} />)

    const rejectButton = screen.getByText('Reject')
    await userEvent.click(rejectButton)

    expect(mockOnDecision).toHaveBeenCalledWith('rejected')
  })

  it('should show form when comment button is clicked', async () => {
    render(<ApprovalDecisionForm onDecision={mockOnDecision} />)

    const commentButton = screen.getByTitle('Add comment')
    await userEvent.click(commentButton)

    expect(screen.getByText('Decision')).toBeInTheDocument()
    expect(screen.getByLabelText('Comment (Optional)')).toBeInTheDocument()
    expect(screen.getByLabelText('Reasoning (Optional)')).toBeInTheDocument()
  })

  it('should handle form submission with comment', async () => {
    render(<ApprovalDecisionForm onDecision={mockOnDecision} />)

    // Open form
    const commentButton = screen.getByTitle('Add comment')
    await userEvent.click(commentButton)

    // Select approval
    const approveRadio = screen.getByRole('radio', { name: /approve/i })
    await userEvent.click(approveRadio)

    // Add comment
    const commentTextarea = screen.getByLabelText('Comment (Optional)')
    await userEvent.type(commentTextarea, 'This looks good to me')

    // Add reasoning
    const reasoningTextarea = screen.getByLabelText('Reasoning (Optional)')
    await userEvent.type(reasoningTextarea, 'All checks passed')

    // Submit
    const submitButton = screen.getByText('Submit Decision')
    await userEvent.click(submitButton)

    expect(mockOnDecision).toHaveBeenCalledWith(
      'approved',
      'This looks good to me',
      'All checks passed'
    )
  })

  it('should require decision selection', async () => {
    render(<ApprovalDecisionForm onDecision={mockOnDecision} />)

    // Open form
    const commentButton = screen.getByTitle('Add comment')
    await userEvent.click(commentButton)

    // Try to submit without selecting decision
    const submitButton = screen.getByText('Submit Decision')
    expect(submitButton).toBeDisabled()
  })

  it('should handle form cancellation', async () => {
    render(<ApprovalDecisionForm onDecision={mockOnDecision} />)

    // Open form
    const commentButton = screen.getByTitle('Add comment')
    await userEvent.click(commentButton)

    // Cancel
    const cancelButton = screen.getByText('Cancel')
    await userEvent.click(cancelButton)

    // Should be back to quick actions
    expect(screen.getByText('Approve')).toBeInTheDocument()
    expect(screen.getByText('Reject')).toBeInTheDocument()
  })

  it('should show error message on submission failure', async () => {
    const mockOnDecisionError = vi.fn().mockRejectedValue(new Error('Network error'))

    render(<ApprovalDecisionForm onDecision={mockOnDecisionError} />)

    const approveButton = screen.getByText('Approve')
    await userEvent.click(approveButton)

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('should disable buttons when submitting', () => {
    render(<ApprovalDecisionForm onDecision={mockOnDecision} isSubmitting={true} />)

    const approveButton = screen.getByText('Approve')
    const rejectButton = screen.getByText('Reject')
    const commentButton = screen.getByTitle('Add comment')

    expect(approveButton).toBeDisabled()
    expect(rejectButton).toBeDisabled()
    expect(commentButton).toBeDisabled()
  })

  it('should trim whitespace from comments', async () => {
    render(<ApprovalDecisionForm onDecision={mockOnDecision} />)

    // Open form
    const commentButton = screen.getByTitle('Add comment')
    await userEvent.click(commentButton)

    // Select approval
    const approveRadio = screen.getByRole('radio', { name: /approve/i })
    await userEvent.click(approveRadio)

    // Add comment with whitespace
    const commentTextarea = screen.getByLabelText('Comment (Optional)')
    await userEvent.type(commentTextarea, '  comment with spaces  ')

    // Submit
    const submitButton = screen.getByText('Submit Decision')
    await userEvent.click(submitButton)

    expect(mockOnDecision).toHaveBeenCalledWith('approved', 'comment with spaces', undefined)
  })
})
