/**
 * VisualWorkflowBuilder - Canvas-based drag-and-drop workflow editor
 *
 * SOLID: Single responsibility - visual workflow editing
 * DRY: Reuses React Flow components and patterns
 * KISS: Clean canvas interface like n8n
 * Library-First: Uses React Flow (industry standard)
 */

import { useCallback, useMemo, useEffect } from 'react'
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
import { X, Save, Download, Upload, Settings, Folder, AlertTriangle } from 'lucide-react'
import { useWorkflowBuilderStore } from '@/stores/workflowBuilder'
import { useProjectStore, useAgentStore } from '@/stores'
import type { WorkflowStepDefinition } from '../../../web/server/schemas/workflow-builder'

// Custom node types
import WorkflowStepNode from './nodes/WorkflowStepNode'
import ConditionalNode from './nodes/ConditionalNode'
import LoopNode from './nodes/LoopNode'
import DraggableNodePalette from './DraggableNodePalette'

const nodeTypes: NodeTypes = {
  workflowStep: WorkflowStepNode,
  conditional: ConditionalNode,
  loop: LoopNode,
}

interface VisualWorkflowBuilderProps {
  onClose: () => void
}

// Convert workflow steps to React Flow nodes
function stepsToNodes(steps: WorkflowStepDefinition[]): Node[] {
  return steps.map((step, index) => ({
    id: step.id,
    type: step.type === 'conditional' ? 'conditional' : step.type === 'parallel' ? 'loop' : 'workflowStep',
    position: { x: 200 + (index % 3) * 250, y: 100 + Math.floor(index / 3) * 200 },
    data: {
      label: step.role || step.type || 'Task',
      task: step.task,
      role: step.role,
      agentId: step.agentId,
      type: step.type,
      stepId: step.id, // Reference to store
    },
  }))
}

// Convert workflow steps dependencies to React Flow edges
function stepsToEdges(steps: WorkflowStepDefinition[]): Edge[] {
  const edges: Edge[] = []
  
  steps.forEach((step) => {
    step.deps.forEach((depId) => {
      edges.push({
        id: `${depId}-${step.id}`,
        source: depId,
        target: step.id,
        type: 'smoothstep',
      })
    })
  })
  
  return edges
}

