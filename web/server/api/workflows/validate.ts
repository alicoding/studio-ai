/**
 * Workflow Validation API Endpoint
 *
 * SOLID: Single responsibility - validates workflow definitions
 * DRY: Reuses validation logic that can be shared
 * KISS: Simple request/response API
 * Library-First: Uses Express and existing services
 */

import { Router, Request, Response } from 'express'
import {
  WorkflowDefinition,
  WorkflowValidationResult,
  ValidationError,
  ValidationWarning,
  isWorkflowDefinition,
} from '../../schemas/workflow-builder'
import { StudioProjectService } from '../../services/StudioProjectService'
import { UnifiedAgentConfigService } from '../../services/UnifiedAgentConfigService'

const router = Router()

/**
 * POST /api/workflows/validate
 * Validates a workflow definition
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const workflow = req.body as WorkflowDefinition

    // Basic type validation
    if (!isWorkflowDefinition(workflow)) {
      return res.status(400).json({
        valid: false,
        errors: [{ message: 'Invalid workflow definition format', code: 'INVALID_FORMAT' }],
        warnings: [],
      } as WorkflowValidationResult)
    }

    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // 1. Validate workflow metadata
    if (!workflow.name || workflow.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Workflow name is required', code: 'MISSING_NAME' })
    }

    if (!workflow.metadata?.projectId) {
      errors.push({
        field: 'metadata.projectId',
        message: 'Project ID is required',
        code: 'MISSING_PROJECT',
      })
    }

    // 2. Validate steps exist
    if (!workflow.steps || workflow.steps.length === 0) {
      errors.push({ message: 'Workflow must have at least one step', code: 'NO_STEPS' })
    }

    // 3. Validate each step
    const stepIds = new Set<string>()
    const projectService = new StudioProjectService()
    const agentService = UnifiedAgentConfigService.getInstance()

    for (const step of workflow.steps) {
      // Check for duplicate step IDs
      if (stepIds.has(step.id)) {
        errors.push({
          stepId: step.id,
          message: `Duplicate step ID: ${step.id}`,
          code: 'DUPLICATE_STEP_ID',
        })
      }
      stepIds.add(step.id)

      // Validate step has either agentId or role
      if (!step.agentId && !step.role) {
        errors.push({
          stepId: step.id,
          message: 'Step must have either agentId or role',
          code: 'MISSING_AGENT_OR_ROLE',
        })
      }

      // Validate task description
      if (!step.task || step.task.trim().length === 0) {
        errors.push({
          stepId: step.id,
          field: 'task',
          message: 'Task description is required',
          code: 'MISSING_TASK',
        })
      }

      // Validate agent exists if agentId provided
      if (step.agentId && workflow.metadata?.projectId) {
        try {
          const projectWithAgents = await projectService.getProjectWithAgents(
            workflow.metadata.projectId
          )
          const agentExists = projectWithAgents.agents.some((a) => a.shortId === step.agentId)
          if (!agentExists) {
            errors.push({
              stepId: step.id,
              message: `Agent ${step.agentId} not found in project`,
              code: 'AGENT_NOT_FOUND',
            })
          }
        } catch (error) {
          warnings.push({
            stepId: step.id,
            message: `Could not verify agent ${step.agentId} exists`,
            code: 'AGENT_VERIFICATION_FAILED',
          })
        }
      }

      // Validate role exists if role provided
      if (step.role) {
        const validRoles = [
          'developer',
          'architect',
          'reviewer',
          'tester',
          'security',
          'devops',
          'designer',
          'orchestrator',
        ]
        if (!validRoles.includes(step.role.toLowerCase())) {
          warnings.push({
            stepId: step.id,
            message: `Role '${step.role}' may not have configured agents`,
            code: 'UNCOMMON_ROLE',
          })
        }
      }

      // Validate step configuration
      if (step.config) {
        if (step.config.timeout && step.config.timeout <= 0) {
          errors.push({
            stepId: step.id,
            field: 'config.timeout',
            message: 'Timeout must be positive',
            code: 'INVALID_TIMEOUT',
          })
        }
        if (step.config.retries && step.config.retries < 0) {
          errors.push({
            stepId: step.id,
            field: 'config.retries',
            message: 'Retries cannot be negative',
            code: 'INVALID_RETRIES',
          })
        }
      }
    }

    // 4. Validate dependencies
    for (const step of workflow.steps) {
      for (const dep of step.deps) {
        // Check dependency exists
        if (!stepIds.has(dep)) {
          errors.push({
            stepId: step.id,
            message: `Dependency '${dep}' does not exist`,
            code: 'MISSING_DEPENDENCY',
          })
        }

        // Check for self-dependency
        if (dep === step.id) {
          errors.push({
            stepId: step.id,
            message: 'Step cannot depend on itself',
            code: 'SELF_DEPENDENCY',
          })
        }
      }
    }

    // 5. Check for circular dependencies
    const circularDeps = detectCircularDependencies(workflow.steps)
    if (circularDeps.length > 0) {
      errors.push({
        message: `Circular dependencies detected: ${circularDeps.join(' → ')}`,
        code: 'CIRCULAR_DEPENDENCY',
      })
    }

    // 6. Validate template variables
    for (const step of workflow.steps) {
      const templateVars = extractTemplateVariables(step.task)
      for (const varName of templateVars) {
        const [stepId, field] = varName.split('.')
        if (!stepIds.has(stepId)) {
          errors.push({
            stepId: step.id,
            message: `Template variable references non-existent step: {${varName}}`,
            code: 'INVALID_TEMPLATE_VAR',
          })
        }
        // Check if step is a dependency
        if (!step.deps.includes(stepId) && stepId !== step.id) {
          warnings.push({
            stepId: step.id,
            message: `Template variable {${varName}} references step that is not a dependency`,
            code: 'TEMPLATE_VAR_NO_DEP',
          })
        }
      }
    }

    // Return validation result
    const result: WorkflowValidationResult = {
      valid: errors.length === 0,
      errors,
      warnings,
    }

    res.json(result)
  } catch (error) {
    console.error('Workflow validation error:', error)
    res.status(500).json({
      valid: false,
      errors: [
        {
          message: 'Internal validation error',
          code: 'INTERNAL_ERROR',
        },
      ],
      warnings: [],
    } as WorkflowValidationResult)
  }
})

/**
 * Detect circular dependencies in workflow steps
 */
function detectCircularDependencies(
  steps: WorkflowDefinition['steps']
): string[] {
  const visited = new Set<string>()
  const recursionStack = new Set<string>()
  const path: string[] = []

  function hasCycle(stepId: string): boolean {
    visited.add(stepId)
    recursionStack.add(stepId)
    path.push(stepId)

    const step = steps.find((s) => s.id === stepId)
    if (!step) return false

    for (const dep of step.deps) {
      if (!visited.has(dep)) {
        if (hasCycle(dep)) return true
      } else if (recursionStack.has(dep)) {
        // Found cycle
        const cycleStart = path.indexOf(dep)
        return true
      }
    }

    recursionStack.delete(stepId)
    path.pop()
    return false
  }

  for (const step of steps) {
    if (!visited.has(step.id)) {
      if (hasCycle(step.id)) {
        // Extract the cycle from the path
        const firstOccurrence = path.indexOf(path[path.length - 1])
        return path.slice(firstOccurrence)
      }
    }
  }

  return []
}

/**
 * Extract template variables from task description
 */
function extractTemplateVariables(task: string): string[] {
  const regex = /\{([^}]+)\}/g
  const variables: string[] = []
  let match

  while ((match = regex.exec(task)) !== null) {
    variables.push(match[1])
  }

  return variables
}

export default router