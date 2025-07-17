/**
 * Workflow Graph Generator - Pure visualization logic
 *
 * SOLID: Single responsibility - only generates graph structures
 * DRY: Reusable graph generation patterns
 * KISS: Simple node/edge generation without orchestration concerns
 * Library-First: Uses existing workflow types and structures
 */

import type { WorkflowStep, StepResult } from '../schemas/invoke'
import type {
  WorkflowGraph,
  WorkflowNode,
  WorkflowEdge,
  WorkflowLoop,
} from '../schemas/workflow-graph'

export class WorkflowGraphGenerator {
  /**
   * Topological sort to ensure steps are in dependency order
   * KISS: Simple depth-first search based topological sort
   */
  private topologicalSort(steps: WorkflowStep[]): WorkflowStep[] {
    const visited = new Set<string>()
    const result: WorkflowStep[] = []

    const visit = (stepId: string) => {
      if (visited.has(stepId)) return
      visited.add(stepId)

      const step = steps.find((s) => s.id === stepId)
      if (!step) return

      // Visit dependencies first
      if (step.deps) {
        step.deps.forEach((depId) => visit(depId))
      }

      result.push(step)
    }

    // Visit all steps
    steps.forEach((step) => visit(step.id!))

    return result
  }

  /**
   * Generate workflow graph structure for visualization
   * Supports both detailed view (all steps) and consolidated view (logical nodes only)
   * KISS: Simple node/edge generation based on workflow steps
   * DRY: Reuses step information already available
   * Library-First: Uses LangGraph patterns for loop detection
   */
  generateWorkflowGraph(
    steps: WorkflowStep[],
    stepResults: Record<string, StepResult>,
    sessionIds: Record<string, string>,
    consolidateLoops = false
  ): WorkflowGraph {
    // Detect loops first using LangGraph patterns
    const detectedLoops = this.detectLangGraphLoops(steps, stepResults)

    if (consolidateLoops) {
      return this.generateConsolidatedGraph(steps, stepResults, sessionIds, detectedLoops)
    }

    return this.generateDetailedGraph(steps, stepResults, sessionIds, detectedLoops)
  }

  /**
   * Generate detailed graph showing all execution steps (current behavior)
   */
  private generateDetailedGraph(
    steps: WorkflowStep[],
    stepResults: Record<string, StepResult>,
    sessionIds: Record<string, string>,
    loops: WorkflowLoop[]
  ): WorkflowGraph {
    const operatorNodes: WorkflowNode[] = []

    // Sort steps by dependency order to ensure correct execution flow
    const sortedSteps = this.topologicalSort(steps)

    // Generate step nodes
    const stepNodes: WorkflowNode[] = sortedSteps.map((step: WorkflowStep, index: number) => {
      const result = stepResults[step.id!]
      const x = this.calculateNodeX(step, steps)
      const y = this.calculateNodeY(step, steps, index)

      return {
        id: step.id!,
        type: 'step',
        data: {
          agentId: step.agentId,
          role: step.role,
          task: step.task,
          status: this.mapResultStatusToNodeStatus(result?.status),
          startTime: result ? Date.now() - result.duration : undefined,
          endTime: result ? Date.now() : undefined,
          output: result?.response,
          error: result?.status === 'failed' ? result?.response : undefined,
          sessionId: sessionIds[step.id!],
        },
        position: { x, y },
      }
    })

    // Build nodes in execution order: step1 -> operator1 -> step2 -> operator2
    const nodes: WorkflowNode[] = []

    sortedSteps.forEach((step) => {
      const stepNode = stepNodes.find((n) => n.id === step.id)
      if (stepNode) {
        // Add the step node
        nodes.push(stepNode)

        // Add the operator node immediately after
        const operatorId = `operator-${step.id}`
        const stepResult = stepResults[step.id!]

        const operatorNode: WorkflowNode = {
          id: operatorId,
          type: 'operator',
          data: {
            task: 'Evaluate output: SUCCESS/BLOCKED/FAILED',
            status: this.getOperatorStatus(stepResult),
            agentId: 'AI Operator',
            role: 'evaluation',
            output: stepResult
              ? `Status: ${this.getOperatorEvaluationResult(stepResult)}`
              : undefined,
          },
          position: {
            x: stepNode.position.x + 175, // Position to the right of the step
            y: stepNode.position.y,
          },
        }

        nodes.push(operatorNode)
        operatorNodes.push(operatorNode)
      }
    })

    // Generate edges
    const edges = this.generateEdges(sortedSteps, stepResults)

    // Use the passed loops parameter instead of detecting again
    const workflowLoops = loops

    // Build execution path
    const executionPath = this.buildExecutionPath(sortedSteps, stepResults)

    return {
      nodes,
      edges,
      execution: {
        path: executionPath,
        loops: workflowLoops,
        currentNode: this.findCurrentNode(stepResults),
        resumePoints: this.findResumePoints(stepResults),
        startTime: Math.min(...Object.values(stepResults).map((r) => Date.now() - r.duration)),
        endTime: this.isWorkflowComplete(stepResults) ? Date.now() : undefined,
      },
    }
  }

