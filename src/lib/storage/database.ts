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
    
    -- Agent Configurations table
    CREATE TABLE IF NOT EXISTS agent_configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      system_prompt TEXT NOT NULL,
      tools TEXT NOT NULL,
      model TEXT NOT NULL,
      max_tokens INTEGER DEFAULT 200000,
      temperature TEXT DEFAULT '0.7',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    
    -- Agent Role Assignments table
    CREATE TABLE IF NOT EXISTS agent_role_assignments (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id),
      role TEXT NOT NULL,
      agent_config_id TEXT,
      custom_name TEXT,
      custom_tools TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    
    -- Team Templates table
    CREATE TABLE IF NOT EXISTS team_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      agents TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_storage_namespace ON storage(namespace);
    CREATE INDEX IF NOT EXISTS idx_storage_type ON storage(type);
    CREATE INDEX IF NOT EXISTS idx_storage_expires ON storage(expires_at);
    CREATE INDEX IF NOT EXISTS idx_storage_updated ON storage(updated_at);
    CREATE INDEX IF NOT EXISTS idx_agent_role_project ON agent_role_assignments(project_id, role);
  `)

  // Mark initial migration as complete
  sqliteInstance
    .prepare('INSERT OR IGNORE INTO migrations (name) VALUES (?)')
    .run('001_initial_schema')

  // Run any pending migrations
  runMigrations()
}

/**
 * Run pending database migrations
 */
function runMigrations() {
  if (!sqliteInstance) return

  // Check if we need to add lastActivityAt
  const hasLastActivity = sqliteInstance
    .prepare(
      `
    SELECT COUNT(*) as count 
    FROM pragma_table_info('projects') 
    WHERE name = 'last_activity_at'
  `
    )
    .get() as { count: number }

  if (hasLastActivity.count === 0) {
    // Run the migration
    sqliteInstance.exec(`
      ALTER TABLE projects 
      ADD COLUMN last_activity_at INTEGER;
    `)

    // Set initial value to updated_at for existing projects
    sqliteInstance.exec(`
      UPDATE projects 
      SET last_activity_at = updated_at 
      WHERE last_activity_at IS NULL;
    `)

    // Mark migration as complete
    sqliteInstance
      .prepare('INSERT OR IGNORE INTO migrations (name) VALUES (?)')
      .run('002_add_last_activity')
  }

  // Check if we need to fix timestamp formats
  const needsTimestampFix = sqliteInstance
    .prepare(
      `
    SELECT COUNT(*) as count 
    FROM projects 
    WHERE typeof(created_at) = 'text'
  `
    )
    .get() as { count: number }

  if (needsTimestampFix.count > 0) {
    // Import and run the timestamp fix migration
    import('./migrations/003_fix_timestamps')
      .then(({ migration }) => {
        try {
          migration.up(sqliteInstance!)
        } catch (error: unknown) {
          // Check if it's just a duplicate column error (migration already partially ran)
          const errorMessage = error instanceof Error ? error.message : String(error)
          if (!errorMessage.includes('duplicate column name')) {
            console.error('Failed to run timestamp fix migration:', error)
          }
        }
      })
      .catch((error) => {
        console.error('Failed to import timestamp fix migration:', error)
      })
  }

  // Check if we need to add project_claude_paths table
  const hasProjectClaudePaths = sqliteInstance
    .prepare(
      `
    SELECT COUNT(*) as count 
    FROM sqlite_master 
    WHERE type='table' AND name='project_claude_paths'
  `
    )
    .get() as { count: number }

  if (hasProjectClaudePaths.count === 0) {
    // Import and run the project claude paths migration
    import('./migrations/004_add_project_claude_paths')
      .then((module) => {
        module.up(sqliteInstance!)
        console.log('✅ Added project_claude_paths table')
      })
      .catch((error) => {
        console.error('Failed to run project_claude_paths migration:', error)
      })
  }

  // Check if we need to run tool permissions migration
  const hasToolPermissionsMigration = sqliteInstance
    .prepare(
      `
    SELECT COUNT(*) as count 
    FROM migrations 
    WHERE name = '005_ensure_tool_permissions'
  `
    )
    .get() as { count: number }

  if (hasToolPermissionsMigration.count === 0) {
    // Import and run the tool permissions migration
    import('./migrations/005_ensure_tool_permissions')
      .then((module) => {
        module.up(sqliteInstance!)

        // Mark migration as complete
        sqliteInstance!
          .prepare('INSERT OR IGNORE INTO migrations (name) VALUES (?)')
          .run('005_ensure_tool_permissions')

        console.log('✅ Ensured agent tool permissions migration completed')
      })
      .catch((error) => {
        console.error('Failed to run tool permissions migration:', error)
      })
  }

  // Check if we need to run saved workflows migration
  const hasSavedWorkflowsMigration = sqliteInstance
    .prepare(
      `
    SELECT COUNT(*) as count 
    FROM migrations 
    WHERE name = '006_add_saved_workflows'
  `
    )
    .get() as { count: number }

  if (hasSavedWorkflowsMigration.count === 0) {
    // Import and run the saved workflows migration
    import('./migrations/006_add_saved_workflows')
      .then((module) => {
        module.up(sqliteInstance!)

        // Mark migration as complete
        sqliteInstance!
          .prepare('INSERT OR IGNORE INTO migrations (name) VALUES (?)')
          .run('006_add_saved_workflows')

        console.log('✅ Added saved_workflows table for workflow storage')
      })
      .catch((error) => {
        console.error('Failed to run saved workflows migration:', error)
      })
  }

  // Check if we need to run workflow scope migration
  const hasWorkflowScopeMigration = sqliteInstance
    .prepare(
      `
    SELECT COUNT(*) as count 
    FROM migrations 
    WHERE name = '007_add_workflow_scope'
  `
    )
    .get() as { count: number }

  if (hasWorkflowScopeMigration.count === 0) {
    // Check if saved_workflows table exists first
    const hasSavedWorkflowsTable = sqliteInstance
      .prepare(
        `
      SELECT COUNT(*) as count 
      FROM sqlite_master 
      WHERE type='table' AND name='saved_workflows'
    `
      )
      .get() as { count: number }

    if (hasSavedWorkflowsTable.count > 0) {
      // Import and run the workflow scope migration
      import('./migrations/007_add_workflow_scope')
        .then((module) => {
          sqliteInstance!.exec(module.addWorkflowScope)

          // Mark migration as complete
          sqliteInstance!
            .prepare('INSERT OR IGNORE INTO migrations (name) VALUES (?)')
            .run('007_add_workflow_scope')

          console.log('✅ Added scope field to saved_workflows for flexible workflow support')
        })
        .catch((error) => {
          console.error('Failed to run workflow scope migration:', error)
        })
    }
  }
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

  const stats = sqliteInstance
    .prepare(
      `
    SELECT 
      COUNT(*) as total_records,
      SUM(LENGTH(value)) as total_size,
      COUNT(DISTINCT namespace) as namespaces
    FROM storage
  `
    )
    .get() as { total_records: number; total_size: number; namespaces: number }

  const namespaceStats = sqliteInstance
    .prepare(
      `
    SELECT 
      namespace,
      COUNT(*) as count,
      SUM(LENGTH(value)) as size
    FROM storage
    GROUP BY namespace
  `
    )
    .all() as Array<{ namespace: string; count: number; size: number }>

  return {
    ...stats,
    byNamespace: namespaceStats,
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
  sqliteInstance
    .backup(destination)
    .then(() => {
      console.log(`Database backed up to ${destination}`)
    })
    .catch((error) => {
      console.error('Backup failed:', error)
      throw error
    })

  return destination
}
