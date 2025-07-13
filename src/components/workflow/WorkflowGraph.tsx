/**
 * Workflow Graph Visualization
 * ReactFlow-based visual representation of workflow execution
 *
 * SOLID: Single responsibility - workflow graph display
 * DRY: Reuses ReactFlow components and existing UI patterns
 * KISS: Simple graph visualization with clear status indicators
 * Library-First: Uses ReactFlow for graph rendering
 */

import { useCallback, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  BackgroundVariant,
} from 'reactflow'
import type { Node, Edge, NodeTypes, EdgeTypes } from 'reactflow'

import { WorkflowStepNode } from './WorkflowStepNode'
import { WorkflowOperatorNode } from './WorkflowOperatorNode'
import { WorkflowEdge } from './WorkflowEdge'
import { WorkflowGraphSettings, type GraphLayoutConfig } from './WorkflowGraphSettings'
import { WorkflowLayoutEngine } from './WorkflowLayoutEngine'
import type { WorkflowGraph as WorkflowGraphData } from '../../../web/server/schemas/workflow-graph'

interface WorkflowGraphProps {
  data: WorkflowGraphData
  threadId: string
  className?: string
}

export function WorkflowGraph({ data, threadId, className = '' }: WorkflowGraphProps) {
  // Layout configuration state
  // Use manual layout for consolidated view to preserve our custom positions
  const isConsolidatedView = data.nodes.some(
    (n) => n.data.iterationCount && n.data.iterationCount > 1
  )
  const [layoutConfig, setLayoutConfig] = useState<GraphLayoutConfig>({
    direction: 'LR',
    layoutAlgorithm: isConsolidatedView ? 'manual' : 'hierarchical',
    nodeSpacing: 200,
    levelSpacing: 350,
    nodeWidth: 280,
    enableDragging: false,
    enableMinimap: true,
    enableBackground: true,
  })

  // Define custom node types (memoized to prevent re-creation)
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      step: WorkflowStepNode,
      operator: WorkflowOperatorNode,
    }),
    []
  )

  // Define custom edge types (memoized to prevent re-creation)
  const edgeTypes: EdgeTypes = useMemo(
    () => ({
      dependency: WorkflowEdge,
      loop: WorkflowEdge,
      conditional: WorkflowEdge,
    }),
    []
  )

  // Debug logging
  console.log('[WorkflowGraph] Received data:', data)
  console.log('[WorkflowGraph] Nodes count:', data.nodes.length)
  console.log('[WorkflowGraph] Edges count:', data.edges.length)

  // Convert workflow graph data to ReactFlow format using layout engine
  const initialNodes: Node[] = useMemo(() => {
    // Use the layout engine to calculate positions
    const layoutedNodes = WorkflowLayoutEngine.applyLayout(
      data.nodes,
      data.edges.map((edge) => ({ source: edge.source, target: edge.target })),
      layoutConfig
    )

    // Add additional data for ReactFlow
    return layoutedNodes.map((node) => {
      const workflowNode = data.nodes.find((n) => n.id === node.id)!

      // Check if this node is part of any loops
      const nodeLoops = data.execution.loops.filter((loop) => loop.nodes.includes(node.id))
      const isInLoop = nodeLoops.length > 0
      const loopIterations = nodeLoops.reduce((max, loop) => Math.max(max, loop.iterations), 0)

      return {
        ...node,
        data: {
          ...node.data,
          ...workflowNode.data,
          threadId,
          isCurrentNode: data.execution.currentNode === node.id,
          isResumePoint: data.execution.resumePoints.includes(node.id),
          isInExecutionPath: data.execution.path.includes(node.id),
          isInLoop,
          loopIterations: isInLoop ? loopIterations : undefined,
        },
      }
    })
  }, [data.nodes, data.edges, data.execution, threadId, layoutConfig])

  const initialEdges: Edge[] = useMemo(
    () =>
      data.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        animated: edge.animated || false,
        data: {
          ...edge.data,
          edgeType: edge.type, // Pass edge type through data for custom edge component
        },
        style: {
          stroke: getEdgeColor(edge.type),
          strokeWidth: edge.type === 'loop' ? 3 : 2,
          strokeDasharray: edge.type === 'loop' ? '5 5' : undefined,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: getEdgeColor(edge.type),
        },
      })),
    [data.edges]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Update nodes when data changes (for real-time updates)
  useMemo(() => {
    setNodes(initialNodes)
  }, [initialNodes, setNodes])

  useMemo(() => {
    setEdges(initialEdges)
  }, [initialEdges, setEdges])

  const onConnect = useCallback(() => {
    // Prevent manual connections in read-only workflow view
  }, [])

  return (
    <div
      className={`w-full h-full ${className}`}
      style={{ width: '100%', height: '500px', minHeight: '500px' }}
    >
      {/* Settings Panel */}
      <div className="absolute top-2 right-2 z-10">
        <WorkflowGraphSettings config={layoutConfig} onChange={setLayoutConfig} />
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{
          padding: 0.2,
          includeHiddenNodes: false,
        }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        nodesDraggable={layoutConfig.enableDragging}
        nodesConnectable={false}
        elementsSelectable={true}
      >
        {layoutConfig.enableBackground && (
          <Background color="#666" gap={16} size={1} variant={BackgroundVariant.Dots} />
        )}
        <Controls position="top-left" showInteractive={false} />
        {layoutConfig.enableMinimap && (
          <MiniMap
            position="bottom-right"
            nodeColor={getNodeColor}
            nodeBorderRadius={4}
            maskColor="rgba(0, 0, 0, 0.2)"
            style={{
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border)',
            }}
          />
        )}
      </ReactFlow>
    </div>
  )
}

// Helper function to get edge color based on type
function getEdgeColor(type: string): string {
  switch (type) {
    case 'dependency':
      return '#6b7280' // gray-500
    case 'loop':
      return '#f59e0b' // amber-500
    case 'conditional':
      return '#3b82f6' // blue-500
    default:
      return '#6b7280'
  }
}

// Helper function to get node color for minimap
function getNodeColor(node: Node): string {
  const status = node.data?.status
  switch (status) {
    case 'pending':
      return '#6b7280' // gray-500
    case 'running':
      return '#3b82f6' // blue-500
    case 'completed':
      return '#10b981' // emerald-500
    case 'failed':
      return '#ef4444' // red-500
    case 'blocked':
      return '#f59e0b' // amber-500
    default:
      return '#6b7280'
  }
}
