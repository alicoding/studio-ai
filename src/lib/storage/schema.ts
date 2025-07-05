/**
 * Database Schema for Unified Storage
 * 
 * KISS: Simple schema that handles all storage needs
 * Library-First: Using Drizzle ORM for type-safe SQL
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// Main storage table for all data
export const storage = sqliteTable('storage', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull(),
  namespace: text('namespace').notNull(),
  type: text('type').notNull(), // config, state, secret, cache, session
  value: text('value').notNull(), // JSON stringified
  encrypted: integer('encrypted', { mode: 'boolean' }).default(false),
  metadata: text('metadata'), // JSON stringified
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  accessedAt: integer('accessed_at', { mode: 'timestamp' })
})

// Projects table (structured data)
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  workspacePath: text('workspace_path'),
  settings: text('settings'), // JSON
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
})

// Agents table
export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id),
  name: text('name').notNull(),
  role: text('role'),
  model: text('model'),
  systemPrompt: text('system_prompt'),
  config: text('config'), // JSON
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
})

// API Keys table (always encrypted)
export const apiKeys = sqliteTable('api_keys', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  provider: text('provider').notNull().unique(),
  encryptedKey: text('encrypted_key').notNull(),
  config: text('config'), // JSON
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
})

// AI Sessions table
export const aiSessions = sqliteTable('ai_sessions', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id),
  agentId: text('agent_id').references(() => agents.id),
  messages: text('messages').notNull(), // JSON array
  metadata: text('metadata'), // JSON
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
})

// Storage stats for monitoring
export const storageStats = sqliteTable('storage_stats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  namespace: text('namespace').notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  count: integer('count').notNull().default(0),
  sizeBytes: integer('size_bytes').notNull().default(0),
  reads: integer('reads').notNull().default(0),
  writes: integer('writes').notNull().default(0),
  deletes: integer('deletes').notNull().default(0)
})

// Agent Configurations table (for global agent templates)
export const agentConfigs = sqliteTable('agent_configs', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  systemPrompt: text('system_prompt').notNull(),
  tools: text('tools').notNull(), // JSON array
  model: text('model').notNull(),
  maxTokens: integer('max_tokens').default(200000),
  temperature: text('temperature').default('0.7'), // Store as text for precision
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
})

// Agent Role Assignments table (which agent config is assigned to which role in a project)
export const agentRoleAssignments = sqliteTable('agent_role_assignments', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id),
  role: text('role').notNull(),
  agentConfigId: text('agent_config_id').references(() => agentConfigs.id),
  customTools: text('custom_tools'), // JSON array - tools specific to this assignment
  hasCustomTools: integer('has_custom_tools', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
})

// Team Templates table
export const teamTemplates = sqliteTable('team_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  agentRoles: text('agent_roles').notNull(), // JSON object mapping role -> agentConfigId
  metadata: text('metadata'), // JSON
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
})

// System Settings table
export const systemSettings = sqliteTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(), // JSON
  category: text('category').default('general'),
  description: text('description'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
})

// Migrations tracking
export const migrations = sqliteTable('migrations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  executedAt: integer('executed_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
})

// Indexes for performance
export const storageIndexes = {
  keyNamespace: sql`CREATE UNIQUE INDEX idx_storage_key_namespace ON storage(key, namespace)`,
  namespace: sql`CREATE INDEX idx_storage_namespace ON storage(namespace)`,
  type: sql`CREATE INDEX idx_storage_type ON storage(type)`,
  expiresAt: sql`CREATE INDEX idx_storage_expires ON storage(expires_at)`,
  updatedAt: sql`CREATE INDEX idx_storage_updated ON storage(updated_at)`,
  
  // Agent Configs indexes
  agentConfigRole: sql`CREATE INDEX idx_agent_configs_role ON agent_configs(role)`,
  agentConfigUpdated: sql`CREATE INDEX idx_agent_configs_updated ON agent_configs(updated_at)`,
  
  // Agent Role Assignments indexes
  roleAssignmentProject: sql`CREATE INDEX idx_role_assignments_project ON agent_role_assignments(project_id)`,
  roleAssignmentRole: sql`CREATE INDEX idx_role_assignments_role ON agent_role_assignments(role)`,
  roleAssignmentConfig: sql`CREATE INDEX idx_role_assignments_config ON agent_role_assignments(agent_config_id)`,
  roleAssignmentProjectRole: sql`CREATE UNIQUE INDEX idx_role_assignments_project_role ON agent_role_assignments(project_id, role)`,
  
  // Team Templates indexes
  teamTemplateUpdated: sql`CREATE INDEX idx_team_templates_updated ON team_templates(updated_at)`,
  
  // System Settings indexes
  systemSettingCategory: sql`CREATE INDEX idx_system_settings_category ON system_settings(category)`
}