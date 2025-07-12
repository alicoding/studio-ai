/**
 * Add scope field to saved_workflows table
 *
 * SOLID: Single responsibility - adds workflow scope support
 * DRY: Reuses existing migration patterns
 * KISS: Simple ALTER TABLE to add one column
 * Library-First: Prepares for cross-project workflow support
 */

export const addWorkflowScope = `
-- Add scope field to support different workflow visibility levels
ALTER TABLE saved_workflows ADD COLUMN scope TEXT DEFAULT 'project' 
  CHECK(scope IN ('project', 'global', 'cross-project'));

-- Add index for efficient scope queries
CREATE INDEX idx_saved_workflows_scope ON saved_workflows(scope);

-- Make projectId optional for global workflows
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table
-- First, create temporary table with new schema
CREATE TABLE saved_workflows_new (
  id TEXT PRIMARY KEY,
  project_id TEXT, -- Now optional, no longer REFERENCES constraint
  name TEXT NOT NULL,
  description TEXT,
  definition TEXT NOT NULL,
  created_by TEXT DEFAULT 'system',
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now')),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch('now')),
  version INTEGER DEFAULT 1,
  tags TEXT DEFAULT '[]',
  is_template INTEGER DEFAULT 0,
  source TEXT CHECK(source IN ('ui', 'mcp', 'api')) DEFAULT 'ui',
  scope TEXT DEFAULT 'project' CHECK(scope IN ('project', 'global', 'cross-project')),
  -- Add constraint: project_id required for project scope
  CHECK(scope != 'project' OR project_id IS NOT NULL)
);

-- Copy existing data
INSERT INTO saved_workflows_new 
SELECT 
  id, 
  project_id,
  name,
  description,
  definition,
  created_by,
  created_at,
  updated_at,
  version,
  tags,
  is_template,
  source,
  'project' as scope -- Default existing workflows to project scope
FROM saved_workflows;

-- Drop old table and rename new one
DROP TABLE saved_workflows;
ALTER TABLE saved_workflows_new RENAME TO saved_workflows;

-- Recreate indexes
CREATE UNIQUE INDEX idx_saved_workflows_project_name ON saved_workflows(project_id, name) 
  WHERE scope = 'project';
CREATE INDEX idx_saved_workflows_is_template ON saved_workflows(is_template);
CREATE INDEX idx_saved_workflows_updated_at ON saved_workflows(updated_at);
CREATE INDEX idx_saved_workflows_scope ON saved_workflows(scope);
`
