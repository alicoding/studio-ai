/**
 * useWorkspaceLayout - Workspace View Management Hook
 *
 * SOLID: Single Responsibility - Only handles workspace layout
 * DRY: Centralizes view mode logic
 * KISS: Simple view mode management
 * Library-First: Uses project store for persistence
 */

import { useCallback } from 'react'
import { useProjectStore } from '../stores'

export type ViewMode = 'single' | 'split' | 'grid'
export type CanvasMode = 'agent' | 'workflow' | 'approval'

interface WorkspaceLayout {
  // State
  viewMode: ViewMode
  sidebarCollapsed: boolean
  canvasMode: CanvasMode
  selectedAgentId: string | null
  selectedWorkflowId: string | null

  // Actions
  setViewMode: (mode: ViewMode) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setCanvasMode: (mode: CanvasMode) => void
  setSelectedAgent: (agentId: string | null) => void
  setSelectedWorkflow: (workflowId: string | null) => void

  // View mode checks
  isSingleView: boolean
  isSplitView: boolean
  isGridView: boolean

  // Canvas mode checks
  isAgentMode: boolean
  isWorkflowMode: boolean

  // Chat panel visibility
  showChatPanel: boolean
  showMessageQueue: boolean
}

export function useWorkspaceLayout(): WorkspaceLayout {
  const {
    viewMode,
    sidebarCollapsed,
    canvasMode,
    selectedAgentId,
    selectedWorkflowId,
    setViewMode: setViewModeStore,
    setSidebarCollapsed: setSidebarCollapsedStore,
    setCanvasMode: setCanvasModeStore,
    setSelectedAgent: setSelectedAgentStore,
    setSelectedWorkflow: setSelectedWorkflowStore,
  } = useProjectStore()

  /**
   * Set view mode
   */
  const setViewMode = useCallback(
    (mode: ViewMode) => {
      setViewModeStore(mode)
      console.log(`View mode changed to: ${mode}`)
    },
    [setViewModeStore]
  )

  /**
   * Toggle sidebar collapsed state
   */
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsedStore(!sidebarCollapsed)
  }, [sidebarCollapsed, setSidebarCollapsedStore])

  /**
   * Set sidebar collapsed state
   */
  const setSidebarCollapsed = useCallback(
    (collapsed: boolean) => {
      setSidebarCollapsedStore(collapsed)
    },
    [setSidebarCollapsedStore]
  )

  /**
   * Set canvas mode (agent or workflow)
   */
  const setCanvasMode = useCallback(
    (mode: CanvasMode) => {
      setCanvasModeStore(mode)
      console.log(`Canvas mode changed to: ${mode}`)
    },
    [setCanvasModeStore]
  )

  /**
   * Set selected agent (preserves state when switching to workflow mode)
   */
  const setSelectedAgent = useCallback(
    (agentId: string | null) => {
      setSelectedAgentStore(agentId)
      if (agentId) {
        setCanvasModeStore('agent')
        console.log(`Selected agent: ${agentId}`)
      }
    },
    [setSelectedAgentStore, setCanvasModeStore]
  )

  /**
   * Set selected workflow (preserves state when switching to agent mode)
   */
  const setSelectedWorkflow = useCallback(
    (workflowId: string | null) => {
      setSelectedWorkflowStore(workflowId)
      if (workflowId) {
        setCanvasModeStore('workflow')
        console.log(`Selected workflow: ${workflowId}`)
      }
    },
    [setSelectedWorkflowStore, setCanvasModeStore]
  )

  // View mode checks
  const isSingleView = viewMode === 'single'
  const isSplitView = viewMode === 'split'
  const isGridView = viewMode === 'grid'

  // Canvas mode checks
  const isAgentMode = canvasMode === 'agent'
  const isWorkflowMode = canvasMode === 'workflow'

  // Chat panel and message queue are visible in all modes
  const showChatPanel = true
  const showMessageQueue = true

  return {
    // State
    viewMode,
    sidebarCollapsed,
    canvasMode,
    selectedAgentId,
    selectedWorkflowId,

    // Actions
    setViewMode,
    toggleSidebar,
    setSidebarCollapsed,
    setCanvasMode,
    setSelectedAgent,
    setSelectedWorkflow,

    // View mode checks
    isSingleView,
    isSplitView,
    isGridView,

    // Canvas mode checks
    isAgentMode,
    isWorkflowMode,

    // UI visibility
    showChatPanel,
    showMessageQueue,
  }
}
