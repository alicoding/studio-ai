/**
 * Workflow Graph Schema
 * Defines the structure for visual workflow representation
 *
 * KISS: Simple, clear data structures for graph visualization
 * DRY: Reusable types for nodes, edges, and execution data
 * SOLID: Focused interfaces for specific visualization needs
 * Library-First: Designed for ReactFlow compatibility
 */

export interface WorkflowNode {
  id: string
  type: 'step' | 'operator' | 'decision'
  data: {
    agentId?: string
    role?: string
    task: string
    status:
      | 'pending'
      | 'running'
      | 'completed'
      | 'failed'
      | 'blocked'
      | 'not_executed'
      | 'skipped'
      | 'aborted'
    startTime?: number
    endTime?: number
    output?: string
    error?: string
    sessionId?: string
    iterationCount?: number // Added for consolidated view
  }
  position: {
    x: number
    y: number
  }
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  type: 'dependency' | 'loop' | 'conditional'
  animated?: boolean
  data?: {
    condition?: string
    iterations?: number
    label?: string
  }
}

export interface WorkflowLoop {
  nodes: string[] // Node IDs that form the loop
  iterations: number
  active: boolean
}

export interface WorkflowExecution {
  path: string[] // Node IDs in execution order
  loops: WorkflowLoop[]
  currentNode?: string
  resumePoints: string[]
  startTime: number
  endTime?: number
}

export interface WorkflowGraph {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  execution: WorkflowExecution
}

// Helper type for workflow statistics
export interface WorkflowStats {
  totalSteps: number
  completedSteps: number
  failedSteps: number
  blockedSteps: number
  totalDuration?: number
  loopCount: number
  maxLoopIterations: number
}
