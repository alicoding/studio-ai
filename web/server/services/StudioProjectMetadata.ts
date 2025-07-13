import { createStorage } from '../../../src/lib/storage/UnifiedStorage'
import type { UnifiedStorage } from '../../../src/lib/storage/UnifiedStorage'

export interface AgentInstance {
  instanceId: string // Unique ID for this instance (e.g., "dev-agent-1234567890")
  configId: string // Reference to the original agent config (e.g., "dev-agent")
  customName?: string // Optional custom name for this instance (e.g., "Senior Dev (2)")
  addedAt: string // When this instance was added
}

export interface ProjectMetadata {
  id: string
  name?: string
  description?: string
  template?: string
  agentIds?: string[] // Keep for backward compatibility
  agentInstances?: AgentInstance[] // New: Support multiple instances of same agent
  createdAt: string
  updatedAt: string
  thumbnail?: string
}

/**
 * Service to manage Claude Studio project metadata using unified storage
 * SOLID: Single responsibility for metadata persistence
 */
export class StudioProjectMetadata {
  private readonly storage: UnifiedStorage

  constructor() {
    this.storage = createStorage({ namespace: 'project-metadata', type: 'config' })
  }

  /**
   * Get metadata for a specific project
   * KISS: Simple storage-based operation
   */
  async getMetadata(projectId: string): Promise<ProjectMetadata | null> {
    try {
      return await this.storage.get<ProjectMetadata>(projectId)
    } catch {
      return null
    }
  }

  /**
   * Save metadata for a project
   * DRY: Reusable save operation
   */
  async saveMetadata(metadata: ProjectMetadata): Promise<void> {
    await this.storage.set(metadata.id, metadata)
  }

  /**
   * Get all project metadata
   */
  async getAllMetadata(): Promise<ProjectMetadata[]> {
    try {
      // Get all keys from storage
      const keys = await this.storage.keys()
      
      // Fetch all metadata in parallel
      const metadata = await Promise.all(
        keys.map(key => this.storage.get<ProjectMetadata>(key))
      )

      return metadata.filter(Boolean) as ProjectMetadata[]
    } catch {
      return []
    }
  }

  /**
   * Delete metadata for a project
   */
  async deleteMetadata(projectId: string): Promise<void> {
    try {
      await this.storage.delete(projectId)
    } catch {
      // Ignore if doesn't exist
    }
  }
}
