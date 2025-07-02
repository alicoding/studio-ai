import fs from 'fs/promises'
import path from 'path'
import os from 'os'

export interface ClaudeProject {
  id: string
  name: string
  path: string
  sessionCount: number
  lastModified: Date
  sessions: string[]
}

/**
 * Service to scan and parse Claude Code projects from ~/.claude/projects/
 * Follows SOLID principles - Single responsibility for Claude project discovery
 */
export class ClaudeProjectScanner {
  private readonly claudeProjectsPath: string

  constructor() {
    this.claudeProjectsPath = path.join(os.homedir(), '.claude', 'projects')
  }

  /**
   * Get all Claude Code projects
   * KISS: Simple directory scanning and parsing
   */
  async getProjects(): Promise<ClaudeProject[]> {
    try {
      const projectDirs = await this.getProjectDirectories()
      const projects = await Promise.all(
        projectDirs.map(dir => this.parseProjectDirectory(dir))
      )
      return projects.filter(Boolean) as ClaudeProject[]
    } catch (error) {
      console.error('Error scanning Claude projects:', error)
      return []
    }
  }

  /**
   * Get a specific project by ID
   */
  async getProject(projectId: string): Promise<ClaudeProject | null> {
    const projects = await this.getProjects()
    return projects.find(p => p.id === projectId) || null
  }

  /**
   * Check if Claude projects directory exists
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.claudeProjectsPath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Get all project directory names
   * DRY: Reusable directory listing
   */
  private async getProjectDirectories(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.claudeProjectsPath, { withFileTypes: true })
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
    } catch {
      return []
    }
  }

  /**
   * Parse a single project directory
   * SOLID: Single responsibility for parsing one project
   */
  private async parseProjectDirectory(dirName: string): Promise<ClaudeProject | null> {
    try {
      const projectPath = path.join(this.claudeProjectsPath, dirName)
      const sessions = await this.getSessionFiles(projectPath)
      const { createdAt, lastSessionAt } = await this.getProjectDates(projectPath, sessions)
      
      // Get the actual working directory from the first session
      const actualPath = await this.getActualProjectPath(projectPath, sessions)
      
      return {
        id: dirName,
        name: this.sanitizedNameToReadable(actualPath),
        path: actualPath,
        sessionCount: sessions.length,
        lastModified: lastSessionAt || createdAt,
        sessions: sessions,
      }
    } catch (error) {
      console.error(`Error parsing project ${dirName}:`, error)
      return null
    }
  }

  /**
   * Get all session files (.jsonl) in a project directory
   */
  private async getSessionFiles(projectPath: string): Promise<string[]> {
    try {
      const files = await fs.readdir(projectPath)
      return files.filter(file => file.endsWith('.jsonl'))
    } catch {
      return []
    }
  }

  /**
   * Get comprehensive project dates from directory and session files
   */
  private async getProjectDates(projectPath: string, sessions: string[]): Promise<{
    createdAt: Date;
    lastModified: Date;
    lastSessionAt?: Date;
  }> {
    try {
      // Get directory creation/modification dates
      const dirStat = await fs.stat(projectPath)
      const createdAt = dirStat.birthtime || dirStat.ctime
      let lastModified = dirStat.mtime
      let lastSessionAt: Date | undefined

      if (sessions.length > 0) {
        // Get the most recent session file for lastSessionAt
        const sessionPaths = sessions.map(session => path.join(projectPath, session))
        const sessionStats = await Promise.all(
          sessionPaths.map(async sessionPath => {
            const stat = await fs.stat(sessionPath)
            return { path: sessionPath, mtime: stat.mtime }
          })
        )
        
        // Find the most recently modified session
        const mostRecentSession = sessionStats.reduce((latest, current) => 
          current.mtime > latest.mtime ? current : latest
        )
        
        lastSessionAt = mostRecentSession.mtime
        
        // Update lastModified to be the more recent of directory or sessions
        if (lastSessionAt > lastModified) {
          lastModified = lastSessionAt
        }
      }

      return {
        createdAt,
        lastModified,
        lastSessionAt,
      }
    } catch (error) {
      console.error('Error getting project dates:', error)
      const fallbackDate = new Date()
      return {
        createdAt: fallbackDate,
        lastModified: fallbackDate,
        lastSessionAt: undefined,
      }
    }
  }

  /**
   * Get the actual project path by reading the cwd from a .jsonl session
   */
  private async getActualProjectPath(projectPath: string, sessions: string[]): Promise<string> {
    for (const sessionFile of sessions) {
      try {
        const sessionPath = path.join(projectPath, sessionFile)
        const content = await fs.readFile(sessionPath, 'utf-8')
        const lines = content.split('\n')
        
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const data = JSON.parse(line)
            if (data.cwd) {
              return data.cwd
            }
          } catch {
            // Skip malformed lines
          }
        }
      } catch {
        // Try next session file
      }
    }

    // No cwd found in any session
    return path.basename(projectPath)
  }

  /**
   * Convert path to readable project name
   */
  private sanitizedNameToReadable(actualPath: string): string {
    // If it's just the directory name (no cwd found), extract from it
    if (actualPath.startsWith('-')) {
      // It's still the encoded directory name, get the last part
      const parts = actualPath.split('-').filter(Boolean)
      return parts[parts.length - 1] || actualPath
    }
    // Otherwise get the last part of the path
    return path.basename(actualPath)
  }
}