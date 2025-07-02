/**
 * useModalOperations - Modal State Management Hook
 * 
 * SOLID: Single Responsibility - Only handles modal state
 * DRY: Centralizes modal state management
 * KISS: Simple boolean flags for each modal
 * Library-First: Clean state management pattern
 */

import { useState, useCallback } from 'react'

interface ModalState {
  agentSelection: boolean
  createAgent: boolean
  createProject: boolean
  assignRole: boolean
}

interface ModalOperations {
  // State
  modals: ModalState
  
  // Actions
  openModal: (modalName: keyof ModalState) => void
  closeModal: (modalName: keyof ModalState) => void
  toggleModal: (modalName: keyof ModalState) => void
  closeAllModals: () => void
  
  // Convenience getters
  isAgentSelectionOpen: boolean
  isCreateAgentOpen: boolean
  isCreateProjectOpen: boolean
  isAssignRoleOpen: boolean
  
  // Convenience setters
  setAgentSelectionOpen: (open: boolean) => void
  setCreateAgentOpen: (open: boolean) => void
  setCreateProjectOpen: (open: boolean) => void
  setAssignRoleOpen: (open: boolean) => void
}

export function useModalOperations(): ModalOperations {
  const [modals, setModals] = useState<ModalState>({
    agentSelection: false,
    createAgent: false,
    createProject: false,
    assignRole: false,
  })

  /**
   * Open a specific modal
   */
  const openModal = useCallback((modalName: keyof ModalState) => {
    setModals(prev => ({
      ...prev,
      [modalName]: true,
    }))
  }, [])

  /**
   * Close a specific modal
   */
  const closeModal = useCallback((modalName: keyof ModalState) => {
    setModals(prev => ({
      ...prev,
      [modalName]: false,
    }))
  }, [])

  /**
   * Toggle a specific modal
   */
  const toggleModal = useCallback((modalName: keyof ModalState) => {
    setModals(prev => ({
      ...prev,
      [modalName]: !prev[modalName],
    }))
  }, [])

  /**
   * Close all modals
   */
  const closeAllModals = useCallback(() => {
    setModals({
      agentSelection: false,
      createAgent: false,
      createProject: false,
      assignRole: false,
    })
  }, [])

  /**
   * Convenience setter for agent selection modal
   */
  const setAgentSelectionOpen = useCallback((open: boolean) => {
    setModals(prev => ({ ...prev, agentSelection: open }))
  }, [])

  /**
   * Convenience setter for create agent modal
   */
  const setCreateAgentOpen = useCallback((open: boolean) => {
    setModals(prev => ({ ...prev, createAgent: open }))
  }, [])

  /**
   * Convenience setter for create project modal
   */
  const setCreateProjectOpen = useCallback((open: boolean) => {
    setModals(prev => ({ ...prev, createProject: open }))
  }, [])

  /**
   * Convenience setter for assign role modal
   */
  const setAssignRoleOpen = useCallback((open: boolean) => {
    setModals(prev => ({ ...prev, assignRole: open }))
  }, [])

  return {
    // State
    modals,
    
    // Actions
    openModal,
    closeModal,
    toggleModal,
    closeAllModals,
    
    // Convenience getters
    isAgentSelectionOpen: modals.agentSelection,
    isCreateAgentOpen: modals.createAgent,
    isCreateProjectOpen: modals.createProject,
    isAssignRoleOpen: modals.assignRole,
    
    // Convenience setters
    setAgentSelectionOpen,
    setCreateAgentOpen,
    setCreateProjectOpen,
    setAssignRoleOpen,
  }
}