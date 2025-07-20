/**
 * CanvasModalsContext - React Context for managing canvas node creation modals
 *
 * SOLID: Single responsibility - provide modal functions to child components
 * DRY: Centralized modal state access for all nodes
 * KISS: Simple context pattern with clear interface
 * Library-First: Uses React Context API
 */

import { createContext, useContext, ReactNode } from 'react'

interface CanvasModalContextType {
  openProviderModal: (nodeId: string) => void
  openMemoryModal: (nodeId: string) => void
  openToolsModal: (nodeId: string) => void
  closeAllModals: () => void
}

const CanvasModalsContext = createContext<CanvasModalContextType | undefined>(undefined)

interface CanvasModalsProviderProps {
  children: ReactNode
  value: CanvasModalContextType
}

export function CanvasModalsProvider({ children, value }: CanvasModalsProviderProps) {
  return <CanvasModalsContext.Provider value={value}>{children}</CanvasModalsContext.Provider>
}

export function useCanvasModalsContext() {
  const context = useContext(CanvasModalsContext)

  if (context === undefined) {
    throw new Error('useCanvasModalsContext must be used within a CanvasModalsProvider')
  }

  return context
}
