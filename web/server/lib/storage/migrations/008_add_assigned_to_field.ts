/**
 * Migration: Add assigned_to field to workflow_approvals table
 *
 * Adds assigned_to field to track who is assigned to handle the approval
 * (different from resolved_by which tracks who actually decided)
 */

import { Database } from 'better-sqlite3'

export function up(db: Database): void {
  // Add assigned_to column to workflow_approvals table
  db.exec(`
    ALTER TABLE workflow_approvals 
    ADD COLUMN assigned_to TEXT
  `)

  // Add index for assigned_to for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_workflow_approvals_assigned_to 
    ON workflow_approvals(assigned_to)
  `)

  console.log('✅ Added assigned_to field to workflow_approvals table')
}

export function down(db: Database): void {
  // Remove the index first
  db.exec('DROP INDEX IF EXISTS idx_workflow_approvals_assigned_to')

  // Remove the column (SQLite doesn't support DROP COLUMN directly)
  // We'd need to recreate the table, but for now we'll just note this
  console.log('⚠️  Cannot remove assigned_to column - SQLite limitation')
  console.log('✅ Removed assigned_to index from workflow_approvals table')
}
