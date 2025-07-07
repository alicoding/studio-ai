/**
 * Client Storage Service - Browser-safe storage API
 *
 * SOLID: Client-side API that mirrors server storage
 * DRY: Same interface as server UnifiedStorage
 * KISS: Simple HTTP calls to server
 * Library-First: Uses ky for HTTP
 */

import ky from 'ky'
import type { StorageConfig, StorageItem } from './types'

export class ClientStorage {
  private baseURL = '/api/storage'
  private namespace: string
  private type: StorageConfig['type']

  constructor(config: StorageConfig) {
    this.namespace = config.namespace
    this.type = config.type
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const response = await ky
        .get(`${this.baseURL}/item/${this.namespace}/${key}`)
        .json<{ value: T }>()
      return response.value
    } catch (error) {
      if (error instanceof Error && 'response' in error) {
        const httpError = error as { response?: { status?: number } }
        if (httpError.response?.status === 404) {
          return null
        }
      }
      throw error
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    await ky.post(`${this.baseURL}/item/${this.namespace}/${key}`, {
      json: {
        value,
        type: this.type,
        encrypt: this.type === 'secret',
        ttl,
      },
    })
  }

  async delete(key: string): Promise<void> {
    await ky.delete(`${this.baseURL}/item/${this.namespace}/${key}`)
  }

  async keys(): Promise<string[]> {
    const items = await this.getItems()
    return items.map((item) => item.key)
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key)
    return value !== null
  }

  async getItems(): Promise<StorageItem[]> {
    const response = await ky
      .get(`${this.baseURL}/items`, {
        searchParams: {
          namespace: this.namespace,
        },
      })
      .json<StorageItem[]>()
    return response
  }

  async search(query: string): Promise<StorageItem[]> {
    const response = await ky
      .get(`${this.baseURL}/items`, {
        searchParams: {
          namespace: this.namespace,
          search: query,
        },
      })
      .json<StorageItem[]>()
    return response
  }

  async clear(): Promise<void> {
    const keys = await this.keys()
    await Promise.all(keys.map((key) => this.delete(key)))
  }
}

/**
 * Factory function for client storage
 */
export function createClientStorage(config: StorageConfig): ClientStorage {
  return new ClientStorage(config)
}

/**
 * Get all namespaces
 */
export async function getStorageNamespaces(): Promise<string[]> {
  const response = await ky.get('/api/storage/namespaces').json<string[]>()
  return response
}

/**
 * Storage statistics type
 */
export interface StorageStats {
  totalItems: number
  totalSize: number
  namespaces: Record<
    string,
    {
      items: number
      size: number
    }
  >
}

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<StorageStats> {
  const response = await ky.get('/api/storage/stats').json<StorageStats>()
  return response
}

/**
 * Vacuum database
 */
export async function vacuumStorage() {
  await ky.post('/api/storage/vacuum')
}

/**
 * Backup database
 */
export async function backupStorage() {
  const response = await ky.post('/api/storage/backup').json<{ path: string }>()
  return response.path
}
