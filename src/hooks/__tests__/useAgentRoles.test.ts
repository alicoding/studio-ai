/**
 * Tests for useAgentRoles hook
 *
 * SOLID: Test single responsibility of role assignment
 * DRY: Reusable test utilities
 * KISS: Simple, focused test cases
 */

import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, MockedFunction } from 'vitest'
import { useAgentRoles } from '../useAgentRoles'

// Type-safe mock fetch
const mockFetch = vi.fn() as MockedFunction<typeof fetch>
global.fetch = mockFetch

// Mock Zustand store
vi.mock('../../stores', () => ({
  useAgentStore: vi.fn(() => ({
    configs: [
      { id: 'senior-dev', name: 'Senior Developer', role: 'developer' },
      { id: 'junior-dev', name: 'Junior Developer', role: 'developer' },
      { id: 'architect', name: 'Architect', role: 'architect' },
    ],
    updateAgentFromConfig: vi.fn(),
  })),
}))

describe('useAgentRoles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  describe('loadAssignments', () => {
    it('should load assignments for studio project agents', async () => {
      const mockAssignments = {
        dev_01: {
          agentId: 'dev_01',
          roleId: 'senior-dev',
          role: 'developer',
          customTools: ['read', 'write'],
          assignedAt: '2025-01-09T10:00:00Z',
          updatedAt: '2025-01-09T10:00:00Z',
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAssignments,
      } as Response)

      const { result } = renderHook(() => useAgentRoles())

      await act(async () => {
        await result.current.loadAssignments(['dev_01'], 'project-123')
      })

      expect(global.fetch).toHaveBeenCalledWith('/api/agent-roles/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentIds: ['dev_01'], projectId: 'project-123' }),
      })

      expect(result.current.roleAssignments).toEqual(mockAssignments)
    })

    it('should handle empty agent IDs', async () => {
      const { result } = renderHook(() => useAgentRoles())

      await act(async () => {
        await result.current.loadAssignments([])
      })

      expect(global.fetch).not.toHaveBeenCalled()
      expect(result.current.roleAssignments).toEqual({})
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useAgentRoles())

      await act(async () => {
        await result.current.loadAssignments(['dev_01'], 'project-123')
      })

      expect(result.current.roleAssignments).toEqual({})
      expect(consoleError).toHaveBeenCalledWith('Failed to load role assignments:', 500)

      consoleError.mockRestore()
    })
  })

  describe('assignRole', () => {
    it('should assign role to studio project agent', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true } as Response) // DELETE request
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'project-123', agents: [] }),
        } as Response) // POST request

      const { result } = renderHook(() => useAgentRoles())

      await act(async () => {
        const assignment = await result.current.assignRole(
          'dev_01',
          'senior-dev',
          ['read', 'write'],
          'project-123'
        )

        expect(assignment).toEqual({
          agentId: 'dev_01',
          roleId: 'senior-dev',
          customTools: ['read', 'write'],
          assignedAt: expect.any(String),
          updatedAt: expect.any(String),
        })
      })

      // Verify DELETE call
      expect(global.fetch).toHaveBeenCalledWith('/api/studio-projects/project-123/agents/dev', {
        method: 'DELETE',
      })

      // Verify POST call
      expect(global.fetch).toHaveBeenCalledWith('/api/studio-projects/project-123/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'dev',
          agentConfigId: 'senior-dev',
          customTools: ['read', 'write'],
        }),
      })
    })

    it('should handle legacy agents without project ID', async () => {
      const mockAssignment = {
        agentId: 'legacy-agent-123',
        roleId: 'senior-dev',
        assignedAt: '2025-01-09T10:00:00Z',
        updatedAt: '2025-01-09T10:00:00Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAssignment,
      } as Response)

      const { result } = renderHook(() => useAgentRoles())

      await act(async () => {
        const assignment = await result.current.assignRole('legacy-agent-123', 'senior-dev')

        expect(assignment).toEqual(mockAssignment)
      })

      expect(global.fetch).toHaveBeenCalledWith('/api/agent-roles/legacy-agent-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: 'senior-dev', customTools: undefined }),
      })
    })

    it('should handle assignment errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad request',
      } as Response)

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useAgentRoles())

      await expect(
        act(async () => {
          await result.current.assignRole('dev_01', 'senior-dev', [], 'project-123')
        })
      ).rejects.toThrow('Failed to remove agent: 400 - Bad request')

      consoleError.mockRestore()
    })
  })

  describe('getAgentRole', () => {
    it('should return role config for assigned agent', () => {
      const { result } = renderHook(() => useAgentRoles())

      // Manually set role assignments for testing
      act(() => {
        result.current.roleAssignments['dev_01'] = {
          agentId: 'dev_01',
          roleId: 'senior-dev',
          assignedAt: '2025-01-09T10:00:00Z',
          updatedAt: '2025-01-09T10:00:00Z',
        }
      })

      const roleConfig = result.current.getAgentRole('dev_01')
      expect(roleConfig?.id).toBe('senior-dev')
      expect(roleConfig?.name).toBe('Senior Developer')
    })

    it('should return null for unassigned agent', () => {
      const { result } = renderHook(() => useAgentRoles())
      const roleConfig = result.current.getAgentRole('unknown_01')
      expect(roleConfig).toBeNull()
    })
  })
})
