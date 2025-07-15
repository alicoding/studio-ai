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

  return {
    getItem: async (name: string): Promise<StorageValue<T> | null> => {
      const contextKey = getContextKey(name)
      console.log('[WorkflowBuilderStorage] Getting item with context key:', contextKey)
      return baseStorage.getItem(contextKey)
    },

    setItem: async (name: string, value: StorageValue<T>): Promise<void> => {
      const contextKey = getContextKey(name)
      console.log('[WorkflowBuilderStorage] Setting item with context key:', contextKey)
      await baseStorage.setItem(contextKey, value)
    },

    removeItem: async (name: string): Promise<void> => {
      const contextKey = getContextKey(name)
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
  const baseKey = 'claude-studio-workflow-builder'

  const contextKey =
    scope === 'project' && projectId ? `${baseKey}-project-${projectId}` : `${baseKey}-global`

  console.log('[WorkflowBuilderStorage] Clearing storage for context:', contextKey)
  await baseStorage.removeItem(contextKey)
}
