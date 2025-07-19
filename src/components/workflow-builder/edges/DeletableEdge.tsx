/**
 * DeletableEdge - Custom React Flow edge with n8n-style hover delete button
 *
 * SOLID: Single responsibility - edge rendering with delete functionality
 * DRY: Reusable edge component for all workflow connections
 * KISS: Simple hover interaction like n8n
 * Library-First: Uses React Flow BaseEdge and getBezierPath
 */

import { useCallback, useState } from 'react'
import { EdgeProps, BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow } from 'reactflow'
import { Trash2 } from 'lucide-react'

export default function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) {
  const { setEdges } = useReactFlow()
  const [isHovered, setIsHovered] = useState(false)

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const onEdgeClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation()

      // Call custom delete handler if provided (for dependency cleanup)
      if (data?.onDelete) {
        data.onDelete(id)
      } else {
        // Fallback to simple edge removal
        setEdges((edges) => edges.filter((edge) => edge.id !== id))
      }
    },
    [id, setEdges, data]
  )

  return (
    <>
      {/* Invisible hover area for edge interaction */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      {/* Actual visible edge */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: isHovered ? 4 : 3,
          stroke: isHovered ? '#3b82f6' : '#64748b',
          transition: 'all 0.2s ease-in-out',
          pointerEvents: 'none',
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <button
            className={`
              transition-all duration-200 ease-in-out
              bg-red-500 hover:bg-red-600 text-white 
              rounded-full shadow-lg border border-white/20
              flex items-center justify-center
              ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}
            `}
            onClick={onEdgeClick}
            title="Delete connection"
            style={{
              width: '24px',
              height: '24px',
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
