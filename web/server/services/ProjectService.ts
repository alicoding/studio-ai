import { ClaudeProjectScanner } from './ClaudeProjectScanner.js';
import { StudioProjectMetadata } from './StudioProjectMetadata.js';
import type { ClaudeProject, ProjectMetadata } from '../types/project.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface EnrichedProject extends ClaudeProject {
  studioMetadata?: ProjectMetadata;
  status: 'active' | 'archived' | 'draft';
  lastModified: Date;
  tags: string[];
  favorite: boolean;
}

export class ProjectService {
  private claudeScanner: ClaudeProjectScanner;
  private studioMetadata: StudioProjectMetadata;

  constructor() {
    this.claudeScanner = new ClaudeProjectScanner();
    this.studioMetadata = new StudioProjectMetadata();
  }

  async getAllProjects(): Promise<EnrichedProject[]> {
    const claudeProjects = await this.claudeScanner.getProjects();
    const enrichedProjects: EnrichedProject[] = [];

    for (const project of claudeProjects) {
      const metadata = await this.studioMetadata.getMetadata(project.id);
      
      enrichedProjects.push({
        ...project,
        studioMetadata: metadata ? {
          projectId: project.id,
          status: 'active' as const,
          tags: [],
          favorite: false,
          notes: '',
          lastModified: metadata.updatedAt || project.lastModified
        } : undefined,
        status: 'active' as const,
        lastModified: project.lastModified,
        tags: [],
        favorite: false,
      });
    }

    // Sort by last modified date (most recent first)
    return enrichedProjects.sort((a, b) => 
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );
  }

  async getProject(projectId: string): Promise<EnrichedProject | null> {
    const claudeProject = await this.claudeScanner.getProject(projectId);
    if (!claudeProject) {
      return null;
    }

    const metadata = await this.studioMetadata.getMetadata(projectId);
    
    return {
      ...claudeProject,
      studioMetadata: metadata ? {
        projectId: claudeProject.id,
        status: 'active' as const,
        tags: [],
        favorite: false,
        notes: '',
        lastModified: metadata.updatedAt || claudeProject.lastModified
      } : undefined,
      status: 'active' as const,
      lastModified: claudeProject.lastModified,
      tags: [],
      favorite: false,
    };
  }

  async updateProjectMetadata(
    projectId: string, 
    _updates: Partial<Omit<ProjectMetadata, 'projectId'>>
  ): Promise<void> {
    const existingMetadata = await this.studioMetadata.getMetadata(projectId);
    
    const studioMetadata = {
      id: projectId,
      name: existingMetadata?.name,
      description: existingMetadata?.description,
      template: existingMetadata?.template,
      agentIds: existingMetadata?.agentIds,
      createdAt: existingMetadata?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      thumbnail: existingMetadata?.thumbnail,
    };

    await this.studioMetadata.saveMetadata(studioMetadata);
  }

  // These methods would need proper implementation with the correct metadata type
  // For now, they're simplified stubs
  async toggleFavorite(projectId: string): Promise<void> {
    // TODO: Implement with proper metadata storage
    console.log('toggleFavorite not implemented', projectId);
  }

  async addTag(projectId: string, tag: string): Promise<void> {
    // TODO: Implement with proper metadata storage
    console.log('addTag not implemented', projectId, tag);
  }

  async removeTag(projectId: string, tag: string): Promise<void> {
    // TODO: Implement with proper metadata storage
    console.log('removeTag not implemented', projectId, tag);
  }

  async archiveProject(projectId: string): Promise<void> {
    // TODO: Implement with proper metadata storage
    console.log('archiveProject not implemented', projectId);
  }

  async unarchiveProject(projectId: string): Promise<void> {
    // TODO: Implement with proper metadata storage
    console.log('unarchiveProject not implemented', projectId);
  }

  async getProjectSessions(projectId: string): Promise<unknown[]> {
    try {
      const projectPath = path.join(os.homedir(), '.claude', 'projects', projectId)
      const files = await fs.readdir(projectPath)
      const sessionFiles = files.filter(file => file.endsWith('.jsonl'))

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
            const lines = content.split('\n').filter(line => line.trim())
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
                  lastMessage = typeof content === 'string' ? content : content[0]?.text || 'Message'
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
              currentContextTokens = (lastUsage.input_tokens || 0) + 
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
      return sessions.sort((a, b) => 
        new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
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
      const sessionPath = path.join(os.homedir(), '.claude', 'projects', projectId, `${sessionId}.jsonl`)
      
      // Read the file
      const content = await fs.readFile(sessionPath, 'utf-8')
      const lines = content.split('\n').filter(line => line.trim())
      
      // Parse all messages
      const allMessages: unknown[] = []
      lines.forEach((line, index) => {
        try {
          const data = JSON.parse(line)
          // Extract message data based on Claude SDK format
          // Include ALL message types from the JSONL
          if (data.type) {
            // Handle different message formats
            let content = ''
            let role = data.type
            
            if (data.message) {
              content = data.message.content || ''
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
              ...(data.type === 'assistant' && data.message?.id && {
                messageId: data.message.id,
                model: data.message.model,
                usage: data.message.usage
              })
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
          nextCursor: hasMore ? startIndex.toString() : undefined
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
          nextCursor: hasMore ? startIndex.toString() : undefined
        }
      }
      
      return {
        messages: [],
        hasMore: false
      }
    } catch (error) {
      console.error('Error getting session messages:', error)
      return { messages: [], hasMore: false }
    }
  }
}