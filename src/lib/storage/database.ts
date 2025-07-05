/**
 * Database Connection and Initialization
 * 
 * SOLID: Single responsibility - database management
 * Library-First: Using better-sqlite3 and drizzle
 */

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'

// Database configuration
const STORAGE_DIR = path.join(os.homedir(), '.claude-studio')
const DB_PATH = path.join(STORAGE_DIR, 'studio.db')
const MIGRATIONS_PATH = path.join(STORAGE_DIR, 'migrations')

// Ensure storage directory exists
export function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true })
  }
  if (!fs.existsSync(MIGRATIONS_PATH)) {
    fs.mkdirSync(MIGRATIONS_PATH, { recursive: true })
  }
}

// Singleton database instance
let dbInstance: ReturnType<typeof drizzle> | null = null
let sqliteInstance: Database.Database | null = null

/**
 * Get or create database connection
 */
export function getDb() {
  if (!dbInstance) {
    ensureStorageDir()
    
    // Create SQLite connection
    sqliteInstance = new Database(DB_PATH)
    
    // Enable WAL mode for better performance
    sqliteInstance.pragma('journal_mode = WAL')
    sqliteInstance.pragma('synchronous = NORMAL')
    
    // Create Drizzle instance
    dbInstance = drizzle(sqliteInstance, { schema })
    
    // Run migrations
    initializeDatabase()
  }
  
  return dbInstance
}

/**
 * Initialize database with schema
 */
function initializeDatabase() {
  if (!sqliteInstance) return
  
  // Create tables
  sqliteInstance.exec(`
    -- Main storage table
    CREATE TABLE IF NOT EXISTS storage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL,
      namespace TEXT NOT NULL,
      type TEXT NOT NULL,
      value TEXT NOT NULL,
      encrypted INTEGER DEFAULT 0,
      metadata TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      expires_at INTEGER,
      accessed_at INTEGER,
      UNIQUE(key, namespace)
    );
    
    -- Projects table
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      workspace_path TEXT,
      settings TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    
    -- Agents table
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id),
      name TEXT NOT NULL,
      role TEXT,
      model TEXT,
      system_prompt TEXT,
      config TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    
    -- API Keys table
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL UNIQUE,
      encrypted_key TEXT NOT NULL,
      config TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    
    -- AI Sessions table
    CREATE TABLE IF NOT EXISTS ai_sessions (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id),
      agent_id TEXT REFERENCES agents(id),
      messages TEXT NOT NULL,
      metadata TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    
    -- Storage stats table
    CREATE TABLE IF NOT EXISTS storage_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      namespace TEXT NOT NULL,
      date TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      reads INTEGER NOT NULL DEFAULT 0,
      writes INTEGER NOT NULL DEFAULT 0,
      deletes INTEGER NOT NULL DEFAULT 0
    );
    
    -- Migrations table
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      executed_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_storage_namespace ON storage(namespace);
    CREATE INDEX IF NOT EXISTS idx_storage_type ON storage(type);
    CREATE INDEX IF NOT EXISTS idx_storage_expires ON storage(expires_at);
    CREATE INDEX IF NOT EXISTS idx_storage_updated ON storage(updated_at);
  `)
  
  // Mark initial migration as complete
  sqliteInstance.prepare(
    'INSERT OR IGNORE INTO migrations (name) VALUES (?)'
  ).run('001_initial_schema')
}

/**
 * Close database connection
 */
export function closeDb() {
  if (sqliteInstance) {
    sqliteInstance.close()
    sqliteInstance = null
    dbInstance = null
  }
}

/**
 * Get database stats
 */
export function getDbStats() {
  if (!sqliteInstance) return null
  
  const stats = sqliteInstance.prepare(`
    SELECT 
      COUNT(*) as total_records,
      SUM(LENGTH(value)) as total_size,
      COUNT(DISTINCT namespace) as namespaces
    FROM storage
  `).get() as { total_records: number; total_size: number; namespaces: number }
  
  const namespaceStats = sqliteInstance.prepare(`
    SELECT 
      namespace,
      COUNT(*) as count,
      SUM(LENGTH(value)) as size
    FROM storage
    GROUP BY namespace
  `).all() as Array<{ namespace: string; count: number; size: number }>
  
  return {
    ...stats,
    byNamespace: namespaceStats
  }
}

/**
 * Vacuum database (optimize storage)
 */
export function vacuumDb() {
  if (!sqliteInstance) return
  sqliteInstance.exec('VACUUM')
}

/**
 * Backup database
 */
export function backupDb(backupPath?: string) {
  if (!sqliteInstance) return
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const destination = backupPath || path.join(STORAGE_DIR, 'backups', `studio-${timestamp}.db`)
  
  // Ensure backup directory exists
  const backupDir = path.dirname(destination)
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }
  
  // Use SQLite's backup API
  sqliteInstance.backup(destination)
    .then(() => {
      console.log(`Database backed up to ${destination}`)
    })
    .catch((error) => {
      console.error('Backup failed:', error)
      throw error
    })
  
  return destination
}