  /**
   * Generate edges based on dependencies and operator flow
   */
  private generateEdges(
    steps: WorkflowStep[],
    stepResults: Record<string, StepResult>
  ): WorkflowEdge[] {
    // Detect loops first
    const loops = this.detectLoops(steps, stepResults)

    // Create a set of loop edges for quick lookup
    const loopEdges = new Set<string>()
    loops.forEach((loop) => {
      // Mark edges that are part of loops
      for (let i = 0; i < loop.nodes.length - 1; i++) {
        const edgeId = `${loop.nodes[i]}-${loop.nodes[i + 1]}`
        loopEdges.add(edgeId)
      }
      // Close the loop
      if (loop.nodes.length > 1) {
        const edgeId = `${loop.nodes[loop.nodes.length - 1]}-${loop.nodes[0]}`
        loopEdges.add(edgeId)
      }
    })

    const edges: WorkflowEdge[] = []

    // Create edges that show the flow through operators
    steps.forEach((step) => {
      const stepOperatorId = `operator-${step.id}`

      // Edge from step to its operator (evaluation)
      edges.push({
        id: `${step.id}-${stepOperatorId}`,
        source: step.id!,
        target: stepOperatorId,
        type: 'dependency',
        animated: false,
        data: {
          label: 'Output →',
        },
      })
    })

    // Create edges from operators to dependent steps
    steps.forEach((step) => {
      if (step.deps && step.deps.length > 0) {
        step.deps.forEach((depId) => {
          const depOperatorId = `operator-${depId}`
          const edgeId = `${depOperatorId}-${step.id}`
          const isLoopEdge = loopEdges.has(`${depId}-${step.id}`)

          // Edge from previous step's operator to current step
          edges.push({
            id: edgeId,
            source: depOperatorId,
            target: step.id!,
            type: isLoopEdge ? 'loop' : 'conditional',
            animated: isLoopEdge && loops.some((l) => l.active),
            data: {
              condition: isLoopEdge ? 'FAILED' : 'SUCCESS',
              label: isLoopEdge ? 'Retry' : 'Continue',
              iterations: isLoopEdge
                ? loops.find((l) => l.nodes.includes(depId) && l.nodes.includes(step.id!))
                    ?.iterations
                : undefined,
            },
          })
        })
      }
    })

    return edges
  }

  /**
   * Calculate X position for node based on dependencies
   */
  private calculateNodeX(step: WorkflowStep, allSteps: WorkflowStep[]): number {
    const baseX = 50
    const spacing = 350 // Increased spacing between columns

    // Calculate depth (distance from start)
    const depth = this.calculateDepth(step.id!, allSteps)
    return baseX + depth * spacing
  }

