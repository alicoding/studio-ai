/**
 * StepEditor Component - Edit individual workflow steps
 *
 * SOLID: Single responsibility - step editing UI
 * DRY: Reuses form components
 * KISS: Simple form-based editing
 * Library-First: Uses existing Select and Input components
 */

import { useEffect, useState } from 'react'
import { Trash2, Info } from 'lucide-react'
import { useWorkflowBuilderStore } from '@/stores/workflowBuilder'
import { useAgentStore } from '@/stores'
import { Button } from '@/components/ui/button'
import { WorkflowStepDefinition } from '@/../../web/server/schemas/workflow-builder'

interface StepEditorProps {
  stepId: string
}

export default function StepEditor({ stepId }: StepEditorProps) {
  const { workflow, validationErrors, updateStep, removeStep, setDependencies } =
    useWorkflowBuilderStore()

  const agents = useAgentStore((state) => state.agents)
  const currentProject = useAgentStore((state) =>
    state.agents[0]?.projectId ? { id: state.agents[0].projectId } : null
  )

  const step = workflow?.steps.find((s) => s.id === stepId)
  const [localStep, setLocalStep] = useState<WorkflowStepDefinition | null>(null)

  useEffect(() => {
    if (step) {
      setLocalStep({ ...step })
    }
  }, [step])

  if (!step || !localStep || !workflow) return null

  const handleUpdate = (updates: Partial<WorkflowStepDefinition>) => {
    setLocalStep({ ...localStep, ...updates })
    updateStep(stepId, updates)
  }

  const handleAgentChange = (value: string) => {
    if (value.startsWith('agent:')) {
      const agentId = value.replace('agent:', '')
      handleUpdate({ agentId, role: undefined })
    } else if (value.startsWith('role:')) {
      const role = value.replace('role:', '')
      handleUpdate({ role, agentId: undefined })
    }
  }

  const handleDependencyToggle = (depId: string) => {
    const newDeps = localStep.deps.includes(depId)
      ? localStep.deps.filter((d) => d !== depId)
      : [...localStep.deps, depId]
    setDependencies(stepId, newDeps)
    setLocalStep({ ...localStep, deps: newDeps })
  }

  const handleRemove = () => {
    if (window.confirm('Are you sure you want to remove this step?')) {
      removeStep(stepId)
      useWorkflowBuilderStore.setState({ selectedStepId: null })
    }
  }

  // Get available steps for dependencies (all steps before this one)
  const stepIndex = workflow.steps.findIndex((s) => s.id === stepId)
  const availableDeps = workflow.steps.slice(0, stepIndex)

  // Project agents for dropdown
  const projectAgents = agents.filter((a) => a.projectId === currentProject?.id)

  const validationError = validationErrors[stepId]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Edit Step</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRemove}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Remove Step
        </Button>
      </div>

      {/* Step ID */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Step ID</label>
        <input
          type="text"
          value={localStep.id}
          disabled
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
        />
      </div>

      {/* Agent/Role Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Agent or Role <span className="text-red-500">*</span>
        </label>
        <select
          value={
            localStep.agentId
              ? `agent:${localStep.agentId}`
              : localStep.role
                ? `role:${localStep.role}`
                : ''
          }
          onChange={(e) => handleAgentChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select agent or role...</option>

          {projectAgents.length > 0 && (
            <optgroup label="Project Agents">
              {projectAgents.map((agent) => (
                <option key={agent.id} value={`agent:${agent.id}`}>
                  {agent.name} ({agent.id})
                </option>
              ))}
            </optgroup>
          )}

          <optgroup label="Roles">
            <option value="role:developer">Developer</option>
            <option value="role:architect">Architect</option>
            <option value="role:reviewer">Reviewer</option>
            <option value="role:tester">Tester</option>
            <option value="role:security">Security</option>
            <option value="role:devops">DevOps</option>
            <option value="role:designer">Designer</option>
            <option value="role:orchestrator">Orchestrator</option>
          </optgroup>
        </select>
      </div>

      {/* Task Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Task Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={localStep.task}
          onChange={(e) => handleUpdate({ task: e.target.value })}
          placeholder="Describe the task for this step..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="mt-1 text-xs text-gray-500 flex items-center gap-1">
          <Info className="w-3 h-3" />
          Use {'{stepId.output}'} to reference other step outputs
        </div>
      </div>

      {/* Dependencies */}
      {availableDeps.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Dependencies</label>
          <div className="space-y-2">
            {availableDeps.map((dep, index) => (
              <label
                key={dep.id}
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
              >
                <input
                  type="checkbox"
                  checked={localStep.deps.includes(dep.id)}
                  onChange={() => handleDependencyToggle(dep.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">
                  Step {index + 1} ({dep.id})
                  {dep.task && (
                    <span className="text-gray-500 ml-2 truncate">
                      - {dep.task.substring(0, 50)}...
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            This step will wait for selected dependencies to complete
          </div>
        </div>
      )}

      {/* Configuration */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700">Configuration (Optional)</h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Timeout (ms)</label>
            <input
              type="number"
              value={localStep.config?.timeout || ''}
              onChange={(e) =>
                handleUpdate({
                  config: {
                    ...localStep.config,
                    timeout: e.target.value ? parseInt(e.target.value) : undefined,
                  },
                })
              }
              placeholder="Default"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Retries</label>
            <input
              type="number"
              value={localStep.config?.retries || ''}
              onChange={(e) =>
                handleUpdate({
                  config: {
                    ...localStep.config,
                    retries: e.target.value ? parseInt(e.target.value) : undefined,
                  },
                })
              }
              placeholder="0"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={localStep.config?.continueOnError || false}
            onChange={(e) =>
              handleUpdate({
                config: {
                  ...localStep.config,
                  continueOnError: e.target.checked,
                },
              })
            }
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Continue workflow if this step fails</span>
        </label>
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{validationError}</p>
        </div>
      )}
    </div>
  )
}
