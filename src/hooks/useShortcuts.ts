import { useEffect, useState, useCallback } from 'react'

interface KeyboardShortcut {
  id: string
  name: string
  description: string
  defaultKeys: string
  currentKeys: string
  category: 'global' | 'workspace' | 'modal'
}

interface ShortcutHandlers {
  [key: string]: () => void
}

const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  {
    id: 'component-inspector',
    name: 'Component Inspector',
    description: 'Open component inspector to capture and analyze UI elements',
    defaultKeys: 'Cmd+Shift+I',
    currentKeys: 'Cmd+Shift+I',
    category: 'global'
  },
  {
    id: 'interrupt-agents',
    name: 'Interrupt Agents',
    description: 'Stop all running agent operations',
    defaultKeys: 'Escape',
    currentKeys: 'Escape',
    category: 'workspace'
  },
  {
    id: 'broadcast-message',
    name: 'Broadcast Message',
    description: 'Send message to all agents',
    defaultKeys: 'Cmd+Shift+Enter',
    currentKeys: 'Cmd+Shift+Enter',
    category: 'workspace'
  },
  {
    id: 'clear-context',
    name: 'Clear Agent Context',
    description: 'Clear selected agent\'s conversation context',
    defaultKeys: 'Cmd+K',
    currentKeys: 'Cmd+K',
    category: 'workspace'
  },
  {
    id: 'new-project',
    name: 'New Project',
    description: 'Create a new project',
    defaultKeys: 'Cmd+N',
    currentKeys: 'Cmd+N',
    category: 'global'
  },
  {
    id: 'close-modal',
    name: 'Close Modal',
    description: 'Close any open modal or dialog',
    defaultKeys: 'Escape',
    currentKeys: 'Escape',
    category: 'modal'
  }
]

function parseShortcut(shortcut: string): {
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  key: string
} {
  const parts = shortcut.split('+')
  const result = {
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    key: ''
  }

  for (const part of parts) {
    switch (part.toLowerCase()) {
      case 'cmd':
      case 'meta':
        result.metaKey = true
        break
      case 'ctrl':
      case 'control':
        result.ctrlKey = true
        break
      case 'alt':
        result.altKey = true
        break
      case 'shift':
        result.shiftKey = true
        break
      default:
        result.key = part.toLowerCase()
    }
  }

  return result
}

function isShortcutMatch(event: KeyboardEvent, shortcut: string): boolean {
  const parsed = parseShortcut(shortcut)
  
  // Handle special key mappings
  let eventKey = event.key.toLowerCase()
  if (eventKey === ' ') eventKey = 'space'
  if (eventKey === 'enter') eventKey = 'enter'
  if (eventKey === 'escape') eventKey = 'escape'
  
  return (
    event.metaKey === parsed.metaKey &&
    event.ctrlKey === parsed.ctrlKey &&
    event.altKey === parsed.altKey &&
    event.shiftKey === parsed.shiftKey &&
    eventKey === parsed.key
  )
}

export function useShortcuts(handlers: ShortcutHandlers, enabled: boolean = true) {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>(DEFAULT_SHORTCUTS)

  // Load shortcuts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('claude-studio-shortcuts')
    if (saved) {
      try {
        const savedShortcuts = JSON.parse(saved)
        setShortcuts(savedShortcuts)
      } catch (error) {
        console.error('Failed to load shortcuts:', error)
      }
    }
  }, [])

  // Listen for shortcut updates
  useEffect(() => {
    const handleShortcutsUpdated = (event: CustomEvent) => {
      setShortcuts(event.detail.shortcuts)
    }

    window.addEventListener('shortcuts-updated', handleShortcutsUpdated as EventListener)
    return () => {
      window.removeEventListener('shortcuts-updated', handleShortcutsUpdated as EventListener)
    }
  }, [])

  // Handle keyboard events
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input elements
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return
      }

      // Check each shortcut
      for (const shortcut of shortcuts) {
        if (isShortcutMatch(event, shortcut.currentKeys)) {
          const handler = handlers[shortcut.id]
          if (handler) {
            event.preventDefault()
            event.stopPropagation()
            handler()
            break
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [shortcuts, handlers, enabled])

  const getShortcut = useCallback((id: string): string | undefined => {
    const shortcut = shortcuts.find(s => s.id === id)
    return shortcut?.currentKeys
  }, [shortcuts])

  return {
    shortcuts,
    getShortcut
  }
}

export function useGlobalShortcuts(handlers: ShortcutHandlers) {
  return useShortcuts(handlers, true)
}

export function useWorkspaceShortcuts(handlers: ShortcutHandlers, enabled: boolean = true) {
  return useShortcuts(handlers, enabled)
}

export function useModalShortcuts(handlers: ShortcutHandlers, enabled: boolean = true) {
  return useShortcuts(handlers, enabled)
}