-- Migration: Fix foreign key constraints for agent role assignments
-- SOLID: Single responsibility - fixing constraints
-- KISS: Simple solution - remove strict foreign key

-- Drop the existing table with foreign key constraint
DROP TABLE IF EXISTS agent_role_assignments;

-- Recreate without foreign key constraint to agent_configs
CREATE TABLE agent_role_assignments (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  role TEXT NOT NULL,
  agent_config_id TEXT, -- No foreign key constraint
  custom_tools TEXT, -- JSON array - tools specific to this assignment
  has_custom_tools INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Recreate indexes
CREATE INDEX idx_role_assignments_project ON agent_role_assignments(project_id);
CREATE INDEX idx_role_assignments_role ON agent_role_assignments(role);
CREATE INDEX idx_role_assignments_config ON agent_role_assignments(agent_config_id);
CREATE UNIQUE INDEX idx_role_assignments_project_role ON agent_role_assignments(project_id, role);