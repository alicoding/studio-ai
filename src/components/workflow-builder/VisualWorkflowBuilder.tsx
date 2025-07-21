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
  EdgeChange,
  SelectionMode,
  MarkerType,
  PanOnScrollMode,
  ReactFlowInstance,
  OnMove,
  Viewport,
  IsValidConnection,
  ConnectionLineType,
} from 'reactflow'
import 'reactflow/dist/style.css'

// No custom CSS at all - pure React Flow
const connectionStyles = ``

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
import AINode from './nodes/AIEvaluationNode'
import ProviderNode from './nodes/ProviderNode'
import MemoryNode from './nodes/MemoryNode'
import ToolsNode from './nodes/ToolsNode'
import DraggableNodePalette from './DraggableNodePalette'
import WorkflowLibraryModal from './WorkflowLibraryModal'
import ProviderSelectionModal from './modals/ProviderSelectionModal'
import { useCanvasModals } from './hooks/useCanvasModals'
import { CanvasModalsProvider } from './contexts/CanvasModalsContext'

// Custom edge types
import DeletableEdge from './edges/DeletableEdge'

// Define nodeTypes and edgeTypes outside component to prevent recreation warnings
const nodeTypes: NodeTypes = {
  workflowStep: WorkflowStepNode,
  conditional: ConditionalNode,
  loop: LoopNode,
  parallel: ParallelNode,
  human: HumanNode,
  aiEvaluation: AINode,
  provider: ProviderNode,
  memory: MemoryNode,
  tools: ToolsNode,
}

const edgeTypes = {
  deletable: DeletableEdge,
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
      case 'ai_evaluation':
        nodeType = 'aiEvaluation'
        break
      case 'provider':
        nodeType = 'provider'
        break
      case 'memory':
        nodeType = 'memory' // Component pending creation
        break
      case 'tools':
        nodeType = 'tools' // Component pending creation
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
        ...(step.type === 'provider' && {
          providerType: step.providerType || 'openai',
          config: step.providerConfig || {
            type: 'openai',
            model: 'gpt-4',
            temperature: 0.7,
            maxTokens: 1000,
          },
        }),
      },
    }
  })
}

