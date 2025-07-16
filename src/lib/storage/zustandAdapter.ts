/**
 * Zustand Storage Adapter - Bridge between Zustand and Unified Storage
 * 
 * SOLID: Single adapter for all Zustand stores
 * DRY: One storage implementation for everything
 * KISS: Simple adapter pattern
 * Library-First: Extends Zustand's storage interface
 */

import type { PersistStorage, StorageValue } from 'zustand/middleware'
import { createClientStorage } from './client'

/**
 * Creates a Zustand storage adapter that uses our unified storage with localStorage fallback
 * This replaces the default localStorage with our SQLite backend when available
 */
export function createUnifiedStorageAdapter<T>(): PersistStorage<T> {
  return {
    getItem: async (name: string): Promise<StorageValue<T> | null> => {
      try {
        // Extract namespace from the store name (e.g., "studio-ai-projects")
        const parts = name.split('-')
        const namespace = parts.slice(2).join('-') || 'default'
        
        const storage = createClientStorage({
          namespace,
          type: 'state'
        })
        
        // Get the persisted value
        const value = await storage.get<StorageValue<T>>(name)
        console.log(`[Storage] Loaded ${name}:`, value)
        return value
      } catch (error) {
        console.error(`Failed to get ${name} from unified storage:`, error)
        return null
      }
    },
    
    setItem: async (name: string, value: StorageValue<T>): Promise<void> => {
      try {
        // Extract namespace from the store name
        const parts = name.split('-')
        const namespace = parts.slice(2).join('-') || 'default'
        
        const storage = createClientStorage({
          namespace,
          type: 'state'
        })
        
        // Store the entire StorageValue object
        await storage.set(name, value)
      } catch (error) {
        console.error(`Failed to set ${name} in unified storage:`, error)
      }
    },
    
    removeItem: async (name: string): Promise<void> => {
      try {
        // Extract namespace from the store name
        const parts = name.split('-')
        const namespace = parts.slice(2).join('-') || 'default'
        
        const storage = createClientStorage({
          namespace,
          type: 'state'
        })
        
        await storage.delete(name)
      } catch (error) {
        console.error(`Failed to remove ${name} from unified storage:`, error)
      }
    }
  }
}

/**
 * Migration helper - checks if data exists in localStorage
 * and needs to be migrated to unified storage
 */
export async function migrateZustandStore(storeName: string) {
  const localStorageKey = `studio-ai-${storeName}`
  const localData = localStorage.getItem(localStorageKey)
  
  if (!localData) return false
  
  try {
    const storage = createClientStorage({
      namespace: storeName,
      type: 'state'
    })
    
    // Store the raw persisted data
    await storage.set(localStorageKey, localData)
    
    // Remove from localStorage after successful migration
    localStorage.removeItem(localStorageKey)
    
    console.log(`✅ Migrated ${storeName} to unified storage`)
    return true
  } catch (error) {
    console.error(`Failed to migrate ${storeName}:`, error)
    return false
  }
}