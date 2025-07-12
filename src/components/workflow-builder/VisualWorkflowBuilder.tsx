/**
 * VisualWorkflowBuilder - Canvas-based drag-and-drop workflow editor
 *
 * SOLID: Single responsibility - visual workflow editing
 * DRY: Reuses React Flow components and patterns
 * KISS: Clean canvas interface like n8n
 * Library-First: Uses React Flow (industry standard)
 */

import { useCallback } from 'react'
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
import { Play, Save, Download, Upload } from 'lucide-react'
import { useWorkflowBuilderStore } from '@/stores/workflowBuilder'

// Custom node types
import WorkflowStepNode from './nodes/WorkflowStepNode'
import StartNode from './nodes/StartNode'
import EndNode from './nodes/EndNode'

const nodeTypes: NodeTypes = {
  workflowStep: WorkflowStepNode,
  start: StartNode,
  end: EndNode,
}

// Initial nodes for empty workflow
const initialNodes: Node[] = [
  {
    id: 'start',
    type: 'start',
    position: { x: 100, y: 100 },
    data: { label: 'Start' },
  },
]

const initialEdges: Edge[] = []

interface VisualWorkflowBuilderProps {
  onClose: () => void
}

export default function VisualWorkflowBuilder({ onClose }: VisualWorkflowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const { executeWorkflow, validateWorkflow } = useWorkflowBuilderStore()

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const onAddNode = useCallback(
    (nodeType: string) => {
      const newNode: Node = {
        id: `node-${Date.now()}`,
        type: nodeType,
        position: {
          x: Math.random() * 400 + 200,
          y: Math.random() * 300 + 200,
        },
        data: {
          label: `New ${nodeType} step`,
          task: '',
          role: 'developer',
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
    console.log('Saving workflow...', { nodes, edges })
  }

  return (
    <div className="fixed inset-0 z-50 w-full h-screen bg-gray-50">
      {/* Top Toolbar */}
      <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Workflow Builder</h1>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onAddNode('workflowStep')}>
              + Add Step
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleSave}>
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
          <Button size="sm" variant="outline">
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
          <Button size="sm" variant="outline">
            <Upload className="w-4 h-4 mr-1" />
            Import
          </Button>
          <Button size="sm" onClick={handleExecute}>
            <Play className="w-4 h-4 mr-1" />
            Execute
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
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
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />

          {/* Node Palette */}
          <Panel position="top-left" className="bg-white rounded-lg shadow-lg p-4 m-4">
            <h3 className="text-sm font-medium mb-3">Add Nodes</h3>
            <div className="space-y-2">
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start"
                onClick={() => onAddNode('workflowStep')}
              >
                🔧 Task Step
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start"
                onClick={() => onAddNode('workflowStep')}
              >
                🤖 Agent Step
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start"
                onClick={() => onAddNode('workflowStep')}
              >
                ⚡ Parallel Step
              </Button>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  )
}
