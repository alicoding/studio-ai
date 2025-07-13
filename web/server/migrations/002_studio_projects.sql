-- Migration: Add Studio Projects tables
-- SOLID: Single responsibility - Studio project schema
-- DRY: Reuses existing patterns
-- KISS: Simple table structure

-- Agent Configurations table (for global agent templates)
CREATE TABLE IF NOT EXISTS agent_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  tools TEXT NOT NULL, -- JSON array
  model TEXT NOT NULL,
  max_tokens INTEGER DEFAULT 200000,
  temperature TEXT DEFAULT '0.7', -- Store as text for precision
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Agent Role Assignments table (which agent config is assigned to which role in a project)
CREATE TABLE IF NOT EXISTS agent_role_assignments (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  role TEXT NOT NULL,
  agent_config_id TEXT REFERENCES agent_configs(id),
  custom_tools TEXT, -- JSON array - tools specific to this assignment
  has_custom_tools INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Team Templates table
CREATE TABLE IF NOT EXISTS team_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  agent_roles TEXT NOT NULL, -- JSON object mapping role -> agentConfigId
  metadata TEXT, -- JSON
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_configs_role ON agent_configs(role);
CREATE INDEX IF NOT EXISTS idx_agent_configs_updated ON agent_configs(updated_at);
CREATE INDEX IF NOT EXISTS idx_role_assignments_project ON agent_role_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_role_assignments_role ON agent_role_assignments(role);
CREATE INDEX IF NOT EXISTS idx_role_assignments_config ON agent_role_assignments(agent_config_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_role_assignments_project_role ON agent_role_assignments(project_id, role);
CREATE INDEX IF NOT EXISTS idx_team_templates_updated ON team_templates(updated_at);