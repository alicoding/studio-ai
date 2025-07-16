/**
 * Migration 009: Add interaction_type column to workflow_approvals table
 *
 * SOLID: Single responsibility - adds interaction type support
 * DRY: Follows existing migration pattern
 * KISS: Simple ALTER TABLE statement
 * Library-First: Uses standard SQLite ALTER TABLE syntax
 */

import type { Database } from 'better-sqlite3'

export function up(db: Database): void {
  // Add interaction_type column with default value 'approval'
  db.exec(`
    ALTER TABLE workflow_approvals 
    ADD COLUMN interaction_type TEXT NOT NULL DEFAULT 'approval'
  `)

  // Create index for efficient querying by interaction type
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_workflow_approvals_interaction_type 
    ON workflow_approvals(interaction_type)
  `)

  console.log('✅ Added interaction_type column to workflow_approvals table')
}

export function down(db: Database): void {
  // Drop the index first
  db.exec(`DROP INDEX IF EXISTS idx_workflow_approvals_interaction_type`)

  // SQLite doesn't support DROP COLUMN directly, so we'd need to recreate the table
  // For now, we'll leave the column (it's backwards compatible)
  console.log(
    '⚠️  Note: SQLite does not support DROP COLUMN. interaction_type column remains but is unused.'
  )
}
