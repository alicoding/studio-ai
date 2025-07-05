import { ClaudeProjectScanner } from './ClaudeProjectScanner.js'
import { StudioProjectMetadata } from './StudioProjectMetadata.js'
import { SessionService } from './SessionService.js'
import { AgentConfigService } from './AgentConfigService.js'
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
  private agentConfigService: AgentConfigService

  constructor() {
    this.claudeScanner = new ClaudeProjectScanner()
    this.studioMetadata = new StudioProjectMetadata()
    this.sessionService = SessionService.getInstance()
    this.agentConfigService = AgentConfigService.getInstance()
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
   * Remove an agent instance from a project
   * Removes the agent from project metadata and cleans up session data
   */
  async removeAgentFromProject(projectId: string, agentInstanceId: string): Promise<void> {
    try {
      // Get existing metadata
      const metadata = await this.studioMetadata.getMetadata(projectId)
      if (!metadata) {
        throw new Error('Project metadata not found')
      }

      // Remove from agentInstances if it exists
      if (metadata.agentInstances) {
        metadata.agentInstances = metadata.agentInstances.filter(
          instance => instance.instanceId !== agentInstanceId
        )
      }

      // Also check and remove from legacy agentIds if it's there
      if (metadata.agentIds) {
        metadata.agentIds = metadata.agentIds.filter(id => id !== agentInstanceId)
      }

      // Delete associated session files
      try {
        // Get tracked session ID before clearing
        const trackedSessionId = await this.sessionService.getSession(projectId, agentInstanceId)
        
        if (trackedSessionId) {
          // Session files are now managed by Claude itself
          console.log(`Session ${trackedSessionId} for agent ${agentInstanceId} will be cleaned up by Claude`)
        }
        
        // Clear session tracking
        await this.sessionService.clearSession(projectId, agentInstanceId)
      } catch (sessionError) {
        console.warn('Error cleaning up session for removed agent:', sessionError)
        // Continue with removal even if session cleanup fails
      }

      // Save updated metadata
      await this.studioMetadata.saveMetadata({
        ...metadata,
        updatedAt: new Date().toISOString(),
      })

      console.log(`Agent instance ${agentInstanceId} removed from project ${projectId}`)
    } catch (error) {
      console.error('Error removing agent from project:', error)
      throw error
    }
  }

  /**
   * Add agents to a project
   * Creates unique instances for each agent, allowing multiple instances of the same role
   */
  async addAgentsToProject(projectId: string, agentIds: string[] | Array<{ configId: string; name?: string }>): Promise<void> {
    try {
      // Validate that agent configs exist
      const agentData = agentIds.map(agent => typeof agent === 'string' ? { configId: agent } : agent)
      const validConfigs: Array<{ configId: string; name?: string }> = []
      
      for (const agent of agentData) {
        const config = await this.agentConfigService.getAgent(agent.configId)
        if (config) {
          validConfigs.push(agent)
        } else {
          console.warn(`Skipping agent with non-existent configId: ${agent.configId}`)
        }
      }
      
      if (validConfigs.length === 0) {
        throw new Error('No valid agent configurations found')
      }
      
      // Get existing metadata
      const metadata = await this.studioMetadata.getMetadata(projectId)

      // Create agent instances with unique IDs (using validated configs)
      const newInstances = validConfigs.map((agent) => {
        const configId = typeof agent === 'string' ? agent : agent.configId
        const customName = typeof agent === 'string' ? undefined : agent.name
        
        return {
          instanceId: `${configId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          configId: configId,
          customName: customName,
          addedAt: new Date().toISOString(),
        }
      })

      if (!metadata) {
        // Create new metadata if it doesn't exist
        const project = await this.claudeScanner.getProject(projectId)
        if (!project) {
          throw new Error('Project not found')
        }

        const configIds = validConfigs.map(agent => agent.configId)
        
        await this.studioMetadata.saveMetadata({
          id: projectId,
          name: project.name,
          agentInstances: newInstances,
          agentIds: configIds, // Keep for backward compatibility
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      } else {
        // Update existing metadata
        const existingInstances = metadata.agentInstances || []
        const allInstances = [...existingInstances, ...newInstances]

        // Also update legacy agentIds for backward compatibility
        const existingAgentIds = metadata.agentIds || []
        const newConfigIds = validConfigs.map(agent => agent.configId)
        const uniqueAgentIds = [...new Set([...existingAgentIds, ...newConfigIds])]

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
      let agentEntries: Array<{ instanceId: string; configId: string; customName?: string }> = []

      // Prefer new agentInstances if they exist
      if (projectMetadata.agentInstances && projectMetadata.agentInstances.length > 0) {
        agentEntries.push(
          ...projectMetadata.agentInstances.map((instance) => ({
            instanceId: instance.instanceId,
            configId: instance.configId,
            customName: instance.customName,
          }))
        )
      } else if (projectMetadata.agentIds && projectMetadata.agentIds.length > 0) {
        // Only use legacy agentIds if no agentInstances exist
        // This prevents duplicates when both arrays contain data
        agentEntries.push(
          ...projectMetadata.agentIds.map((id) => ({
            instanceId: id,
            configId: id,
          }))
        )
      }

      if (agentEntries.length === 0) {
        return []
      }

      // Get agent configurations
      const agentConfigs = await Promise.all(
        agentEntries.map(async (entry) => {
          const config = await this.agentConfigService.getAgent(entry.configId)
          if (!config) {
            console.warn(`Agent configuration not found for configId: ${entry.configId}`)
          }
          return config ? { ...config, instanceId: entry.instanceId, customName: entry.customName } : null
        })
      )

      // Build agent info with session data
      const agents = await Promise.all(
        agentConfigs
          .filter((config) => config !== null)
          .map(async (config) => {
            // Use instanceId for this specific agent instance
            const instanceId = (config as { instanceId: string; customName?: string }).instanceId

            // Get tracked sessionId for this project+agent instance
            const sessionId = await this.sessionService.getSession(projectId, instanceId)
            console.log(`[ProjectService] Agent ${instanceId} has tracked sessionId: ${sessionId}`)

            // If no session, agent hasn't been used yet
            if (!sessionId) {
              return {
                id: instanceId, // Use instance ID
                configId: config.id, // Keep reference to original config
                name: (config as { instanceId: string; customName?: string }).customName || config.name,
                role: config.role,
                status: 'offline' as const,
                sessionId: null,
                messageCount: 0,
                totalTokens: 0,
                lastMessage: 'No messages yet',
                hasSession: false,
              }
            }

            // Session tracking is now handled by Claude directly
            // We just track the session ID in our unified storage
            const hasSession = !!sessionId
            
            // Read token usage from JSONL file if session exists
            let lastMessage = hasSession ? 'Session active' : 'No messages yet'
            let messageCount = 0
            let totalTokens = 0
            
            if (sessionId) {
              try {
                const projectPath = path.join(os.homedir(), '.claude', 'projects', projectId)
                const sessionFile = path.join(projectPath, `${sessionId}.jsonl`)
                
                // Check if file exists
                const fileExists = await fs.access(sessionFile).then(() => true).catch(() => false)
                
                if (fileExists) {
                  const content = await fs.readFile(sessionFile, 'utf-8')
                  const lines = content.split('\n').filter(line => line.trim())
                  
                  // Count messages and find last usage
                  let lastUsage = null
                  for (const line of lines) {
                    try {
                      const data = JSON.parse(line)
                      if (data.type === 'user' || data.type === 'assistant') {
                        messageCount++
                      }
                      
                      // Track token usage from assistant messages
                      if (data.type === 'assistant' && data.message?.usage) {
                        lastUsage = data.message.usage
                        // Calculate total tokens from the usage
                        const inputTokens = (lastUsage.input_tokens || 0) + 
                                          (lastUsage.cache_read_input_tokens || 0) + 
                                          (lastUsage.cache_creation_input_tokens || 0)
                        const outputTokens = lastUsage.output_tokens || 0
                        totalTokens = inputTokens + outputTokens
                      }
                      
                      // Get last user message for display
                      if (data.type === 'user' && data.message?.content) {
                        const content = data.message.content
                        const text = typeof content === 'string' ? content : content[0]?.text || 'Message'
                        lastMessage = text.substring(0, 100) + (text.length > 100 ? '...' : '')
                      }
                    } catch (_e) {
                      // Skip invalid lines
                    }
                  }
                }
              } catch (error) {
                console.error(`Error reading session file for ${sessionId}:`, error)
              }
            }

            return {
              id: instanceId, // Use instance ID
              configId: config.id, // Keep reference to original config
              name: (config as { instanceId: string; customName?: string }).customName || config.name,
              role: config.role,
              status: 'offline' as const, // All sessions are historical
              sessionId: sessionId,
              messageCount: messageCount,
              totalTokens: totalTokens,
              lastMessage: lastMessage,
              hasSession: hasSession,
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
          let lastUsage: {
            input_tokens?: number
            cache_read_input_tokens?: number
            cache_creation_input_tokens?: number
            output_tokens?: number
          } | null = null

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
