/**
 * WorkflowVisualization Component - Visual representation of workflow steps for approval context
 *
 * SOLID: Single responsibility - workflow visualization only
 * DRY: Reusable step rendering components
 * KISS: Simple visual hierarchy
 * Library-First: Uses React and Tailwind for styling
 */

import React from 'react'
import { CheckCircle, Clock, AlertCircle, Circle } from 'lucide-react'
import type { ApprovalContextData } from '../../../web/server/schemas/approval-types'

interface WorkflowVisualizationProps {
  workflowSteps: ApprovalContextData['workflowSteps']
  currentStepIndex: number
}

export const WorkflowVisualization: React.FC<WorkflowVisualizationProps> = ({
  workflowSteps,
  currentStepIndex,
}) => {
  /**
   * Get icon and color for step status
   * KISS: Simple status mapping
   */
  const getStepVisuals = (status: string, isCurrentStep: boolean) => {
    if (isCurrentStep) {
      return {
        icon: <Clock className="w-5 h-5" />,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-300',
      }
    }

    switch (status) {
      case 'completed':
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-300',
        }
      case 'failed':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-300',
        }
      case 'in_progress':
        return {
          icon: <Clock className="w-5 h-5" />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-300',
        }
      default:
        return {
          icon: <Circle className="w-5 h-5" />,
          color: 'text-gray-400',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-300',
        }
    }
  }

  /**
   * Format timestamp for display
   * KISS: Simple date formatting
   */
  const formatTime = (timestamp?: string) => {
    if (!timestamp) return null

    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  /**
   * Truncate long output text
   * DRY: Reusable text truncation
   */
  const truncateOutput = (output?: string, maxLength = 100) => {
    if (!output) return null
    if (output.length <= maxLength) return output
    return output.substring(0, maxLength) + '...'
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Workflow Progress</h3>

      <div className="relative">
        {workflowSteps.map((step, index) => {
          const isCurrentStep = index === currentStepIndex
          const visuals = getStepVisuals(step.status, isCurrentStep)
          const isLastStep = index === workflowSteps.length - 1

          return (
            <div key={step.id} className="relative">
              {/* Connection line */}
              {!isLastStep && (
                <div className="absolute left-5 top-12 w-0.5 h-16 bg-gray-200" aria-hidden="true" />
              )}

              {/* Step container */}
              <div
                className={`
                  relative flex items-start space-x-3 p-4 rounded-lg
                  ${isCurrentStep ? 'ring-2 ring-amber-400 ring-offset-2' : ''}
                  ${visuals.bgColor}
                `}
              >
                {/* Step icon */}
                <div
                  className={`
                    flex-shrink-0 flex items-center justify-center w-10 h-10 
                    rounded-full border-2 bg-white
                    ${visuals.borderColor} ${visuals.color}
                  `}
                >
                  {visuals.icon}
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${visuals.color}`}>
                        Step {index + 1}: {step.task}
                      </p>

                      {isCurrentStep && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 mt-1">
                          Awaiting Approval
                        </span>
                      )}
                    </div>

                    {step.executedAt && (
                      <span className="text-xs text-gray-500">{formatTime(step.executedAt)}</span>
                    )}
                  </div>

                  {/* Step output preview */}
                  {step.output && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600">Output: {truncateOutput(step.output)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Current step indicator */}
              {isCurrentStep && (
                <div className="absolute -left-1 top-0 bottom-0 w-1 bg-amber-400 rounded-full" />
              )}
            </div>
          )
        })}

        {/* Future steps placeholder */}
        {workflowSteps.length > 0 && (
          <div className="relative mt-4">
            <div className="flex items-start space-x-3 p-4 rounded-lg bg-gray-50 opacity-50">
              <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full border-2 border-gray-300 bg-white">
                <Circle className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">
                  Future steps will appear here after approval...
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
