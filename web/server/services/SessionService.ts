import path from 'path'
import os from 'os'
import { ServerConfigService } from './ServerConfigService'

/**
 * SessionService - Tracks current sessionId for each agent in each project
 *
 * KISS: Simple interface for session management
 * SOLID: Single responsibility - session tracking only
 * DRY: Uses ConfigService for storage (no more JSON files)
 * Library-First: Uses unified storage through ConfigService
 */
export class SessionService {
  private static instance: SessionService
  private configService: ServerConfigService

  private constructor() {
    this.configService = ServerConfigService.getInstance()
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
   * Get current sessionId for an agent in a project
   */
  async getSession(projectId: string, agentId: string): Promise<string | null> {
    const sessions = await this.configService.getProjectSessions(projectId)
    return sessions?.[agentId] || null
  }

  /**
   * Update sessionId for an agent in a project
   */
  async updateSession(projectId: string, agentId: string, sessionId: string): Promise<void> {
    const sessions = await this.configService.getProjectSessions(projectId) || {}
    sessions[agentId] = sessionId
    await this.configService.saveSession(projectId, sessions)
  }

  /**
   * Clear session for an agent (removes from tracking)
   */
  async clearSession(projectId: string, agentId: string): Promise<void> {
    const sessions = await this.configService.getProjectSessions(projectId) || {}
    delete sessions[agentId]
    await this.configService.saveSession(projectId, sessions)
  }

  /**
   * Delete all sessions for a project
   */
  async deleteProjectSessions(projectId: string): Promise<void> {
    await this.configService.saveSession(projectId, {})
  }

  /**
   * Get all sessions for a project
   */
  async getAllSessions(projectId: string): Promise<Record<string, string>> {
    return await this.configService.getProjectSessions(projectId) || {}
  }

  /**
   * Get Claude session path for a project
   * Note: This still returns the filesystem path where Claude stores its sessions
   */
  getClaudeSessionPath(projectPath: string, sessionId: string): string {
    const projectDir = this.getClaudeProjectDir(projectPath)
    return path.join(projectDir, 'chats', sessionId)
  }
}