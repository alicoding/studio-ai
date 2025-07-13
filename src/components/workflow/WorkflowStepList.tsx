/**
 * Workflow Step List Component with Loop Visualization
 *
 * SOLID: Single responsibility - displaying workflow steps with loop grouping
 * DRY: Reuses existing status styling and node data structures
 * KISS: Simple loop detection and grouping logic
 * Library-First: Uses existing workflow graph data
 */

import { useState, useMemo } from 'react'
import {
  ChevronDown,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Pause,
} from 'lucide-react'
import type { WorkflowNode } from '../../../web/server/schemas/workflow-graph'

interface WorkflowStepListProps {
  nodes: WorkflowNode[]
  className?: string
}

interface LoopIteration {
  id: string
  nodes: WorkflowNode[]
  startIndex: number
  endIndex: number
  isComplete: boolean
  finalStatus: 'approved' | 'failed' | 'in-progress'
}

// Status styling helper
const getStatusStyles = (status: string): string => {
  const statusMap: Record<string, string> = {
    running: 'bg-blue-500/20 text-blue-700',
    completed: 'bg-green-500/20 text-green-700',
    failed: 'bg-red-500/20 text-red-700',
    blocked: 'bg-orange-500/20 text-orange-700',
    not_executed: 'bg-gray-500/20 text-gray-700',
    skipped: 'bg-blue-500/20 text-blue-700',
    aborted: 'bg-purple-500/20 text-purple-700',
  }
  return statusMap[status] || 'bg-gray-500/20 text-gray-700'
}

interface ExtendedWorkflowStepListProps extends WorkflowStepListProps {
  resumePoints?: string[]
}

