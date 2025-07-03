import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

/**
 * SessionService - Tracks current sessionId for each agent in each project
 *
 * KISS: Simple JSON file per project
 * SOLID: Single responsibility - session tracking only
 * Library First: Uses Node.js fs.promises
 * DRY: Centralized session management
 */
export class SessionService {
  private static instance: SessionService
  private configDir: string

  private constructor() {
    this.configDir = path.join(os.homedir(), '.claude-studio')
  }

  static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService()
    }
    return SessionService.instance
  }

  /**
   * Get the Claude project directory for a given project path
   */
  private getClaudeProjectDir(projectPath: string): string {
    // Convert project path to Claude directory name (keep leading dash)
    const projectDirName = projectPath.replace(/\//g, '-')
    return path.join(os.homedir(), '.claude', 'projects', projectDirName)
  }

  /**
   * Get sessions file path for a project
   */
  private getSessionsFilePath(projectId: string): string {
    return path.join(this.configDir, 'projects', projectId, 'sessions.json')
  }

  /**
   * Read sessions for a project
   */
  private async readSessions(projectId: string): Promise<Record<string, string>> {
    try {
      const filePath = this.getSessionsFilePath(projectId)
      const data = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(data)
    } catch {
      // File doesn't exist or is invalid - return empty object
      return {}
    }
  }

  /**
   * Write sessions for a project
   */
  private async writeSessions(projectId: string, sessions: Record<string, string>): Promise<void> {
    const filePath = this.getSessionsFilePath(projectId)
    const dir = path.dirname(filePath)

    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true })

    // Write sessions file
    await fs.writeFile(filePath, JSON.stringify(sessions, null, 2))
  }

  /**
   * Get current sessionId for an agent in a project
   */
  async getSession(projectId: string, agentId: string): Promise<string | null> {
    const sessions = await this.readSessions(projectId)
    return sessions[agentId] || null
  }

  /**
   * Update sessionId for an agent in a project
   */
  async updateSession(projectId: string, agentId: string, sessionId: string): Promise<void> {
    const sessions = await this.readSessions(projectId)
    sessions[agentId] = sessionId
    await this.writeSessions(projectId, sessions)
  }

  /**
   * Clear session for an agent (removes from tracking)
   */
  async clearSession(projectId: string, agentId: string): Promise<void> {
    const sessions = await this.readSessions(projectId)
    delete sessions[agentId]
    await this.writeSessions(projectId, sessions)
  }

  /**
   * Delete all sessions for a project
   */
  async deleteProject(projectId: string): Promise<void> {
    try {
      const filePath = this.getSessionsFilePath(projectId)
      await fs.unlink(filePath)
    } catch {
      // Ignore if file doesn't exist
    }
  }

  /**
   * Load JSONL file for a session
   */
  async loadSessionMessages(projectPath: string, sessionId: string): Promise<any[]> {
    try {
      const claudeDir = this.getClaudeProjectDir(projectPath)
      const jsonlPath = path.join(claudeDir, `${sessionId}.jsonl`)

      const content = await fs.readFile(jsonlPath, 'utf-8')
      const lines = content
        .trim()
        .split('\n')
        .filter((line) => line.trim())

      return lines
        .map((line) => {
          try {
            return JSON.parse(line)
          } catch {
            return null
          }
        })
        .filter(Boolean)
    } catch (error) {
      console.error(`Failed to load session ${sessionId}:`, error)
      return []
    }
  }

  /**
   * Delete JSONL file for a session
   */
  async deleteSessionFile(projectPath: string, sessionId: string): Promise<void> {
    try {
      const claudeDir = this.getClaudeProjectDir(projectPath)
      const jsonlPath = path.join(claudeDir, `${sessionId}.jsonl`)
      await fs.unlink(jsonlPath)
    } catch (error) {
      console.error(`Failed to delete session file ${sessionId}:`, error)
      // Ignore if file doesn't exist
    }
  }

  /**
   * Get session file path for a given project and sessionId
   */
  getSessionPath(projectId: string, sessionId: string): string {
    // Convert projectId to Claude directory path format
    const claudeDir = path.join(os.homedir(), '.claude', 'projects', projectId)
    return path.join(claudeDir, `${sessionId}.jsonl`)
  }

  /**
   * Check if a session file exists
   */
  async sessionExists(projectPath: string, sessionId: string): Promise<boolean> {
    try {
      const claudeDir = this.getClaudeProjectDir(projectPath)
      const jsonlPath = path.join(claudeDir, `${sessionId}.jsonl`)
      await fs.access(jsonlPath)
      return true
    } catch {
      return false
    }
  }
}
