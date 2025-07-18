/**
 * Workflow Builder - LangGraph workflow construction service
 *
 * SOLID: Single responsibility - workflow graph building
 * DRY: Centralized workflow construction logic
 * KISS: Simple workflow building with LangGraph
 * Library-First: Uses LangGraph StateGraph and patterns
 */

import { StateGraph, Annotation, BaseCheckpointSaver, type RetryPolicy } from '@langchain/langgraph'
import type { WorkflowStep, StepResult } from '../schemas/invoke'
import { ConditionEvaluator } from './ConditionEvaluator'
import { WorkflowNodeFactory } from './WorkflowNodeFactory'
import { WorkflowStateManager } from './WorkflowStateManager'

// Type guards - now using WorkflowStep directly since it includes all needed fields
function isConditionalStep(step: WorkflowStep): boolean {
  return step.type === 'conditional'
}

function isLoopStep(step: WorkflowStep): boolean {
  return step.type === 'loop'
}

function isParallelStep(step: WorkflowStep): boolean {
  return step.type === 'parallel'
}

function isHumanStep(step: WorkflowStep): boolean {
  return step.type === 'human'
}

// Workflow state schema - exported for use in other workflow services
export const WorkflowStateSchema = Annotation.Root({
  steps: Annotation<WorkflowStep[]>({
    reducer: (x, y) => y,
    default: () => [],
  }),
  currentStepIndex: Annotation<number>({
    reducer: (x, y) => y,
    default: () => 0,
  }),
  stepResults: Annotation<Record<string, StepResult>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  stepOutputs: Annotation<Record<string, string>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  sessionIds: Annotation<Record<string, string>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  threadId: Annotation<string>({
    reducer: (x, y) => y,
    default: () => '',
  }),
  projectId: Annotation<string>({
    reducer: (x, y) => y,
    default: () => '',
  }),
  status: Annotation<'running' | 'completed' | 'partial' | 'failed' | 'aborted'>({
    reducer: (x, y) => y,
    default: () => 'running',
  }),
  startNewConversation: Annotation<boolean>({
    reducer: (x, y) => y,
    default: () => false,
  }),
})

export class WorkflowBuilder {
  constructor(
    private nodeFactory: WorkflowNodeFactory,
    private conditionEvaluator: ConditionEvaluator,
    private stateManager: WorkflowStateManager
  ) {}

  /**
   * Build a LangGraph workflow from workflow steps
   */
  async buildWorkflow(steps: WorkflowStep[], checkpointer: BaseCheckpointSaver) {
    const workflow = new StateGraph(WorkflowStateSchema)

    // Set up retry policy
    const retryPolicy: RetryPolicy = {
      maxAttempts: 2,
      initialInterval: 1000,
      maxInterval: 5000,
      backoffFactor: 2,
      retryOn: (error) => {
        const message = error?.message || ''
        const nonRetryableErrors = [
          'validation failed',
          'invalid configuration',
          'unauthorized',
          'forbidden',
        ]
        return !nonRetryableErrors.some((err) => message.toLowerCase().includes(err))
      },
    }

    // Add nodes for each step
    steps.forEach((step) => {
      if (isConditionalStep(step)) {
        // Conditional steps are handled with conditional edges, not as nodes
        return
      }

      if (isLoopStep(step)) {
        workflow.addNode(step.id!, this.nodeFactory.createLoopNode(step), { retryPolicy })
      } else if (isParallelStep(step)) {
        workflow.addNode(step.id!, this.nodeFactory.createParallelNode(step), { retryPolicy })
      } else if (isHumanStep(step)) {
        workflow.addNode(step.id!, this.nodeFactory.createHumanNode(step), { retryPolicy })
      } else {
        workflow.addNode(step.id!, this.nodeFactory.createTaskNode(step), { retryPolicy })
      }
    })

    // Add edges based on dependencies and conditional logic
    this.addWorkflowEdges(workflow, steps)

    // Connect final steps to end
    const finalSteps = this.stateManager.findFinalSteps(steps)
    finalSteps.forEach((stepId) => {
      workflow.addEdge(stepId as '__start__', '__end__')
    })

    return workflow.compile({ checkpointer })
  }

  /**
   * Add edges to workflow based on step dependencies and conditions
   */
  private addWorkflowEdges(
    workflow: StateGraph<typeof WorkflowStateSchema>,
    steps: WorkflowStep[]
  ) {
    steps.forEach((step) => {
      // Handle conditional steps with LangGraph conditional edges
      if (isConditionalStep(step) && step.condition) {
        if (step.deps && step.deps.length > 0) {
          step.deps.forEach((depId) => {
            workflow.addConditionalEdges(
              depId as '__start__',
              (state: typeof WorkflowStateSchema.State) => {
                return this.evaluateStepCondition(step, state)
              },
              {
                true: step.trueBranch || '__end__',
                false: step.falseBranch || '__end__',
              }
            )
          })
        }
      } else {
        // Standard dependency-based edges for non-conditional steps
        if (step.deps && step.deps.length > 0) {
          // Filter out conditional dependencies
          const nonConditionalDeps = step.deps.filter((depId) => {
            const depStep = steps.find((s) => s.id === depId)
            return !(depStep && isConditionalStep(depStep))
          })

          nonConditionalDeps.forEach((depId) => {
            workflow.addEdge(depId as '__start__', step.id! as '__start__')
          })
        } else if (!step.deps || step.deps.length === 0) {
          // If no dependencies, connect from start
          workflow.addEdge('__start__', step.id! as '__start__')
        }
      }
    })
  }

  /**
   * Evaluate conditional step condition
   */
  private evaluateStepCondition(
    step: WorkflowStep,
    state: typeof WorkflowStateSchema.State
  ): 'true' | 'false' {
    if (!step.condition) {
      console.warn(`Conditional step ${step.id} has no condition, defaulting to false`)
      return 'false'
    }

    try {
      // Create condition context from workflow state
      const context = {
        stepResults: state.stepResults || {},
        stepOutputs: state.stepOutputs || {},
        sessionIds: state.sessionIds || {},
        threadId: state.threadId,
        projectId: state.projectId,
      }

      const result = this.conditionEvaluator.evaluateCondition(step.condition, context)

      if (result.error) {
        console.error(`Condition evaluation error for step ${step.id}: ${result.error}`)
        return 'false'
      }

      return result.result ? 'true' : 'false'
    } catch (error) {
      console.error(`Unexpected error evaluating condition for step ${step.id}:`, error)
      return 'false'
    }
  }

  /**
   * Get workflow state schema for external use
   */
  getWorkflowStateSchema() {
    return WorkflowStateSchema
  }
}
