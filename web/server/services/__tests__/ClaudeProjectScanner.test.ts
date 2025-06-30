import { describe, it, expect, beforeEach, vi } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { ClaudeProjectScanner } from '../ClaudeProjectScanner'

vi.mock('fs/promises')
vi.mock('os')

describe('ClaudeProjectScanner', () => {
  let scanner: ClaudeProjectScanner

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(os.homedir).mockReturnValue('/Users/test')
    scanner = new ClaudeProjectScanner()
  })

  describe('getProjects', () => {
    it('should handle project with sessions containing cwd', async () => {
      // Setup mock file system
      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.readdir).mockImplementation(async (dir: any) => {
        if (dir === '/Users/test/.claude/projects') {
          return [
            { name: '-Users-ali-claude-swarm-claude-team', isDirectory: () => true }
          ] as any
        }
        return ['session1.jsonl']
      })

      // Mock session file content with cwd
      const sessionContent = JSON.stringify({ 
        cwd: '/Users/ali/claude-swarm/claude-team',
        type: 'user',
        message: { role: 'user', content: 'test' }
      }) + '\n'
      
      vi.mocked(fs.readFile).mockResolvedValue(sessionContent)
      vi.mocked(fs.stat).mockResolvedValue({
        birthtime: new Date('2024-01-01'),
        mtime: new Date('2024-01-02'),
        ctime: new Date('2024-01-01'),
      } as any)

      const projects = await scanner.getProjects()

      expect(projects).toHaveLength(1)
      expect(projects[0]).toMatchObject({
        id: '-Users-ali-claude-swarm-claude-team',
        name: 'claude-team',
        path: '/Users/ali/claude-swarm/claude-team',
        sessionCount: 1
      })
    })

    it('should handle project with no sessions', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.readdir).mockImplementation(async (dir: any) => {
        if (dir === '/Users/test/.claude/projects') {
          return [
            { name: '-Users-ali-projects-my-app', isDirectory: () => true }
          ] as any
        }
        return [] // No sessions
      })

      vi.mocked(fs.stat).mockResolvedValue({
        birthtime: new Date('2024-01-01'),
        mtime: new Date('2024-01-02'),
        ctime: new Date('2024-01-01'),
      } as any)

      const projects = await scanner.getProjects()

      expect(projects).toHaveLength(1)
      expect(projects[0]).toMatchObject({
        id: '-Users-ali-projects-my-app',
        name: 'my-app',
        path: '/Users/ali/projects/my-app', // Should decode from directory name
        sessionCount: 0
      })
    })

    it('should handle malformed session file', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.readdir).mockImplementation(async (dir: any) => {
        if (dir === '/Users/test/.claude/projects') {
          return [
            { name: '-home-user-workspace-project', isDirectory: () => true }
          ] as any
        }
        return ['corrupted.jsonl']
      })

      // Mock corrupted session file
      vi.mocked(fs.readFile).mockResolvedValue('not valid json')
      vi.mocked(fs.stat).mockResolvedValue({
        birthtime: new Date('2024-01-01'),
        mtime: new Date('2024-01-02'),
        ctime: new Date('2024-01-01'),
      } as any)

      const projects = await scanner.getProjects()

      expect(projects).toHaveLength(1)
      expect(projects[0]).toMatchObject({
        id: '-home-user-workspace-project',
        name: 'project',
        path: '/home/user/workspace/project', // Should fallback to decoded path
        sessionCount: 1
      })
    })

    it('should handle session file without cwd field', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.readdir).mockImplementation(async (dir: any) => {
        if (dir === '/Users/test/.claude/projects') {
          return [
            { name: '-var-projects-test', isDirectory: () => true }
          ] as any
        }
        return ['session.jsonl']
      })

      // Mock session without cwd
      const sessionContent = JSON.stringify({ 
        type: 'user',
        message: { role: 'user', content: 'test' }
      }) + '\n'
      
      vi.mocked(fs.readFile).mockResolvedValue(sessionContent)
      vi.mocked(fs.stat).mockResolvedValue({
        birthtime: new Date('2024-01-01'),
        mtime: new Date('2024-01-02'),
        ctime: new Date('2024-01-01'),
      } as any)

      const projects = await scanner.getProjects()

      expect(projects).toHaveLength(1)
      expect(projects[0]).toMatchObject({
        id: '-var-projects-test',
        name: 'test',
        path: '/var/projects/test', // Should fallback to decoded path
        sessionCount: 1
      })
    })
  })
})