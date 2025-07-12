/**
 * Workflow Storage Service
 *
 * SOLID: Single responsibility with delegation pattern
 * DRY: Reuses interface for future library migration
 * KISS: Simple delegation to storage implementation
 * Library-First: Ready to adopt WorkflowKit, DAGX, or n8n-core
 */

import {
  IWorkflowStorage,
  SavedWorkflow,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
} from './WorkflowStorageInterface'
import { SQLiteWorkflowStorage } from './storage/SQLiteWorkflowStorage'

/**
 * Main service that delegates to storage implementation
 * Easily switchable to new libraries via environment variables
 */
export class WorkflowStorageService implements IWorkflowStorage {
  private static instance: WorkflowStorageService
  private storage: IWorkflowStorage

  constructor() {
    // Current: Use SQLite implementation
    // Future: Switch based on environment variable
    const provider = process.env.WORKFLOW_STORAGE_PROVIDER || 'sqlite'

    switch (provider) {
      case 'sqlite':
        this.storage = new SQLiteWorkflowStorage()
        break
      // Future library integrations:
      // case 'workflowkit':
      //   this.storage = new WorkflowKitStorage()
      //   break
      // case 'dagx':
      //   this.storage = new DAGXStorage()
      //   break
      // case 'n8n-core':
      //   this.storage = new N8nCoreStorage()
      //   break
      default:
        console.warn(`Unknown workflow storage provider: ${provider}, using SQLite`)
        this.storage = new SQLiteWorkflowStorage()
    }
  }

  static getInstance(): WorkflowStorageService {
    if (!this.instance) {
      this.instance = new WorkflowStorageService()
    }
    return this.instance
  }

  // Delegate all operations to the storage implementation
  async create(request: CreateWorkflowRequest): Promise<SavedWorkflow> {
    return this.storage.create(request)
  }

  async getById(id: string): Promise<SavedWorkflow | null> {
    return this.storage.getById(id)
  }

  async listByProject(projectId: string): Promise<SavedWorkflow[]> {
    return this.storage.listByProject(projectId)
  }

  async update(id: string, updates: UpdateWorkflowRequest): Promise<SavedWorkflow | null> {
    return this.storage.update(id, updates)
  }

  async delete(id: string): Promise<boolean> {
    return this.storage.delete(id)
  }

  // Advanced features (if supported by storage implementation)
  async getVersions(id: string): Promise<SavedWorkflow[]> {
    if (this.storage.getVersions) {
      return this.storage.getVersions(id)
    }
    // Fallback for simple storage implementations
    const workflow = await this.storage.getById(id)
    return workflow ? [workflow] : []
  }

  async createVersion(id: string): Promise<SavedWorkflow> {
    if (this.storage.createVersion) {
      return this.storage.createVersion(id)
    }
    throw new Error('Versioning not supported by current storage provider')
  }

  async searchByTags(tags: string[]): Promise<SavedWorkflow[]> {
    if (this.storage.searchByTags) {
      return this.storage.searchByTags(tags)
    }
    throw new Error('Tag search not supported by current storage provider')
  }

  async listTemplates(): Promise<SavedWorkflow[]> {
    if (this.storage.listTemplates) {
      return this.storage.listTemplates()
    }
    // Fallback: filter templates from all workflows
    // This is inefficient but works for small datasets
    throw new Error('Template listing not supported by current storage provider')
  }

  async healthCheck(): Promise<boolean> {
    if (this.storage.healthCheck) {
      return this.storage.healthCheck()
    }
    // Basic health check: try to perform a simple operation
    try {
      await this.storage.listByProject('health-check')
      return true
    } catch {
      return false
    }
  }
}
