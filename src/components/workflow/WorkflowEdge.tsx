/**
 * Workflow Edge Component
 * Custom ReactFlow edge for displaying workflow connections
 *
 * SOLID: Single responsibility - edge rendering
 * DRY: Reuses ReactFlow edge patterns
 * KISS: Simple edge styling with type indicators
 * Library-First: Built for ReactFlow integration
 */

import { memo } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from 'reactflow'

interface WorkflowEdgeData {
  condition?: string
  iterations?: number
  label?: string
}

export const WorkflowEdge = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    markerEnd,
    style,
  }: EdgeProps<WorkflowEdgeData>) => {
    const [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    })

    const getEdgeStyle = () => {
      const baseStyle = {
        strokeWidth: 2,
        ...style,
      }

      return baseStyle
    }

    const getEdgeLabel = () => {
      if (data?.label) return data.label
      if (data?.condition) return data.condition
      if (data?.iterations && data.iterations > 1) return `×${data.iterations}`
      return null
    }

    const edgeLabel = getEdgeLabel()

    return (
      <>
        <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={getEdgeStyle()} />
        {edgeLabel && (
          <EdgeLabelRenderer>
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                pointerEvents: 'all',
              }}
              className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-medium shadow-sm"
            >
              {edgeLabel}
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    )
  }
)

WorkflowEdge.displayName = 'WorkflowEdge'
