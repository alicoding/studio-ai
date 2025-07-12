/**
 * DraggableNodePalette - Draggable node palette for workflow builder
 *
 * SOLID: Single responsibility - node creation palette
 * KISS: Simple drag-and-drop interface
 * Library-First: Uses React Flow Panel component
 */

import { Panel } from 'reactflow'
import { Code2, Zap, Eye, Shield, Server, Palette, Building, GitBranch, RotateCcw, Layers, Users } from 'lucide-react'

interface NodeTypeConfig {
  type: string
  label: string
  icon: React.ReactNode
  color: string
  description: string
  category: 'task' | 'control'
}

// Task nodes - execute actual work
const taskNodes: NodeTypeConfig[] = [
  {
    type: 'Developer',
    label: 'Developer',
    icon: <Code2 className="w-4 h-4" />,
    color: 'bg-blue-500',
    description: 'Code implementation and development tasks',
    category: 'task',
  },
  {
    type: 'Architect',
    label: 'Architect',
    icon: <Building className="w-4 h-4" />,
    color: 'bg-purple-500',
    description: 'System design and architecture planning',
    category: 'task',
  },
  {
    type: 'Reviewer',
    label: 'Reviewer',
    icon: <Eye className="w-4 h-4" />,
    color: 'bg-green-500',
    description: 'Code review and quality assurance',
    category: 'task',
  },
  {
    type: 'Tester',
    label: 'Tester',
    icon: <Zap className="w-4 h-4" />,
    color: 'bg-orange-500',
    description: 'Testing and validation tasks',
    category: 'task',
  },
  {
    type: 'Security',
    label: 'Security',
    icon: <Shield className="w-4 h-4" />,
    color: 'bg-red-500',
    description: 'Security analysis and vulnerability assessment',
    category: 'task',
  },
  {
    type: 'DevOps',
    label: 'DevOps',
    icon: <Server className="w-4 h-4" />,
    color: 'bg-gray-500',
    description: 'Deployment and infrastructure management',
    category: 'task',
  },
]

// Control flow nodes - LangGraph logic
const controlNodes: NodeTypeConfig[] = [
  {
    type: 'Conditional',
    label: 'Conditional',
    icon: <GitBranch className="w-4 h-4" />,
    color: 'bg-amber-500',
    description: 'If/else branching logic',
    category: 'control',
  },
  {
    type: 'Loop',
    label: 'Loop',
    icon: <RotateCcw className="w-4 h-4" />,
    color: 'bg-indigo-500',
    description: 'While, for, or retry loops',
    category: 'control',
  },
  {
    type: 'Parallel',
    label: 'Parallel',
    icon: <Layers className="w-4 h-4" />,
    color: 'bg-teal-500',
    description: 'Execute multiple tasks simultaneously',
    category: 'control',
  },
  {
    type: 'Human',
    label: 'Human Input',
    icon: <Users className="w-4 h-4" />,
    color: 'bg-pink-500',
    description: 'Wait for human intervention',
    category: 'control',
  },
]

const onDragStart = (event: React.DragEvent, nodeType: string) => {
  event.dataTransfer.setData('application/reactflow', nodeType)
  event.dataTransfer.effectAllowed = 'move'
}

export default function DraggableNodePalette() {
  return (
    <Panel
      position="top-left"
      className="bg-card border border-border rounded-lg shadow-lg p-4 m-4 min-w-[240px]"
    >
      <div className="flex items-center gap-2 mb-4">
        <Palette className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Node Palette</h3>
      </div>

      <div className="space-y-4">
        {/* Task Nodes Section */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Task Nodes
          </h4>
          <div className="space-y-2">
            {taskNodes.map((nodeType) => (
              <div
                key={nodeType.type}
                draggable
                onDragStart={(e) => onDragStart(e, nodeType.type)}
                className="flex items-center gap-3 p-3 border border-border rounded-lg bg-background hover:bg-muted cursor-grab active:cursor-grabbing transition-colors group"
              >
                <div className={`${nodeType.color} p-2 rounded-md text-white`}>{nodeType.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium group-hover:text-foreground">
                    {nodeType.label}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{nodeType.description}</div>
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
              >
                <div className={`${nodeType.color} p-2 rounded-md text-white`}>{nodeType.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium group-hover:text-foreground">
                    {nodeType.label}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{nodeType.description}</div>
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