  /**
   * Calculate Y position for node to avoid overlaps
   */
  private calculateNodeY(step: WorkflowStep, allSteps: WorkflowStep[], _index: number): number {
    const baseY = 50
    const spacing = 200 // Increased vertical spacing

    // Group by depth level
    const depth = this.calculateDepth(step.id!, allSteps)
    const sameDepthSteps = allSteps.filter((s) => this.calculateDepth(s.id!, allSteps) === depth)

    const positionInLevel = sameDepthSteps.findIndex((s) => s.id === step.id)

    // Center nodes vertically if there are fewer nodes than max
    const maxNodesAtDepth = Math.max(
      ...Array.from(
        { length: 10 },
        (_, i) => allSteps.filter((s) => this.calculateDepth(s.id!, allSteps) === i).length
      )
    )

    const offsetY = ((maxNodesAtDepth - sameDepthSteps.length) * spacing) / 4
    return baseY + offsetY + positionInLevel * spacing
  }

  /**
   * Calculate depth of a step in the dependency graph
   */
  private calculateDepth(stepId: string, allSteps: WorkflowStep[]): number {
    const step = allSteps.find((s) => s.id === stepId)
    if (!step || !step.deps || step.deps.length === 0) {
      return 0
    }

    const depDepths = step.deps.map((depId) => this.calculateDepth(depId, allSteps))
    return Math.max(...depDepths) + 1
  }

  /**
   * Map step result status to node visualization status
   */
  /**
   * Determine operator status based on step result
   */
  private getOperatorStatus(
    stepResult?: StepResult
  ):
    | 'pending'
    | 'running'
    | 'completed'
    | 'failed'
    | 'blocked'
    | 'not_executed'
    | 'skipped'
    | 'aborted' {
    if (!stepResult) return 'pending'

    // Operator successfully evaluates any step that actually executed
    // The operator's job is to evaluate the outcome, regardless of success/failure
    switch (stepResult.status) {
      case 'success':
        return 'completed' // Operator evaluated successful step → "SUCCESS"
      case 'failed':
        return 'completed' // Operator evaluated failed step → "FAILED"
      case 'blocked':
        return 'completed' // Operator evaluated blocked step → "BLOCKED"
      case 'aborted':
        return 'completed' // Operator evaluated aborted step → "ABORTED"
      case 'not_executed':
        return 'not_executed' // Operator never ran because step never executed
      case 'skipped':
        return 'skipped' // Operator was skipped because step was skipped
      default:
        return 'pending'
    }
  }

  /**
   * Get operator evaluation result based on step outcome
   */
  private getOperatorEvaluationResult(stepResult: StepResult): string {
    switch (stepResult.status) {
      case 'success':
        return 'SUCCESS'
      case 'failed':
        return 'FAILED'
      case 'blocked':
        return 'BLOCKED'
      case 'aborted':
        return 'ABORTED'
      case 'not_executed':
        return 'NOT_EXECUTED'
      case 'skipped':
        return 'SKIPPED'
      default:
        return 'PENDING'
    }
  }

  private mapResultStatusToNodeStatus(
    status?: 'success' | 'failed' | 'blocked' | 'running' | 'not_executed' | 'skipped' | 'aborted'
  ):
    | 'pending'
    | 'running'
    | 'completed'
    | 'failed'
    | 'blocked'
    | 'not_executed'
    | 'skipped'
    | 'aborted' {
    if (!status) return 'pending'

    switch (status) {
      case 'success':
        return 'completed'
      case 'failed':
        return 'failed'
      case 'blocked':
        return 'blocked'
      case 'running':
        return 'running'
      case 'not_executed':
        return 'not_executed'
      case 'skipped':
        return 'skipped'
      case 'aborted':
        return 'aborted'
      default:
        return 'pending'
    }
  }

