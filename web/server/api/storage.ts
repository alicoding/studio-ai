/**
 * Storage API - Server-side endpoints for unified storage
 * 
 * SOLID: Server handles all database operations
 * DRY: Single API for all storage needs
 * KISS: Simple REST endpoints
 */

import { Router } from 'express'
import { getDb } from '../../../src/lib/storage/database'
import { storage as storageTable } from '../../../src/lib/storage/schema'
import { eq, and, like } from 'drizzle-orm'
import { createStorage } from '../../../src/lib/storage/UnifiedStorage'
import type { StorageConfig } from '../../../src/lib/storage/types'

const router = Router()

// GET /api/storage/namespaces - Get all namespaces
router.get('/namespaces', async (req, res) => {
  try {
    const db = getDb()
    const rows = await db
      .selectDistinct({ namespace: storageTable.namespace })
      .from(storageTable)
    
    const namespaces = rows.map(r => r.namespace)
    res.json(namespaces)
  } catch (error) {
    console.error('Failed to get namespaces:', error)
    res.status(500).json({ error: 'Failed to get namespaces' })
  }
})

// GET /api/storage/items - Get storage items with filtering
router.get('/items', async (req, res) => {
  try {
    const { namespace, search, limit = 100 } = req.query
    const db = getDb()
    
    // Build query with filters
    let rows
    if (namespace && namespace !== 'all' && search) {
      rows = await db
        .select()
        .from(storageTable)
        .where(
          and(
            eq(storageTable.namespace, namespace as string),
            like(storageTable.value, `%${search}%`)
          )
        )
        .limit(Number(limit))
    } else if (namespace && namespace !== 'all') {
      rows = await db
        .select()
        .from(storageTable)
        .where(eq(storageTable.namespace, namespace as string))
        .limit(Number(limit))
    } else if (search) {
      rows = await db
        .select()
        .from(storageTable)
        .where(like(storageTable.value, `%${search}%`))
        .limit(Number(limit))
    } else {
      rows = await db
        .select()
        .from(storageTable)
        .limit(Number(limit))
    }
    
    // Transform rows to StorageItem format
    const items = rows.map(row => ({
      key: row.key,
      namespace: row.namespace,
      type: row.type,
      value: row.encrypted ? '<encrypted>' : JSON.parse(row.value),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      expiresAt: row.expiresAt
    }))
    
    res.json(items)
  } catch (error) {
    console.error('Failed to get storage items:', error)
    res.status(500).json({ error: 'Failed to get storage items' })
  }
})

// GET /api/storage/item/:namespace/:key - Get specific item
router.get('/item/:namespace/:key', async (req: any, res: any) => {
  try {
    const { namespace, key } = req.params
    const storage = createStorage({ 
      namespace, 
      type: 'state' as const
    })
    
    const value = await storage.get(key)
    if (value === null) {
      return res.status(404).json({ error: 'Item not found' })
    }
    
    res.json({ value })
  } catch (error) {
    console.error('Failed to get item:', error)
    res.status(500).json({ error: 'Failed to get item' })
  }
})

// POST /api/storage/item/:namespace/:key - Set item
router.post('/item/:namespace/:key', async (req: any, res: any) => {
  try {
    const { namespace, key } = req.params
    const { value, type = 'state', encrypt = false, ttl } = req.body
    
    const config: StorageConfig = {
      namespace,
      type: type as any,
      encrypt
    }
    
    const storage = createStorage(config)
    await storage.set(key, value, ttl)
    
    res.json({ success: true })
  } catch (error) {
    console.error('Failed to set item:', error)
    res.status(500).json({ error: 'Failed to set item' })
  }
})

// DELETE /api/storage/item/:namespace/:key - Delete item
router.delete('/item/:namespace/:key', async (req: any, res: any) => {
  try {
    const { namespace, key } = req.params
    const db = getDb()
    
    await db
      .delete(storageTable)
      .where(
        and(
          eq(storageTable.key, key),
          eq(storageTable.namespace, namespace)
        )
      )
    
    res.json({ success: true })
  } catch (error) {
    console.error('Failed to delete item:', error)
    res.status(500).json({ error: 'Failed to delete item' })
  }
})

// GET /api/storage/stats - Get storage statistics
router.get('/stats', async (req, res) => {
  try {
    const db = getDb()
    
    const stats = await db
      .select({
        namespace: storageTable.namespace,
        count: storageTable.id,
        totalSize: storageTable.value
      })
      .from(storageTable)
    
    // Aggregate stats by namespace
    const byNamespace: Record<string, { count: number; size: number }> = {}
    let totalRecords = 0
    let totalSize = 0
    
    stats.forEach(row => {
      if (!byNamespace[row.namespace]) {
        byNamespace[row.namespace] = { count: 0, size: 0 }
      }
      byNamespace[row.namespace].count++
      byNamespace[row.namespace].size += row.totalSize.length
      totalRecords++
      totalSize += row.totalSize.length
    })
    
    res.json({
      total_records: totalRecords,
      total_size: totalSize,
      namespaces: Object.keys(byNamespace).length,
      byNamespace: Object.entries(byNamespace).map(([namespace, stats]) => ({
        namespace,
        count: stats.count,
        size: stats.size
      }))
    })
  } catch (error) {
    console.error('Failed to get stats:', error)
    res.status(500).json({ error: 'Failed to get stats' })
  }
})

// POST /api/storage/vacuum - Optimize database
router.post('/vacuum', async (req, res) => {
  try {
    const { vacuumDb } = await import('../../../src/lib/storage/database')
    vacuumDb()
    res.json({ success: true, message: 'Database optimized' })
  } catch (error) {
    console.error('Failed to vacuum database:', error)
    res.status(500).json({ error: 'Failed to vacuum database' })
  }
})

// POST /api/storage/backup - Backup database
router.post('/backup', async (req, res) => {
  try {
    const { backupDb } = await import('../../../src/lib/storage/database')
    const backupPath = backupDb()
    res.json({ success: true, path: backupPath })
  } catch (error) {
    console.error('Failed to backup database:', error)
    res.status(500).json({ error: 'Failed to backup database' })
  }
})

export default router