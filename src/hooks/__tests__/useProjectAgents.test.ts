import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useProjectAgents } from '../useProjectAgents'
import { useProjectStore } from '../../stores'

// Mock the project store
vi.mock('../../stores', () => ({
  useProjectStore: vi.fn(),
}))

// Mock fetch
global.fetch = vi.fn()

describe('useProjectAgents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock console.error
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should return empty agents array when no activeProjectId', () => {
    // Arrange
    const mockStore: Partial<ReturnType<typeof useProjectStore>> = {
      activeProjectId: null,
      projects: [],
    }
    vi.mocked(useProjectStore).mockReturnValue(mockStore as ReturnType<typeof useProjectStore>)

    // Act
    const { result } = renderHook(() => useProjectAgents())

    // Assert
    expect(result.current.agents).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.activeProjectId).toBeNull()
  })

  it('should fetch and transform Claude Code sessions into agents', async () => {
    // Arrange
    const mockProjectId = 'project-123'
    const mockSessions = [
      {
        sessionId: 'session-001',
        agentName: 'Claude Assistant',
        messageCount: 42,
        createdAt: '2024-01-01T10:00:00Z',
      },
      {
        sessionId: 'session-002',
        agentName: null, // Test fallback name
        messageCount: 15,
        createdAt: '2024-01-02T10:00:00Z',
      },
    ]

    const mockStore: Partial<ReturnType<typeof useProjectStore>> = {
      activeProjectId: mockProjectId,
      projects: [],
    }
    vi.mocked(useProjectStore).mockReturnValue(mockStore as ReturnType<typeof useProjectStore>)

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sessions: mockSessions }),
    } as Response)

    // Act
    const { result } = renderHook(() => useProjectAgents())

    // Assert - Initial state
    expect(result.current.loading).toBe(true)
    expect(result.current.agents).toEqual([])

    // Wait for async operations
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Assert - After fetch
    expect(fetch).toHaveBeenCalledWith(`/api/projects/${mockProjectId}/sessions`)
    expect(result.current.agents).toHaveLength(2)

    // Check first agent transformation
    expect(result.current.agents[0]).toEqual({
      id: 'session-001',
      name: 'Claude Assistant',
      role: 'Claude Code Agent',
      status: 'offline',
      tokens: 0,
      maxTokens: 200000,
      lastMessage: '42 messages',
      sessionId: 'session-001',
    })

    // Check second agent with fallback name
    expect(result.current.agents[1]).toEqual({
      id: 'session-002',
      name: 'Agent session-',
      role: 'Claude Code Agent',
      status: 'offline',
      tokens: 0,
      maxTokens: 200000,
      lastMessage: '15 messages',
      sessionId: 'session-002',
    })
  })

  it('should handle fetch errors gracefully', async () => {
    // Arrange
    const mockProjectId = 'project-123'
    const mockStore: Partial<ReturnType<typeof useProjectStore>> = {
      activeProjectId: mockProjectId,
      projects: [],
    }
    vi.mocked(useProjectStore).mockReturnValue(mockStore as ReturnType<typeof useProjectStore>)

    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    // Act
    const { result } = renderHook(() => useProjectAgents())

    // Wait for async operations
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Assert
    expect(result.current.agents).toEqual([])
    expect(console.error).toHaveBeenCalledWith('Error fetching project agents:', expect.any(Error))
  })

  it('should handle non-ok responses', async () => {
    // Arrange
    const mockProjectId = 'project-123'
    const mockStore: Partial<ReturnType<typeof useProjectStore>> = {
      activeProjectId: mockProjectId,
      projects: [],
    }
    vi.mocked(useProjectStore).mockReturnValue(mockStore as ReturnType<typeof useProjectStore>)

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response)

    // Act
    const { result } = renderHook(() => useProjectAgents())

    // Wait for async operations
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Assert
    expect(result.current.agents).toEqual([])
  })

  it('should refetch when activeProjectId changes', async () => {
    // Arrange - First project
    const mockStore: Partial<ReturnType<typeof useProjectStore>> = {
      activeProjectId: 'project-123',
      projects: [],
    }
    vi.mocked(useProjectStore).mockReturnValue(mockStore as ReturnType<typeof useProjectStore>)

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sessions: [] }),
    } as Response)

    // Act - Initial render
    const { result, rerender } = renderHook(() => useProjectAgents())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(fetch).toHaveBeenCalledWith('/api/projects/project-123/sessions')

    // Arrange - Change to second project
    const mockStore2: Partial<ReturnType<typeof useProjectStore>> = {
      activeProjectId: 'project-456',
      projects: [],
    }
    vi.mocked(useProjectStore).mockReturnValue(mockStore2 as ReturnType<typeof useProjectStore>)

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessions: [
          {
            sessionId: 'new-session',
            agentName: 'New Agent',
            messageCount: 10,
          },
        ],
      }),
    } as Response)

    // Act - Rerender with new project
    rerender()

    await waitFor(() => {
      expect(result.current.agents).toHaveLength(1)
    })

    // Assert
    expect(fetch).toHaveBeenCalledWith('/api/projects/project-456/sessions')
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(result.current.agents[0].name).toBe('New Agent')
  })
})
