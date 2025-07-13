import type { Database } from 'better-sqlite3'

export const up = (db: Database) => {
  // Create saved_workflows table
  db.exec(`
    CREATE TABLE IF NOT EXISTS saved_workflows (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      definition TEXT NOT NULL,
      created_by TEXT DEFAULT 'system',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      version INTEGER DEFAULT 1,
      tags TEXT DEFAULT '[]',
      is_template INTEGER DEFAULT 0,
      source TEXT DEFAULT 'ui',
      scope TEXT DEFAULT 'project'
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_saved_workflows_project ON saved_workflows(project_id);
    CREATE INDEX IF NOT EXISTS idx_saved_workflows_scope ON saved_workflows(scope);
    CREATE INDEX IF NOT EXISTS idx_saved_workflows_updated ON saved_workflows(updated_at);
    CREATE INDEX IF NOT EXISTS idx_saved_workflows_template ON saved_workflows(is_template);
  `)

  console.log('✅ Created saved_workflows table')
}
