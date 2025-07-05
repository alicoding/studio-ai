/**
 * createPersistentStore - DRY factory for persistent Zustand stores
 * 
 * SOLID: Single factory for all persistent stores
 * KISS: Simple wrapper around Zustand persist
 * Library-First: Uses Zustand's built-in persist middleware
 * DRY: One place to configure persistence behavior
 */

import { StateCreator, create } from 'zustand'
import { devtools, persist, PersistOptions } from 'zustand/middleware'
import { createUnifiedStorageAdapter, migrateZustandStore } from '../lib/storage/zustandAdapter'

interface PersistConfig<T> {
  name: string
  version?: number
  partialize?: (state: T) => any
  migrate?: PersistOptions<T>['migrate']
}

/**
 * Creates a persistent Zustand store with sensible defaults
 * Handles errors gracefully and provides consistent behavior
 */
export function createPersistentStore<T>(
  name: string,
  stateCreator: StateCreator<T>,
  persistConfig?: Partial<PersistConfig<T>>
) {
  const storeName = `claude-studio-${name}`
  
  // Migrate existing localStorage data if needed
  migrateZustandStore(name)
  
  const persistOptions: PersistOptions<T> = {
    name: storeName,
    version: persistConfig?.version ?? 1,
    partialize: persistConfig?.partialize,
    migrate: persistConfig?.migrate,
    // Use our unified storage instead of localStorage
    storage: createUnifiedStorageAdapter<T>(),
    // Handle storage errors gracefully
    onRehydrateStorage: () => (_state, error) => {
      if (error) {
        console.error(`Failed to rehydrate ${storeName}:`, error)
        // Store continues with initial state
      }
    },
  }

  return create<T>()(
    devtools(
      persist(stateCreator, persistOptions),
      { 
        name: `${name}-store`,
        // Enable trace in development for better debugging
        trace: process.env.NODE_ENV === 'development'
      }
    )
  )
}

/**
 * Utility to clear all persisted stores
 * Now uses unified storage API
 */
export async function clearAllStores() {
  if (typeof window === 'undefined') return
  
  try {
    // Get all namespaces from unified storage
    const response = await fetch('/api/storage/namespaces')
    const namespaces: string[] = await response.json()
    
    // Clear each namespace
    for (const namespace of namespaces) {
      const items = await fetch(`/api/storage/items?namespace=${namespace}`).then(r => r.json())
      for (const item of items) {
        await fetch(`/api/storage/item/${namespace}/${item.key}`, { method: 'DELETE' })
      }
    }
  } catch (error) {
    console.error('Failed to clear stores:', error)
  }
}

/**
 * Utility to export all store data
 * Now uses unified storage API
 */
export async function exportAllStores(): Promise<Record<string, unknown>> {
  if (typeof window === 'undefined') return {}
  
  const data: Record<string, unknown> = {}
  
  try {
    // Get all items from unified storage
    const items = await fetch('/api/storage/items').then(r => r.json())
    
    for (const item of items) {
      const key = `${item.namespace}/${item.key}`
      data[key] = item.value
    }
  } catch (error) {
    console.error('Failed to export stores:', error)
  }
  
  return data
}

/**
 * Utility to import store data
 * Now uses unified storage API
 */
export async function importStores(data: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  
  for (const [path, value] of Object.entries(data)) {
    const [namespace, ...keyParts] = path.split('/')
    const key = keyParts.join('/')
    
    if (namespace && key) {
      try {
        await fetch(`/api/storage/item/${namespace}/${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value })
        })
      } catch (error) {
        console.error(`Failed to import ${path}:`, error)
      }
    }
  }
  
  // Trigger a page reload to rehydrate stores
  window.location.reload()
}