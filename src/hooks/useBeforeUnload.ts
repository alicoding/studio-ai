/**
 * BeforeUnload Protection Hook - Prevents accidental loss of unsaved changes
 *
 * SOLID: Single responsibility for unload protection
 * DRY: Reusable hook for any unsaved changes scenario
 * KISS: Simple beforeunload event handling
 * Library-First: Uses standard browser APIs with React hooks
 */

import { useEffect, useRef, useCallback, useState } from 'react'

interface BeforeUnloadOptions {
  when: boolean // When to show the warning (e.g., hasUnsavedChanges)
  message?: string // Custom message (may not be shown in modern browsers)
  onBeforeUnload?: () => void // Callback when unload is attempted
  onUnload?: () => void // Callback when unload actually happens
}

export function useBeforeUnload(options: BeforeUnloadOptions) {
  const {
    when,
    message = 'You have unsaved changes. Are you sure you want to leave?',
    onBeforeUnload,
    onUnload,
  } = options

  const savedCallbackRef = useRef<(() => void) | undefined>(undefined)

  // Save the callback to ref so it's always current
  useEffect(() => {
    savedCallbackRef.current = onBeforeUnload
  }, [onBeforeUnload])

  const handleBeforeUnload = useCallback(
    (event: BeforeUnloadEvent) => {
      if (!when) return

      // Call the callback if provided
      if (savedCallbackRef.current) {
        savedCallbackRef.current()
      }

      // Modern browsers ignore the message, but we set it for older browsers
      event.preventDefault()
      event.returnValue = message
      return message
    },
    [when, message]
  )

  const handleUnload = useCallback(() => {
    if (onUnload) {
      onUnload()
    }
  }, [onUnload])

  useEffect(() => {
    if (when) {
      window.addEventListener('beforeunload', handleBeforeUnload)
      window.addEventListener('unload', handleUnload)

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload)
        window.removeEventListener('unload', handleUnload)
      }
    }
  }, [when, handleBeforeUnload, handleUnload])

  // Manual trigger for programmatic navigation
  const confirmNavigation = useCallback(
    (message?: string): boolean => {
      if (!when) return true

      const confirmMessage = message || 'You have unsaved changes. Are you sure you want to leave?'
      return window.confirm(confirmMessage)
    },
    [when]
  )

  return {
    confirmNavigation,
    isProtected: when,
  }
}

/**
 * Workflow-specific beforeunload protection
 * Uses the workflow store to check for unsaved changes
 */
export function useWorkflowBeforeUnload() {
  // Dynamic import to avoid circular dependencies
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    const checkUnsavedChanges = async () => {
      try {
        const { useWorkflowBuilderStore } = await import('../stores/workflowBuilder')
        const store = useWorkflowBuilderStore.getState()
        const hasChanges = store.hasUnsavedChanges()
        setHasUnsavedChanges(hasChanges)
      } catch (error) {
        console.error('Error checking unsaved changes:', error)
      }
    }

    // Check immediately
    checkUnsavedChanges()

    // Set up interval to check periodically
    const interval = setInterval(checkUnsavedChanges, 1000)

    return () => clearInterval(interval)
  }, [])

  return useBeforeUnload({
    when: hasUnsavedChanges,
    message: 'You have unsaved workflow changes. Are you sure you want to leave?',
    onBeforeUnload: () => {
      console.log('[BeforeUnload] User attempting to leave with unsaved workflow changes')
    },
    onUnload: () => {
      console.log('[BeforeUnload] User left with unsaved workflow changes')
    },
  })
}
