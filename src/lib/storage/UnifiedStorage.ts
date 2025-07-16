/**
 * Unified Storage Service
 *
 * SOLID: Single interface for all storage needs
 * DRY: One implementation for all storage operations
 * KISS: Simple API that works everywhere
 * Library-First: Built on SQLite and unstorage
 */

import { getDb } from './database'
import { storage as storageTable } from './schema'
import { eq, and, like, desc } from 'drizzle-orm'
import type {
  StorageConfig,
  UnifiedStorage as IUnifiedStorage,
  StorageItem,
  StorageStats,
  StorageType,
} from './types'
import * as crypto from 'crypto'

// Encryption key management (required for production)
const ENCRYPTION_KEY = process.env.STUDIO_AI_ENCRYPTION_KEY
if (!ENCRYPTION_KEY) {
  throw new Error('STUDIO_AI_ENCRYPTION_KEY environment variable is required')
}

// Type assertion since we've checked for existence above
const encryptionKey: string = ENCRYPTION_KEY

export class UnifiedStorage implements IUnifiedStorage {
  private db = getDb()
  public readonly namespace: string
  public readonly type: StorageConfig['type']
  private readonly config: StorageConfig

  constructor(config: StorageConfig) {
    this.config = config
    this.namespace = config.namespace
    this.type = config.type
  }

