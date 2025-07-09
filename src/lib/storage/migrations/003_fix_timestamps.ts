import type { Database } from 'better-sqlite3'

interface Migration {
  name: string
  up: (db: Database) => void
  down: (db: Database) => void
}

export const migration: Migration = {
  name: '003_fix_timestamps',
  up: (db: Database) => {
    // First, create temporary columns with proper integer timestamps
    db.exec(`
      ALTER TABLE projects ADD COLUMN created_at_new INTEGER;
      ALTER TABLE projects ADD COLUMN updated_at_new INTEGER;
      ALTER TABLE projects ADD COLUMN last_activity_at_new INTEGER;
    `)

    // Convert string timestamps to Unix timestamps (milliseconds)
    db.exec(`
      UPDATE projects 
      SET 
        created_at_new = CASE 
          WHEN created_at IS NOT NULL AND created_at != '' 
          THEN CAST(strftime('%s', created_at) AS INTEGER) * 1000
          ELSE CAST(strftime('%s', 'now') AS INTEGER) * 1000
        END,
        updated_at_new = CASE 
          WHEN updated_at IS NOT NULL AND updated_at != '' 
          THEN CAST(strftime('%s', updated_at) AS INTEGER) * 1000
          ELSE CAST(strftime('%s', 'now') AS INTEGER) * 1000
        END,
        last_activity_at_new = CASE 
          WHEN last_activity_at IS NOT NULL AND last_activity_at != '' 
          THEN CAST(strftime('%s', last_activity_at) AS INTEGER) * 1000
          ELSE NULL
        END;
    `)

    // Drop old columns and rename new ones
    db.exec(`
      CREATE TABLE projects_new (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        workspace_path TEXT,
        settings TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_activity_at INTEGER
      );
      
      INSERT INTO projects_new (id, name, description, workspace_path, settings, created_at, updated_at, last_activity_at)
      SELECT id, name, description, workspace_path, settings, created_at_new, updated_at_new, last_activity_at_new
      FROM projects;
      
      DROP TABLE projects;
      ALTER TABLE projects_new RENAME TO projects;
    `)

    // Mark migration as complete
    db.prepare('INSERT OR IGNORE INTO migrations (name) VALUES (?)').run('003_fix_timestamps')
  },
  down: (_db: Database) => {
    console.warn('Rollback not implemented for this migration')
  },
}
