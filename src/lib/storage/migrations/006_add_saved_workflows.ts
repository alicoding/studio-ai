/**
 * Migration to add saved_workflows table
 * This table stores workflow definitions (not execution state)
 *
 * SOLID: Single table for workflow definitions
 * DRY: Follows existing migration patterns
 * KISS: Simple schema, no complex relationships
 * Library-First: Uses SQLite/better-sqlite3
 */

import type { Database } from 'better-sqlite3'

export const up = (db: Database) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS saved_workflows (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      definition TEXT NOT NULL, -- JSON string of WorkflowDefinition
      created_by TEXT DEFAULT 'system',
      created_at INTEGER NOT NULL DEFAULT (unixepoch('now')),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch('now')),
      version INTEGER DEFAULT 1,
      tags TEXT DEFAULT '[]', -- JSON array
      is_template INTEGER DEFAULT 0,
      source TEXT CHECK(source IN ('ui', 'mcp', 'api')) DEFAULT 'ui',
      UNIQUE(project_id, name)
    );
    
    CREATE INDEX IF NOT EXISTS idx_saved_workflows_project 
      ON saved_workflows(project_id);
    CREATE INDEX IF NOT EXISTS idx_saved_workflows_template 
      ON saved_workflows(is_template);
    CREATE INDEX IF NOT EXISTS idx_saved_workflows_created 
      ON saved_workflows(created_at DESC);
  `)
}

export const down = (db: Database) => {
  db.exec('DROP TABLE IF EXISTS saved_workflows')
}
