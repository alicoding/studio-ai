import path from 'path'
import os from 'os'
import { ServerConfigService } from './ServerConfigService'

/**
 * SessionService - SINGLE SOURCE OF TRUTH for Agent ID ↔ Claude Session UUID Mapping
 *
 * CRITICAL: This service is the ONLY place that maps:
 * - Agent ID (e.g., "developer_01") ↔ Claude Session UUID (e.g., "19c2acd3-1403-4848-8ad2-090952c93658")
 *
 * FRONTEND RULE: Frontend NEVER sees Claude Session UUIDs - only Agent IDs
 * BACKEND RULE: All Claude file operations use Session UUIDs resolved from Agent IDs
 *
 * DATA FLOW:
 * 1. Frontend sends agentId "developer_01"
 * 2. This service maps to Claude session UUID "19c2acd3-1403-4848-8ad2-090952c93658"
 * 3. StudioSessionService loads from "~/.claude/projects/-project-path/19c2acd3-1403-4848-8ad2-090952c93658.jsonl"
 * 4. Results returned to frontend (no UUIDs exposed)
 *
 * KISS: Simple interface for session management
 * SOLID: Single responsibility - session tracking only
 * DRY: Uses ConfigService for storage + ALL agent→session mapping happens here ONLY
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
   * Get current Claude Session UUID for an agent
   * @param projectId Project identifier
   * @param agentId Agent instance ID (e.g., "developer_01")
   * @returns Claude Session UUID (e.g., "19c2acd3-1403-4848-8ad2-090952c93658") or null
   */
  async getSession(projectId: string, agentId: string): Promise<string | null> {
    const sessions = await this.configService.getProjectSessions(projectId)
    return sessions?.[agentId] || null
  }

  /**
   * Update Claude Session UUID for an agent (called when Claude creates new session)
   * @param projectId Project identifier
   * @param agentId Agent instance ID (e.g., "developer_01")
   * @param sessionId Claude Session UUID (e.g., "19c2acd3-1403-4848-8ad2-090952c93658")
   */
  async updateSession(projectId: string, agentId: string, sessionId: string): Promise<void> {
    const sessions = (await this.configService.getProjectSessions(projectId)) || {}
    sessions[agentId] = sessionId
    await this.configService.saveSession(projectId, sessions)
  }

  /**
   * Clear session for an agent (removes from tracking)
   */
  async clearSession(projectId: string, agentId: string): Promise<void> {
    const sessions = (await this.configService.getProjectSessions(projectId)) || {}
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
    return (await this.configService.getProjectSessions(projectId)) || {}
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
