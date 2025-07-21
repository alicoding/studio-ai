/**
 * DraggableNodePalette - Draggable node palette for workflow builder
 *
 * SOLID: Single responsibility - node creation palette
 * KISS: Simple drag-and-drop interface
 * Library-First: Uses React Flow Panel component
 */

import { Panel } from 'reactflow'
import {
  Code2,
  Zap,
  Eye,
  Shield,
  Server,
  Palette,
  Building,
  GitBranch,
  Layers,
  User,
  RotateCcw,
  Users,
  Settings,
  Brain,
  Database,
  Wrench,
} from 'lucide-react'
import { useAgentConfigs } from '@/hooks/useAgentConfigs'
import { nodeRegistry } from './utils/NodeRegistry'

interface NodeTypeConfig {
  type: string
  label: string
  icon: React.ReactNode
  color: string
  description: string
  category: 'task' | 'control' | 'config'
}

// Icon mapping for agent roles
const getIconForRole = (iconName: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    Code2: <Code2 className="w-4 h-4" />,
    Building: <Building className="w-4 h-4" />,
    Eye: <Eye className="w-4 h-4" />,
    Zap: <Zap className="w-4 h-4" />,
    Shield: <Shield className="w-4 h-4" />,
    Server: <Server className="w-4 h-4" />,
    Layers: <Layers className="w-4 h-4" />,
    Palette: <Palette className="w-4 h-4" />,
    User: <User className="w-4 h-4" />,
  }
  return iconMap[iconName] || <User className="w-4 h-4" />
}

// Icon and color mapping for registry-generated nodes (extends existing pattern)
const getNodeDisplayInfo = (type: string) => {
  const displayMap: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    conditional: {
      icon: <GitBranch className="w-4 h-4" />,
      color: 'bg-amber-500',
      label: 'Conditional',
    },
    loop: { icon: <RotateCcw className="w-4 h-4" />, color: 'bg-purple-500', label: 'Loop' },
    parallel: { icon: <Settings className="w-4 h-4" />, color: 'bg-blue-500', label: 'Parallel' },
    human: { icon: <Users className="w-4 h-4" />, color: 'bg-green-500', label: 'Human Input' },
    aiEvaluation: { icon: <Brain className="w-4 h-4" />, color: 'bg-orange-500', label: 'AI Task' },
    memory: { icon: <Database className="w-4 h-4" />, color: 'bg-purple-600', label: 'Memory' },
    tools: { icon: <Wrench className="w-4 h-4" />, color: 'bg-orange-600', label: 'Tools' },
  }
  return (
    displayMap[type] || {
      icon: <Settings className="w-4 h-4" />,
      color: 'bg-gray-500',
      label: type,
    }
  )
}

// Generate control and config nodes from registry (follows research best practices)
const getControlNodes = (): NodeTypeConfig[] => {
  const registeredTypes = nodeRegistry.getRegisteredTypes()
  return registeredTypes
    .filter((type) => {
      // Get category from registry - for now use hardcoded mapping during transition
      const controlTypes = ['conditional', 'loop', 'parallel', 'human', 'aiEvaluation']
      return controlTypes.includes(type)
    })
    .map((type) => {
      const displayInfo = getNodeDisplayInfo(type)
      return {
        type:
          type === 'conditional'
            ? 'Conditional'
            : type === 'loop'
              ? 'Loop'
              : type === 'parallel'
                ? 'Parallel'
                : type === 'human'
                  ? 'Human'
                  : type === 'aiEvaluation'
                    ? 'AIEvaluation'
                    : type,
        label: displayInfo.label,
        icon: displayInfo.icon,
        color: displayInfo.color,
        description:
          type === 'conditional'
            ? 'If/else branching logic'
            : type === 'loop'
              ? 'Repeat steps for each item'
              : type === 'parallel'
                ? 'Run multiple steps in parallel'
                : type === 'human'
                  ? 'Wait for human approval'
                  : type === 'aiEvaluation'
                    ? 'Process with AI models'
                    : 'Node type',
        category: 'control' as const,
      }
    })
}

