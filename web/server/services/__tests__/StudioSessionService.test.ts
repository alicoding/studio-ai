/**
 * StudioSessionService Tests
 * 
 * SOLID: Single responsibility - test Studio session management
 * DRY: Reusable mock factories and test utilities
 * KISS: Simple, focused test cases
 * Library-First: Uses vitest, fs mocking patterns
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import fs from 'fs/promises'
import fsSync from 'fs'
import path from 'path'
import os from 'os'
import { StudioSessionService, SessionMessage } from '../StudioSessionService'

// Mock all file system operations
vi.mock('fs/promises')
vi.mock('fs')
vi.mock('child_process')
vi.mock('../../../src/lib/storage/database')

// Mock database
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  get: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
}

vi.mocked(require('../../../src/lib/storage/database')).getDb = vi.fn(() => mockDb)

// Mock child_process for grep operations
const mockExecSync = vi.fn()
vi.mocked(require('child_process')).execSync = mockExecSync

describe('StudioSessionService', () => {
  let service: StudioSessionService
  let mockFs: typeof fs
  let mockFsSync: typeof fsSync

  beforeEach(() => {
    // Reset singleton instance
    // @ts-ignore - accessing private static property for testing
    StudioSessionService.instance = undefined
    
    service = StudioSessionService.getInstance()
    mockFs = vi.mocked(fs)
    mockFsSync = vi.mocked(fsSync)
    
    // Reset all mocks
    vi.clearAllMocks()
    
    // Mock os.homedir
    vi.spyOn(os, 'homedir').mockReturnValue('/home/user')
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Singleton Pattern (SRP)', () => {
    it('should return same instance for multiple calls', () => {
      const instance1 = StudioSessionService.getInstance()
      const instance2 = StudioSessionService.getInstance()
      
      expect(instance1).toBe(instance2)
    })

    it('should maintain singleton after method calls', () => {
      const instance1 = StudioSessionService.getInstance()
      const instance2 = StudioSessionService.getInstance()
      
      expect(instance1).toBe(service)
      expect(instance2).toBe(service)
    })
  })

  describe('getClaudeProjectFolder - Private Directory Bug Fix (OCP)', () => {
    const workspacePath = '/workspace/test-project'
    const normalizedPath = '-workspace-test-project'
    const privatePath = '/home/user/.claude/projects/-private-workspace-test-project'
    const regularPath = '/home/user/.claude/projects/-workspace-test-project'

    beforeEach(() => {
      // Default: both paths don't exist
      mockFsSync.accessSync = vi.fn().mockImplementation((path: string) => {
        throw new Error(`ENOENT: no such file or directory, access '${path}'`)
      })
    })

    it('should handle tilde expansion in workspace path', () => {
      const tildeWorkspace = '~/workspace/test-project'
      
      // Mock private path exists with files
      mockFsSync.accessSync = vi.fn().mockImplementation((path: string) => {
        if (path.includes('-private-home-user-workspace-test-project')) {
          return // Success - path exists
        }
        throw new Error('Path does not exist')
      })
      
      mockFsSync.readdirSync = vi.fn().mockReturnValue(['session1.jsonl', 'session2.jsonl'])

      // Use reflection to test private method
      const result = (service as any).getClaudeProjectFolder(tildeWorkspace)
      
      expect(result).toContain('-private-home-user-workspace-test-project')
    })

    it('should prefer regular path when it has more JSONL files (Bug Fix)', () => {
      // Mock both paths exist
      mockFsSync.accessSync = vi.fn() // Both succeed
      
      // Private path has fewer files
      // Regular path has more files (this is the bug fix scenario)
      mockFsSync.readdirSync = vi.fn().mockImplementation((path: string) => {
        if (path === privatePath) {
          return ['session1.jsonl'] // 1 file
        } else if (path === regularPath) {
          return ['session1.jsonl', 'session2.jsonl', 'session3.jsonl'] // 3 files
        }
        return []
      })

      const result = (service as any).getClaudeProjectFolder(workspacePath)
      
      expect(result).toBe(regularPath)
      expect(mockFsSync.readdirSync).toHaveBeenCalledWith(privatePath)
      expect(mockFsSync.readdirSync).toHaveBeenCalledWith(regularPath)
    })

    it('should choose path with more recent files when both have same count', () => {
      // Mock both paths exist
      mockFsSync.accessSync = vi.fn()
      
      // Both have same number of files
      mockFsSync.readdirSync = vi.fn().mockReturnValue(['session1.jsonl'])
      
      // Mock file stats - regular path is more recent
      const oldDate = new Date('2024-01-01')
      const newDate = new Date('2024-01-02')
      
      mockFsSync.statSync = vi.fn().mockImplementation((filePath: string) => {
        if (filePath.includes(privatePath)) {
          return { mtime: oldDate }
        } else if (filePath.includes(regularPath)) {
          return { mtime: newDate }
        }
        throw new Error('File not found')
      })

      const result = (service as any).getClaudeProjectFolder(workspacePath)
      
      expect(result).toBe(regularPath)
    })

    it('should default to private path when only private exists', () => {
      // Only private path exists
      mockFsSync.accessSync = vi.fn().mockImplementation((path: string) => {
        if (path === privatePath) {
          return // Success
        }
        throw new Error('Path does not exist')
      })
      
      mockFsSync.readdirSync = vi.fn().mockReturnValue(['session1.jsonl'])

      const result = (service as any).getClaudeProjectFolder(workspacePath)
      
      expect(result).toBe(privatePath)
    })

    it('should default to regular path when only regular exists', () => {
      // Only regular path exists
      mockFsSync.accessSync = vi.fn().mockImplementation((path: string) => {
        if (path === regularPath) {
          return // Success
        }
        throw new Error('Path does not exist')
      })
      
      mockFsSync.readdirSync = vi.fn().mockReturnValue(['session1.jsonl'])

      const result = (service as any).getClaudeProjectFolder(workspacePath)
      
      expect(result).toBe(regularPath)
    })

    it('should default to regular path when neither exists', () => {
      // Both paths don't exist (default mock behavior)
      const result = (service as any).getClaudeProjectFolder(workspacePath)
      
      expect(result).toBe(regularPath)
    })

    it('should handle private path with files but no regular path', () => {
      mockFsSync.accessSync = vi.fn().mockImplementation((path: string) => {
        if (path === privatePath) {
          return // Success
        }
        throw new Error('Path does not exist')
      })
      
      mockFsSync.readdirSync = vi.fn().mockReturnValue(['session1.jsonl', 'session2.jsonl'])

      const result = (service as any).getClaudeProjectFolder(workspacePath)
      
      expect(result).toBe(privatePath)
    })
  })

  describe('findProjectFolderBySessionId (DIP)', () => {
    const sessionId = 'test-session-123'
    const projectsDir = '/home/user/.claude/projects'

    it('should find project folder using grep when session exists', async () => {
      const expectedPath = '/home/user/.claude/projects/my-project'
      const grepResult = `${expectedPath}/session-123.jsonl`
      
      mockExecSync.mockReturnValue(grepResult)

      const result = await (service as any).findProjectFolderBySessionId(sessionId)
      
      expect(result).toBe(expectedPath)
      expect(mockExecSync).toHaveBeenCalledWith(
        `grep -r "${sessionId}" "${projectsDir}" --include="*.jsonl" -l | head -1`,
        { encoding: 'utf-8' }
      )
    })

    it('should return null when session not found', async () => {
      mockExecSync.mockReturnValue('')

      const result = await (service as any).findProjectFolderBySessionId(sessionId)
      
      expect(result).toBeNull()
    })

    it('should return null when grep command fails', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('grep command failed')
      })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const result = await (service as any).findProjectFolderBySessionId(sessionId)
      
      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith(`Session ${sessionId} not found in Claude projects`)
      
      consoleSpy.mockRestore()
    })

    it('should handle whitespace in grep results', async () => {
      const expectedPath = '/home/user/.claude/projects/my-project'
      const grepResult = `  ${expectedPath}/session-123.jsonl  \n`
      
      mockExecSync.mockReturnValue(grepResult)

      const result = await (service as any).findProjectFolderBySessionId(sessionId)
      
      expect(result).toBe(expectedPath)
    })
  })

  describe('getSessionMessages with Pagination (ISP)', () => {
    const workspacePath = '/workspace/test'
    const sessionId = 'test-session'
    const projectId = 'project-123'

    const createMockJsonlContent = (messageCount: number): string => {
      const messages = []
      for (let i = 0; i < messageCount; i++) {
        messages.push(JSON.stringify({
          type: 'message',
          message: {
            role: i % 2 === 0 ? 'user' : 'assistant',
            content: `Message ${i + 1}`,
            model: 'claude-3-sonnet'
          },
          timestamp: new Date(Date.now() + i * 1000).toISOString()
        }))
      }
      return messages.join('\n')
    }

    beforeEach(() => {
      // Mock findProjectFolderBySessionId to return a path
      vi.spyOn(service as any, 'findProjectFolderBySessionId').mockResolvedValue('/found/project/path')
      
      // Mock database operations
      mockDb.get.mockResolvedValue(null)
      mockDb.insert.mockResolvedValue({})
    })

    it('should return last messages on initial load (no cursor)', async () => {
      const jsonlContent = createMockJsonlContent(100) // 100 messages
      mockFs.readFile = vi.fn().mockResolvedValue(jsonlContent)

      const result = await service.getSessionMessages(workspacePath, sessionId, { limit: 10 })
      
      expect(result.messages).toHaveLength(10)
      expect(result.hasMore).toBe(true)
      expect(result.nextCursor).toBe('90') // startIndex for next page
      
      // Should get the last 10 messages (messages 91-100)
      expect(result.messages[0].content).toBe('Message 91')
      expect(result.messages[9].content).toBe('Message 100')
    })

    it('should handle pagination with cursor', async () => {
      const jsonlContent = createMockJsonlContent(100)
      mockFs.readFile = vi.fn().mockResolvedValue(jsonlContent)

      // Request earlier messages with cursor
      const result = await service.getSessionMessages(workspacePath, sessionId, { 
        limit: 10, 
        cursor: '90' // endIndex from previous call
      })
      
      expect(result.messages).toHaveLength(10)
      expect(result.hasMore).toBe(true)
      expect(result.nextCursor).toBe('80')
      
      // Should get messages 81-90
      expect(result.messages[0].content).toBe('Message 81')
      expect(result.messages[9].content).toBe('Message 90')
    })

    it('should handle last page correctly', async () => {
      const jsonlContent = createMockJsonlContent(25) // Small set
      mockFs.readFile = vi.fn().mockResolvedValue(jsonlContent)

      // Request with cursor that reaches beginning
      const result = await service.getSessionMessages(workspacePath, sessionId, { 
        limit: 10, 
        cursor: '10' 
      })
      
      expect(result.messages).toHaveLength(10)
      expect(result.hasMore).toBe(false)
      expect(result.nextCursor).toBeUndefined()
      
      // Should get messages 1-10
      expect(result.messages[0].content).toBe('Message 1')
      expect(result.messages[9].content).toBe('Message 10')
    })

    it('should handle empty or small message sets', async () => {
      const jsonlContent = createMockJsonlContent(3) // Only 3 messages
      mockFs.readFile = vi.fn().mockResolvedValue(jsonlContent)

      const result = await service.getSessionMessages(workspacePath, sessionId, { limit: 10 })
      
      expect(result.messages).toHaveLength(3)
      expect(result.hasMore).toBe(false)
      expect(result.nextCursor).toBeUndefined()
    })

    it('should skip malformed JSON lines', async () => {
      const jsonlContent = [
        JSON.stringify({ type: 'message', message: { role: 'user', content: 'Valid message 1' } }),
        'invalid json line',
        JSON.stringify({ type: 'message', message: { role: 'assistant', content: 'Valid message 2' } }),
        '{ incomplete json',
        JSON.stringify({ type: 'message', message: { role: 'user', content: 'Valid message 3' } }),
      ].join('\n')
      
      mockFs.readFile = vi.fn().mockResolvedValue(jsonlContent)

      const result = await service.getSessionMessages(workspacePath, sessionId)
      
      expect(result.messages).toHaveLength(3)
      expect(result.messages[0].content).toBe('Valid message 1')
      expect(result.messages[1].content).toBe('Valid message 2')
      expect(result.messages[2].content).toBe('Valid message 3')
    })

    it('should skip summary messages', async () => {
      const jsonlContent = [
        JSON.stringify({ type: 'summary', content: 'This is a summary' }),
        JSON.stringify({ type: 'message', message: { role: 'user', content: 'User message' } }),
        JSON.stringify({ type: 'summary', content: 'Another summary' }),
        JSON.stringify({ type: 'message', message: { role: 'assistant', content: 'Assistant message' } }),
      ].join('\n')
      
      mockFs.readFile = vi.fn().mockResolvedValue(jsonlContent)

      const result = await service.getSessionMessages(workspacePath, sessionId)
      
      expect(result.messages).toHaveLength(2)
      expect(result.messages[0].content).toBe('User message')
      expect(result.messages[1].content).toBe('Assistant message')
    })

    it('should handle different message formats', async () => {
      const jsonlContent = [
        // Standard message format
        JSON.stringify({ 
          type: 'message', 
          message: { role: 'user', content: 'Standard format', model: 'claude-3-sonnet' },
          timestamp: '2024-01-01T00:00:00Z'
        }),
        // Legacy format with direct content
        JSON.stringify({ 
          type: 'user', 
          content: 'Legacy format',
          timestamp: '2024-01-01T00:01:00Z'
        }),
        // Message with usage stats
        JSON.stringify({ 
          type: 'message', 
          message: { 
            role: 'assistant', 
            content: 'With usage', 
            usage: { input_tokens: 10, output_tokens: 20 } 
          },
          timestamp: '2024-01-01T00:02:00Z'
        }),
      ].join('\n')
      
      mockFs.readFile = vi.fn().mockResolvedValue(jsonlContent)

      const result = await service.getSessionMessages(workspacePath, sessionId)
      
      expect(result.messages).toHaveLength(3)
      
      // Check standard format
      expect(result.messages[0].role).toBe('user')
      expect(result.messages[0].content).toBe('Standard format')
      expect(result.messages[0].model).toBe('claude-3-sonnet')
      expect(result.messages[0].timestamp).toBe('2024-01-01T00:00:00Z')
      
      // Check legacy format
      expect(result.messages[1].role).toBe('user')
      expect(result.messages[1].content).toBe('Legacy format')
      
      // Check usage stats
      expect(result.messages[2].usage).toEqual({ input_tokens: 10, output_tokens: 20 })
    })

    it('should use cached path from database when session not found by ID', async () => {
      const cachedPath = '/cached/project/path'
      
      // Mock findProjectFolderBySessionId to return null
      vi.spyOn(service as any, 'findProjectFolderBySessionId').mockResolvedValue(null)
      
      // Mock database to return cached path
      mockDb.get.mockResolvedValue({ claudePath: cachedPath })
      
      mockFs.readFile = vi.fn().mockResolvedValue('')

      await service.getSessionMessages(workspacePath, sessionId, {}, projectId)
      
      expect(mockDb.select).toHaveBeenCalled()
      expect(mockFs.readFile).toHaveBeenCalledWith(
        path.join(cachedPath, `${sessionId}.jsonl`),
        'utf-8'
      )
    })

    it('should update cache when project folder is found', async () => {
      const foundPath = '/found/project/path'
      
      vi.spyOn(service as any, 'findProjectFolderBySessionId').mockResolvedValue(foundPath)
      mockFs.readFile = vi.fn().mockResolvedValue('')

      await service.getSessionMessages(workspacePath, sessionId, {}, projectId)
      
      expect(mockDb.insert).toHaveBeenCalled()
      expect(mockDb.values).toHaveBeenCalledWith({
        projectId,
        claudePath: foundPath,
      })
    })

    it('should include 200ms delay for file system stability', async () => {
      const startTime = Date.now()
      
      mockFs.readFile = vi.fn().mockResolvedValue('')
      
      await service.getSessionMessages(workspacePath, sessionId)
      
      const elapsed = Date.now() - startTime
      expect(elapsed).toBeGreaterThanOrEqual(190) // Allow some timing variance
    })
  })

  describe('Edge Cases (Error Handling)', () => {
    const workspacePath = '/workspace/test'
    const sessionId = 'test-session'

    it('should handle missing session file gracefully', async () => {
      vi.spyOn(service as any, 'findProjectFolderBySessionId').mockResolvedValue('/found/path')
      
      mockFs.readFile = vi.fn().mockRejectedValue(new Error('ENOENT: file not found'))
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await service.getSessionMessages(workspacePath, sessionId)
      
      expect(result.messages).toEqual([])
      expect(result.hasMore).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Error reading session:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('should handle empty JSONL file', async () => {
      vi.spyOn(service as any, 'findProjectFolderBySessionId').mockResolvedValue('/found/path')
      
      mockFs.readFile = vi.fn().mockResolvedValue('')

      const result = await service.getSessionMessages(workspacePath, sessionId)
      
      expect(result.messages).toEqual([])
      expect(result.hasMore).toBe(false)
    })

    it('should handle JSONL file with only whitespace', async () => {
      vi.spyOn(service as any, 'findProjectFolderBySessionId').mockResolvedValue('/found/path')
      
      mockFs.readFile = vi.fn().mockResolvedValue('   \n  \n  \t  \n')

      const result = await service.getSessionMessages(workspacePath, sessionId)
      
      expect(result.messages).toEqual([])
      expect(result.hasMore).toBe(false)
    })

    it('should handle database connection errors gracefully', async () => {
      vi.spyOn(service as any, 'findProjectFolderBySessionId').mockResolvedValue(null)
      
      // Mock database to throw error
      mockDb.get.mockRejectedValue(new Error('Database connection failed'))
      
      vi.spyOn(service as any, 'getClaudeProjectFolder').mockReturnValue('/fallback/path')
      mockFs.readFile = vi.fn().mockResolvedValue('')

      // Should not throw, should fall back to getClaudeProjectFolder
      const result = await service.getSessionMessages(workspacePath, sessionId, {}, 'project-123')
      
      expect(result).toBeDefined()
    })
  })

  describe('listProjectSessions (SRP)', () => {
    const workspacePath = '/workspace/test'

    it('should list sessions sorted by last activity', async () => {
      vi.spyOn(service as any, 'getClaudeProjectFolder').mockReturnValue('/project/path')
      
      const mockFiles = ['session1.jsonl', 'session2.jsonl', 'other.txt', 'session3.jsonl']
      mockFs.readdir = vi.fn().mockResolvedValue(mockFiles)
      
      // Mock file stats with different modification times
      mockFs.stat = vi.fn().mockImplementation((filePath: string) => {
        const fileName = path.basename(filePath as string)
        const baseTime = new Date('2024-01-01T00:00:00Z').getTime()
        
        if (fileName === 'session1.jsonl') {
          return Promise.resolve({
            birthtime: new Date(baseTime),
            ctime: new Date(baseTime),
            mtime: new Date(baseTime + 1000), // Oldest
            size: 1000,
          })
        } else if (fileName === 'session2.jsonl') {
          return Promise.resolve({
            birthtime: new Date(baseTime + 2000),
            ctime: new Date(baseTime + 2000),
            mtime: new Date(baseTime + 3000), // Newest
            size: 2000,
          })
        } else if (fileName === 'session3.jsonl') {
          return Promise.resolve({
            birthtime: new Date(baseTime + 1000),
            ctime: new Date(baseTime + 1000),
            mtime: new Date(baseTime + 2000), // Middle
            size: 1500,
          })
        }
        throw new Error('Unexpected file')
      })

      const result = await service.listProjectSessions(workspacePath)
      
      expect(result).toHaveLength(3)
      
      // Should be sorted by last activity (mtime) descending
      expect(result[0].sessionId).toBe('session2') // Newest
      expect(result[1].sessionId).toBe('session3') // Middle
      expect(result[2].sessionId).toBe('session1') // Oldest
      
      // Check properties
      expect(result[0].fileName).toBe('session2.jsonl')
      expect(result[0].size).toBe(2000)
    })

    it('should handle missing project directory', async () => {
      vi.spyOn(service as any, 'getClaudeProjectFolder').mockReturnValue('/nonexistent/path')
      
      mockFs.readdir = vi.fn().mockRejectedValue(new Error('ENOENT: directory not found'))
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const result = await service.listProjectSessions(workspacePath)
      
      expect(result).toEqual([])
      expect(consoleSpy).toHaveBeenCalledWith('No sessions found for project at /workspace/test')
      
      consoleSpy.mockRestore()
    })

    it('should handle directory with no JSONL files', async () => {
      vi.spyOn(service as any, 'getClaudeProjectFolder').mockReturnValue('/project/path')
      
      mockFs.readdir = vi.fn().mockResolvedValue(['readme.txt', 'config.json', 'other.log'])

      const result = await service.listProjectSessions(workspacePath)
      
      expect(result).toEqual([])
    })
  })

  describe('deleteSession (Error Handling)', () => {
    const workspacePath = '/workspace/test'
    const sessionId = 'test-session'

    it('should delete session file successfully', async () => {
      vi.spyOn(service as any, 'getClaudeProjectFolder').mockReturnValue('/project/path')
      
      mockFs.unlink = vi.fn().mockResolvedValue(undefined)

      await expect(service.deleteSession(workspacePath, sessionId)).resolves.toBeUndefined()
      
      expect(mockFs.unlink).toHaveBeenCalledWith('/project/path/test-session.jsonl')
    })

    it('should throw error when deletion fails', async () => {
      vi.spyOn(service as any, 'getClaudeProjectFolder').mockReturnValue('/project/path')
      
      const deleteError = new Error('Permission denied')
      mockFs.unlink = vi.fn().mockRejectedValue(deleteError)
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(service.deleteSession(workspacePath, sessionId))
        .rejects.toThrow('Failed to delete session')
      
      expect(consoleSpy).toHaveBeenCalledWith('Error deleting session:', deleteError)
      
      consoleSpy.mockRestore()
    })
  })

  describe('exportSessionAsJsonl (File Access)', () => {
    const workspacePath = '/workspace/test'
    const sessionId = 'test-session'

    it('should export session content successfully', async () => {
      vi.spyOn(service as any, 'getClaudeProjectFolder').mockReturnValue('/project/path')
      
      const mockContent = '{"type":"message","content":"test"}\n{"type":"message","content":"test2"}'
      
      mockFs.access = vi.fn().mockResolvedValue(undefined)
      mockFs.readFile = vi.fn().mockResolvedValue(mockContent)

      const result = await service.exportSessionAsJsonl(workspacePath, sessionId)
      
      expect(result).toBe(mockContent)
      expect(mockFs.access).toHaveBeenCalledWith('/project/path/test-session.jsonl')
      expect(mockFs.readFile).toHaveBeenCalledWith('/project/path/test-session.jsonl', 'utf-8')
    })

    it('should throw error when session file does not exist', async () => {
      vi.spyOn(service as any, 'getClaudeProjectFolder').mockReturnValue('/project/path')
      
      const accessError = new Error('ENOENT: file not found')
      mockFs.access = vi.fn().mockRejectedValue(accessError)
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(service.exportSessionAsJsonl(workspacePath, sessionId))
        .rejects.toThrow('Session test-session not found')
      
      expect(consoleSpy).toHaveBeenCalledWith('Error exporting session:', accessError)
      
      consoleSpy.mockRestore()
    })
  })
})