  /**
   * Detect loops in workflow execution
   */
  private detectLoops(
    steps: WorkflowStep[],
    stepResults: Record<string, StepResult>
  ): WorkflowLoop[] {
    const loops: WorkflowLoop[] = []
    const rolePatterns: Map<string, string[]> = new Map()

    // Build dependency graph and track role patterns
    const dependencies: Map<string, Set<string>> = new Map()

    steps.forEach((step) => {
      // Track dependencies
      if (step.deps) {
        step.deps.forEach((depId) => {
          if (!dependencies.has(depId)) {
            dependencies.set(depId, new Set())
          }
          dependencies.get(depId)!.add(step.id!)
        })
      }

      // Track role patterns
      if (step.role) {
        if (!rolePatterns.has(step.role)) {
          rolePatterns.set(step.role, [])
        }
        rolePatterns.get(step.role)!.push(step.id!)
      }
    })

    // Detect role-based loops (e.g., developer -> reviewer -> developer)
    steps.forEach((step) => {
      if (!step.role || !step.deps || !step.id) return

      const stepRole = step.role
      const stepId = step.id

      // Check each dependency
      step.deps.forEach((depId) => {
        const depStep = steps.find((s) => s.id === depId)
        if (!depStep?.role) return

        // Check if we've seen this role before in the chain
        const previousStepsWithRole = rolePatterns.get(stepRole) || []
        const currentIndex = previousStepsWithRole.indexOf(stepId)

        // Look for earlier steps with the same role that are ancestors
        for (let i = 0; i < currentIndex; i++) {
          const earlierStepId = previousStepsWithRole[i]
          if (this.isAncestor(earlierStepId, stepId, steps)) {
            // Found a loop!
            const loopNodes = this.getLoopPath(earlierStepId, stepId, steps)

            // Check if this loop is currently active
            const active = loopNodes.some((nodeId: string) => {
              const result = stepResults[nodeId]
              return result?.status === 'blocked'
            })

            loops.push({
              nodes: loopNodes,
              iterations: this.countLoopIterations(loopNodes, stepRole, rolePatterns),
              active,
            })
          }
        }
      })
    })

    // Also detect direct circular dependencies
    steps.forEach((step) => {
      if (step.task.includes('.output}')) {
        // Extract referenced step IDs
        const references = step.task.match(/\{(\w+)\.output\}/g) || []
        const referencedIds = references
          .map((ref) => ref.match(/\{(\w+)\.output\}/)?.[1])
          .filter(Boolean) as string[]

        // Check if this forms a direct cycle
        referencedIds.forEach((refId) => {
          const referencedStep = steps.find((s) => s.id === refId)
          if (referencedStep?.deps?.includes(step.id!)) {
            // Direct circular dependency
            loops.push({
              nodes: [refId, step.id!],
              iterations: 1,
              active: false,
            })
          }
        })
      }
    })

    return loops
  }

  /**
   * Helper method to check if one step is an ancestor of another
   */
  private isAncestor(ancestorId: string, descendantId: string, steps: WorkflowStep[]): boolean {
    const visited = new Set<string>()
    const queue = [descendantId]

    while (queue.length > 0) {
      const currentId = queue.shift()!
      if (visited.has(currentId)) continue
      visited.add(currentId)

      const currentStep = steps.find((s) => s.id === currentId)
      if (!currentStep?.deps) continue

      for (const depId of currentStep.deps) {
        if (depId === ancestorId) return true
        queue.push(depId)
      }
    }

    return false
  }

  /**
   * Get the path of nodes that form a loop
   */
  private getLoopPath(startId: string, endId: string, steps: WorkflowStep[]): string[] {
    const path: string[] = []
    const visited = new Set<string>()

    // Build path from end to start
    const buildPath = (currentId: string): boolean => {
      if (visited.has(currentId)) return false
      visited.add(currentId)
      path.unshift(currentId)

      if (currentId === startId) return true

      const currentStep = steps.find((s) => s.id === currentId)
      if (!currentStep?.deps) return false

      for (const depId of currentStep.deps) {
        if (buildPath(depId)) return true
      }

      path.shift() // Remove from path if not part of the loop
      return false
    }

    buildPath(endId)
    return path
  }

