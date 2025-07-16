import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMessageOperations } from '../useMessageOperations'
import { useAgentStore } from '../../stores/agents'
import { useProjectStore } from '../../stores/projects'
import { useClaudeMessages } from '../useClaudeMessages'

// Mock dependencies
vi.mock('../../stores/agents')
vi.mock('../../stores/projects')
vi.mock('../useClaudeMessages')
vi.mock('../useProcessManager', () => ({
  useProcessManager: () => ({
    sendMention: vi.fn(),
  }),
}))
vi.mock('../useAICommands', () => ({
  useAICommands: () => ({
    isAICommand: vi.fn().mockResolvedValue(false),
    executeAICommand: vi.fn(),
  }),
}))

describe('useMessageOperations - Path Tracing', () => {
  const mockSendClaudeMessage = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock useClaudeMessages
    vi.mocked(useClaudeMessages).mockReturnValue({
      sendMessage: mockSendClaudeMessage,
      loading: false,
      error: null,
      clearError: vi.fn(),
    })

    // Mock stores with full implementation
    vi.mocked(useAgentStore).mockReturnValue({
      selectedAgentId: 'developer_01',
      updateAgentSessionId: vi.fn(),
      getProjectAgents: vi.fn().mockReturnValue([
        {
          id: 'developer_01',
          name: 'Developer',
          role: 'dev',
          status: 'online',
          sessionId: 'session-123',
          tokens: 0,
          maxTokens: 200000,
          order: 0,
        },
      ]),
      agents: [],
      configs: [],
      addAgent: vi.fn(),
      removeAgent: vi.fn(),
      updateAgentStatus: vi.fn(),
      updateAgentTokens: vi.fn(),
      updateAgentMessage: vi.fn(),
      clearingAgent: null,
      setClearingAgent: vi.fn(),
      setAgents: vi.fn(),
      setAgentConfigs: vi.fn(),
      addAgentConfig: vi.fn(),
      getConfig: vi.fn(),
      syncAgentsFromProject: vi.fn(),
    })

    vi.mocked(useProjectStore).mockReturnValue({
      activeProjectId: 'project-123',
      addToQueue: vi.fn(),
      projects: [],
      openProjects: [],
      setActiveProject: vi.fn(),
      addProject: vi.fn(),
      updateProject: vi.fn(),
      removeProject: vi.fn(),
      getOpenProjects: vi.fn(),
      clearQueue: vi.fn(),
      removeFromQueue: vi.fn(),
    })
  })

  it('should trace the path from UI to backend', async () => {
    const { result } = renderHook(() => useMessageOperations())

    // Simulate the exact scenario from the main route
    const workspaceProject = {
      id: 'project-123',
      name: 'bns-ai',
      workspacePath: '~/projects/bns-ai', // This is what we get from workspace API
    }

    // Convert to store project format (exactly like in index.tsx)
    const storeProject = {
      ...workspaceProject,
      path: workspaceProject.workspacePath || '', // Map workspacePath to path
      createdAt: new Date().toISOString(),
      sessionCount: 0,
      status: 'active' as const,
      lastModified: new Date().toISOString(),
      tags: [],
      favorite: false,
    }

    const mockAgents = [
      {
        id: 'developer_01',
        name: 'Developer',
        role: 'dev',
        status: 'online' as const,
        sessionId: 'session-123',
        tokens: 0,
        maxTokens: 200000,
        order: 0,
      },
    ]

    // Trace the call
    console.log('=== PATH TRACING TEST ===')
    console.log('1. Store project path:', storeProject.path)
    console.log('2. Workspace project path:', workspaceProject.workspacePath)

    await act(async () => {
      await result.current.sendMessage('Test message', mockAgents, storeProject)
    })

    // Check what was actually sent
    const callArgs = mockSendClaudeMessage.mock.calls[0]
    console.log('3. sendClaudeMessage called with:', callArgs)
    console.log('4. projectPath sent:', callArgs[1].projectPath)

    expect(callArgs[1].projectPath).toBe('~/projects/bns-ai')
    expect(callArgs[1].projectPath).not.toContain('studio-ai')
  })

  it('should trace what happens when activeProject is undefined', async () => {
    const { result } = renderHook(() => useMessageOperations())

    const mockAgents = [
      {
        id: 'developer_01',
        name: 'Developer',
        role: 'dev',
        status: 'online' as const,
        sessionId: 'session-123',
        tokens: 0,
        maxTokens: 200000,
        order: 0,
      },
    ]

    // Send message with undefined project
    await act(async () => {
      await result.current.sendMessage('Test message', mockAgents, undefined)
    })

    // Should not have called sendClaudeMessage
    expect(mockSendClaudeMessage).not.toHaveBeenCalled()
  })

  it('should verify the exact flow in handleRegularMessage', async () => {
    const { result } = renderHook(() => useMessageOperations())

    // This simulates the exact data structure from the UI
    const activeProject = {
      id: 'project-123',
      name: 'bns-ai',
      path: '~/projects/bns-ai', // Already converted from workspacePath
      createdAt: new Date().toISOString(),
      sessionCount: 0,
      status: 'active' as const,
      lastModified: new Date().toISOString(),
      tags: [],
      favorite: false,
    }

    const selectedAgent = {
      id: 'developer_01',
      name: 'Developer',
      role: 'dev',
      status: 'online' as const,
      sessionId: 'session-123',
      tokens: 0,
      maxTokens: 200000,
      order: 0,
    }

    console.log('=== HANDLE REGULAR MESSAGE FLOW ===')
    console.log('activeProject:', activeProject)
    console.log('selectedAgent:', selectedAgent)

    await act(async () => {
      await result.current.handleRegularMessage('Direct test', [selectedAgent], activeProject)
    })

    const options = mockSendClaudeMessage.mock.calls[0][1]
    console.log('Options passed to sendClaudeMessage:', options)

    expect(options).toEqual({
      projectId: 'project-123',
      agentId: 'developer_01',
      projectPath: '~/projects/bns-ai',
      role: 'dev',
      sessionId: 'session-123',
    })
  })
})
