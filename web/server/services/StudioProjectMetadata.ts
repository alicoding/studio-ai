import fs from 'fs/promises'
import path from 'path'
import os from 'os'

export interface AgentInstance {
  instanceId: string // Unique ID for this instance (e.g., "dev-agent-1234567890")
  configId: string // Reference to the original agent config (e.g., "dev-agent")
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
 * Service to manage Claude Studio project metadata in ~/.claude-studio/projects/
 * SOLID: Single responsibility for metadata persistence
 */
export class StudioProjectMetadata {
  private readonly metadataDir: string

  constructor() {
    this.metadataDir = path.join(os.homedir(), '.claude-studio', 'projects')
  }

  /**
   * Get metadata for a specific project
   * KISS: Simple file-based storage
   */
  async getMetadata(projectId: string): Promise<ProjectMetadata | null> {
    try {
      const metadataPath = path.join(this.metadataDir, `${projectId}.json`)
      const content = await fs.readFile(metadataPath, 'utf-8')
      return JSON.parse(content)
    } catch {
      return null
    }
  }

  /**
   * Save metadata for a project
   * DRY: Reusable save operation
   */
  async saveMetadata(metadata: ProjectMetadata): Promise<void> {
    await this.ensureMetadataDir()
    const metadataPath = path.join(this.metadataDir, `${metadata.id}.json`)
    const content = JSON.stringify(metadata, null, 2)
    await fs.writeFile(metadataPath, content, 'utf-8')
  }

  /**
   * Get all project metadata files
   */
  async getAllMetadata(): Promise<ProjectMetadata[]> {
    try {
      await this.ensureMetadataDir()
      const files = await fs.readdir(this.metadataDir)
      const metadataFiles = files.filter((file) => file.endsWith('.json'))

      const metadata = await Promise.all(
        metadataFiles.map(async (file) => {
          const projectId = path.basename(file, '.json')
          return this.getMetadata(projectId)
        })
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
      const metadataPath = path.join(this.metadataDir, `${projectId}.json`)
      await fs.unlink(metadataPath)
    } catch {
      // Ignore if file doesn't exist
    }
  }

  /**
   * Ensure metadata directory exists
   * DRY: Reusable directory creation
   */
  private async ensureMetadataDir(): Promise<void> {
    try {
      await fs.mkdir(this.metadataDir, { recursive: true })
    } catch {
      // Directory already exists
    }
  }
}