export default function VisualWorkflowBuilder({ onClose }: VisualWorkflowBuilderProps) {
  // Use store state instead of local state
  const {
    workflow,
    isDirty,
    isValidating,
    isExecuting,
    validationResult,
    lastError,
    initWorkflow,
    updateWorkflowMeta,
    addStep,
    setDependencies,
    validateWorkflow,
    executeWorkflow,
  } = useWorkflowBuilderStore()
  
  const projects = useProjectStore((state) => state.projects)
  const agents = useAgentStore((state) => state.agents)

  // Convert store workflow to React Flow format
  const nodes = useMemo(() => 
    workflow ? stepsToNodes(workflow.steps) : [], 
    [workflow]
  )
  
  const edges = useMemo(() => 
    workflow ? stepsToEdges(workflow.steps) : [], 
    [workflow]
  )
  
  // Use React Flow hooks for UI interactions only
  const [displayNodes, setDisplayNodes, onNodesChange] = useNodesState(nodes)
  const [displayEdges, setDisplayEdges, onEdgesChange] = useEdgesState(edges)
  
  // Sync store changes to display
  useEffect(() => {
    setDisplayNodes(nodes)
    setDisplayEdges(edges)
  }, [nodes, edges, setDisplayNodes, setDisplayEdges])

  // Initialize workflow if none exists
  useEffect(() => {
    if (!workflow) {
      const currentProject = agents[0]?.projectId 
        ? projects.find(p => p.id === agents[0].projectId)
        : null
      
      initWorkflow(
        'Untitled Workflow',
        'Workflow created in visual builder',
        currentProject?.id
      )
    }
  }, [workflow, initWorkflow, agents, projects])

  const handleWorkflowNameChange = useCallback((name: string) => {
    updateWorkflowMeta({ name })
  }, [updateWorkflowMeta])

  // Get current project context
  const currentProject = useMemo(() => {
    return workflow?.metadata.projectId 
      ? projects.find(p => p.id === workflow.metadata.projectId)
      : null
  }, [workflow?.metadata.projectId, projects])

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      if (params.source && params.target) {
        // Update dependencies in store instead of just UI
        const targetStep = workflow?.steps.find(s => s.id === params.target)
        if (targetStep) {
          const newDeps = [...targetStep.deps, params.source]
          setDependencies(params.target, newDeps)
        }
      }
      // Also update display for immediate feedback
      setDisplayEdges((eds) => addEdge(params, eds))
    },
    [setDependencies, setDisplayEdges, workflow?.steps]
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

      // Handle different node types - add to store instead of local state
      const isControlFlow = ['Conditional', 'Loop', 'Parallel', 'Human'].includes(nodeType)
      
      if (nodeType === 'Conditional') {
        addStep({
          type: 'conditional',
          task: 'Configure conditional logic here...',
          role: 'conditional',
        })
      } else if (nodeType === 'Loop') {
        addStep({
          type: 'parallel', // Using parallel type for now
          task: 'Configure loop logic here...',
          role: 'loop',
        })
      } else if (isControlFlow) {
        // For future control flow nodes (Parallel, Human)
        addStep({
          type: 'parallel',
          task: `Configure your ${nodeType.toLowerCase()} logic here...`,
          role: nodeType.toLowerCase(),
        })
      } else {
        // Regular task nodes (Developer, Architect, etc.)
        addStep({
          type: 'task',
          task: `Describe your ${nodeType.toLowerCase()} task here...`,
          role: nodeType.toLowerCase(),
        })
      }
    },
    [addStep]
  )

  const handleExecute = async () => {
    try {
      const isValid = await validateWorkflow()
      if (isValid) {
        const result = await executeWorkflow()
        console.log('Workflow started:', result.threadId)
        onClose()
      }
    } catch (error) {
      console.error('Execution failed:', error)
    }
  }

  const handleSave = () => {
    // Mark as saved (workflow is automatically persisted via store)
    console.log('Workflow saved:', workflow?.name)
  }

  const handleValidate = async () => {
    await validateWorkflow()
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
            value={workflow?.name || 'Untitled Workflow'}
            onChange={(e) => handleWorkflowNameChange(e.target.value)}
            className="text-xl font-semibold bg-transparent border-none outline-none focus:bg-muted px-2 py-1 rounded"
            placeholder="Enter workflow name..."
          />

          {/* Status Indicators */}
          <div className="flex items-center gap-2">
            {isDirty && (
              <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                Unsaved changes
              </span>
            )}
            {validationResult && !validationResult.valid && (
              <div className="flex items-center gap-1 text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                <AlertTriangle className="w-3 h-3" />
                {validationResult.errors.length} errors
              </div>
            )}
            {lastError && (
              <div className="flex items-center gap-1 text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                <AlertTriangle className="w-3 h-3" />
                Error
              </div>
            )}
          </div>

          {/* Project Context */}
          {currentProject && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1 rounded-md">
              <Folder className="w-4 h-4" />
              <span>{currentProject.name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleValidate}
            disabled={isValidating}
          >
            {isValidating ? 'Validating...' : 'Validate'}
          </Button>
          <Button size="sm" variant="outline" onClick={handleSave} disabled={!isDirty}>
            <Save className="w-4 h-4 mr-2" />
            {isDirty ? 'Save' : 'Saved'}
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
          <Button 
            size="sm" 
            onClick={handleExecute}
            disabled={isExecuting || !workflow?.steps.length}
          >
            <Settings className="w-4 h-4 mr-2" />
            {isExecuting ? 'Executing...' : 'Execute'}
          </Button>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="h-[calc(100vh-4rem)]">
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
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
          {(!workflow?.steps.length) && (
            <Panel position="top-center">
              <div className="bg-card border border-border rounded-lg p-8 shadow-lg text-center max-w-md">
                <h3 className="text-lg font-semibold mb-2">Start Building Your Workflow</h3>
                <p className="text-muted-foreground mb-4">
                  Drag nodes from the palette on the left to create your workflow steps. Connect
                  them by dragging between the node handles to set up dependencies.
                </p>
                <div className="text-sm text-muted-foreground">
                  💡 Tip: Each node type has a different color to help you organize your workflow
                </div>
              </div>
            </Panel>
          )}

          {/* Validation Results Panel */}
          {validationResult && !validationResult.valid && (
            <Panel position="bottom-right">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-sm">
                <h4 className="text-sm font-semibold text-red-800 mb-2">Validation Errors</h4>
                <div className="space-y-1">
                  {validationResult.errors.slice(0, 3).map((error, index) => (
                    <div key={index} className="text-xs text-red-600">
                      {error.stepId && `[${error.stepId}] `}{error.message}
                    </div>
                  ))}
                  {validationResult.errors.length > 3 && (
                    <div className="text-xs text-red-600">
                      ...and {validationResult.errors.length - 3} more errors
                    </div>
                  )}
                </div>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  )
}
