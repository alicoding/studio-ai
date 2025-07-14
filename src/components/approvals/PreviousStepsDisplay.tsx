/**
 * PreviousStepsDisplay Component - Shows outputs from previous workflow steps
 *
 * SOLID: Single responsibility - display previous step outputs
 * DRY: Reusable output rendering
 * KISS: Simple expandable output display
 * Library-First: Uses React and Tailwind
 */

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, FileText, Code, Copy, Check } from 'lucide-react'

interface PreviousStepsDisplayProps {
  previousStepOutputs: Record<string, string>
  className?: string
}

export const PreviousStepsDisplay: React.FC<PreviousStepsDisplayProps> = ({
  previousStepOutputs,
  className = '',
}) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())
  const [copiedSteps, setCopiedSteps] = useState<Set<string>>(new Set())

  /**
   * Toggle step expansion
   * KISS: Simple state toggle
   */
  const toggleStep = (stepId: string) => {
    const newExpanded = new Set(expandedSteps)
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId)
    } else {
      newExpanded.add(stepId)
    }
    setExpandedSteps(newExpanded)
  }

  /**
   * Copy output to clipboard
   * Library-First: Uses browser clipboard API
   */
  const copyToClipboard = async (stepId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedSteps(new Set([...copiedSteps, stepId]))

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedSteps((prev) => {
          const newSet = new Set(prev)
          newSet.delete(stepId)
          return newSet
        })
      }, 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  /**
   * Detect content type for better formatting
   * KISS: Simple content type detection
   */
  const getContentType = (content: string): 'json' | 'code' | 'text' => {
    // Try to parse as JSON
    try {
      JSON.parse(content)
      return 'json'
    } catch {
      // Check if it looks like code
      if (
        content.includes('function') ||
        content.includes('const ') ||
        content.includes('import ') ||
        content.includes('class ') ||
        (content.includes('{') && content.includes('}'))
      ) {
        return 'code'
      }
      return 'text'
    }
  }

  /**
   * Format content for display
   * DRY: Centralized content formatting
   */
  const formatContent = (content: string, type: 'json' | 'code' | 'text') => {
    if (type === 'json') {
      try {
        return JSON.stringify(JSON.parse(content), null, 2)
      } catch {
        return content
      }
    }
    return content
  }

  const stepIds = Object.keys(previousStepOutputs)

  if (stepIds.length === 0) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>No previous step outputs available</div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-sm font-medium text-gray-700">Previous Step Outputs</h3>

      <div className="space-y-2">
        {stepIds.map((stepId) => {
          const output = previousStepOutputs[stepId]
          const isExpanded = expandedSteps.has(stepId)
          const isCopied = copiedSteps.has(stepId)
          const contentType = getContentType(output)
          const formattedContent = formatContent(output, contentType)

          return (
            <div key={stepId} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Header */}
              <div
                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer"
                onClick={() => toggleStep(stepId)}
              >
                <div className="flex items-center space-x-2">
                  <button className="p-0">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                  </button>

                  {contentType === 'json' ? (
                    <Code className="w-4 h-4 text-gray-500" />
                  ) : (
                    <FileText className="w-4 h-4 text-gray-500" />
                  )}

                  <span className="text-sm font-medium text-gray-700">{stepId}</span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    copyToClipboard(stepId, output)
                  }}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Copy output"
                >
                  {isCopied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </div>

              {/* Content */}
              {isExpanded && (
                <div className="p-3 bg-white border-t border-gray-200">
                  <pre
                    className={`
                      text-xs overflow-x-auto
                      ${
                        contentType === 'json' || contentType === 'code'
                          ? 'font-mono bg-gray-900 text-gray-100 p-3 rounded'
                          : 'whitespace-pre-wrap'
                      }
                    `}
                  >
                    {formattedContent}
                  </pre>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
