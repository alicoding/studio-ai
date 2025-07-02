import { ClaudeProjectScanner } from './ClaudeProjectScanner.js'
import { StudioProjectMetadata } from './StudioProjectMetadata.js'
import { SessionService } from './SessionService.js'
import { ConfigService } from '../../../src/services/ConfigService.js'
import type { ClaudeProject, ProjectMetadata } from '../types/project.js'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

export interface EnrichedProject extends ClaudeProject {
  studioMetadata?: ProjectMetadata
  status: 'active' | 'archived' | 'draft'
  lastModified: Date
  tags: string[]
  favorite: boolean
}

export class ProjectService {
  private claudeScanner: ClaudeProjectScanner
  private studioMetadata: StudioProjectMetadata
  private sessionService: SessionService
  private configService: ConfigService

  constructor() {
    this.claudeScanner = new ClaudeProjectScanner()
    this.studioMetadata = new StudioProjectMetadata()
    this.sessionService = SessionService.getInstance()
    this.configService = ConfigService.getInstance()
  }

  async getAllProjects(): Promise<EnrichedProject[]> {
    const claudeProjects = await this.claudeScanner.getProjects()
    const enrichedProjects: EnrichedProject[] = []

    for (const project of claudeProjects) {
      const metadata = await this.studioMetadata.getMetadata(project.id)

      enrichedProjects.push({
        ...project,
        studioMetadata: metadata
          ? {
              projectId: project.id,
              status: 'active' as const,
              tags: [],
              favorite: false,
              notes: '',
              lastModified: metadata.updatedAt || project.lastModified,
            }
          : undefined,
        status: 'active' as const,
        lastModified: project.lastModified,
        tags: [],
        favorite: false,
      })
    }

    // Sort by last modified date (most recent first)
    return enrichedProjects.sort(
      (a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    )
  }

  async getProject(projectId: string): Promise<EnrichedProject | null> {
    const claudeProject = await this.claudeScanner.getProject(projectId)
    if (!claudeProject) {
      return null
    }

    const metadata = await this.studioMetadata.getMetadata(projectId)

    return {
      ...claudeProject,
      studioMetadata: metadata
        ? {
            projectId: claudeProject.id,
            status: 'active' as const,
            tags: [],
            favorite: false,
            notes: '',
            lastModified: metadata.updatedAt || claudeProject.lastModified,
          }
        : undefined,
      status: 'active' as const,
      lastModified: claudeProject.lastModified,
      tags: [],
      favorite: false,
    }
  }

  async updateProjectMetadata(
    projectId: string,
    _updates: Partial<Omit<ProjectMetadata, 'projectId'>>
  ): Promise<void> {
    const existingMetadata = await this.studioMetadata.getMetadata(projectId)

    const studioMetadata = {
      id: projectId,
      name: existingMetadata?.name,
      description: existingMetadata?.description,
      template: existingMetadata?.template,
      agentIds: existingMetadata?.agentIds,
      createdAt: existingMetadata?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      thumbnail: existingMetadata?.thumbnail,
    }

    await this.studioMetadata.saveMetadata(studioMetadata)
  }

  // These methods would need proper implementation with the correct metadata type
  // For now, they're simplified stubs
  async toggleFavorite(projectId: string): Promise<void> {
    // TODO: Implement with proper metadata storage
    console.log('toggleFavorite not implemented', projectId)
  }

  async addTag(projectId: string, tag: string): Promise<void> {
    // TODO: Implement with proper metadata storage
    console.log('addTag not implemented', projectId, tag)
  }

  async removeTag(projectId: string, tag: string): Promise<void> {
    // TODO: Implement with proper metadata storage
    console.log('removeTag not implemented', projectId, tag)
  }

  async archiveProject(projectId: string): Promise<void> {
    // TODO: Implement with proper metadata storage
    console.log('archiveProject not implemented', projectId)
  }

  async unarchiveProject(projectId: string): Promise<void> {
    // TODO: Implement with proper metadata storage
    console.log('unarchiveProject not implemented', projectId)
  }

  /**
   * Add agents to a project
   * Creates unique instances for each agent, allowing multiple instances of the same role
   */
  async addAgentsToProject(projectId: string, agentIds: string[]): Promise<void> {
    try {
      // Get existing metadata
      const metadata = await this.studioMetadata.getMetadata(projectId)

      // Create agent instances with unique IDs
      const newInstances = agentIds.map((configId) => ({
        instanceId: `${configId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        configId: configId,
        addedAt: new Date().toISOString(),
      }))

      if (!metadata) {
        // Create new metadata if it doesn't exist
        const project = await this.claudeScanner.getProject(projectId)
        if (!project) {
          throw new Error('Project not found')
        }

        await this.studioMetadata.saveMetadata({
          id: projectId,
          name: project.name,
          agentInstances: newInstances,
          agentIds: agentIds, // Keep for backward compatibility
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      } else {
        // Update existing metadata
        const existingInstances = metadata.agentInstances || []
        const allInstances = [...existingInstances, ...newInstances]

        // Also update legacy agentIds for backward compatibility
        const existingAgentIds = metadata.agentIds || []
        const uniqueAgentIds = [...new Set([...existingAgentIds, ...agentIds])]

        await this.studioMetadata.saveMetadata({
          ...metadata,
          agentInstances: allInstances,
          agentIds: uniqueAgentIds, // Keep for backward compatibility
          updatedAt: new Date().toISOString(),
        })
      }
    } catch (error) {
      console.error('Error adding agents to project:', error)
      throw error
    }
  }

  /**
   * Get agents that are configured for this project
   * Only returns agents from the /agents configuration that have active sessions
   */
  async getProjectAgents(projectId: string): Promise<unknown[]> {
    try {
      // Get project details first
      const project = await this.claudeScanner.getProject(projectId)
      if (!project) {
        return []
      }

      // Get project metadata to find which agents are assigned
      const projectMetadata = await this.studioMetadata.getMetadata(projectId)
      if (!projectMetadata) {
        return []
      }

      // Handle both legacy agentIds and new agentInstances
      let agentEntries: Array<{ instanceId: string; configId: string }> = []

      // Add legacy agents if they exist
      if (projectMetadata.agentIds && projectMetadata.agentIds.length > 0) {
        agentEntries.push(
          ...projectMetadata.agentIds.map((id) => ({
            instanceId: id,
            configId: id,
          }))
        )
      }

      // Add new agent instances
      if (projectMetadata.agentInstances && projectMetadata.agentInstances.length > 0) {
        agentEntries.push(
          ...projectMetadata.agentInstances.map((instance) => ({
            instanceId: instance.instanceId,
            configId: instance.configId,
          }))
        )
      }

      if (agentEntries.length === 0) {
        return []
      }

      // Get agent configurations
      const agentConfigs = await Promise.all(
        agentEntries.map(async (entry) => {
          const config = await this.configService.getAgent(entry.configId)
          return config ? { ...config, instanceId: entry.instanceId } : null
        })
      )

      // Build agent info with session data
      const agents = await Promise.all(
        agentConfigs
          .filter((config) => config !== null)
          .map(async (config) => {
            // Use instanceId for this specific agent instance
            const instanceId = (config as any).instanceId

            // Get tracked sessionId for this project+agent instance
            const sessionId = await this.sessionService.getSession(projectId, instanceId)

            // If no session, agent hasn't been used yet
            if (!sessionId) {
              return {
                id: instanceId, // Use instance ID
                configId: config.id, // Keep reference to original config
                name: config.name,
                role: config.role,
                status: 'offline' as const,
                sessionId: null,
                messageCount: 0,
                totalTokens: 0,
                lastMessage: 'No messages yet',
                hasSession: false,
              }
            }

            // Check if session file exists
            const sessionExists = await this.sessionService.sessionExists(project.path, sessionId)

            if (!sessionExists) {
              // Session was tracked but file is missing
              return {
                id: instanceId, // Use instance ID
                configId: config.id, // Keep reference to original config
                name: config.name,
                role: config.role,
                status: 'offline' as const,
                sessionId: sessionId,
                messageCount: 0,
                totalTokens: 0,
                lastMessage: 'Session file missing',
                hasSession: false,
              }
            }

            // Load session messages to get stats
            const messages = await this.sessionService.loadSessionMessages(project.path, sessionId)

            // Calculate stats from messages
            let lastMessage = 'No messages'
            let totalTokens = 0
            let lastUsage: any = null

            for (const msg of messages) {
              if (msg.type === 'user' && msg.message?.content) {
                const content = msg.message.content
                lastMessage = typeof content === 'string' ? content : content[0]?.text || 'Message'
              }

              if (msg.type === 'assistant' && msg.message?.usage) {
                lastUsage = msg.message.usage
              }
            }

            // Calculate current context size from the last usage
            if (lastUsage) {
              totalTokens =
                (lastUsage.input_tokens || 0) +
                (lastUsage.cache_creation_input_tokens || 0) +
                (lastUsage.cache_read_input_tokens || 0)
            }

            return {
              id: instanceId, // Use instance ID
              configId: config.id, // Keep reference to original config
              name: config.name,
              role: config.role,
              status: 'offline' as const, // All sessions are historical
              sessionId: sessionId,
              messageCount: messages.length,
              totalTokens: totalTokens,
              lastMessage: lastMessage,
              hasSession: true,
              maxTokens: config.maxTokens || 200000,
            }
          })
      )

      return agents
    } catch (error) {
      console.error('Error getting project agents:', error)
      return []
    }
  }

  async getProjectSessions(projectId: string): Promise<unknown[]> {
    try {
      const projectPath = path.join(os.homedir(), '.claude', 'projects', projectId)
      const files = await fs.readdir(projectPath)
      const sessionFiles = files.filter((file) => file.endsWith('.jsonl'))

      const sessions = await Promise.all(
        sessionFiles.map(async (fileName) => {
          const filePath = path.join(projectPath, fileName)
          const stat = await fs.stat(filePath)
          const sessionId = fileName.replace('.jsonl', '')

          // Extract session info
          let messageCount = 0
          let agentName: string | undefined
          let lastActivity: Date | undefined
          let currentContextTokens = 0
          let lastMessage: string | undefined
          let lastUsage: any = null

          try {
            const content = await fs.readFile(filePath, 'utf-8')
            const lines = content.split('\n').filter((line) => line.trim())
            messageCount = lines.length

            // Look for agent name in messages or use session ID
            for (const line of lines) {
              try {
                const data = JSON.parse(line)
                // Update last activity
                if (data.timestamp) {
                  const msgTime = new Date(data.timestamp)
                  if (!lastActivity || msgTime > lastActivity) {
                    lastActivity = msgTime
                  }
                }

                // Track the most recent token usage (current context size)
                if (data.type === 'assistant' && data.message?.usage) {
                  lastUsage = data.message.usage
                }

                // Extract last user message
                if (data.type === 'user' && data.message?.content) {
                  const content = data.message.content
                  lastMessage =
                    typeof content === 'string' ? content : content[0]?.text || 'Message'
                }

                // Try to extract agent name from system messages or context
                if (data.type === 'user' && data.message?.content?.includes('You are')) {
                  // Extract agent name from system prompt
                  const match = data.message.content.match(/You are ([^,.]+)/i)
                  if (match) {
                    agentName = match[1].trim()
                  }
                }
              } catch {
                // Skip malformed lines
              }
            }

            // Calculate current context size from the last usage
            if (lastUsage) {
              currentContextTokens =
                (lastUsage.input_tokens || 0) +
                (lastUsage.cache_creation_input_tokens || 0) +
                (lastUsage.cache_read_input_tokens || 0)
            }
          } catch {
            // Ignore errors in parsing
          }

          return {
            fileName,
            sessionId,
            createdAt: stat.birthtime || stat.ctime,
            lastActivity: lastActivity || stat.mtime,
            size: stat.size,
            messageCount,
            agentName,
            totalTokens: currentContextTokens,
            lastMessage,
          }
        })
      )

      // Sort by last activity descending
      return sessions.sort(
        (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
      )
    } catch (error) {
      console.error('Error getting project sessions:', error)
      return []
    }
  }

  async deleteProjectSession(projectId: string, fileName: string): Promise<void> {
    try {
      const sessionPath = path.join(os.homedir(), '.claude', 'projects', projectId, fileName)

      // Verify the file exists and is a .jsonl file
      if (!fileName.endsWith('.jsonl')) {
        throw new Error('Invalid session file')
      }

      await fs.unlink(sessionPath)
    } catch (error) {
      console.error('Error deleting session:', error)
      throw new Error('Failed to delete session')
    }
  }

  async getSessionMessages(
    projectId: string,
    sessionId: string,
    options: { cursor?: string; limit?: number } = {}
  ): Promise<{ messages: unknown[]; hasMore: boolean; nextCursor?: string }> {
    try {
      const { cursor, limit = 50 } = options
      const sessionPath = path.join(
        os.homedir(),
        '.claude',
        'projects',
        projectId,
        `${sessionId}.jsonl`
      )

      // Read the file
      const content = await fs.readFile(sessionPath, 'utf-8')
      const lines = content.split('\n').filter((line) => line.trim())

      // Parse all messages
      const allMessages: unknown[] = []
      lines.forEach((line, index) => {
        try {
          const data = JSON.parse(line)
          // Extract message data based on Claude SDK format
          // Filter out internal summary messages that clutter the UI
          if (data.type && data.type !== 'summary') {
            // Handle different message formats
            let content = ''
            let role = data.type

            if (data.message) {
              // Handle both string content and array content (for tool results)
              if (Array.isArray(data.message.content)) {
                content = data.message.content
              } else {
                content = data.message.content || ''
              }
              role = data.message.role || data.type
            } else if (data.content) {
              content = data.content
            } else if (data.text) {
              content = data.text
            } else if (data.result) {
              content = data.result
            }

            allMessages.push({
              id: `${sessionId}-${index}`,
              role: role,
              content: content,
              timestamp: data.timestamp || new Date().toISOString(),
              type: data.type,
              uuid: data.uuid,
              parentUuid: data.parentUuid,
              isMeta: data.isMeta || false,
              // Include all data properties for debugging
              rawData: data,
              // For assistant messages, include additional metadata
              ...(data.type === 'assistant' &&
                data.message?.id && {
                  messageId: data.message.id,
                  model: data.message.model,
                  usage: data.message.usage,
                }),
            })
          }
        } catch (err) {
          console.error('Error parsing line:', err)
          // Skip malformed lines
        }
      })

      // Handle pagination - load from the end backwards
      if (!cursor && allMessages.length > 0) {
        // Initial load - get the last 'limit' messages
        const startIndex = Math.max(0, allMessages.length - limit)
        const messages = allMessages.slice(startIndex)
        const hasMore = startIndex > 0

        return {
          messages,
          hasMore,
          nextCursor: hasMore ? startIndex.toString() : undefined,
        }
      } else if (cursor) {
        // Loading more (scrolling up) - get earlier messages
        const endIndex = parseInt(cursor, 10)
        const startIndex = Math.max(0, endIndex - limit)
        const messages = allMessages.slice(startIndex, endIndex)
        const hasMore = startIndex > 0

        return {
          messages,
          hasMore,
          nextCursor: hasMore ? startIndex.toString() : undefined,
        }
      }

      return {
        messages: [],
        hasMore: false,
      }
    } catch (error) {
      console.error('Error getting session messages:', error)
      return { messages: [], hasMore: false }
    }
  }
}
