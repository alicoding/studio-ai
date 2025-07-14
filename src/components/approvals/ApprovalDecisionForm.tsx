/**
 * ApprovalDecisionForm Component - Form for submitting approval decisions
 *
 * SOLID: Single responsibility - decision form handling
 * DRY: Reusable form validation
 * KISS: Simple form with clear actions
 * Library-First: Uses React and form handling best practices
 */

import React, { useState } from 'react'
import { Check, X, MessageSquare, AlertCircle } from 'lucide-react'
import type { ApprovalDecision } from '../../../web/server/schemas/approval-types'

interface ApprovalDecisionFormProps {
  onDecision: (decision: ApprovalDecision, comment?: string, reasoning?: string) => Promise<void>
  isSubmitting?: boolean
  className?: string
}

export const ApprovalDecisionForm: React.FC<ApprovalDecisionFormProps> = ({
  onDecision,
  isSubmitting = false,
  className = '',
}) => {
  const [showForm, setShowForm] = useState(false)
  const [decision, setDecision] = useState<ApprovalDecision | null>(null)
  const [comment, setComment] = useState('')
  const [reasoning, setReasoning] = useState('')
  const [error, setError] = useState<string | null>(null)

  /**
   * Handle quick decision without form
   * KISS: Simple one-click approval/rejection
   */
  const handleQuickDecision = async (quickDecision: ApprovalDecision) => {
    setError(null)
    try {
      await onDecision(quickDecision)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit decision')
    }
  }

  /**
   * Handle form submission
   * DRY: Centralized form validation and submission
   */
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!decision) {
      setError('Please select a decision')
      return
    }

    setError(null)
    try {
      await onDecision(decision, comment.trim() || undefined, reasoning.trim() || undefined)

      // Reset form on success
      setShowForm(false)
      setDecision(null)
      setComment('')
      setReasoning('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit decision')
    }
  }

  /**
   * Cancel form and reset
   * KISS: Simple form reset
   */
  const handleCancel = () => {
    setShowForm(false)
    setDecision(null)
    setComment('')
    setReasoning('')
    setError(null)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {!showForm ? (
        /* Quick Action Buttons */
        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleQuickDecision('approved')}
            disabled={isSubmitting}
            className={`
              flex-1 flex items-center justify-center space-x-2 px-4 py-2 
              bg-green-600 text-white rounded-lg font-medium
              hover:bg-green-700 focus:outline-none focus:ring-2 
              focus:ring-green-500 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            `}
          >
            <Check className="w-5 h-5" />
            <span>Approve</span>
          </button>

          <button
            onClick={() => handleQuickDecision('rejected')}
            disabled={isSubmitting}
            className={`
              flex-1 flex items-center justify-center space-x-2 px-4 py-2 
              bg-red-600 text-white rounded-lg font-medium
              hover:bg-red-700 focus:outline-none focus:ring-2 
              focus:ring-red-500 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            `}
          >
            <X className="w-5 h-5" />
            <span>Reject</span>
          </button>

          <button
            onClick={() => setShowForm(true)}
            disabled={isSubmitting}
            className={`
              flex items-center justify-center p-2 
              border border-gray-300 rounded-lg
              hover:bg-gray-50 focus:outline-none focus:ring-2 
              focus:ring-gray-500 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            `}
            title="Add comment"
          >
            <MessageSquare className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      ) : (
        /* Detailed Form */
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Decision Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Decision</label>
            <div className="flex space-x-3">
              <label className="flex-1">
                <input
                  type="radio"
                  name="decision"
                  value="approved"
                  checked={decision === 'approved'}
                  onChange={(e) => setDecision(e.target.value as ApprovalDecision)}
                  className="sr-only"
                />
                <div
                  className={`
                  p-3 border-2 rounded-lg cursor-pointer text-center transition-all
                  ${
                    decision === 'approved'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }
                `}
                >
                  <Check className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-sm font-medium">Approve</span>
                </div>
              </label>

              <label className="flex-1">
                <input
                  type="radio"
                  name="decision"
                  value="rejected"
                  checked={decision === 'rejected'}
                  onChange={(e) => setDecision(e.target.value as ApprovalDecision)}
                  className="sr-only"
                />
                <div
                  className={`
                  p-3 border-2 rounded-lg cursor-pointer text-center transition-all
                  ${
                    decision === 'rejected'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }
                `}
                >
                  <X className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-sm font-medium">Reject</span>
                </div>
              </label>
            </div>
          </div>

          {/* Comment Field */}
          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
              Comment (Optional)
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add any additional context or notes..."
            />
          </div>

          {/* Reasoning Field */}
          <div>
            <label htmlFor="reasoning" className="block text-sm font-medium text-gray-700 mb-1">
              Reasoning (Optional)
            </label>
            <textarea
              id="reasoning"
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Explain your decision reasoning..."
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center space-x-3">
            <button
              type="submit"
              disabled={isSubmitting || !decision}
              className={`
                flex-1 px-4 py-2 font-medium text-white rounded-lg
                focus:outline-none focus:ring-2 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
                ${
                  decision === 'approved'
                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                    : decision === 'rejected'
                      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                      : 'bg-gray-400'
                }
              `}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Decision'}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