const getConfigNodes = (): NodeTypeConfig[] => {
  const registeredTypes = nodeRegistry.getRegisteredTypes()
  return registeredTypes
    .filter((type) => {
      // Get category from registry - for now use hardcoded mapping during transition
      const configTypes = ['memory', 'tools', 'provider']
      return configTypes.includes(type)
    })
    .map((type) => {
      const displayInfo = getNodeDisplayInfo(type)
      return {
        type:
          type === 'memory'
            ? 'Memory'
            : type === 'tools'
              ? 'Tools'
              : type === 'provider'
                ? 'Provider'
                : type,
        label: displayInfo.label,
        icon: displayInfo.icon,
        color: displayInfo.color,
        description:
          type === 'memory'
            ? 'Store and retrieve context'
            : type === 'tools'
              ? 'Function calls and integrations'
              : type === 'provider'
                ? 'AI provider configuration'
                : 'Configuration node',
        category: 'config' as const,
      }
    })
}

const onDragStart = (event: React.DragEvent, nodeType: string) => {
  event.dataTransfer.setData('application/reactflow', nodeType)
  event.dataTransfer.effectAllowed = 'move'
}

export default function DraggableNodePalette() {
  const { availableRoles, loading, error } = useAgentConfigs()

  // Convert agent roles to task nodes
  const taskNodes: NodeTypeConfig[] = availableRoles.map((role) => ({
    type: role.role,
    label: role.name,
    icon: getIconForRole(role.icon),
    color: role.color,
    description: role.description,
    category: 'task' as const,
  }))

  // Generate nodes from registry (follows research best practices)
  const controlNodes = getControlNodes()
  const configNodes = getConfigNodes()

  return (
    <Panel
      position="top-left"
      className="bg-card border border-border rounded-lg shadow-lg p-4 m-4 min-w-[240px]"
      data-testid="node-palette"
    >
      <div className="flex items-center gap-2 mb-4">
        <Palette className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Node Palette</h3>
      </div>

      <div className="space-y-4">
        {/* Task Nodes Section */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Agent Roles
          </h4>
          {loading && (
            <div className="text-xs text-muted-foreground p-3">Loading agent roles...</div>
          )}
          {error && <div className="text-xs text-red-500 p-3">Error: {error}</div>}
          <div className="space-y-2">
            {taskNodes.map((nodeType) => (
              <div
                key={nodeType.type}
                draggable
                onDragStart={(e) => onDragStart(e, nodeType.type)}
                className="flex items-center gap-3 p-3 border border-border rounded-lg bg-background hover:bg-muted cursor-grab active:cursor-grabbing transition-colors group"
                data-testid={`${nodeType.type.toLowerCase()}-node-template`}
              >
                <div className={`${nodeType.color} p-2 rounded-md text-white`}>{nodeType.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium group-hover:text-foreground">
                    {nodeType.label}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {nodeType.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Control Flow Nodes Section */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Control Flow
          </h4>
          <div className="space-y-2">
            {controlNodes.map((nodeType) => (
              <div
                key={nodeType.type}
                draggable
                onDragStart={(e) => onDragStart(e, nodeType.type)}
                className="flex items-center gap-3 p-3 border border-border rounded-lg bg-background hover:bg-muted cursor-grab active:cursor-grabbing transition-colors group"
                data-testid={
                  nodeType.type === 'Conditional'
                    ? 'conditional-node-template'
                    : `${nodeType.type.toLowerCase()}-node-template`
                }
              >
                <div className={`${nodeType.color} p-2 rounded-md text-white`}>{nodeType.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium group-hover:text-foreground">
                    {nodeType.label}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {nodeType.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Configuration Nodes Section */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Configuration
          </h4>
          <div className="space-y-2">
            {configNodes.map((nodeType) => (
              <div
                key={nodeType.type}
                draggable
                onDragStart={(e) => onDragStart(e, nodeType.type)}
                className="flex items-center gap-3 p-3 border border-border rounded-lg bg-background hover:bg-muted cursor-grab active:cursor-grabbing transition-colors group"
                data-testid={`${nodeType.type.toLowerCase()}-node-template`}
              >
                <div className={`${nodeType.color} p-2 rounded-md text-white`}>{nodeType.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium group-hover:text-foreground">
                    {nodeType.label}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {nodeType.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="text-xs text-muted-foreground">
          💡 Drag nodes onto the canvas to create workflow steps
        </div>
      </div>
    </Panel>
  )
}
