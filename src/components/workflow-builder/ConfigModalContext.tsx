/**
 * ConfigModalContext - React Context for managing AI node configuration modal states
 *
 * SOLID: Single responsibility - modal state management only
 * DRY: Centralized modal state for all configuration types
 * KISS: Simple context pattern with clear interface
 * Library-First: Uses React Context API
 */

/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useState, ReactNode } from 'react'

// Configuration modal types
type ConfigModalType = 'provider' | 'tools' | 'memory'

// Provider configuration interface (following LangGraph patterns)
interface ProviderConfig {
  type: 'openai' | 'anthropic' | 'azure' | 'google' | 'custom'
  apiKey?: string
  model: string
  temperature?: number
  maxTokens?: number
  baseUrl?: string
  organizationId?: string
}

// Tool configuration interface (LangGraph tool categories)
interface ToolConfig {
  type: 'function' | 'api' | 'retriever' | 'code' | 'mcp'
  name: string
  config: Record<string, unknown>
}

// Memory configuration interface (LangGraph memory types)
interface MemoryConfig {
  type: 'buffer' | 'summary' | 'vector' | 'entity' | 'combined'
  config: Record<string, unknown>
}

// Modal state interface
interface ConfigModalState {
  isOpen: boolean
  modalType: ConfigModalType | null
  nodeId: string | null

  // Configuration data
  providerConfig?: ProviderConfig
  toolsConfig?: ToolConfig[]
  memoryConfig?: MemoryConfig
}

// Context interface
interface ConfigModalContextType {
  // State
  modalState: ConfigModalState

  // Actions
  openProviderModal: (nodeId: string, currentConfig?: ProviderConfig) => void
  openToolsModal: (nodeId: string, currentConfig?: ToolConfig[]) => void
  openMemoryModal: (nodeId: string, currentConfig?: MemoryConfig) => void
  closeModal: () => void

  // Configuration updates
  updateProviderConfig: (config: ProviderConfig) => void
  updateToolsConfig: (config: ToolConfig[]) => void
  updateMemoryConfig: (config: MemoryConfig) => void

  // Save configuration to node
  saveConfiguration: () => void
}

// Create context with undefined default (will throw error if used without provider)
const ConfigModalContext = createContext<ConfigModalContextType | undefined>(undefined)

// Provider component props
interface ConfigModalProviderProps {
  children: ReactNode
}

// Context provider component
export function ConfigModalProvider({ children }: ConfigModalProviderProps) {
  const [modalState, setModalState] = useState<ConfigModalState>({
    isOpen: false,
    modalType: null,
    nodeId: null,
  })

  // Modal actions
  const openProviderModal = (nodeId: string, currentConfig?: ProviderConfig) => {
    console.log('Opening provider modal for node:', nodeId, 'with config:', currentConfig)
    setModalState({
      isOpen: true,
      modalType: 'provider',
      nodeId,
      providerConfig: currentConfig,
    })
  }

  const openToolsModal = (nodeId: string, currentConfig?: ToolConfig[]) => {
    setModalState({
      isOpen: true,
      modalType: 'tools',
      nodeId,
      toolsConfig: currentConfig,
    })
  }

  const openMemoryModal = (nodeId: string, currentConfig?: MemoryConfig) => {
    setModalState({
      isOpen: true,
      modalType: 'memory',
      nodeId,
      memoryConfig: currentConfig,
    })
  }

  const closeModal = () => {
    setModalState({
      isOpen: false,
      modalType: null,
      nodeId: null,
    })
  }

  // Configuration update actions
  const updateProviderConfig = (config: ProviderConfig) => {
    setModalState((prev) => ({
      ...prev,
      providerConfig: config,
    }))
  }

  const updateToolsConfig = (config: ToolConfig[]) => {
    setModalState((prev) => ({
      ...prev,
      toolsConfig: config,
    }))
  }

  const updateMemoryConfig = (config: MemoryConfig) => {
    setModalState((prev) => ({
      ...prev,
      memoryConfig: config,
    }))
  }

  // Save configuration callback - will be implemented by parent component
  const saveConfiguration = () => {
    // This is a placeholder - actual saving will be handled by
    // the component that provides the update mechanism
    console.log('Save configuration called for node:', modalState.nodeId)
  }

  const contextValue: ConfigModalContextType = {
    modalState,
    openProviderModal,
    openToolsModal,
    openMemoryModal,
    closeModal,
    updateProviderConfig,
    updateToolsConfig,
    updateMemoryConfig,
    saveConfiguration,
  }

  return <ConfigModalContext.Provider value={contextValue}>{children}</ConfigModalContext.Provider>
}

// Custom hook for using the context
export function useConfigModal() {
  const context = useContext(ConfigModalContext)

  if (context === undefined) {
    throw new Error('useConfigModal must be used within a ConfigModalProvider')
  }

  return context
}

// Export types for use in other components
export type { ConfigModalType, ProviderConfig, ToolConfig, MemoryConfig, ConfigModalState }