  /**
   * Get a value by key
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const [row] = await this.db
        .select()
        .from(storageTable)
        .where(and(eq(storageTable.key, key), eq(storageTable.namespace, this.namespace)))
        .limit(1)

      if (!row) return null

      // Check expiration
      if (row.expiresAt && row.expiresAt < new Date()) {
        await this.delete(key)
        return null
      }

      // Update accessed time
      await this.db
        .update(storageTable)
        .set({ accessedAt: new Date() })
        .where(and(eq(storageTable.key, key), eq(storageTable.namespace, this.namespace)))

      // Decrypt if needed
      let value = row.value
      if (row.encrypted && this.config.encrypt) {
        value = this.decrypt(value)
      }

      return JSON.parse(value) as T
    } catch (error) {
      console.error(`Storage get error for ${this.namespace}/${key}:`, error)
      return null
    }
  }

  /**
   * Set a value by key
   */
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    try {
      const now = new Date()
      const expiresAt = ttl ? new Date(now.getTime() + ttl * 1000) : undefined

      // Serialize value
      let serialized = JSON.stringify(value)
      let encrypted = false

      // Encrypt if needed
      if (this.config.encrypt || this.type === 'secret') {
        serialized = this.encrypt(serialized)
        encrypted = true
      }

      // Upsert into database
      const existing = await this.get(key)

      if (existing !== null) {
        await this.db
          .update(storageTable)
          .set({
            value: serialized,
            encrypted,
            updatedAt: now,
            expiresAt,
            metadata: JSON.stringify(this.getValueMetadata(value)),
          })
          .where(and(eq(storageTable.key, key), eq(storageTable.namespace, this.namespace)))
      } else {
        await this.db.insert(storageTable).values({
          key,
          namespace: this.namespace,
          type: this.type,
          value: serialized,
          encrypted,
          createdAt: now,
          updatedAt: now,
          expiresAt,
          metadata: JSON.stringify(this.getValueMetadata(value)),
        })
      }

      // Update stats
      await this.updateStats('write')
    } catch (error) {
      console.error(`Storage set error for ${this.namespace}/${key}:`, error)
      throw error
    }
  }

  /**
   * Delete a value by key
   */
  async delete(key: string): Promise<void> {
    try {
      await this.db
        .delete(storageTable)
        .where(and(eq(storageTable.key, key), eq(storageTable.namespace, this.namespace)))

      await this.updateStats('delete')
    } catch (error) {
      console.error(`Storage delete error for ${this.namespace}/${key}:`, error)
      throw error
    }
  }

  /**
   * Clear all values in this namespace
   */
  async clear(): Promise<void> {
    try {
      await this.db.delete(storageTable).where(eq(storageTable.namespace, this.namespace))
    } catch (error) {
      console.error(`Storage clear error for ${this.namespace}:`, error)
      throw error
    }
  }

  /**
   * Get all keys in this namespace
   */
  async keys(): Promise<string[]> {
    try {
      const rows = await this.db
        .select({ key: storageTable.key })
        .from(storageTable)
        .where(eq(storageTable.namespace, this.namespace))

      return rows.map((row) => row.key)
    } catch (error) {
      console.error(`Storage keys error for ${this.namespace}:`, error)
      return []
    }
  }

  /**
   * Check if a key exists
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key)
    return value !== null
  }

  /**
   * Get multiple values
   */
  async getMany<T = unknown>(keys: string[]): Promise<Record<string, T>> {
    const result: Record<string, T> = {}

    for (const key of keys) {
      const value = await this.get<T>(key)
      if (value !== null) {
        result[key] = value
      }
    }

    return result
  }

  /**
   * Set multiple values
   */
  async setMany(items: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(items)) {
      await this.set(key, value)
    }
  }

  /**
   * Delete multiple values
   */
  async deleteMany(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.delete(key)
    }
  }

  /**
   * Search for items by query
   */
  async search(query: string): Promise<StorageItem[]> {
    try {
      const rows = await this.db
        .select()
        .from(storageTable)
        .where(
          and(eq(storageTable.namespace, this.namespace), like(storageTable.value, `%${query}%`))
        )
        .orderBy(desc(storageTable.updatedAt))
        .limit(100)

      return rows.map((row) => this.rowToStorageItem(row))
    } catch (error) {
      console.error(`Storage search error for ${this.namespace}:`, error)
      return []
    }
  }

  /**
   * Get items by key prefix
   */
  async getByPrefix(prefix: string): Promise<StorageItem[]> {
    try {
      const rows = await this.db
        .select()
        .from(storageTable)
        .where(
          and(eq(storageTable.namespace, this.namespace), like(storageTable.key, `${prefix}%`))
        )
        .orderBy(desc(storageTable.updatedAt))

      return rows.map((row) => this.rowToStorageItem(row))
    } catch (error) {
      console.error(`Storage getByPrefix error for ${this.namespace}:`, error)
      return []
    }
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<StorageStats> {
    try {
      const stats = await this.db
        .select({
          count: storageTable.id,
          totalSize: storageTable.value,
        })
        .from(storageTable)
        .where(eq(storageTable.namespace, this.namespace))

      const count = stats.length
      const sizeBytes = stats.reduce((sum, row) => sum + row.totalSize.length, 0)

      return {
        namespace: this.namespace,
        count,
        sizeBytes,
        lastAccessed: new Date(),
      }
    } catch (error) {
      console.error(`Storage getStats error for ${this.namespace}:`, error)
      return {
        namespace: this.namespace,
        count: 0,
        sizeBytes: 0,
      }
    }
  }

  /**
   * Get metadata for a key
   */
  async getMetadata(key: string): Promise<Record<string, unknown> | null> {
    try {
      const [row] = await this.db
        .select({ metadata: storageTable.metadata })
        .from(storageTable)
        .where(and(eq(storageTable.key, key), eq(storageTable.namespace, this.namespace)))
        .limit(1)

      if (!row || !row.metadata) return null

      return JSON.parse(row.metadata)
    } catch (error) {
      console.error(`Storage getMetadata error for ${this.namespace}/${key}:`, error)
      return null
    }
  }

  /**
   * Set metadata for a key
   */
  async setMetadata(key: string, metadata: Record<string, unknown>): Promise<void> {
    try {
      await this.db
        .update(storageTable)
        .set({
          metadata: JSON.stringify(metadata),
          updatedAt: new Date(),
        })
        .where(and(eq(storageTable.key, key), eq(storageTable.namespace, this.namespace)))
    } catch (error) {
      console.error(`Storage setMetadata error for ${this.namespace}/${key}:`, error)
      throw error
    }
  }

  // Helper methods

  private encrypt(value: string): string {
    const algorithm = 'aes-256-cbc'
    const key = crypto.scryptSync(encryptionKey, 'salt', 32)
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(algorithm, key, iv)
    let encrypted = cipher.update(value, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return iv.toString('hex') + ':' + encrypted
  }

  private decrypt(value: string): string {
    const algorithm = 'aes-256-cbc'
    const key = crypto.scryptSync(encryptionKey, 'salt', 32)
    const [ivHex, encrypted] = value.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipheriv(algorithm, key, iv)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  private getValueMetadata(value: unknown): Record<string, unknown> {
    return {
      type: typeof value,
      size: JSON.stringify(value).length,
      isArray: Array.isArray(value),
      isObject: typeof value === 'object' && value !== null && !Array.isArray(value),
    }
  }

  private rowToStorageItem(row: typeof storageTable.$inferSelect): StorageItem {
    return {
      key: row.key,
      namespace: row.namespace,
      type: row.type as StorageType,
      value: row.encrypted ? '<encrypted>' : JSON.parse(row.value),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      expiresAt: row.expiresAt || undefined,
    }
  }

  private async updateStats(_operation: 'read' | 'write' | 'delete') {
    // Update storage stats for monitoring
    // Implementation depends on requirements
  }
}

/**
 * Factory function to create storage instances
 */
export function createStorage(config: StorageConfig): UnifiedStorage {
  return new UnifiedStorage(config)
}
