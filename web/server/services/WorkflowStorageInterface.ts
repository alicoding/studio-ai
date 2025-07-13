/**
 * Workflow Storage Interface
 *
 * SOLID: Interface segregation - clean contract for workflow storage
 * Library-First: Abstraction enables easy migration to workflow libraries
 * DRY: Single interface for all storage implementations
 */

import type { WorkflowDefinition } from '../schemas/workflow-builder'

export interface SavedWorkflow {
  id: string
  projectId?: string // Optional for global workflows
  name: string
  description?: string
  definition: WorkflowDefinition
  createdBy: string
  createdAt: string
  updatedAt: string
  version: number
  tags: string[]
  isTemplate: boolean
  source: 'ui' | 'mcp' | 'api'
  scope: 'project' | 'global' | 'cross-project'
}

export interface CreateWorkflowRequest {
  projectId?: string // Optional for global workflows
  name: string
  description?: string
  definition: WorkflowDefinition
  createdBy?: string
  tags?: string[]
  isTemplate?: boolean
  source?: 'ui' | 'mcp' | 'api'
  scope?: 'project' | 'global' | 'cross-project' // Defaults to 'project' if projectId provided
}

export interface UpdateWorkflowRequest {
  name?: string
  description?: string
  definition?: WorkflowDefinition
  tags?: string[]
  isTemplate?: boolean
}

/**
 * Abstract interface for workflow storage implementations
 * Enables easy migration to libraries like WorkflowKit, DAGX, or n8n-core
 */
export interface IWorkflowStorage {
  // Basic CRUD operations
  create(request: CreateWorkflowRequest): Promise<SavedWorkflow>
  getById(id: string): Promise<SavedWorkflow | null>
  listByProject(projectId: string): Promise<SavedWorkflow[]>
  update(id: string, updates: UpdateWorkflowRequest): Promise<SavedWorkflow | null>
  delete(id: string): Promise<boolean>

  // Advanced features (for future library support)
  getVersions?(id: string): Promise<SavedWorkflow[]>
  createVersion?(id: string): Promise<SavedWorkflow>
  searchByTags?(tags: string[]): Promise<SavedWorkflow[]>
  listTemplates?(): Promise<SavedWorkflow[]>

  // Scope-based queries (for global/cross-project workflows)
  listByScope?(scope: 'project' | 'global' | 'cross-project'): Promise<SavedWorkflow[]>
  listGlobal?(): Promise<SavedWorkflow[]>
  listCrossProject?(projectIds: string[]): Promise<SavedWorkflow[]>

  // Bulk operations (for migration/import)
  bulkCreate?(requests: CreateWorkflowRequest[]): Promise<SavedWorkflow[]>
  bulkDelete?(ids: string[]): Promise<number>

  // Health check (for monitoring)
  healthCheck?(): Promise<boolean>
}
