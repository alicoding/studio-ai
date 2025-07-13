/**
 * Migration to add project_claude_paths table
 * This table caches where Claude stores JSONL files for each project
 */

import type { Database } from 'better-sqlite3'

export const up = (db: Database) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS project_claude_paths (
      project_id TEXT PRIMARY KEY REFERENCES projects(id),
      claude_path TEXT NOT NULL,
      last_verified INTEGER NOT NULL DEFAULT (unixepoch('now')),
      created_at INTEGER NOT NULL DEFAULT (unixepoch('now')),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch('now'))
    )
  `)
}

export const down = (db: Database) => {
  db.exec('DROP TABLE IF EXISTS project_claude_paths')
}
