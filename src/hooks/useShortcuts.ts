import { useEffect, useCallback } from 'react'
import { useShortcutsStore } from '../stores/shortcuts'

interface ShortcutHandlers {
  [key: string]: () => void
}

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
  const { shortcuts, getShortcut: getShortcutFromStore } = useShortcutsStore()

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
    const shortcut = getShortcutFromStore(id)
    return shortcut?.currentKeys
  }, [getShortcutFromStore])

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