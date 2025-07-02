import { create } from 'zustand'

interface CollapsibleState {
  openStates: Record<string, boolean>
  setOpen: (id: string, isOpen: boolean) => void
  getOpen: (id: string, defaultOpen?: boolean) => boolean
}

export const useCollapsibleStore = create<CollapsibleState>((set, get) => ({
  openStates: {},
  setOpen: (id: string, isOpen: boolean) =>
    set((state) => ({
      openStates: { ...state.openStates, [id]: isOpen },
    })),
  getOpen: (id: string, defaultOpen = false) => {
    const state = get()
    return state.openStates[id] ?? defaultOpen
  },
}))
