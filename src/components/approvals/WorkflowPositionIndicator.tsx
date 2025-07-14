/**
 * WorkflowPositionIndicator Component - Shows current position in workflow
 *
 * SOLID: Single responsibility - position visualization
 * DRY: Reusable position display
 * KISS: Simple progress indicator
 * Library-First: Uses React and Tailwind
 */

import React from 'react'
import { MapPin } from 'lucide-react'

interface WorkflowPositionIndicatorProps {
  currentStep: number
  totalSteps: number
  className?: string
}

export const WorkflowPositionIndicator: React.FC<WorkflowPositionIndicatorProps> = ({
  currentStep,
  totalSteps,
  className = '',
}) => {
  const progressPercentage = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Text Indicator */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-amber-600" />
          <span className="font-medium text-gray-700">
            Step {currentStep} of {totalSteps}
          </span>
        </div>
        <span className="text-gray-500">{progressPercentage}% Complete</span>
      </div>

      {/* Progress Bar */}
      <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-amber-500 transition-all duration-300 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />

        {/* Step Markers */}
        <div className="absolute inset-0 flex items-center justify-between px-1">
          {Array.from({ length: totalSteps }, (_, index) => {
            const stepNumber = index + 1
            const isCompleted = stepNumber < currentStep
            const isCurrent = stepNumber === currentStep

            return (
              <div
                key={stepNumber}
                className={`
                  w-1.5 h-1.5 rounded-full transition-all
                  ${
                    isCompleted
                      ? 'bg-green-500'
                      : isCurrent
                        ? 'bg-amber-500 ring-2 ring-amber-300 ring-offset-1'
                        : 'bg-gray-300'
                  }
                `}
                title={`Step ${stepNumber}`}
              />
            )
          })}
        </div>
      </div>

      {/* Step Summary */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{currentStep - 1} completed</span>
        <span>{totalSteps - currentStep} remaining</span>
      </div>
    </div>
  )
}
