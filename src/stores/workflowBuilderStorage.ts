/**
 * Context-aware storage adapter for workflow builder
 *
 * SOLID: Single responsibility - handles context-aware persistence
 * DRY: Reuses unified storage adapter with context keys
 * KISS: Simple wrapper that adds context to keys
 */

import { PersistStorage, StorageValue } from 'zustand/middleware'
import { createUnifiedStorageAdapter } from '../lib/storage/zustandAdapter'

// Track current context for the workflow builder
let currentContext: { scope: 'global' | 'project'; projectId?: string } = { scope: 'global' }

/**
 * Set the current context for workflow builder persistence
 */
export function setWorkflowBuilderContext(scope: 'global' | 'project', projectId?: string) {
  currentContext = { scope, projectId }
  console.log('[WorkflowBuilderStorage] Context updated:', currentContext)
}

/**
 * Get the current context
 */
export function getWorkflowBuilderContext() {
  return currentContext
}

/**
 * Generate a context-aware storage key
 */
function getContextKey(baseKey: string): string {
  if (currentContext.scope === 'project' && currentContext.projectId) {
    return `${baseKey}-project-${currentContext.projectId}`
  }
  return `${baseKey}-global`
}

/**
 * Context-aware storage adapter that uses different keys based on current context
 */
export function createContextAwareStorage<T>(): PersistStorage<T> {
  const baseStorage = createUnifiedStorageAdapter<T>()

  // Track context to prevent loops during context transitions
  let lastSeenContext: string | null = null
  let isContextTransitioning = false
  let contextTransitionTimer: NodeJS.Timeout | null = null

  return {
    getItem: async (name: string): Promise<StorageValue<T> | null> => {
      const contextKey = getContextKey(name)
      const contextString = JSON.stringify(currentContext)

      // Check if context is transitioning
      if (contextString !== lastSeenContext) {
        // Context has changed - mark as transitioning to prevent loops
        isContextTransitioning = true
        lastSeenContext = contextString

        console.log(
          '[WorkflowBuilderStorage] Context transition detected, getting item with key:',
          contextKey
        )

        // Clear any existing transition timer
        if (contextTransitionTimer) {
          clearTimeout(contextTransitionTimer)
        }

        // Mark transition as complete after a brief delay
        contextTransitionTimer = setTimeout(() => {
          isContextTransitioning = false
          console.log('[WorkflowBuilderStorage] Context transition complete')
        }, 100)
      }

      return baseStorage.getItem(contextKey)
    },

    setItem: async (name: string, value: StorageValue<T>): Promise<void> => {
      const contextKey = getContextKey(name)
      const contextString = JSON.stringify(currentContext)

      // Skip storage during context transitions to prevent loops
      if (isContextTransitioning) {
        console.log('[WorkflowBuilderStorage] Skipping storage save during context transition')
        return
      }

      // Skip storage during rehydration to prevent loops
      if (typeof window !== 'undefined' && sessionStorage.getItem('workflow-rehydrating')) {
        console.log('[WorkflowBuilderStorage] Skipping storage save during rehydration')
        return
      }

      // Update context tracking if needed
      if (contextString !== lastSeenContext) {
        console.log('[WorkflowBuilderStorage] Setting item with new context key:', contextKey)
        lastSeenContext = contextString
      }

      await baseStorage.setItem(contextKey, value)
    },

    removeItem: async (name: string): Promise<void> => {
      const contextKey = getContextKey(name)

      // Skip removal during context transitions
      if (isContextTransitioning) {
        console.log('[WorkflowBuilderStorage] Skipping storage removal during context transition')
        return
      }

      console.log('[WorkflowBuilderStorage] Removing item with context key:', contextKey)
      await baseStorage.removeItem(contextKey)
    },
  }
}

/**
 * Clear storage for a specific context
 */
export async function clearWorkflowBuilderStorage(scope: 'global' | 'project', projectId?: string) {
  const baseStorage = createUnifiedStorageAdapter()
  const baseKey = 'studio-ai-workflow-builder'

  const contextKey =
    scope === 'project' && projectId ? `${baseKey}-project-${projectId}` : `${baseKey}-global`

  console.log('[WorkflowBuilderStorage] Clearing storage for context:', contextKey)
  await baseStorage.removeItem(contextKey)
}