  /**
   * Count how many times a role appears in the loop
   */
  private countLoopIterations(
    loopNodes: string[],
    role: string,
    rolePatterns: Map<string, string[]>
  ): number {
    const roleSteps = rolePatterns.get(role) || []
    return loopNodes.filter((nodeId) => roleSteps.includes(nodeId)).length
  }

  /**
   * Build execution path from step results
   */
  private buildExecutionPath(
    _steps: WorkflowStep[],
    stepResults: Record<string, StepResult>
  ): string[] {
    return Object.entries(stepResults)
      .filter(([_, result]) => result.status === 'success' || result.status === 'failed')
      .map(([stepId]) => stepId)
  }

  /**
   * Find currently executing node
   */
  private findCurrentNode(_stepResults: Record<string, StepResult>): string | undefined {
    // StepResult doesn't have 'running' status, so we can't detect currently running nodes
    // This would need to be tracked separately during execution
    return undefined
  }

  /**
   * Find resume points in workflow
   */
  private findResumePoints(stepResults: Record<string, StepResult>): string[] {
    return Object.entries(stepResults)
      .filter(([_, result]) => result.status === 'blocked' || result.status === 'failed')
      .map(([stepId]) => stepId)
  }

  /**
   * Check if workflow is complete
   */
  private isWorkflowComplete(stepResults: Record<string, StepResult>): boolean {
    return Object.values(stepResults).every(
      (result) => result.status === 'success' || result.status === 'failed'
    )
  }

  /**
   * Detect loops using LangGraph conditional edge patterns
   * Library-First: Uses LangGraph's native loop detection approach
   */
  private detectLangGraphLoops(
    steps: WorkflowStep[],
    stepResults: Record<string, StepResult>
  ): WorkflowLoop[] {
    // For now, delegate to existing detectLoops method
    // TODO: Enhance with LangGraph conditional edge patterns
    return this.detectLoops(steps, stepResults)
  }

  /**
   * Generate consolidated graph with 3 logical nodes for loop visualization
   * Shows: [Junior Dev] ←×3→ [Operator] ←×3→ [Senior Reviewer]
   */
  private generateConsolidatedGraph(
    steps: WorkflowStep[],
    stepResults: Record<string, StepResult>,
    sessionIds: Record<string, string>,
    loops: WorkflowLoop[]
  ): WorkflowGraph {
    console.log('[WorkflowGraphGenerator] generateConsolidatedGraph called')
    console.log('[WorkflowGraphGenerator] Input steps:', steps.length)
    // Analyze the workflow pattern to identify execution units
    const executionUnits = this.identifyExecutionUnits(steps, stepResults)
    console.log('[WorkflowGraphGenerator] Execution units:', executionUnits.length, executionUnits)

    // Create consolidated nodes for each execution unit
    const consolidatedNodes = this.createConsolidatedNodes(executionUnits, stepResults, sessionIds)

    // Create aggregated edges with iteration counters
    const consolidatedEdges = this.createConsolidatedEdges(executionUnits, loops)

    // Build execution path for consolidated view
    const executionPath = this.buildConsolidatedExecutionPath(executionUnits)

    return {
      nodes: consolidatedNodes,
      edges: consolidatedEdges,
      execution: {
        path: executionPath,
        loops,
        currentNode: this.findCurrentNode(stepResults),
        resumePoints: this.findResumePoints(stepResults),
        startTime: Math.min(...Object.values(stepResults).map((r) => Date.now() - r.duration)),
        endTime: this.isWorkflowComplete(stepResults) ? Date.now() : undefined,
      },
    }
  }

