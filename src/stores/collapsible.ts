/**
 * CollapsibleStore - Persists UI collapsible states
 * 
 * KISS: Simple state management for UI elements
 * Library-First: Uses persistent store factory
 */

import { createPersistentStore } from './createPersistentStore'

interface CollapsibleState {
  openStates: Record<string, boolean>
  setOpen: (id: string, isOpen: boolean) => void
  getOpen: (id: string, defaultOpen?: boolean) => boolean
}

export const useCollapsibleStore = createPersistentStore<CollapsibleState>(
  'collapsible',
  (set, get) => ({
    openStates: {},
    setOpen: (id: string, isOpen: boolean) =>
      set((state) => ({
        openStates: { ...state.openStates, [id]: isOpen },
      })),
    getOpen: (id: string, defaultOpen = false) => {
      const state = get()
      return state.openStates[id] ?? defaultOpen
    },
  }),
  {
    version: 1,
    // Persist all UI state - it's the whole purpose of this store
  }
)