/**
 * Studio Session Service - Handle sessions for Studio Projects
 *
 * SOLID: Single responsibility - Studio project session management
 * DRY: Reuses existing patterns
 * KISS: Simple mapping between Studio projects and Claude sessions
 * Library-First: Uses fs/path for file operations
 */

import fs from 'fs/promises'
import fsSync from 'fs'
import path from 'path'
import os from 'os'
import { getDb } from '../../../src/lib/storage/database'
import { projectClaudePaths } from '../../../src/lib/storage/schema'
import { eq } from 'drizzle-orm'

export interface SessionMessage {
  id: string
  role: string
  content: string | unknown[]
  timestamp: string
  type?: string
  model?: string
  usage?: {
    input_tokens: number
    output_tokens: number
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
  }
}

export class StudioSessionService {
  private static instance: StudioSessionService
  private db: ReturnType<typeof getDb> | null = null

  private getDatabase() {
    if (!this.db) {
      this.db = getDb()
    }
    return this.db
  }

  static getInstance(): StudioSessionService {
    if (!StudioSessionService.instance) {
      StudioSessionService.instance = new StudioSessionService()
    }
    return StudioSessionService.instance
  }

  /**
   * Find the Claude project folder by searching for a session ID
   */
  private async findProjectFolderBySessionId(sessionId: string): Promise<string | null> {
    const claudeProjectsDir = path.join(os.homedir(), '.claude', 'projects')

    try {
      // Use grep to find the JSONL file containing the session ID
      const { execSync } = require('child_process')
      const grepResult = execSync(
        `grep -r "${sessionId}" "${claudeProjectsDir}" --include="*.jsonl" -l | head -1`,
        { encoding: 'utf-8' }
      ).trim()

      if (grepResult) {
        // Extract the directory path from the file path
        return path.dirname(grepResult)
      }
    } catch (_error) {
      console.log(`Session ${sessionId} not found in Claude projects`)
    }

    return null
  }

