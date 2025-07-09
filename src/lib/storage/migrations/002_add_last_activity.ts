/**
 * Migration: Add lastActivityAt field to projects table
 *
 * SOLID: Single responsibility - one migration, one purpose
 * KISS: Simple SQL alteration
 */

import type { Database } from 'better-sqlite3'

interface Migration {
  name: string
  up: (db: Database) => void
  down: (_db: Database) => void
}

export const migration: Migration = {
  name: '002_add_last_activity',
  up: (db: Database) => {
    // Add lastActivityAt column to projects table
    db.exec(`
      ALTER TABLE projects 
      ADD COLUMN last_activity_at INTEGER;
    `)

    // Set initial value to updated_at for existing projects
    db.exec(`
      UPDATE projects 
      SET last_activity_at = updated_at 
      WHERE last_activity_at IS NULL;
    `)
  },
  down: (_db: Database) => {
    // SQLite doesn't support DROP COLUMN easily
    // Would need to recreate table without the column
    console.warn('Rollback not implemented for this migration')
  },
}