// Convert workflow steps dependencies to React Flow edges
function stepsToEdges(
  steps: WorkflowStepDefinition[],
  onEdgeDelete?: (edgeId: string) => void
): Edge[] {
  const edges: Edge[] = []

  steps.forEach((step) => {
    if (step.deps && Array.isArray(step.deps)) {
      step.deps.forEach((depId) => {
        // Find the source step to determine connection type
        const sourceStep = steps.find((s) => s.id === depId)

        // Determine handles based on step types
        let sourceHandle: string | undefined = undefined
        let targetHandle: string | undefined = undefined
        let edgeColor = '#64748b' // default color

        if (sourceStep?.type === 'provider') {
          sourceHandle = 'output'
          targetHandle = 'provider' // Connect to bottom green handle
          edgeColor = '#10b981' // green color for provider connections
        } else if (sourceStep?.type === 'memory') {
          sourceHandle = 'output'
          targetHandle = 'memory' // Connect to bottom purple handle
          edgeColor = '#8b5cf6' // purple color for memory connections
        } else if (sourceStep?.type === 'tools') {
          sourceHandle = 'output'
          targetHandle = 'tools' // Connect to bottom orange handle
          edgeColor = '#f97316' // orange color for tools connections
        }

        edges.push({
          id: `${depId}-${step.id}`,
          source: depId,
          target: step.id,
          sourceHandle,
          targetHandle,
          type: 'deletable', // Use our custom deletable edge
          deletable: true,
          focusable: true,
          data: { onDelete: onEdgeDelete }, // Pass delete handler to edge component
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: edgeColor,
          },
          style: {
            stroke: edgeColor,
            strokeWidth: 3,
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
  // Inject minimal styles
  useEffect(() => {
    const styleElement = document.createElement('style')
    styleElement.textContent = connectionStyles
    document.head.appendChild(styleElement)

    return () => {
      document.head.removeChild(styleElement)
    }
  }, [])
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
    clearSelection,
    setSelectedSteps,
    updateNodePosition,
    updateViewport,
  } = useWorkflowBuilderStore()

  const projects = useProjectStore((state) => state.projects)

  // React Flow instance for save/restore
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null)

  // Track if we've done initial viewport setup to prevent loops
  const [isViewportInitialized, setIsViewportInitialized] = useState(false)

  // Canvas modals for node creation
  const canvasModals = useCanvasModals()

  // Removed connection state - let React Flow handle everything

  // Debounce timer ref for viewport updates
  const viewportTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Connection validation - prevent invalid connections
  const isValidConnection: IsValidConnection = useCallback(
    (connection) => {
      // Prevent self-connections
      if (connection.source === connection.target) {
        return false
      }

      // Prevent duplicate connections
      const targetStep = workflow?.steps.find((s) => s.id === connection.target)
      if (targetStep?.deps?.includes(connection.source || '')) {
        return false
      }

      // Prevent circular dependencies (basic check)
      const sourceStep = workflow?.steps.find((s) => s.id === connection.source)
      if (sourceStep?.deps?.includes(connection.target || '')) {
        return false
      }

      return true
    },
    [workflow?.steps]
  )

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

  // Select all steps function
  const selectAllSteps = useCallback(() => {
    if (!workflow?.steps) return
    const allStepIds = workflow.steps.map((step) => step.id)
    setSelectedSteps(allStepIds)
  }, [workflow?.steps, setSelectedSteps])

  // Delete selected steps function
  const deleteSelectedSteps = useCallback(() => {
    if (selectedStepIds.length === 0) return

    // Remove each selected step
    selectedStepIds.forEach((stepId) => {
      removeStep(stepId)
    })

    // Clear selection after deletion
    clearSelection()
  }, [selectedStepIds, removeStep, clearSelection])

  // Handle keyboard shortcuts with direct event handling (more reliable than useKeyPress)
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // Prevent shortcuts when typing in inputs, textareas, or selects
      const activeElement = document.activeElement

      // Enhanced check for input fields and form areas
      if (
        // Check if actively focused element is an input
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement ||
        // Check if we're inside a no-drag container (our form areas)
        (activeElement instanceof HTMLElement &&
          (activeElement.closest('[data-no-drag="true"]') !== null ||
            // Check if we're inside any React Flow node
            activeElement.closest('.react-flow__node') !== null ||
            // Check for input-related roles and attributes
            activeElement.closest('[role="textbox"]') !== null ||
            activeElement.closest('[contenteditable]') !== null ||
            // Check for specific input classes
            activeElement.classList.contains('form-control') ||
            activeElement.classList.contains('input'))) ||
        // Check if element itself is editable
        (activeElement instanceof HTMLElement &&
          activeElement.getAttribute('contenteditable') === 'true')
      ) {
        // Skip all keyboard shortcuts when user is typing in input fields
        return
      }

      // Handle Delete/Backspace for node deletion
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedStepIds.length > 0) {
          event.preventDefault()
          deleteSelectedSteps()
        }
      }

      // Handle CMD+A for select all - ensure React Flow doesn't interfere
      if ((event.metaKey || event.ctrlKey) && event.key === 'a') {
        if (workflow?.steps.length) {
          event.preventDefault()
          event.stopPropagation() // Prevent React Flow from handling this
          selectAllSteps()
        }
      }
    },
    [selectedStepIds, deleteSelectedSteps, workflow?.steps, selectAllSteps]
  )

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

  // React Flow canvas ref for focus management
  const reactFlowRef = useRef<HTMLDivElement>(null)

  // Use React Flow hooks for UI interactions only - initialized once, then managed by React Flow
  const [displayNodes, setDisplayNodes, onNodesChangeOriginal] = useNodesState([])
  const [displayEdges, setDisplayEdges, onEdgesChangeOriginal] = useEdgesState([])

  // Custom edge delete handler that maintains dependency cleanup
  const handleCustomEdgeDelete = useCallback(
    (edgeId: string) => {
      // Parse edge ID format: "sourceId-targetId"
      const [sourceId, targetId] = edgeId.split('-')

      if (sourceId && targetId && workflow) {
        const targetStep = workflow.steps.find((s) => s.id === targetId)
        if (targetStep) {
          // Check if source is a conditional node to clean up branch references
          const sourceStep = workflow.steps.find((s) => s.id === sourceId)
          if (sourceStep?.type === 'conditional') {
            // Clean up conditional branch references
            if (sourceStep.trueBranch === targetId) {
              updateStep(sourceId, { trueBranch: undefined })
            }
            if (sourceStep.falseBranch === targetId) {
              updateStep(sourceId, { falseBranch: undefined })
            }
          }

          // Remove dependency from target step
          const newDeps = (targetStep.deps || []).filter((dep) => dep !== sourceId)
          setDependencies(targetId, newDeps)

          console.log(`[Custom Edge Delete] Removed dependency: ${sourceId} -> ${targetId}`)
        }
      }

      // Also update React Flow display
      setDisplayEdges((edges) => edges.filter((edge) => edge.id !== edgeId))
    },
    [workflow, updateStep, setDependencies, setDisplayEdges]
  )

  const edges = useMemo(
    () => (workflow ? stepsToEdges(workflow.steps, handleCustomEdgeDelete) : []),
    [workflow, handleCustomEdgeDelete]
  )

  // Track if we've initialized the nodes to prevent race conditions
  const [nodesInitialized, setNodesInitialized] = useState(false)

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

  // Enhanced onEdgesChange handler that syncs edge deletions with store
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // Handle React Flow display changes first
      onEdgesChangeOriginal(changes)

      // Process edge deletions and update store dependencies
      changes.forEach((change) => {
        if (change.type === 'remove') {
          const edgeId = change.id
          // Parse edge ID format: "sourceId-targetId"
          const [sourceId, targetId] = edgeId.split('-')

          if (sourceId && targetId && workflow) {
            const targetStep = workflow.steps.find((s) => s.id === targetId)
            if (targetStep) {
              // Check if source is a conditional node to clean up branch references
              const sourceStep = workflow.steps.find((s) => s.id === sourceId)
              if (sourceStep?.type === 'conditional') {
                // Clean up conditional branch references
                if (sourceStep.trueBranch === targetId) {
                  updateStep(sourceId, { trueBranch: undefined })
                }
                if (sourceStep.falseBranch === targetId) {
                  updateStep(sourceId, { falseBranch: undefined })
                }
              }

              // Remove dependency from target step
              const newDeps = (targetStep.deps || []).filter((dep) => dep !== sourceId)
              setDependencies(targetId, newDeps)

              console.log(`[Edge Delete] Removed dependency: ${sourceId} -> ${targetId}`)
            }
          }
        }
      })
    },
    [onEdgesChangeOriginal, workflow, updateStep, setDependencies]
  )

  // Reset initialization when workflow changes completely (new workflow loaded)
  const workflowIdRef = useRef<string | null>(null)
  useEffect(() => {
    const currentWorkflowId =
      workflow?.name || workflow?.id || workflow?.steps?.length?.toString() || null
    if (currentWorkflowId !== workflowIdRef.current) {
      console.log('[VisualWorkflowBuilder] New workflow detected, resetting initialization')
      workflowIdRef.current = currentWorkflowId
      setNodesInitialized(false)
    }
  }, [workflow])

  // Initialize nodes only once when workflow loads, then let React Flow manage positions
  useEffect(() => {
    if (workflow && workflow.steps.length > 0 && !nodesInitialized) {
      console.log('[VisualWorkflowBuilder] Initial node setup with stored positions')
      setDisplayNodes(nodes)
      setDisplayEdges(edges)
      setNodesInitialized(true)
    }
  }, [workflow, nodes, edges, setDisplayNodes, setDisplayEdges, nodesInitialized])

  // Handle structural changes (add/remove nodes) without affecting positions
  useEffect(() => {
    if (workflow && nodesInitialized) {
      const currentNodeIds = displayNodes.map((n) => n.id).sort()
      const newNodeIds = workflow.steps.map((s) => s.id).sort()

      // Only update if there are structural changes (different node IDs)
      if (JSON.stringify(currentNodeIds) !== JSON.stringify(newNodeIds)) {
        console.log('[VisualWorkflowBuilder] Structural change detected, updating nodes')
        // Preserve current positions from React Flow state
        const currentPositions = displayNodes.reduce(
          (acc, node) => {
            acc[node.id] = node.position
            return acc
          },
          {} as Record<string, { x: number; y: number }>
        )

        // Create new nodes with preserved positions where possible
        const updatedNodes = stepsToNodes(workflow.steps, currentPositions).map((node) => ({
          ...node,
          selected: selectedStepIds.includes(node.id),
        }))

        setDisplayNodes(updatedNodes)
        setDisplayEdges(edges)
      }
    }
  }, [
    workflow,
    nodesInitialized,
    displayNodes,
    edges,
    selectedStepIds,
    setDisplayNodes,
    setDisplayEdges,
  ])

  // Canvas click handler for focus management and selection clearing
  const handlePaneClick = useCallback(() => {
    // Clear selection when clicking on empty canvas
    clearSelection()
    // Also clear React Flow visual selection
    setTimeout(() => {
      setDisplayNodes((nodes) => nodes.map((node) => ({ ...node, selected: false })))
    }, 0)
  }, [clearSelection, setDisplayNodes])

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

  // Remove custom connection handlers - let React Flow handle everything

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
      // Also update display for immediate feedback with our custom edge type
      const customEdge: Edge = {
        id: `${params.source}-${params.target}`,
        source: params.source!,
        target: params.target!,
        type: 'deletable',
        data: { onDelete: handleCustomEdgeDelete },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: '#64748b',
        },
        style: {
          stroke: '#64748b',
          strokeWidth: 3,
        },
      }
      setDisplayEdges((eds) => addEdge(customEdge, eds))
    },
    [setDependencies, setDisplayEdges, workflow?.steps, updateStep, handleCustomEdgeDelete]
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
        case 'AIEvaluation':
          addStep({
            type: 'ai_evaluation',
            task: 'Process the content: {previous_step.output}',
            role: 'ai',
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

  // Handle provider node creation
  const handleProviderSelect = (providerType: string) => {
    console.log('🎯 handleProviderSelect called with:', providerType)
    console.log('📊 Modal state:', canvasModals.modalState)

    const targetNodeId = canvasModals.modalState.targetNodeId
    if (!targetNodeId) {
      console.error('❌ No targetNodeId in modal state')
      return
    }

    console.log('🔍 Looking for target node:', targetNodeId)

    // Check if target AI node already has a provider connection
    const targetAIStep = workflow?.steps.find((s) => s.id === targetNodeId)
    if (targetAIStep) {
      const existingProviderConnection = targetAIStep.deps?.find((depId) => {
        const depStep = workflow?.steps.find((s) => s.id === depId)
        return depStep?.type === 'provider'
      })

      if (existingProviderConnection) {
        console.warn('⚠️ Target AI node already has a provider connection')
        canvasModals.closeAllModals()
        return // Don't create auto-connection, but allow manual node creation
      }
    }

    // Get target node position - try multiple approaches
    let targetPosition = { x: 200, y: 200 } // fallback position

    // Try React Flow instance first
    if (rfInstance) {
      const targetNode = rfInstance.getNode(targetNodeId)
      if (targetNode) {
        targetPosition = { x: targetNode.position.x, y: targetNode.position.y + 150 }
        console.log('✅ Found target node in React Flow:', targetNode.position)
      } else {
        console.warn('⚠️ Target node not found in React Flow instance')
      }
    }

    // Fallback: try displayNodes
    if (!rfInstance || !rfInstance.getNode(targetNodeId)) {
      const targetNode = displayNodes.find((node) => node.id === targetNodeId)
      if (targetNode) {
        targetPosition = { x: targetNode.position.x, y: targetNode.position.y + 150 }
        console.log('✅ Found target node in displayNodes:', targetNode.position)
      } else {
        console.warn('⚠️ Target node not found in displayNodes, using fallback position')
      }
    }

    console.log('🆕 Creating provider node for type:', providerType)

    // Validate provider type with explicit checks
    const typedProviderType =
      providerType === 'openai' ||
      providerType === 'anthropic' ||
      providerType === 'azure' ||
      providerType === 'google'
        ? providerType
        : 'openai' // fallback to openai for invalid types

    // First, add to workflow store as a provider step
    const generatedStepId = addStep({
      type: 'provider',
      task: `Configure ${typedProviderType} AI provider connection`,
      role: 'provider',
      providerType: typedProviderType,
      providerConfig: {
        type: typedProviderType,
        model:
          typedProviderType === 'openai'
            ? 'gpt-4'
            : typedProviderType === 'anthropic'
              ? 'claude-3-sonnet'
              : typedProviderType === 'azure'
                ? 'gpt-4'
                : 'gemini-pro',
        temperature: 0.7,
        maxTokens: 1000,
      },
    })

    // Create provider node for React Flow display
    const newProviderNode = {
      id: generatedStepId,
      type: 'provider',
      position: targetPosition,
      data: {
        label: 'AI Provider',
        providerType: providerType,
      },
    }

    // Create edge connecting provider to AI node
    const edgeId = `${generatedStepId}-${targetNodeId}`
    const newEdge = {
      id: edgeId,
      source: generatedStepId,
      sourceHandle: 'output',
      target: targetNodeId,
      targetHandle: 'provider',
      type: 'deletable',
      data: { onDelete: handleCustomEdgeDelete },
      style: { stroke: '#10b981', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#10b981',
      },
    }

    // Update React Flow display immediately
    setDisplayNodes((nodes) => [...nodes, newProviderNode])
    setDisplayEdges((edges) => [...edges, newEdge])

    // CRITICAL: Update target node dependencies in store for persistence
    const targetStep = workflow?.steps.find((s) => s.id === targetNodeId)
    if (targetStep) {
      const newDeps = [...(targetStep.deps || []), generatedStepId]
      setDependencies(targetNodeId, newDeps)
    }

    // Store the position for persistence
    updateNodePosition(generatedStepId, targetPosition)

    console.log('✅ Provider node created successfully:', {
      nodeId: generatedStepId,
      providerType,
      position: targetPosition,
      edgeId,
    })
  }

  const canvasModalContextValue = {
    openProviderModal: canvasModals.openProviderModal,
    openMemoryModal: canvasModals.openMemoryModal,
    openToolsModal: canvasModals.openToolsModal,
    closeAllModals: canvasModals.closeAllModals,
  }

  return (
    <CanvasModalsProvider value={canvasModalContextValue}>
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
            <Button
              size="sm"
              variant="outline"
              onClick={handleSave}
              disabled={!isDirty || isSaving}
            >
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
            onKeyDown={handleKeyDown}
            isValidConnection={isValidConnection}
            connectionLineType={ConnectionLineType.SmoothStep}
            connectionLineStyle={{
              stroke: '#3b82f6',
              strokeWidth: 4,
              strokeDasharray: '8,4',
              filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.6))',
            }}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onPaneClick={handlePaneClick}
            onMove={handleViewportChange}
            snapToGrid={true}
            snapGrid={[20, 20]}
            connectionRadius={100}
            connectOnClick={false}
            minZoom={0.1}
            maxZoom={2}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView={!viewport}
            defaultViewport={viewport || undefined}
            attributionPosition="bottom-left"
            className="bg-background"
            tabIndex={0}
            style={{ outline: 'none' }}
            selectionMode={SelectionMode.Partial}
            multiSelectionKeyCode={['Meta', 'Control']}
            selectNodesOnDrag={true}
            selectionKeyCode={['Shift']}
            elementsSelectable={true}
            panOnDrag={[1, 2]}
            nodesDraggable={true}
            nodesFocusable={true}
            edgesFocusable={true}
            disableKeyboardA11y={false}
            selectionOnDrag={true}
            panOnScroll={true}
            zoomOnScroll={true}
            zoomOnPinch={true}
            panOnScrollMode={PanOnScrollMode.Free}
            zoomOnDoubleClick={false}
            preventScrolling={false}
            nodeDragThreshold={10}
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
                          <p className="text-sm text-muted-foreground mt-1">
                            {workflow.description}
                          </p>
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

        {/* Provider Configuration Modal */}
        <ProviderSelectionModal
          isOpen={canvasModals.modalState.isProviderModalOpen}
          onClose={canvasModals.closeAllModals}
          onProviderSelect={handleProviderSelect}
        />
      </div>
    </CanvasModalsProvider>
  )
}