  /**
   * Get the Claude project folder for a workspace path
   */
  private getClaudeProjectFolder(workspacePath: string): string {
    // Expand ~ to home directory first
    const expandedPath = workspacePath.startsWith('~')
      ? path.join(os.homedir(), workspacePath.slice(2))
      : workspacePath

    // Claude SDK converts paths like /tmp/foo to -tmp-foo
    const normalized = expandedPath.replace(/\//g, '-')

    // Check both with and without -private prefix as Claude uses both
    const privatePath = path.join(os.homedir(), '.claude', 'projects', `-private${normalized}`)
    const regularPath = path.join(os.homedir(), '.claude', 'projects', normalized)

    // Return the one that has more recent JSONL files (Claude SDK may use either)
    try {
      // Check if private path exists and has recent sessions
      fsSync.accessSync(privatePath)
      const privateFiles = fsSync.readdirSync(privatePath).filter((f) => f.endsWith('.jsonl'))

      // Check if regular path exists and has recent sessions
      try {
        fsSync.accessSync(regularPath)
        const regularFiles = fsSync.readdirSync(regularPath).filter((f) => f.endsWith('.jsonl'))

        // If regular path has more JSONL files, use it
        // This handles the case where Claude SDK switched from private to regular
        if (regularFiles.length > privateFiles.length) {
          return regularPath
        }

        // If both have files, check which has more recent activity
        if (privateFiles.length > 0 && regularFiles.length > 0) {
          const privateStat = fsSync.statSync(path.join(privatePath, privateFiles[0]))
          const regularStat = fsSync.statSync(path.join(regularPath, regularFiles[0]))

          // Use the directory with more recent files
          return regularStat.mtime > privateStat.mtime ? regularPath : privatePath
        }

        // Default to private if it has files
        return privateFiles.length > 0 ? privatePath : regularPath
      } catch {
        // Regular path doesn't exist, use private
        return privatePath
      }
    } catch {
      // Private path doesn't exist, use regular
      return regularPath
    }
  }

  /**
   * List all sessions for a Studio project
   */
  async listProjectSessions(workspacePath: string): Promise<
    Array<{
      sessionId: string
      fileName: string
      createdAt: Date
      lastActivity: Date
      size: number
    }>
  > {
    const projectFolder = this.getClaudeProjectFolder(workspacePath)

    try {
      const files = await fs.readdir(projectFolder)
      const sessionFiles = files.filter((f) => f.endsWith('.jsonl'))

      const sessions = await Promise.all(
        sessionFiles.map(async (fileName) => {
          const filePath = path.join(projectFolder, fileName)
          const stat = await fs.stat(filePath)
          const sessionId = fileName.replace('.jsonl', '')

          return {
            sessionId,
            fileName,
            createdAt: stat.birthtime || stat.ctime,
            lastActivity: stat.mtime,
            size: stat.size,
          }
        })
      )

      return sessions.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
    } catch (_error) {
      console.log(`No sessions found for project at ${workspacePath}`)
      return []
    }
  }

  /**
   * Get messages from a session
   */
  async getSessionMessages(
    workspacePath: string,
    sessionId: string,
    options: { cursor?: string; limit?: number } = {},
    projectId?: string
  ): Promise<{ messages: SessionMessage[]; hasMore: boolean; nextCursor?: string }> {
    const { cursor, limit = 50 } = options

    // Always try to find by session ID first to ensure we have the correct folder
    // This is important because Claude might create new sessions in different subfolders
    let projectFolder = await this.findProjectFolderBySessionId(sessionId)

    // If not found by session ID, try the cached path as fallback
    if (!projectFolder && projectId) {
      const cachedPath = await this.getDatabase()
        .select()
        .from(projectClaudePaths)
        .where(eq(projectClaudePaths.projectId, projectId))
        .get()

      if (cachedPath) {
        projectFolder = cachedPath.claudePath
      }
    }

    // Update cache if we found the folder and have projectId
    if (projectFolder && projectId) {
      await this.getDatabase()
        .insert(projectClaudePaths)
        .values({
          projectId,
          claudePath: projectFolder,
        })
        .onConflictDoUpdate({
          target: projectClaudePaths.projectId,
          set: {
            claudePath: projectFolder,
            lastVerified: new Date(),
            updatedAt: new Date(),
          },
        })
    }

    // Fall back to the old method if still not found
    if (!projectFolder) {
      projectFolder = this.getClaudeProjectFolder(workspacePath)
    }

    const sessionPath = path.join(projectFolder, `${sessionId}.jsonl`)

    try {
      // Add a small delay to ensure JSONL file is fully written
      // This helps when switching between agents quickly after sending messages
      await new Promise((resolve) => setTimeout(resolve, 200))

      const content = await fs.readFile(sessionPath, 'utf-8')
      const lines = content.split('\n').filter((line) => line.trim())

      // Parse all messages
      const allMessages: SessionMessage[] = []
      lines.forEach((line, index) => {
        try {
          const data = JSON.parse(line)

          // Skip internal messages
          if (data.type === 'summary') return

          // Extract message content
          let content = ''
          let role = data.type

          if (data.message) {
            content = data.message.content || ''
            role = data.message.role || data.type
          } else if (data.content) {
            content = data.content
          }

          allMessages.push({
            id: `${sessionId}-${index}`,
            role,
            content,
            timestamp: data.timestamp || undefined, // Use actual timestamp if available
            type: data.type,
            model: data.message?.model,
            usage: data.message?.usage,
          })
        } catch (_err) {
          // Skip malformed lines
        }
      })

      // Handle pagination
      if (!cursor && allMessages.length > 0) {
        // Initial load - get last messages
        const startIndex = Math.max(0, allMessages.length - limit)
        const messages = allMessages.slice(startIndex)
        const hasMore = startIndex > 0

        return {
          messages,
          hasMore,
          nextCursor: hasMore ? startIndex.toString() : undefined,
        }
      } else if (cursor) {
        // Loading more - get earlier messages
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

      return { messages: [], hasMore: false }
    } catch (error) {
      console.error('Error reading session:', error)
      return { messages: [], hasMore: false }
    }
  }

  /**
   * Delete a session file
   */
  async deleteSession(workspacePath: string, sessionId: string): Promise<void> {
    const projectFolder = this.getClaudeProjectFolder(workspacePath)
    const sessionPath = path.join(projectFolder, `${sessionId}.jsonl`)

    try {
      await fs.unlink(sessionPath)
    } catch (error) {
      console.error('Error deleting session:', error)
      throw new Error('Failed to delete session')
    }
  }

  /**
   * Export a session as JSONL
   */
  async exportSessionAsJsonl(workspacePath: string, sessionId: string): Promise<string> {
    const projectFolder = this.getClaudeProjectFolder(workspacePath)
    const sessionPath = path.join(projectFolder, `${sessionId}.jsonl`)

    try {
      // Check if session file exists
      await fs.access(sessionPath)

      // Read and return the raw JSONL content
      const content = await fs.readFile(sessionPath, 'utf-8')
      return content
    } catch (error) {
      console.error('Error exporting session:', error)
      throw new Error(`Session ${sessionId} not found`)
    }
  }
}
