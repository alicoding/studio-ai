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
  edgeType?: 'dependency' | 'loop' | 'conditional'
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
    // Get edge type from data or default to dependency
    const edgeType = data?.edgeType || 'dependency'

    const [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      curvature: edgeType === 'loop' ? 0.7 : 0.25, // More curve for loop edges
    })

    const getEdgeStyle = () => {
      const baseStyle = {
        strokeWidth: edgeType === 'loop' ? 3 : 2,
        strokeDasharray: edgeType === 'loop' ? '5 5' : undefined,
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

    const getEdgeLabelStyle = () => {
      if (edgeType === 'loop') {
        return 'px-2 py-1 bg-amber-50 border border-amber-300 rounded text-xs font-medium shadow-sm text-amber-700'
      }
      return 'px-2 py-1 bg-white border border-gray-300 rounded text-xs font-medium shadow-sm'
    }

    const edgeLabel = getEdgeLabel()

    return (
      <>
        <BaseEdge
          id={id}
          path={edgePath}
          markerEnd={markerEnd}
          style={getEdgeStyle()}
          data-testid={`edge-${id}`}
        />
        {edgeLabel && (
          <EdgeLabelRenderer>
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                pointerEvents: 'all',
              }}
              className={getEdgeLabelStyle()}
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
