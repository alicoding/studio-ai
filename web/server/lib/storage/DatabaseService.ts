/**
 * Database Service - Simple wrapper around better-sqlite3
 *
 * SOLID: Single responsibility - database connection management
 * DRY: Centralized database access for server-side services
 * KISS: Simple wrapper without overengineering
 * Library-First: Uses existing better-sqlite3 infrastructure
 */

import Database from 'better-sqlite3'
import path from 'path'
import os from 'os'
import fs from 'fs'

// SQLite pragma result types
interface ColumnInfo {
  cid: number
  name: string
  type: string
  notnull: number
  dflt_value: string | null
  pk: number
}

// Database configuration
const STORAGE_DIR = path.join(os.homedir(), '.claude-studio')
const DB_PATH = path.join(STORAGE_DIR, 'studio.db')

export class DatabaseService {
  private static instance: DatabaseService
  private db: Database.Database

  private constructor() {
    this.ensureStorageDir()
    this.db = new Database(DB_PATH)

    // Enable WAL mode for better performance
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('synchronous = NORMAL')
    this.db.pragma('foreign_keys = ON')

    this.runMigrations()
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  public prepare(sql: string) {
    return this.db.prepare(sql)
  }

  public transaction(fn: () => void) {
    return this.db.transaction(fn)
  }

  public close() {
    this.db.close()
  }

  private ensureStorageDir() {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true })
    }
  }

  private runMigrations() {
    // Check if migrations table exists
    const migrationTableExists = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'")
      .get()

    if (!migrationTableExists) {
      this.db.exec(`
        CREATE TABLE migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          filename TEXT UNIQUE NOT NULL,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
    } else {
      // Check if filename column exists, add it if missing
      const columns = this.db.pragma('table_info(migrations)') as ColumnInfo[]
      const hasFilenameColumn = columns.some((col: ColumnInfo) => col.name === 'filename')

      if (!hasFilenameColumn) {
        this.db.exec('ALTER TABLE migrations ADD COLUMN filename TEXT')
      }
    }

    // Run the approval system migration directly
    const approvalMigrationName = '007_create_workflow_approvals.ts'
    const appliedMigrations = this.db
      .prepare('SELECT filename FROM migrations WHERE filename = ?')
      .get(approvalMigrationName) as { filename: string } | undefined

    if (!appliedMigrations) {
      console.log(`Running migration: ${approvalMigrationName}`)

      try {
        // Run approval tables migration directly
        this.createApprovalTables()

        // Record migration as applied
        this.db.prepare('INSERT INTO migrations (name) VALUES (?)').run(approvalMigrationName)

        console.log(`✅ Migration ${approvalMigrationName} applied successfully`)
      } catch (error) {
        console.error(`❌ Failed to run migration ${approvalMigrationName}:`, error)
      }
    }
  }

  private createApprovalTables() {
    // Create workflow_approvals table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workflow_approvals (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        thread_id TEXT NOT NULL,
        step_id TEXT NOT NULL,
        project_id TEXT,
        workflow_name TEXT,
        
        -- Approval content
        prompt TEXT NOT NULL,
        context_data TEXT, -- JSON blob with workflow context
        risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
        
        -- Timing and timeout
        requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        timeout_seconds INTEGER NOT NULL DEFAULT 3600,
        expires_at DATETIME NOT NULL,
        
        -- Status and resolution
        status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled')) DEFAULT 'pending',
        resolved_at DATETIME,
        resolved_by TEXT, -- User ID who made the decision
        
        -- Approval configuration
        approval_required BOOLEAN NOT NULL DEFAULT 1,
        auto_approve_after_timeout BOOLEAN DEFAULT 0,
        escalation_user_id TEXT,
        
        -- Metadata
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_workflow_approvals_thread_id ON workflow_approvals(thread_id);
      CREATE INDEX IF NOT EXISTS idx_workflow_approvals_project_id ON workflow_approvals(project_id);
      CREATE INDEX IF NOT EXISTS idx_workflow_approvals_status ON workflow_approvals(status);
      CREATE INDEX IF NOT EXISTS idx_workflow_approvals_expires_at ON workflow_approvals(expires_at);
      CREATE INDEX IF NOT EXISTS idx_workflow_approvals_requested_at ON workflow_approvals(requested_at);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_approvals_thread_step ON workflow_approvals(thread_id, step_id);
    `)

    // Create approval_decisions table for audit trail
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS approval_decisions (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        approval_id TEXT NOT NULL,
        
        -- Decision details
        decision TEXT CHECK (decision IN ('approved', 'rejected')) NOT NULL,
        comment TEXT,
        reasoning TEXT,
        confidence_level INTEGER CHECK (confidence_level BETWEEN 1 AND 5),
        
        -- Decision maker
        decided_by TEXT NOT NULL, -- User ID
        decided_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        -- Context at time of decision
        workflow_state TEXT, -- JSON snapshot of workflow state
        user_agent TEXT,
        ip_address TEXT,
        
        -- Metadata
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (approval_id) REFERENCES workflow_approvals(id) ON DELETE CASCADE
      )
    `)

    // Create approval_notifications table for notification tracking
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS approval_notifications (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        approval_id TEXT NOT NULL,
        
        -- Notification details
        channel_type TEXT CHECK (channel_type IN ('websocket', 'email', 'slack', 'sms', 'webhook', 'push')) NOT NULL,
        recipient TEXT NOT NULL, -- Email, user ID, phone number, etc.
        subject TEXT,
        message TEXT,
        
        -- Delivery tracking
        status TEXT CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')) DEFAULT 'pending',
        sent_at DATETIME,
        delivered_at DATETIME,
        failed_at DATETIME,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        
        -- Metadata
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (approval_id) REFERENCES workflow_approvals(id) ON DELETE CASCADE
      )
    `)

    // Create indexes for other tables
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_approval_decisions_approval_id ON approval_decisions(approval_id);
      CREATE INDEX IF NOT EXISTS idx_approval_decisions_decided_by ON approval_decisions(decided_by);
      CREATE INDEX IF NOT EXISTS idx_approval_decisions_decided_at ON approval_decisions(decided_at);
      
      CREATE INDEX IF NOT EXISTS idx_approval_notifications_approval_id ON approval_notifications(approval_id);
      CREATE INDEX IF NOT EXISTS idx_approval_notifications_status ON approval_notifications(status);
      CREATE INDEX IF NOT EXISTS idx_approval_notifications_channel_type ON approval_notifications(channel_type);
      CREATE INDEX IF NOT EXISTS idx_approval_notifications_recipient ON approval_notifications(recipient);
      CREATE INDEX IF NOT EXISTS idx_approval_notifications_created_at ON approval_notifications(created_at);
    `)

    // Create triggers to update updated_at timestamps
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_workflow_approvals_timestamp
      AFTER UPDATE ON workflow_approvals
      BEGIN
        UPDATE workflow_approvals SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `)

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_approval_notifications_timestamp
      AFTER UPDATE ON approval_notifications
      BEGIN
        UPDATE approval_notifications SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `)

    console.log('✅ Created workflow approval tables with indexes and triggers')
  }
}
