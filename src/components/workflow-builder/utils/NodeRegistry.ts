/**
 * Node Registry - Dynamic component registration for workflow nodes
 *
 * SOLID: Single responsibility - node type management
 * DRY: Centralized node registration logic
 * KISS: Simple Map-based registry
 * Library-First: Extends React Flow NodeTypes pattern
 */

import type { NodeTypes, NodeProps } from 'reactflow'
import type { ComponentType } from 'react'

// Type for React Flow node components - uses NodeProps which is what React Flow expects
type NodeComponent = ComponentType<NodeProps>

// Import StepExecutor type for unified registration
import type { StepExecutor } from '../../../../web/server/services/executors/StepExecutor'
// Import existing StepExecutorRegistry for coordination (extends existing pattern)
import { StepExecutorRegistry } from '../../../../web/server/services/executors/StepExecutorRegistry'

// Unified node registration entry (extends existing patterns)
interface UnifiedNodeEntry {
  componentName: string
  category: 'basic' | 'control' | 'config' | 'ai'
  description: string
  executor?: StepExecutor // Optional executor for unified registration
}

// Dynamic import pattern to avoid TypeScript JSX issues
const getNodeComponent = (componentName: string): Promise<NodeComponent> => {
  switch (componentName) {
    case 'WorkflowStepNode':
      return import('../nodes/WorkflowStepNode').then((m) => m.default)
    case 'ConditionalNode':
      return import('../nodes/ConditionalNode').then((m) => m.default)
    case 'LoopNode':
      return import('../nodes/LoopNode').then((m) => m.default)
    case 'ParallelNode':
      return import('../nodes/ParallelNode').then((m) => m.default)
    case 'HumanNode':
      return import('../nodes/HumanNode').then((m) => m.default)
    case 'AIEvaluationNode':
      return import('../nodes/AIEvaluationNode').then((m) => m.default)
    case 'ProviderNode':
      return import('../nodes/ProviderNode').then((m) => m.default)
    case 'MemoryNode':
      return import('../nodes/MemoryNode').then((m) => m.default)
    case 'ToolsNode':
      return import('../nodes/ToolsNode').then((m) => m.default)
    default:
      throw new Error(`Unknown component: ${componentName}`)
  }
}

interface NodeRegistryEntry {
  componentName: string
  category: 'basic' | 'control' | 'config' | 'ai'
  description: string
}

class WorkflowNodeRegistry {
  private nodes = new Map<string, NodeRegistryEntry>()
  private componentCache = new Map<string, NodeComponent>()
  private executorRegistry: StepExecutorRegistry // Coordinate with existing registry

  constructor() {
    // Initialize with existing registry instance (extends existing pattern)
    this.executorRegistry = new StepExecutorRegistry()
  }

  /**
   * Register a node type with its component name
   * SOLID: Open/closed principle - extend without modifying
   */
  register(type: string, entry: NodeRegistryEntry): void {
    this.nodes.set(type, entry)
  }

  /**
   * Unified node registration - coordinates component and executor registration
   * SOLID: Single responsibility - unified registration
   * DRY: Reuses existing registration patterns
   * Library-First: Extends existing registry coordination
   */
  registerNode(type: string, entry: UnifiedNodeEntry): void {
    // Register component using existing pattern
    this.register(type, {
      componentName: entry.componentName,
      category: entry.category,
      description: entry.description,
    })

    // Register executor if provided (coordinates with StepExecutorRegistry)
    if (entry.executor) {
      // Use existing registerForTypes method to coordinate registries
      this.executorRegistry.registerForTypes(entry.executor, [type])
    }
  }

  /**
   * Get React Flow NodeTypes object
   * DRY: Reuses existing React Flow pattern
   */
  async getNodeTypes(): Promise<NodeTypes> {
    const nodeTypes: NodeTypes = {}

    for (const [type, entry] of this.nodes.entries()) {
      if (!this.componentCache.has(entry.componentName)) {
        const component = await getNodeComponent(entry.componentName)
        this.componentCache.set(entry.componentName, component)
      }

      const component = this.componentCache.get(entry.componentName)
      if (component) {
        nodeTypes[type] = component
      }
    }

    return nodeTypes
  }

  /**
   * Get React Flow NodeTypes object synchronously (for compatibility)
   * Uses pre-loaded components from VisualWorkflowBuilder
   */
  getNodeTypesSync(preloadedComponents: NodeTypes): NodeTypes {
    const nodeTypes: NodeTypes = {}
    this.nodes.forEach((entry, type) => {
      // Map componentName to the preloaded component
      const componentKey = this.getComponentKey(entry.componentName)
      if (preloadedComponents[componentKey]) {
        nodeTypes[type] = preloadedComponents[componentKey]
      }
    })
    return nodeTypes
  }

  /**
   * Map component name to nodeTypes key
   */
  private getComponentKey(componentName: string): string {
    switch (componentName) {
      case 'WorkflowStepNode':
        return 'workflowStep'
      case 'ConditionalNode':
        return 'conditional'
      case 'LoopNode':
        return 'loop'
      case 'ParallelNode':
        return 'parallel'
      case 'HumanNode':
        return 'human'
      case 'AIEvaluationNode':
        return 'aiEvaluation'
      case 'ProviderNode':
        return 'provider'
      case 'MemoryNode':
        return 'memory'
      case 'ToolsNode':
        return 'tools'
      default:
        return 'workflowStep'
    }
  }

  /**
   * Map workflow step type to React Flow node type
   * Extends existing switch statement logic
   */
  getNodeType(stepType: string): string {
    return this.nodes.has(stepType) ? stepType : 'workflowStep'
  }

  /**
   * Get all registered node types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.nodes.keys())
  }

  /**
   * Check if a node type is registered
   */
  hasNodeType(type: string): boolean {
    return this.nodes.has(type)
  }
}

// Create singleton instance (extends existing pattern)
const nodeRegistry = new WorkflowNodeRegistry()

// Register all existing nodes (maintain backward compatibility)
nodeRegistry.register('workflowStep', {
  componentName: 'WorkflowStepNode',
  category: 'basic',
  description: 'Standard workflow task',
})

nodeRegistry.register('conditional', {
  componentName: 'ConditionalNode',
  category: 'control',
  description: 'Conditional branching',
})

nodeRegistry.register('loop', {
  componentName: 'LoopNode',
  category: 'control',
  description: 'Loop execution',
})

nodeRegistry.register('parallel', {
  componentName: 'ParallelNode',
  category: 'control',
  description: 'Parallel execution',
})

nodeRegistry.register('human', {
  componentName: 'HumanNode',
  category: 'control',
  description: 'Human interaction',
})

nodeRegistry.register('aiEvaluation', {
  componentName: 'AIEvaluationNode',
  category: 'ai',
  description: 'AI evaluation',
})

nodeRegistry.register('provider', {
  componentName: 'ProviderNode',
  category: 'config',
  description: 'AI provider configuration',
})

nodeRegistry.register('memory', {
  componentName: 'MemoryNode',
  category: 'config',
  description: 'Memory configuration',
})

nodeRegistry.register('tools', {
  componentName: 'ToolsNode',
  category: 'config',
  description: 'Tools configuration',
})

export { nodeRegistry, type NodeRegistryEntry }
