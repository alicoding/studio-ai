/**
 * VisualWorkflowBuilder - Canvas-based drag-and-drop workflow editor
 *
 * SOLID: Single responsibility - visual workflow editing
 * DRY: Reuses React Flow components and patterns
 * KISS: Clean canvas interface like n8n
 * Library-First: Uses React Flow (industry standard)
 */

import { useCallback, useMemo, useEffect, useState, useRef } from 'react'
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
  NodeChange,
  SelectionMode,
  MarkerType,
  PanOnScrollMode,
  ReactFlowInstance,
  OnMove,
  Viewport,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { Button } from '@/components/ui/button'
import { ModalLayout } from '@/components/ui/modal-layout'
import { X, Save, Download, Upload, Settings, Folder, AlertTriangle, Library } from 'lucide-react'
import { useWorkflowBuilderStore } from '@/stores/workflowBuilder'
import { useProjectStore } from '@/stores'
import type {
  WorkflowStepDefinition,
  WorkflowDefinition,
} from '../../../web/server/schemas/workflow-builder'

// Custom node types
import WorkflowStepNode from './nodes/WorkflowStepNode'
import ConditionalNode from './nodes/ConditionalNode'
import LoopNode from './nodes/LoopNode'
import ParallelNode from './nodes/ParallelNode'
import HumanNode from './nodes/HumanNode'
import DraggableNodePalette from './DraggableNodePalette'
import WorkflowLibraryModal from './WorkflowLibraryModal'

// Define nodeTypes outside component to prevent recreation warnings
const nodeTypes: NodeTypes = {
  workflowStep: WorkflowStepNode,
  conditional: ConditionalNode,
  loop: LoopNode,
  parallel: ParallelNode,
  human: HumanNode,
}

interface VisualWorkflowBuilderProps {
  onClose: () => void
  scope?: 'project' | 'global'
  projectId?: string
  onSaveSuccess?: (workflowId: string) => void
}

// Convert workflow steps to React Flow nodes
function stepsToNodes(
  steps: WorkflowStepDefinition[],
  nodePositions: Record<string, { x: number; y: number }>
): Node[] {
  return steps.map((step, index) => {
    // Map step type to React Flow node type
    let nodeType = 'workflowStep'
    switch (step.type) {
      case 'conditional':
        nodeType = 'conditional'
        break
      case 'loop':
        nodeType = 'loop'
        break
      case 'parallel':
        nodeType = 'parallel'
        break
      case 'human':
        nodeType = 'human'
        break
    }

    // Use stored position or calculate default position
    const storedPosition = nodePositions[step.id]
    const defaultPosition = { x: 200 + (index % 3) * 250, y: 100 + Math.floor(index / 3) * 200 }
    const position = storedPosition || defaultPosition

    console.log(`[stepsToNodes] Step ${step.id}: task="${step.task}", position=`, position)

    return {
      id: step.id,
      type: nodeType,
      position,
      data: {
        label: step.role || step.type || 'Task',
        task: step.task,
        role: step.role,
        agentId: step.agentId,
        type: step.type,
        stepId: step.id, // Reference to store
        // Include additional fields for specific node types
        ...(step.type === 'loop' && {
          items: step.items,
          loopVar: step.loopVar,
          maxIterations: step.maxIterations,
        }),
        ...(step.type === 'parallel' && {
          parallelSteps: step.parallelSteps,
        }),
        ...(step.type === 'human' && {
          prompt: step.prompt,
          approvalRequired: step.approvalRequired,
          timeoutSeconds: step.timeoutSeconds,
        }),
      },
    }
  })
}

// Convert workflow steps dependencies to React Flow edges
function stepsToEdges(steps: WorkflowStepDefinition[]): Edge[] {
  const edges: Edge[] = []

  steps.forEach((step) => {
    if (step.deps && Array.isArray(step.deps)) {
      step.deps.forEach((depId) => {
        edges.push({
          id: `${depId}-${step.id}`,
          source: depId,
          target: step.id,
          type: 'smoothstep',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: '#64748b',
          },
          style: {
            stroke: '#64748b',
            strokeWidth: 2,
          },
        })
      })
    }
  })

  return edges
}

