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

interface WorkspaceLayout {
  // State
  viewMode: ViewMode
  sidebarCollapsed: boolean

  // Actions
  setViewMode: (mode: ViewMode) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void

  // View mode checks
  isSingleView: boolean
  isSplitView: boolean
  isGridView: boolean

  // Chat panel visibility
  showChatPanel: boolean
  showMessageQueue: boolean
}

export function useWorkspaceLayout(): WorkspaceLayout {
  const {
    viewMode,
    sidebarCollapsed,
    setViewMode: setViewModeStore,
    setSidebarCollapsed: setSidebarCollapsedStore,
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

  // View mode checks
  const isSingleView = viewMode === 'single'
  const isSplitView = viewMode === 'split'
  const isGridView = viewMode === 'grid'

  // Chat panel and message queue are visible in all modes
  const showChatPanel = true
  const showMessageQueue = true

  return {
    // State
    viewMode,
    sidebarCollapsed,

    // Actions
    setViewMode,
    toggleSidebar,
    setSidebarCollapsed,

    // View mode checks
    isSingleView,
    isSplitView,
    isGridView,

    // UI visibility
    showChatPanel,
    showMessageQueue,
  }
}
