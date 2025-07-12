/**
 * VisualWorkflowBuilder - Canvas-based drag-and-drop workflow editor
 *
 * SOLID: Single responsibility - visual workflow editing
 * DRY: Reuses React Flow components and patterns
 * KISS: Clean canvas interface like n8n
 * Library-First: Uses React Flow (industry standard)
 */

import { useCallback, useState, useMemo } from 'react'
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeTypes,
  Panel,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { Button } from '@/components/ui/button'
import { X, Save, Download, Upload, Settings, Folder } from 'lucide-react'
import { useWorkflowBuilderStore } from '@/stores/workflowBuilder'
import { useProjectStore, useAgentStore } from '@/stores'

// Custom node types
import WorkflowStepNode from './nodes/WorkflowStepNode'
import DraggableNodePalette from './DraggableNodePalette'

const nodeTypes: NodeTypes = {
  workflowStep: WorkflowStepNode,
}

// Empty initial state - no ugly green button
const initialNodes: Node[] = []
const initialEdges: Edge[] = []

interface VisualWorkflowBuilderProps {
  onClose: () => void
}

export default function VisualWorkflowBuilder({ onClose }: VisualWorkflowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [workflowName, setWorkflowName] = useState('Untitled Workflow')

  const { executeWorkflow, validateWorkflow } = useWorkflowBuilderStore()
  const projects = useProjectStore((state) => state.projects)
  const agents = useAgentStore((state) => state.agents)

  // Get current project context
  const currentProject = useMemo(() => {
    const firstAgent = agents[0]
    return firstAgent?.projectId ? projects.find((p) => p.id === firstAgent.projectId) : null
  }, [agents, projects])

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const nodeType = event.dataTransfer.getData('application/reactflow')
      if (!nodeType) return

      const bounds = event.currentTarget.getBoundingClientRect()
      const position = {
        x: event.clientX - bounds.left - 100,
        y: event.clientY - bounds.top - 40,
      }

      const newNode: Node = {
        id: `${nodeType}-${Date.now()}`,
        type: 'workflowStep',
        position,
        data: {
          label: `${nodeType} step`,
          task: `Describe your ${nodeType.toLowerCase()} task here...`,
          role: nodeType.toLowerCase(),
          type: nodeType,
        },
      }

      setNodes((nds) => nds.concat(newNode))
    },
    [setNodes]
  )

  const handleExecute = async () => {
    const isValid = await validateWorkflow()
    if (isValid) {
      const result = await executeWorkflow()
      console.log('Workflow started:', result.threadId)
      onClose()
    }
  }

  const handleSave = () => {
    // TODO: Save workflow definition
    console.log('Saving workflow...', { workflowName, nodes, edges })
  }

  return (
    <div className="fixed inset-0 z-50 w-full h-screen bg-background text-foreground">
      {/* Enhanced Toolbar with Project Context */}
      <div className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={onClose} className="p-2">
              <X className="w-4 h-4" />
            </Button>
            <div className="h-6 w-px bg-border" />
          </div>

          {/* Workflow Name */}
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="text-xl font-semibold bg-transparent border-none outline-none focus:bg-muted px-2 py-1 rounded"
            placeholder="Enter workflow name..."
          />

          {/* Project Context */}
          {currentProject && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1 rounded-md">
              <Folder className="w-4 h-4" />
              <span>{currentProject.name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button size="sm" variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button size="sm" variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <div className="h-6 w-px bg-border" />
          <Button size="sm" onClick={handleExecute}>
            <Settings className="w-4 h-4 mr-2" />
            Execute
          </Button>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="h-[calc(100vh-4rem)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
          className="bg-background"
        >
          <Controls className="bg-card border-border" />
          <MiniMap
            className="bg-card border-border"
            nodeColor={(node) => {
              switch (node.data?.role) {
                case 'developer':
                  return '#3b82f6'
                case 'architect':
                  return '#8b5cf6'
                case 'reviewer':
                  return '#10b981'
                case 'tester':
                  return '#f59e0b'
                case 'security':
                  return '#ef4444'
                default:
                  return '#6b7280'
              }
            }}
          />
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            className="bg-background"
          />

          {/* Draggable Node Palette */}
          <DraggableNodePalette />

          {/* Empty State Help */}
          {nodes.length === 0 && (
            <Panel position="top-center">
              <div className="bg-card border border-border rounded-lg p-8 shadow-lg text-center max-w-md">
                <h3 className="text-lg font-semibold mb-2">Start Building Your Workflow</h3>
                <p className="text-muted-foreground mb-4">
                  Drag nodes from the palette on the left to create your workflow steps. Connect
                  them by dragging between the node handles.
                </p>
                <div className="text-sm text-muted-foreground">
                  💡 Tip: Each node type has a different color to help you organize your workflow
                </div>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  )
}