export default function VisualWorkflowBuilder({
  onClose,
  scope = 'project',
  projectId,
  onSaveSuccess,
}: VisualWorkflowBuilderProps) {
  // Use store state instead of local state
  const {
    workflow,
    isDirty,
    isValidating,
    isExecuting,
    isSaving,
    validationResult,
    lastError,
    selectedStepIds,
    nodePositions,
    viewport,
    updateWorkflowMeta,
    addStep,
    updateStep,
    removeStep,
    setDependencies,
    validateWorkflow,
    executeWorkflow,
    saveWorkflow,
    fetchSavedWorkflows,
    loadWorkflow,
    selectAllSteps,
    clearSelection,
    deleteSelectedSteps,
    setSelectedSteps,
    updateNodePosition,
    updateViewport,
  } = useWorkflowBuilderStore()

  const projects = useProjectStore((state) => state.projects)

  // React Flow instance for save/restore
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null)

  // Track if we've done initial viewport setup to prevent loops
  const [isViewportInitialized, setIsViewportInitialized] = useState(false)

  // Debounce timer ref for viewport updates
  const viewportTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Handle viewport changes and save to store with debouncing
  const handleViewportChange: OnMove = useCallback(
    (_event, newViewport: Viewport) => {
      // Clear any existing timer
      if (viewportTimerRef.current) {
        clearTimeout(viewportTimerRef.current)
      }

      // Set a new timer to update viewport after user stops moving for 500ms
      viewportTimerRef.current = setTimeout(() => {
        updateViewport(newViewport)
      }, 500)
    },
    [updateViewport]
  )

  // Restore viewport when ReactFlow instance is ready and we have saved viewport
  useEffect(() => {
    if (rfInstance && viewport && !isViewportInitialized) {
      rfInstance.setViewport(viewport)
      setIsViewportInitialized(true)
    }
  }, [rfInstance, viewport, isViewportInitialized])

  // Clean up timers on unmount
  useEffect(() => {
    // Capture refs in effect scope
    const viewportTimer = viewportTimerRef
    const nodeTimers = nodePositionTimersRef

    return () => {
      // Clean up viewport timer
      if (viewportTimer.current) {
        clearTimeout(viewportTimer.current)
      }
      // Clean up all node position timers
      Object.values(nodeTimers.current).forEach((timer) => {
        clearTimeout(timer)
      })
    }
  }, [])

  // Load modal state
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false)
  const [availableWorkflows, setAvailableWorkflows] = useState<
    Array<{
      id: string
      name: string
      description?: string
      definition: WorkflowDefinition
      updatedAt: string
    }>
  >([])
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false)

  // Library modal state
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false)

  // Convert store workflow to React Flow format with selection state
  const nodes = useMemo(() => {
    if (!workflow) return []
    console.log('[VisualWorkflowBuilder] Creating nodes with positions:', nodePositions)
    console.log('[VisualWorkflowBuilder] Workflow steps:', workflow.steps)
    return stepsToNodes(workflow.steps, nodePositions).map((node) => ({
      ...node,
      selected: selectedStepIds.includes(node.id),
    }))
  }, [workflow, selectedStepIds, nodePositions])

  const edges = useMemo(() => (workflow ? stepsToEdges(workflow.steps) : []), [workflow])

  // React Flow canvas ref for focus management
  const reactFlowRef = useRef<HTMLDivElement>(null)

  // Use React Flow hooks for UI interactions only
  const [displayNodes, setDisplayNodes, onNodesChangeOriginal] = useNodesState(nodes)
  const [displayEdges, setDisplayEdges, onEdgesChange] = useEdgesState(edges)

  // Node position update timers to debounce position changes
  const nodePositionTimersRef = useRef<Record<string, NodeJS.Timeout>>({})

  // Enhanced onNodesChange handler that syncs with store
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Handle React Flow display changes first
      onNodesChangeOriginal(changes)

      // Process store updates for node removal and position changes
      changes.forEach((change) => {
        if (change.type === 'remove') {
          removeStep(change.id)
        }
        // Handle position changes with debouncing - store them to prevent reset
        if (change.type === 'position' && change.position && change.dragging === false) {
          // Only update position when dragging ends (dragging === false)
          // Clear any existing timer for this node
          if (nodePositionTimersRef.current[change.id]) {
            clearTimeout(nodePositionTimersRef.current[change.id])
          }

          // Set a new timer to update position after drag ends
          nodePositionTimersRef.current[change.id] = setTimeout(() => {
            updateNodePosition(change.id, change.position!)
            delete nodePositionTimersRef.current[change.id]
          }, 100)
        }
      })

      // Handle selection changes - collect selected node IDs directly from changes
      const selectionChanges = changes.filter((change) => change.type === 'select')
      if (selectionChanges.length > 0) {
        // Calculate selected nodes from the changes
        const selectedFromChanges = selectionChanges
          .filter((change) => change.selected)
          .map((change) => change.id)

        // Update store with selected nodes
        setSelectedSteps(selectedFromChanges)
      }
    },
    [onNodesChangeOriginal, removeStep, setSelectedSteps, updateNodePosition]
  )

  // Sync store changes to display (only when structure changes, not positions)
  useEffect(() => {
    setDisplayNodes(nodes)
    setDisplayEdges(edges)
  }, [nodes, edges, setDisplayNodes, setDisplayEdges])

  // Keyboard event handlers for canvas focus and shortcuts
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Only handle keyboard events when canvas is focused or no input is focused
      const activeElement = document.activeElement
      const isInputFocused =
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement)?.contentEditable === 'true'

      if (isInputFocused) return

      // CMD+A / CTRL+A - Select all nodes
      if ((event.metaKey || event.ctrlKey) && event.key === 'a') {
        event.preventDefault()
        selectAllSteps()
        // Also update React Flow display nodes to show selection
        setTimeout(() => {
          setDisplayNodes((nodes) => nodes.map((node) => ({ ...node, selected: true })))
        }, 0)
        return
      }

      // Delete / Backspace - Delete selected nodes
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        if (selectedStepIds.length > 0) {
          deleteSelectedSteps()
        }
        return
      }

      // Escape - Clear selection
      if (event.key === 'Escape') {
        event.preventDefault()
        clearSelection()
        // Also clear React Flow visual selection
        setTimeout(() => {
          setDisplayNodes((nodes) => nodes.map((node) => ({ ...node, selected: false })))
        }, 0)
        return
      }
    },
    [selectAllSteps, deleteSelectedSteps, clearSelection, selectedStepIds, setDisplayNodes]
  )

  // Canvas click handler for focus management
  const handlePaneClick = useCallback(() => {
    // Focus the React Flow canvas to enable keyboard shortcuts
    if (reactFlowRef.current) {
      reactFlowRef.current.focus()
    }
    // Clear selection when clicking on empty canvas
    clearSelection()
    // Also clear React Flow visual selection
    setTimeout(() => {
      setDisplayNodes((nodes) => nodes.map((node) => ({ ...node, selected: false })))
    }, 0)
  }, [clearSelection, setDisplayNodes])

  // Add keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  // Workflow initialization is now handled by the routes that open this component

  const handleWorkflowNameChange = useCallback(
    (name: string) => {
      updateWorkflowMeta({ name })
    },
    [updateWorkflowMeta]
  )

  // Get current project context - prioritize passed projectId over workflow metadata
  const currentProject = useMemo(() => {
    const contextProjectId = projectId || workflow?.metadata?.projectId
    return contextProjectId ? projects.find((p) => p.id === contextProjectId) : null
  }, [projectId, workflow?.metadata?.projectId, projects])

  // Remove automatic initialization - this should be handled by the route wrapper
  // to prevent conflicts with persistence and rehydration

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      if (params.source && params.target) {
        // Check if the source is a conditional node
        const sourceStep = workflow?.steps.find((s) => s.id === params.source)

        if (sourceStep?.type === 'conditional') {
          // Handle conditional node connections based on source handle
          if (params.sourceHandle === 'true') {
            updateStep(params.source, { trueBranch: params.target })
          } else if (params.sourceHandle === 'false') {
            updateStep(params.source, { falseBranch: params.target })
          }
          // Also add dependency from conditional node to target
          const targetStep = workflow?.steps.find((s) => s.id === params.target)
          if (targetStep && !(targetStep.deps || []).includes(params.source)) {
            const newDeps = [...(targetStep.deps || []), params.source]
            setDependencies(params.target, newDeps)
          }
        } else {
          // Regular dependency handling for non-conditional nodes
          const targetStep = workflow?.steps.find((s) => s.id === params.target)
          if (targetStep) {
            const newDeps = [...(targetStep.deps || []), params.source]
            setDependencies(params.target, newDeps)
          }
        }
      }
      // Also update display for immediate feedback
      setDisplayEdges((eds) => addEdge(params, eds))
    },
    [setDependencies, setDisplayEdges, workflow?.steps, updateStep]
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
      switch (nodeType) {
        case 'Conditional':
          addStep({
            type: 'conditional',
            task: 'Configure conditional logic here...',
            role: 'conditional',
          })
          break
        case 'Loop':
          addStep({
            type: 'loop',
            task: 'Configure loop iteration here...',
            role: 'loop',
            items: ['item1', 'item2', 'item3'],
            loopVar: 'item',
          })
          break
        case 'Parallel':
          addStep({
            type: 'parallel',
            task: 'Configure parallel execution here...',
            role: 'parallel',
            parallelSteps: [],
          })
          break
        case 'Human':
          addStep({
            type: 'human',
            task: 'Configure human input here...',
            role: 'human',
            prompt: 'Please review and approve to continue',
            approvalRequired: true,
            timeoutSeconds: 3600,
          })
          break
        default:
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
      // Error will be displayed in the UI via lastError state
    }
  }

  const handleSave = async () => {
    try {
      // Get the complete React Flow state including nodes, edges, and viewport
      if (rfInstance && workflow) {
        const flowData = rfInstance.toObject()

        // Update the workflow with the latest React Flow data
        updateWorkflowMeta({
          name: workflow.name,
          description: workflow.description,
        })

        // Save positions from React Flow's nodes
        flowData.nodes.forEach((node) => {
          updateNodePosition(node.id, node.position)
        })
      }

      const workflowId = await saveWorkflow(undefined, undefined, scope)
      console.log('Workflow saved successfully:', workflow?.name)
      if (onSaveSuccess) {
        onSaveSuccess(workflowId)
      }
    } catch (error) {
      console.error('Failed to save workflow:', error)
      // TODO: Show user-friendly error notification
    }
  }

  const handleValidate = async () => {
    await validateWorkflow()
  }

  const handleLoadClick = async () => {
    setIsLoadingWorkflows(true)
    try {
      const workflows = await fetchSavedWorkflows()
      setAvailableWorkflows(workflows)
      setIsLoadModalOpen(true)
    } catch (error) {
      console.error('Failed to load workflows:', error)
      // TODO: Show user-friendly error notification
    } finally {
      setIsLoadingWorkflows(false)
    }
  }

  const handleWorkflowSelect = (selectedWorkflow: { definition: WorkflowDefinition }) => {
    loadWorkflow(selectedWorkflow.definition)
    setIsLoadModalOpen(false)
    console.log('Workflow loaded:', selectedWorkflow.definition.name)
  }

  return (
    <div
      data-testid="workflow-builder"
      className="fixed inset-0 z-50 w-full h-screen bg-background text-foreground"
    >
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

          {/* Mock Mode Indicator */}
          {process.env.NODE_ENV === 'development' && (
            <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-100 px-3 py-1 rounded-md">
              <span>Mock Mode</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleValidate} disabled={isValidating}>
            {isValidating ? 'Validating...' : 'Validate'}
          </Button>
          <Button size="sm" variant="outline" onClick={handleSave} disabled={!isDirty || isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : isDirty ? 'Save' : 'Saved'}
          </Button>
          <Button size="sm" variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleLoadClick}
            disabled={isLoadingWorkflows}
          >
            <Upload className="w-4 h-4 mr-2" />
            {isLoadingWorkflows ? 'Loading...' : 'Load'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsLibraryModalOpen(true)}>
            <Library className="w-4 h-4 mr-2" />
            Library
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
          ref={reactFlowRef}
          nodes={displayNodes}
          edges={displayEdges}
          onInit={setRfInstance}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onPaneClick={handlePaneClick}
          onMove={handleViewportChange}
          nodeTypes={nodeTypes}
          fitView={!viewport}
          defaultViewport={viewport || undefined}
          attributionPosition="bottom-left"
          className="bg-background"
          tabIndex={0}
          style={{ outline: 'none' }}
          selectionMode={SelectionMode.Partial}
          multiSelectionKeyCode={['Meta', 'Control']}
          selectNodesOnDrag={false}
          selectionKeyCode={null}
          deleteKeyCode={null}
          panOnDrag={[1, 2]}
          nodesDraggable={true}
          selectionOnDrag={true}
          panOnScroll={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          panOnScrollMode={PanOnScrollMode.Free}
          zoomOnDoubleClick={false}
          preventScrolling={false}
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
          {!workflow?.steps.length && (
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
                      {error.stepId && `[${error.stepId}] `}
                      {error.message}
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

      {/* Load Workflow Modal */}
      <ModalLayout
        isOpen={isLoadModalOpen}
        onClose={() => setIsLoadModalOpen(false)}
        title="Load Workflow"
        size="lg"
      >
        <div className="space-y-4">
          {availableWorkflows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Upload className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No saved workflows found</p>
              <p className="text-sm mt-2">Create and save workflows to see them here</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-4">
                Select a workflow to load into the builder:
              </p>
              {availableWorkflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="border border-border rounded-lg p-4 hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => handleWorkflowSelect(workflow)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium">{workflow.name}</h3>
                      {workflow.description && (
                        <p className="text-sm text-muted-foreground mt-1">{workflow.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{workflow.definition?.steps?.length || 0} steps</span>
                        <span>Updated {new Date(workflow.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ModalLayout>

      {/* Workflow Library Modal */}
      <WorkflowLibraryModal
        isOpen={isLibraryModalOpen}
        onClose={() => setIsLibraryModalOpen(false)}
        onSelectWorkflow={(workflow) => {
          loadWorkflow(workflow)
          console.log('Workflow loaded from library:', workflow.name)
        }}
        title="Workflow Library"
        subtitle="Browse, load, and manage your saved workflows"
      />
    </div>
  )
}