  /**
   * Identify execution units from workflow steps
   * Groups steps by role/agent to find logical execution units
   * Creates separate units for: developer steps, reviewer steps, and operators
   */
  private identifyExecutionUnits(
    steps: WorkflowStep[],
    _stepResults: Record<string, StepResult>
  ): Array<{ role: string; agentId?: string; stepIds: string[]; iterationCount: number }> {
    const roleGroups = new Map<string, string[]>()

    // Group steps by role/agentId
    steps.forEach((step) => {
      const key = step.agentId || step.role || 'unknown'
      if (!roleGroups.has(key)) {
        roleGroups.set(key, [])
      }
      roleGroups.get(key)!.push(step.id!)
    })

    // Convert to execution units with iteration counts
    const executionUnits = Array.from(roleGroups.entries()).map(([key, stepIds]) => {
      const isAgent = steps.find((s) => s.id === stepIds[0])?.agentId
      return {
        role: isAgent ? key : steps.find((s) => s.id === stepIds[0])?.role || key,
        agentId: isAgent ? key : undefined,
        stepIds,
        iterationCount: stepIds.length,
      }
    })

    // Add operator execution unit (operators process all steps)
    const allStepIds = steps.map((s) => s.id!)
    const operatorStepIds = allStepIds.map((id) => `operator-${id}`)

    executionUnits.push({
      role: 'operator',
      agentId: 'ElectronHub AI',
      stepIds: operatorStepIds,
      iterationCount: operatorStepIds.length,
    })

    return executionUnits
  }

  /**
   * Create consolidated nodes for execution units
   */
  private createConsolidatedNodes(
    executionUnits: Array<{
      role: string
      agentId?: string
      stepIds: string[]
      iterationCount: number
    }>,
    stepResults: Record<string, StepResult>,
    sessionIds: Record<string, string>
  ): WorkflowNode[] {
    return executionUnits.map((unit, index) => {
      // Determine overall status for this execution unit
      const unitResults = unit.stepIds.map((id) => stepResults[id]).filter(Boolean)
      const hasFailures = unitResults.some((r) => r.status === 'failed')
      const hasSuccess = unitResults.some((r) => r.status === 'success')
      const allCompleted = unitResults.every((r) => r.status === 'success' || r.status === 'failed')

      let status:
        | 'pending'
        | 'running'
        | 'completed'
        | 'failed'
        | 'blocked'
        | 'not_executed'
        | 'skipped'
        | 'aborted'
      if (hasFailures) status = 'failed'
      else if (hasSuccess && allCompleted) status = 'completed'
      else if (hasSuccess) status = 'running'
      else status = 'pending'

      // Get the latest output from this unit
      const latestResult = unitResults[unitResults.length - 1]

      return {
        id: unit.agentId || unit.role,
        type: 'step', // All consolidated nodes use step type for consistent styling
        data: {
          agentId: unit.agentId,
          role: unit.role,
          task: `${unit.role} (×${unit.iterationCount} iterations)`,
          status,
          startTime: unitResults[0] ? Date.now() - unitResults[0].duration : undefined,
          endTime: latestResult ? Date.now() : undefined,
          output: latestResult?.response,
          sessionId: unit.stepIds.map((id) => sessionIds[id]).find(Boolean),
          iterationCount: unit.iterationCount,
        },
        position: {
          x: this.calculateConsolidatedNodeX(unit, executionUnits, index),
          y: this.calculateConsolidatedNodeY(unit, executionUnits, index),
        },
      }
    })
  }

