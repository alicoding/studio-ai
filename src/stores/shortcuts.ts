/**
 * ShortcutsStore - Persists keyboard shortcut customizations
 *
 * KISS: Simple shortcut management
 * Library-First: Uses persistent store factory
 * DRY: Centralized shortcut configuration
 */

import { createPersistentStore } from './createPersistentStore'

export interface KeyboardShortcut {
  id: string
  name: string
  description: string
  defaultKeys: string
  currentKeys: string
  category: 'global' | 'workspace' | 'modal'
}

interface ShortcutsState {
  shortcuts: KeyboardShortcut[]
  updateShortcut: (id: string, keys: string) => void
  resetShortcut: (id: string) => void
  resetAllShortcuts: () => void
  getShortcut: (id: string) => KeyboardShortcut | undefined
}

export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  {
    id: 'component-inspector',
    name: 'Component Inspector',
    description: 'Open component inspector to capture and analyze UI elements',
    defaultKeys: 'Cmd+Shift+I',
    currentKeys: 'Cmd+Shift+I',
    category: 'global',
  },
  {
    id: 'interrupt-agents',
    name: 'Interrupt Agents',
    description: 'Stop all running agent operations',
    defaultKeys: 'Escape',
    currentKeys: 'Escape',
    category: 'workspace',
  },
  {
    id: 'broadcast-message',
    name: 'Broadcast Message',
    description: 'Send message to all agents',
    defaultKeys: 'Cmd+Shift+Enter',
    currentKeys: 'Cmd+Shift+Enter',
    category: 'workspace',
  },
  {
    id: 'clear-context',
    name: 'Clear Agent Context',
    description: "Clear selected agent's conversation context",
    defaultKeys: 'Cmd+K',
    currentKeys: 'Cmd+K',
    category: 'workspace',
  },
  {
    id: 'new-project',
    name: 'New Project',
    description: 'Create a new project',
    defaultKeys: 'Cmd+N',
    currentKeys: 'Cmd+N',
    category: 'global',
  },
  {
    id: 'new-workflow',
    name: 'New Workflow',
    description: 'Create a new workflow',
    defaultKeys: 'Cmd+Shift+W',
    currentKeys: 'Cmd+Shift+W',
    category: 'workspace',
  },
  {
    id: 'close-modal',
    name: 'Close Modal',
    description: 'Close any open modal or dialog',
    defaultKeys: 'Escape',
    currentKeys: 'Escape',
    category: 'modal',
  },
]

export const useShortcutsStore = createPersistentStore<ShortcutsState>(
  'shortcuts',
  (set, get) => ({
    shortcuts: DEFAULT_SHORTCUTS,

    updateShortcut: (id: string, keys: string) => {
      set((state) => ({
        shortcuts: state.shortcuts.map((shortcut) =>
          shortcut.id === id ? { ...shortcut, currentKeys: keys } : shortcut
        ),
      }))

      // Emit event for backward compatibility
      window.dispatchEvent(
        new CustomEvent('shortcuts-updated', {
          detail: { shortcuts: get().shortcuts },
        })
      )
    },

    resetShortcut: (id: string) => {
      set((state) => ({
        shortcuts: state.shortcuts.map((shortcut) =>
          shortcut.id === id ? { ...shortcut, currentKeys: shortcut.defaultKeys } : shortcut
        ),
      }))

      // Emit event for backward compatibility
      window.dispatchEvent(
        new CustomEvent('shortcuts-updated', {
          detail: { shortcuts: get().shortcuts },
        })
      )
    },

    resetAllShortcuts: () => {
      set({ shortcuts: DEFAULT_SHORTCUTS })

      // Emit event for backward compatibility
      window.dispatchEvent(
        new CustomEvent('shortcuts-updated', {
          detail: { shortcuts: DEFAULT_SHORTCUTS },
        })
      )
    },

    getShortcut: (id: string) => {
      return get().shortcuts.find((s) => s.id === id)
    },
  }),
  {
    version: 1,
  }
)
