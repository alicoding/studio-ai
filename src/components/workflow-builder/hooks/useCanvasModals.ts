/**
 * useCanvasModals - Hook for managing canvas node creation modals
 *
 * SOLID: Single responsibility - modal state management for canvas nodes
 * DRY: Centralized modal state for provider, memory, tools
 * KISS: Simple state management with clear interface
 * Library-First: Uses React state hooks
 */

import { useState } from 'react'

interface CanvasModalState {
  isProviderModalOpen: boolean
  isMemoryModalOpen: boolean
  isToolsModalOpen: boolean
  targetNodeId: string | null
}

export function useCanvasModals() {
  const [modalState, setModalState] = useState<CanvasModalState>({
    isProviderModalOpen: false,
    isMemoryModalOpen: false,
    isToolsModalOpen: false,
    targetNodeId: null,
  })

  const openProviderModal = (nodeId: string) => {
    console.log('🔄 Opening provider modal for node:', nodeId)
    setModalState({
      isProviderModalOpen: true,
      isMemoryModalOpen: false,
      isToolsModalOpen: false,
      targetNodeId: nodeId,
    })
    console.log('✅ Provider modal state set to open')
  }

  const openMemoryModal = (nodeId: string) => {
    setModalState({
      isProviderModalOpen: false,
      isMemoryModalOpen: true,
      isToolsModalOpen: false,
      targetNodeId: nodeId,
    })
  }

  const openToolsModal = (nodeId: string) => {
    setModalState({
      isProviderModalOpen: false,
      isMemoryModalOpen: false,
      isToolsModalOpen: true,
      targetNodeId: nodeId,
    })
  }

  const closeAllModals = () => {
    setModalState({
      isProviderModalOpen: false,
      isMemoryModalOpen: false,
      isToolsModalOpen: false,
      targetNodeId: null,
    })
  }

  return {
    modalState,
    openProviderModal,
    openMemoryModal,
    openToolsModal,
    closeAllModals,
  }
}