  /**
   * Create consolidated edges showing correct flow
   * Flow pattern: Developer → Reviewer → Operator → (loop back to Developer)
   */
  private createConsolidatedEdges(
    executionUnits: Array<{
      role: string
      agentId?: string
      stepIds: string[]
      iterationCount: number
    }>,
    _loops: WorkflowLoop[]
  ): WorkflowEdge[] {
    const edges: WorkflowEdge[] = []

    // Find each type of unit
    const developerUnit = executionUnits.find((u) =>
      ['developer', 'junior developer'].includes(u.role.toLowerCase())
    )
    const reviewerUnit = executionUnits.find((u) =>
      ['reviewer', 'senior reviewer'].includes(u.role.toLowerCase())
    )
    const operatorUnit = executionUnits.find((u) => u.role.toLowerCase() === 'operator')

    if (!developerUnit || !reviewerUnit || !operatorUnit) {
      // Fallback to linear edges if missing key roles
      for (let i = 0; i < executionUnits.length - 1; i++) {
        const source = executionUnits[i]
        const target = executionUnits[i + 1]
        edges.push({
          id: `${source.agentId || source.role}-${target.agentId || target.role}`,
          source: source.agentId || source.role,
          target: target.agentId || target.role,
          type: 'dependency',
          animated: false,
          data: { label: 'Continue' },
        })
      }
      return edges
    }

    const developerId = developerUnit.agentId || developerUnit.role
    const reviewerId = reviewerUnit.agentId || reviewerUnit.role
    const operatorId = operatorUnit.agentId || operatorUnit.role

    // Calculate iterations (how many times the loop executed)
    const loopIterations = Math.min(developerUnit.iterationCount, reviewerUnit.iterationCount) - 1

    // Developer → Reviewer (always happens)
    edges.push({
      id: `${developerId}-${reviewerId}`,
      source: developerId,
      target: reviewerId,
      type: 'dependency',
      animated: false,
      data: { label: 'Submit for review' },
    })

    // Reviewer → Operator (for evaluation)
    edges.push({
      id: `${reviewerId}-${operatorId}`,
      source: reviewerId,
      target: operatorId,
      type: 'dependency',
      animated: false,
      data: { label: 'Evaluate' },
    })

    // Operator → Developer (loop back if needed)
    if (loopIterations > 0) {
      edges.push({
        id: `${operatorId}-${developerId}`,
        source: operatorId,
        target: developerId,
        type: 'loop',
        animated: true,
        data: {
          label: `×${loopIterations} (retry)`,
          iterations: loopIterations,
          condition: 'FAILED',
        },
      })
    }

    return edges
  }

  /**
   * Build execution path for consolidated view
   */
  private buildConsolidatedExecutionPath(
    executionUnits: Array<{
      role: string
      agentId?: string
      stepIds: string[]
      iterationCount: number
    }>
  ): string[] {
    return executionUnits.map((unit) => unit.agentId || unit.role)
  }

  /**
   * Calculate X position for consolidated nodes
   * Creates correct flow: Developer → Reviewer → Operator → (loop back)
   */
  private calculateConsolidatedNodeX(
    unit: { role: string; agentId?: string; stepIds: string[]; iterationCount: number },
    executionUnits: Array<{
      role: string
      agentId?: string
      stepIds: string[]
      iterationCount: number
    }>,
    _index: number
  ): number {
    const startX = 150
    const spacing = 300

    // Position based on actual execution order
    const role = unit.role.toLowerCase()

    if (role === 'developer' || role === 'junior developer') {
      return startX // Leftmost position
    } else if (role === 'reviewer' || role === 'senior reviewer') {
      return startX + spacing // Middle position
    } else if (role === 'operator') {
      return startX + spacing * 2 // Rightmost position
    }

    // Default positioning for unknown roles
    const allUnits = executionUnits.filter(
      (u) =>
        !['developer', 'junior developer', 'reviewer', 'senior reviewer', 'operator'].includes(
          u.role.toLowerCase()
        )
    )
    const unitIndex = allUnits.findIndex((u) => u.role === unit.role)
    return startX + spacing * 3 + unitIndex * spacing
  }

  /**
   * Calculate Y position for consolidated nodes
   * Keep all nodes on same horizontal level for clear flow visualization
   */
  private calculateConsolidatedNodeY(
    _unit: { role: string; agentId?: string; stepIds: string[]; iterationCount: number },
    _executionUnits: Array<{
      role: string
      agentId?: string
      stepIds: string[]
      iterationCount: number
    }>,
    _index: number
  ): number {
    // All nodes at the same Y level for horizontal flow
    return 150
  }
}
