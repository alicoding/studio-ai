/**
 * Unified Storage Types
 * 
 * SOLID: Type definitions for storage abstraction
 * DRY: Single source of truth for storage types
 */

export type StorageType = 'config' | 'state' | 'secret' | 'cache' | 'session'
export type StorageBackend = 'memory' | 'sqlite' | 'file' | 'auto'

export interface StorageConfig {
  namespace: string
  type: StorageType
  backend?: StorageBackend
  encrypt?: boolean
  ttl?: number // Time to live in seconds
  sync?: boolean
  table?: string // SQLite table name
}

export interface StorageItem {
  key: string
  namespace: string
  type: StorageType
  value: unknown
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
  expiresAt?: Date
}

export interface StorageStats {
  namespace: string
  count: number
  sizeBytes: number
  lastAccessed?: Date
}

export interface StorageDriver {
  get<T = unknown>(key: string): Promise<T | null>
  set(key: string, value: unknown, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
  keys(): Promise<string[]>
  has(key: string): Promise<boolean>
}

export interface UnifiedStorage extends StorageDriver {
  namespace: string
  type: StorageType
  
  // Batch operations
  getMany<T = unknown>(keys: string[]): Promise<Record<string, T>>
  setMany(items: Record<string, unknown>): Promise<void>
  deleteMany(keys: string[]): Promise<void>
  
  // Search and query
  search(query: string): Promise<StorageItem[]>
  getByPrefix(prefix: string): Promise<StorageItem[]>
  
  // Metadata
  getStats(): Promise<StorageStats>
  getMetadata(key: string): Promise<Record<string, unknown> | null>
  setMetadata(key: string, metadata: Record<string, unknown>): Promise<void>
}