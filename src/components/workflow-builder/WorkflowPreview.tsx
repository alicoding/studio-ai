/**
 * WorkflowPreview Component - Preview workflow before execution
 *
 * SOLID: Single responsibility - workflow preview display
 * DRY: Reuses validation logic from store
 * KISS: Simple read-only view
 * Library-First: Uses React for rendering
 */

import { useState } from 'react'
import { AlertCircle, CheckCircle, Code, Eye } from 'lucide-react'
import { useWorkflowBuilderStore } from '@/stores/workflowBuilder'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function WorkflowPreview() {
  const { workflow, validationErrors, validateWorkflow, isValidating } = useWorkflowBuilderStore()
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual')
  const [validationResult, setValidationResult] = useState<boolean | null>(null)

  if (!workflow) return null

  const handleValidate = async () => {
    const isValid = await validateWorkflow()
    setValidationResult(isValid)
  }

  // const hasErrors = Object.keys(validationErrors).length > 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Workflow Preview</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setViewMode(viewMode === 'visual' ? 'json' : 'visual')}
          >
            {viewMode === 'visual' ? (
              <>
                <Code className="w-4 h-4 mr-1" />
                JSON View
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-1" />
                Visual View
              </>
            )}
          </Button>
          <Button variant="secondary" size="sm" onClick={handleValidate} disabled={isValidating}>
            {isValidating ? 'Validating...' : 'Validate'}
          </Button>
        </div>
      </div>

      {/* Validation Status */}
      {validationResult !== null && (
        <div
          className={cn(
            'p-4 rounded-lg border flex items-center gap-3',
            validationResult ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          )}
        >
          {validationResult ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-700">Workflow is valid and ready to execute</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-700">
                Workflow has {Object.keys(validationErrors).length} validation error(s)
              </span>
            </>
          )}
        </div>
      )}

      {/* Content */}
      {viewMode === 'visual' ? (
        <div className="space-y-4">
          {/* Workflow Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-700 mb-2">Workflow Information</h4>
            <dl className="space-y-1 text-sm">
              <div className="flex">
                <dt className="text-gray-500 w-24">Name:</dt>
                <dd className="text-gray-900 font-medium">{workflow.name}</dd>
              </div>
              {workflow.description && (
                <div className="flex">
                  <dt className="text-gray-500 w-24">Description:</dt>
                  <dd className="text-gray-900">{workflow.description}</dd>
                </div>
              )}
              <div className="flex">
                <dt className="text-gray-500 w-24">Steps:</dt>
                <dd className="text-gray-900">{workflow.steps.length}</dd>
              </div>
              <div className="flex">
                <dt className="text-gray-500 w-24">Project ID:</dt>
                <dd className="text-gray-900 font-mono text-xs">{workflow.metadata.projectId}</dd>
              </div>
            </dl>
          </div>

          {/* Steps */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Workflow Steps</h4>
            <div className="space-y-3">
              {workflow.steps.map((step, index) => {
                const stepError = validationErrors[step.id]
                return (
                  <div
                    key={step.id}
                    className={cn(
                      'border rounded-lg p-4',
                      stepError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">Step {index + 1}</span>
                          <span className="text-sm text-gray-500">({step.id})</span>
                          {stepError && <AlertCircle className="w-4 h-4 text-red-500" />}
                        </div>

                        <div className="space-y-1 text-sm">
                          <div>
                            <span className="text-gray-500">Agent/Role:</span>{' '}
                            <span className="font-medium">
                              {step.agentId || step.role || 'Not assigned'}
                            </span>
                          </div>

                          <div>
                            <span className="text-gray-500">Task:</span>{' '}
                            <span className="text-gray-900">
                              {step.task || 'No task description'}
                            </span>
                          </div>

                          {step.deps.length > 0 && (
                            <div>
                              <span className="text-gray-500">Dependencies:</span>{' '}
                              <span className="text-gray-900">{step.deps.join(', ')}</span>
                            </div>
                          )}

                          {step.config && Object.keys(step.config).length > 0 && (
                            <div>
                              <span className="text-gray-500">Config:</span>{' '}
                              <span className="text-gray-900 font-mono text-xs">
                                {JSON.stringify(step.config)}
                              </span>
                            </div>
                          )}
                        </div>

                        {stepError && <div className="mt-2 text-sm text-red-600">{stepError}</div>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Execution Flow */}
          {workflow.steps.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Execution Flow</h4>
              <p className="text-sm text-blue-700">
                Steps will execute in dependency order. Steps without dependencies run in parallel.
                Steps with dependencies wait for their dependencies to complete first.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-100">
            <code>{JSON.stringify(workflow, null, 2)}</code>
          </pre>
        </div>
      )}
    </div>
  )
}
