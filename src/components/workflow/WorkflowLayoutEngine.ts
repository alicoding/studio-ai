/**
 * Workflow Layout Engine
 * Handles different layout algorithms for workflow graph visualization
 *
 * SOLID: Single responsibility - graph layout calculation
 * DRY: Reusable layout algorithms
 * KISS: Simple layout interfaces
 * Library-First: Uses standard layout algorithms
 */

import type { Node } from 'reactflow'
import type { WorkflowNode } from '../../../web/server/schemas/workflow-graph'
import type { GraphLayoutConfig } from './WorkflowGraphSettings'

export interface LayoutPosition {
  x: number
  y: number
}

export class WorkflowLayoutEngine {
  /**
   * Apply layout algorithm to workflow nodes
   */
  static applyLayout(
    nodes: WorkflowNode[],
    edges: { source: string; target: string }[],
    config: GraphLayoutConfig
  ): Node[] {
    let positions: Record<string, LayoutPosition>

    switch (config.layoutAlgorithm) {
      case 'hierarchical':
        positions = this.hierarchicalLayout(nodes, edges, config)
        break
      case 'force':
        positions = this.forceDirectedLayout(nodes, edges, config)
        break
      case 'circular':
        positions = this.circularLayout(nodes, config)
        break
      case 'manual':
        positions = this.manualLayout(nodes, config)
        break
      default:
        positions = this.hierarchicalLayout(nodes, edges, config)
    }

    return nodes.map((node) => ({
      id: node.id,
      type: node.type, // Preserve the original node type (step or operator)
      position: positions[node.id] || { x: 0, y: 0 },
      data: {
        ...node.data,
        nodeWidth: config.nodeWidth,
      },
      style: {
        width: config.nodeWidth,
      },
    }))
  }

  /**
   * Hierarchical layout based on dependencies
   */
  private static hierarchicalLayout(
    nodes: WorkflowNode[],
    edges: { source: string; target: string }[],
    config: GraphLayoutConfig
  ): Record<string, LayoutPosition> {
    const positions: Record<string, LayoutPosition> = {}
    const depths = this.calculateDepths(nodes, edges)

    // Group nodes by depth level
    const nodesByDepth = new Map<number, WorkflowNode[]>()
    nodes.forEach((node) => {
      const depth = depths[node.id] || 0
      if (!nodesByDepth.has(depth)) {
        nodesByDepth.set(depth, [])
      }
      nodesByDepth.get(depth)!.push(node)
    })

    // Position nodes based on direction
    nodesByDepth.forEach((nodesAtDepth, depth) => {
      nodesAtDepth.forEach((node, index) => {
        const position = this.calculateHierarchicalPosition(
          depth,
          index,
          nodesAtDepth.length,
          config
        )
        positions[node.id] = position
      })
    })

    return positions
  }

  /**
   * Calculate position for hierarchical layout
   */
  private static calculateHierarchicalPosition(
    depth: number,
    index: number,
    totalAtDepth: number,
    config: GraphLayoutConfig
  ): LayoutPosition {
    const { direction, levelSpacing, nodeSpacing } = config

    // Calculate primary and secondary coordinates
    const primaryPos = depth * levelSpacing
    const secondaryPos = (index - (totalAtDepth - 1) / 2) * nodeSpacing

    switch (direction) {
      case 'LR': // Left to Right
        return { x: primaryPos, y: secondaryPos }
      case 'RL': // Right to Left
        return { x: -primaryPos, y: secondaryPos }
      case 'TB': // Top to Bottom
        return { x: secondaryPos, y: primaryPos }
      case 'BT': // Bottom to Top
        return { x: secondaryPos, y: -primaryPos }
      default:
        return { x: primaryPos, y: secondaryPos }
    }
  }

  /**
   * Force-directed layout for organic positioning
   */
  private static forceDirectedLayout(
    nodes: WorkflowNode[],
    edges: { source: string; target: string }[],
    config: GraphLayoutConfig
  ): Record<string, LayoutPosition> {
    const positions: Record<string, LayoutPosition> = {}

    // Initialize random positions
    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI
      const radius = Math.min(config.levelSpacing, config.nodeSpacing) * 2
      positions[node.id] = {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      }
    })

    // Simple force simulation (simplified for performance)
    for (let iteration = 0; iteration < 50; iteration++) {
      // Repulsion between all nodes
      nodes.forEach((nodeA) => {
        let fx = 0,
          fy = 0
        nodes.forEach((nodeB) => {
          if (nodeA.id === nodeB.id) return

          const dx = positions[nodeA.id].x - positions[nodeB.id].x
          const dy = positions[nodeA.id].y - positions[nodeB.id].y
          const distance = Math.sqrt(dx * dx + dy * dy) || 1

          const repulsion = config.nodeSpacing / distance
          fx += (dx / distance) * repulsion
          fy += (dy / distance) * repulsion
        })

        // Attraction along edges
        edges.forEach((edge) => {
          if (edge.source === nodeA.id) {
            const target = positions[edge.target]
            const dx = target.x - positions[nodeA.id].x
            const dy = target.y - positions[nodeA.id].y
            const distance = Math.sqrt(dx * dx + dy * dy) || 1

            const attraction = distance / config.levelSpacing
            fx += (dx / distance) * attraction * 0.1
            fy += (dy / distance) * attraction * 0.1
          }
        })

        // Apply forces with damping
        positions[nodeA.id].x += fx * 0.1
        positions[nodeA.id].y += fy * 0.1
      })
    }

    return positions
  }

  /**
   * Circular layout
   */
  private static circularLayout(
    nodes: WorkflowNode[],
    config: GraphLayoutConfig
  ): Record<string, LayoutPosition> {
    const positions: Record<string, LayoutPosition> = {}
    const radius = Math.max(
      config.levelSpacing,
      (config.nodeSpacing * nodes.length) / (2 * Math.PI)
    )

    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI
      positions[node.id] = {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      }
    })

    return positions
  }

  /**
   * Manual layout (preserves existing positions)
   */
  private static manualLayout(
    nodes: WorkflowNode[],
    _config: GraphLayoutConfig
  ): Record<string, LayoutPosition> {
    const positions: Record<string, LayoutPosition> = {}

    nodes.forEach((node) => {
      positions[node.id] = {
        x: node.position.x,
        y: node.position.y,
      }
    })

    return positions
  }

  /**
   * Calculate depths of nodes based on dependencies
   */
  private static calculateDepths(
    nodes: WorkflowNode[],
    edges: { source: string; target: string }[]
  ): Record<string, number> {
    const depths: Record<string, number> = {}
    const visited = new Set<string>()

    // Find root nodes (no incoming edges)
    const hasIncoming = new Set(edges.map((e) => e.target))
    const rootNodes = nodes.filter((n) => !hasIncoming.has(n.id))

    // BFS to calculate depths
    const calculateDepth = (nodeId: string, currentDepth: number) => {
      if (visited.has(nodeId)) return
      visited.add(nodeId)
      depths[nodeId] = Math.max(depths[nodeId] || 0, currentDepth)

      // Find children
      const children = edges.filter((e) => e.source === nodeId).map((e) => e.target)
      children.forEach((childId) => calculateDepth(childId, currentDepth + 1))
    }

    rootNodes.forEach((node) => calculateDepth(node.id, 0))

    // Handle disconnected nodes
    nodes.forEach((node) => {
      if (!visited.has(node.id)) {
        depths[node.id] = 0
      }
    })

    return depths
  }
}