export function WorkflowStepList({ nodes, className = '', resumePoints = [] }: ExtendedWorkflowStepListProps) {
  const [expandedLoops, setExpandedLoops] = useState<Set<string>>(new Set())

  // Detect loop iterations
  const loopIterations = useMemo(() => {
    const iterations: LoopIteration[] = []
    const roleSequence: string[] = []
    const iterationNodes: WorkflowNode[][] = []
    let currentIteration: WorkflowNode[] = []

    // Track role appearance to detect loops
    nodes.forEach((node, _index) => {
      const role = node.data.role?.toLowerCase() || node.type

      // Check if we're starting a new iteration (seeing developer role again)
      if (role === 'developer' || role === 'junior developer') {
        if (currentIteration.length > 0) {
          // Save previous iteration
          iterationNodes.push(currentIteration)
          currentIteration = []
        }
      }

      currentIteration.push(node)
      roleSequence.push(role)
    })

    // Add the last iteration
    if (currentIteration.length > 0) {
      iterationNodes.push(currentIteration)
    }

    // Create loop iteration objects
    let nodeIndex = 0
    iterationNodes.forEach((iterNodes, index) => {
      const iteration: LoopIteration = {
        id: `loop-${index}`,
        nodes: iterNodes,
        startIndex: nodeIndex,
        endIndex: nodeIndex + iterNodes.length - 1,
        isComplete: iterNodes.every((n) =>
          ['completed', 'failed', 'blocked'].includes(n.data.status)
        ),
        finalStatus: 'in-progress',
      }

      // Determine final status based on last operator in iteration
      const lastOperator = iterNodes
        .slice()
        .reverse()
        .find((n) => n.type === 'operator')

      if (lastOperator?.data.output) {
        if (
          lastOperator.data.output.includes('APPROVED') ||
          lastOperator.data.output.includes('SUCCESS')
        ) {
          iteration.finalStatus = 'approved'
        } else if (
          lastOperator.data.output.includes('FAILED') ||
          lastOperator.data.output.includes('BLOCKED')
        ) {
          iteration.finalStatus = 'failed'
        }
      }

      iterations.push(iteration)
      nodeIndex += iterNodes.length
    })

    return iterations
  }, [nodes])

  const toggleLoop = (loopId: string) => {
    const newExpanded = new Set(expandedLoops)
    if (newExpanded.has(loopId)) {
      newExpanded.delete(loopId)
    } else {
      newExpanded.add(loopId)
    }
    setExpandedLoops(newExpanded)
  }

  // If no loops detected, render simple list
  if (loopIterations.length <= 1) {
    return (
      <div className={`space-y-3 ${className}`}>
        {nodes.map((node, index) => (
          <NodeCard key={node.id} node={node} index={index} />
        ))}
      </div>
    )
  }

  // Render with loop grouping
  return (
    <div className={`space-y-4 ${className}`}>
      {loopIterations.map((iteration, loopIndex) => {
        const isExpanded = expandedLoops.has(iteration.id)
        const isFirstIteration = loopIndex === 0

        return (
          <div key={iteration.id} className="border border-border rounded-lg overflow-hidden">
            {/* Loop Header */}
            <button
              onClick={() => toggleLoop(iteration.id)}
              className="w-full flex items-center justify-between p-4 bg-secondary/30 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <RefreshCw className="w-4 h-4 text-blue-500" />
                <span className="font-medium">
                  {isFirstIteration ? 'Initial Attempt' : `Loop ${loopIndex}`}
                </span>
                <span className="text-sm text-muted-foreground">
                  ({iteration.nodes.length} steps)
                </span>
              </div>
              <div className="flex items-center gap-2">
                {iteration.isComplete && (
                  <span
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                      iteration.finalStatus === 'approved'
                        ? 'bg-green-500/20 text-green-600'
                        : iteration.finalStatus === 'failed'
                          ? 'bg-red-500/20 text-red-600'
                          : 'bg-blue-500/20 text-blue-600'
                    }`}
                  >
                    {iteration.finalStatus === 'approved' && <CheckCircle className="w-3 h-3" />}
                    {iteration.finalStatus === 'failed' && <XCircle className="w-3 h-3" />}
                    {iteration.finalStatus === 'in-progress' && <AlertCircle className="w-3 h-3" />}
                    {iteration.finalStatus === 'approved'
                      ? 'Approved'
                      : iteration.finalStatus === 'failed'
                        ? 'Needs Revision'
                        : 'In Progress'}
                  </span>
                )}
              </div>
            </button>

            {/* Loop Steps */}
            {isExpanded && (
              <div className="p-4 space-y-3 bg-background/50">
                {iteration.nodes.map((node, nodeIndex) => (
                  <NodeCard
                    key={node.id}
                    node={node}
                    index={iteration.startIndex + nodeIndex}
                    isInLoop={true}
                    isResumePoint={resumePoints.includes(node.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Individual node card component
function NodeCard({
  node,
  index,
  isInLoop = false,
  isResumePoint = false,
}: {
  node: WorkflowNode
  index: number
  isInLoop?: boolean
  isResumePoint?: boolean
}) {
  return (
    <div
      className={`p-4 border rounded-lg ${
        node.type === 'operator' ? 'border-amber-500/30 bg-amber-500/5' : 'border-border'
      } ${isInLoop ? 'ml-4' : ''}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-muted-foreground">{index + 1}.</span>
          <span className="font-medium">{node.id}</span>
          {node.type === 'operator' && (
            <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-600 rounded font-medium">
              🔄 Decision Point
            </span>
          )}
          {isResumePoint && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-amber-500/20 text-amber-600 rounded">
              <Pause className="w-3 h-3" />
              Resume point
            </span>
          )}
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${getStatusStyles(node.data.status)}`}
        >
          {node.data.status}
        </span>
      </div>

      <div className="mb-3">
        <div className="text-xs font-medium text-muted-foreground mb-1">
          {node.type === 'operator' ? 'Decision Logic:' : 'Task:'}
        </div>
        <p className="text-sm bg-secondary/50 p-2 rounded">{node.data.task}</p>
        
        {/* Show decision outcome for operators */}
        {node.type === 'operator' && node.data.output && (
          <div className="mt-2">
            <div className="text-xs font-medium text-muted-foreground mb-1">Decision Outcome:</div>
            <div className={`text-sm px-2 py-1 rounded border ${
              node.data.output.includes('SUCCESS') 
                ? 'bg-green-50 text-green-700 border-green-200'
                : node.data.output.includes('FAILED')
                ? 'bg-red-50 text-red-700 border-red-200'
                : node.data.output.includes('BLOCKED')
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-purple-50 text-purple-700 border-purple-200'
            }`}>
              {node.data.output}
            </div>
          </div>
        )}
      </div>

      {/* Show actual output content for non-operator steps */}
      {node.type !== 'operator' && node.data.output && (
        <div className="mb-3">
          <div className="text-xs font-medium text-muted-foreground mb-1">Output:</div>
          <div className="text-sm bg-primary/5 p-3 rounded whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
            {node.data.output}
          </div>
        </div>
      )}

      <div className="flex gap-4 text-xs text-muted-foreground">
        {node.data.role && <div>Role: {node.data.role}</div>}
        {node.data.agentId && <div>Agent: {node.data.agentId}</div>}
      </div>

      {node.data.error && (
        <div className="text-xs text-red-500 mt-2 p-2 bg-red-500/10 rounded">
          Error: {node.data.error}
        </div>
      )}
    </div>
  )
}
