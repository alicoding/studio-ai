/**
 * Migration Example - How to migrate from localStorage to Unified Storage
 * 
 * KISS: Simple examples showing the migration pattern
 * DRY: Reusable migration utilities
 */

import { createStorage } from './UnifiedStorage'
import type { StorageConfig } from './types'

// Example 1: Migrate API Keys (HIGH PRIORITY - Security)
export async function migrateApiKeys() {
  // Create secure storage for API keys
  const apiKeyStorage = createStorage({
    namespace: 'api-keys',
    type: 'secret',
    encrypt: true // Always encrypted
  })
  
  // Read from localStorage (old way)
  const oldKeysJson = localStorage.getItem('claude-studio-api-keys')
  if (oldKeysJson) {
    try {
      const oldKeys = JSON.parse(oldKeysJson)
      
      // Migrate each key
      for (const [provider, key] of Object.entries(oldKeys)) {
        await apiKeyStorage.set(provider, key)
      }
      
      // Remove from localStorage after successful migration
      localStorage.removeItem('claude-studio-api-keys')
      console.log('✅ API keys migrated to secure storage')
    } catch (error) {
      console.error('Failed to migrate API keys:', error)
    }
  }
}

// Example 2: Migrate UI State (projects, agents, etc.)
export async function migrateUIState(storeName: string) {
  const storage = createStorage({
    namespace: storeName,
    type: 'state',
    sync: true // Enable sync between client/server
  })
  
  const oldKey = `claude-studio-${storeName}`
  const oldData = localStorage.getItem(oldKey)
  
  if (oldData) {
    try {
      const parsed = JSON.parse(oldData)
      
      // Handle Zustand persisted store format
      if (parsed.state) {
        await storage.set('state', parsed.state)
        await storage.setMetadata('state', {
          version: parsed.version || 1,
          migratedAt: new Date().toISOString()
        })
      }
      
      localStorage.removeItem(oldKey)
      console.log(`✅ ${storeName} migrated to unified storage`)
    } catch (error) {
      console.error(`Failed to migrate ${storeName}:`, error)
    }
  }
}

// Example 3: Migrate AI Sessions (can be large)
export async function migrateAISessions() {
  const storage = createStorage({
    namespace: 'ai-sessions',
    type: 'session',
    ttl: 30 * 24 * 60 * 60 // 30 days retention
  })
  
  const oldKey = 'claude-studio-ai-sessions'
  const oldData = localStorage.getItem(oldKey)
  
  if (oldData) {
    try {
      const sessions = JSON.parse(oldData)
      
      // Migrate each session with proper structure
      for (const [sessionId, sessionData] of Object.entries(sessions)) {
        await storage.set(sessionId, sessionData)
      }
      
      localStorage.removeItem(oldKey)
      console.log('✅ AI sessions migrated')
    } catch (error) {
      console.error('Failed to migrate AI sessions:', error)
    }
  }
}

// Example 4: How to use the new storage in components
export function useUnifiedStorage(config: StorageConfig) {
  const storage = createStorage(config)
  
  return {
    // Simple key-value operations
    get: async (key: string) => storage.get(key),
    set: async (key: string, value: unknown) => storage.set(key, value),
    delete: async (key: string) => storage.delete(key),
    
    // Advanced operations
    search: async (query: string) => storage.search(query),
    getAll: async () => {
      const keys = await storage.keys()
      return storage.getMany(keys)
    }
  }
}

// Example 5: Replace createPersistentStore with unified storage
export function createUnifiedStore<T>(namespace: string) {
  const storage = createStorage({
    namespace,
    type: 'state',
    sync: true
  })
  
  return {
    // Zustand-compatible interface
    getState: async () => {
      const state = await storage.get<T>('state')
      return state || {} as T
    },
    setState: async (newState: Partial<T>) => {
      const current = await storage.get<T>('state') || {} as T
      await storage.set('state', { ...current, ...newState })
    },
    subscribe: (_listener: (state: T) => void) => {
      // Implement subscription logic if needed
      // Could use WebSocket for real-time updates
      return () => {} // Return unsubscribe function
    }
  }
}

// Run all migrations
export async function runAllMigrations() {
  console.log('🚀 Starting storage migration...')
  
  await migrateApiKeys()
  await migrateUIState('projects')
  await migrateUIState('agents') 
  await migrateUIState('diagnostics')
  await migrateUIState('shortcuts')
  await migrateUIState('collapsible')
  await migrateAISessions()
  
  console.log('✅ Storage migration complete!')
}

// Usage in app initialization:
// import { runAllMigrations } from './lib/storage/migration-example'
// 
// // Run once on app start
// if (!localStorage.getItem('claude-studio-migrated-v2')) {
//   await runAllMigrations()
//   localStorage.setItem('claude-studio-migrated-v2', 'true')
// }