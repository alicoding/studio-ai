/**
 * Comprehensive tests for useWorkflowSSE hook
 *
 * SOLID: Single responsibility - test SSE workflow event handling
 * DRY: Reusable mock factories and test utilities
 * KISS: Clear test scenarios with descriptive names
 */

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { useWorkflowSSE } from '../useWorkflowSSE'
import { useWorkflowStore } from '../../stores/workflows'

// Mock EventSource
const mockEventSource = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  close: vi.fn(),
  readyState: 1, // OPEN
  url: '',
  withCredentials: false,
  onopen: null as ((event: Event) => void) | null,
  onmessage: null as ((event: MessageEvent) => void) | null,
  onerror: null as ((event: Event) => void) | null,
  dispatchEvent: vi.fn(),
  CONNECTING: 0,
  OPEN: 1,
  CLOSED: 2,
}

// Mock EventSource constructor
const MockEventSource = vi.fn(() => mockEventSource)
Object.defineProperty(global, 'EventSource', {
  value: MockEventSource,
  writable: true,
})

// Mock workflow store
vi.mock('../../stores/workflows', () => ({
  useWorkflowStore: vi.fn(() => ({
    updateWorkflow: vi.fn(),
    updateStep: vi.fn(),
  })),
}))

// Mock console methods to avoid test noise
const consoleSpy = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
}

describe('useWorkflowSSE', () => {
  let mockUpdateWorkflow: Mock
  let mockUpdateStep: Mock

  // Helper function to create message events
  const createMessageEvent = (data: Record<string, unknown>): MessageEvent => {
    const event = new MessageEvent('message', {
      data: JSON.stringify(data),
    })
    return event
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset EventSource mock
    mockEventSource.addEventListener.mockClear()
    mockEventSource.removeEventListener.mockClear()
    mockEventSource.close.mockClear()
    mockEventSource.onopen = null
    mockEventSource.onmessage = null
    mockEventSource.onerror = null
    MockEventSource.mockClear()

    // Setup store mocks
    mockUpdateWorkflow = vi.fn()
    mockUpdateStep = vi.fn()

    vi.mocked(useWorkflowStore).mockReturnValue({
      workflows: {},
      addWorkflow: vi.fn(),
      updateWorkflow: mockUpdateWorkflow,
      updateStep: mockUpdateStep,
      removeWorkflow: vi.fn(),
      getWorkflow: vi.fn(),
      getActiveWorkflows: vi.fn(),
      clearCompletedWorkflows: vi.fn(),
    })
  })

  afterEach(() => {
    consoleSpy.log.mockClear()
    consoleSpy.warn.mockClear()
    consoleSpy.error.mockClear()
  })

  describe('Connection Management', () => {
    it('should establish SSE connection with correct URL', () => {
      // Act
      renderHook(() =>
        useWorkflowSSE({
          threadId: 'test-thread-123',
        })
      )

      // Assert
      expect(MockEventSource).toHaveBeenCalledWith('/api/invoke/stream/test-thread-123')
    })

    it('should not create connection when threadId is empty', () => {
      // Act
      renderHook(() =>
        useWorkflowSSE({
          threadId: '',
        })
      )

      // Assert
      expect(MockEventSource).not.toHaveBeenCalled()
    })

    it('should set up event handlers on connection', () => {
      // Act
      renderHook(() =>
        useWorkflowSSE({
          threadId: 'test-thread-123',
        })
      )

      // Assert
      expect(mockEventSource.onopen).toBeDefined()
      expect(mockEventSource.onmessage).toBeDefined()
      expect(mockEventSource.onerror).toBeDefined()
    })

    it('should call onConnect callback when connection opens', () => {
      // Arrange
      const onConnect = vi.fn()

      // Act
      renderHook(() =>
        useWorkflowSSE({
          threadId: 'test-thread-123',
          onConnect,
        })
      )

      // Simulate connection open
      mockEventSource.onopen?.(new Event('open'))

      // Assert
      expect(onConnect).toHaveBeenCalled()
    })

    it('should call onError callback when connection errors', () => {
      // Arrange
      const onError = vi.fn()

      // Act
      renderHook(() =>
        useWorkflowSSE({
          threadId: 'test-thread-123',
          onError,
        })
      )

      // Simulate connection error
      const errorEvent = new Event('error')
      mockEventSource.onerror?.(errorEvent)

      // Assert
      expect(onError).toHaveBeenCalledWith(errorEvent)
    })

    it('should update connection state correctly', () => {
      // Act
      const { result } = renderHook(() =>
        useWorkflowSSE({
          threadId: 'test-thread-123',
        })
      )

      // Initial state
      expect(result.current.isConnected).toBe(false)
      expect(result.current.error).toBeNull()

      // Simulate connection open
      act(() => {
        mockEventSource.onopen?.(new Event('open'))
      })
      expect(result.current.isConnected).toBe(true)
      expect(result.current.error).toBeNull()

      // Simulate connection error
      act(() => {
        mockEventSource.onerror?.(new Event('error'))
      })
      expect(result.current.isConnected).toBe(false)
      expect(result.current.error).toBe('Connection error')
    })
  })

  describe('Event Processing', () => {
    it('should handle step_start events', () => {
      // Arrange
      renderHook(() =>
        useWorkflowSSE({
          threadId: 'test-thread-123',
        })
      )

      const eventData = {
        type: 'step_start',
        threadId: 'test-thread-123',
        stepId: 'step1',
        data: {
          agentId: 'dev_01',
          sessionId: 'session-123',
        },
        timestamp: '2025-01-09T10:00:00Z',
      }

      // Act
      const messageEvent = createMessageEvent(eventData)
      mockEventSource.onmessage?.(messageEvent)

      // Assert
      expect(mockUpdateStep).toHaveBeenCalledWith('test-thread-123', 'step1', {
        status: 'running',
        startTime: '2025-01-09T10:00:00Z',
        agentId: 'dev_01',
      })
      expect(mockUpdateWorkflow).toHaveBeenCalledWith('test-thread-123', {
        currentStep: 'step1',
      })
    })

    it('should handle step_complete events', () => {
      // Arrange
      renderHook(() =>
        useWorkflowSSE({
          threadId: 'test-thread-123',
        })
      )

      const eventData = {
        type: 'step_complete',
        threadId: 'test-thread-123',
        stepId: 'step1',
        data: {
          output: 'Step completed successfully',
        },
        timestamp: '2025-01-09T10:05:00Z',
      }

      // Act
      const messageEvent = createMessageEvent(eventData)
      mockEventSource.onmessage?.(messageEvent)

      // Assert
      expect(mockUpdateStep).toHaveBeenCalledWith('test-thread-123', 'step1', {
        status: 'completed',
        endTime: '2025-01-09T10:05:00Z',
      })
    })

    it('should handle step_failed events', () => {
      // Arrange
      renderHook(() =>
        useWorkflowSSE({
          threadId: 'test-thread-123',
        })
      )

      const eventData = {
        type: 'step_failed',
        threadId: 'test-thread-123',
        stepId: 'step1',
        data: {
          error: 'Agent conflict detected',
        },
        timestamp: '2025-01-09T10:03:00Z',
      }

      // Act
      const messageEvent = createMessageEvent(eventData)
      mockEventSource.onmessage?.(messageEvent)

      // Assert
      expect(mockUpdateStep).toHaveBeenCalledWith('test-thread-123', 'step1', {
        status: 'failed',
        endTime: '2025-01-09T10:03:00Z',
        error: 'Agent conflict detected',
      })
    })

    it('should handle workflow_complete events', () => {
      // Arrange
      renderHook(() =>
        useWorkflowSSE({
          threadId: 'test-thread-123',
        })
      )

      const eventData = {
        type: 'workflow_complete',
        threadId: 'test-thread-123',
        data: {},
        timestamp: '2025-01-09T10:10:00Z',
      }

      // Act
      const messageEvent = createMessageEvent(eventData)
      mockEventSource.onmessage?.(messageEvent)

      // Assert
      expect(mockUpdateWorkflow).toHaveBeenCalledWith('test-thread-123', {
        status: 'completed',
        currentStep: undefined,
      })
    })

    it('should handle workflow_failed events', () => {
      // Arrange
      renderHook(() =>
        useWorkflowSSE({
          threadId: 'test-thread-123',
        })
      )

      const eventData = {
        type: 'workflow_failed',
        threadId: 'test-thread-123',
        data: {
          currentStep: 'step2',
          error: 'Workflow failed due to agent conflict',
        },
        timestamp: '2025-01-09T10:08:00Z',
      }

      // Act
      const messageEvent = createMessageEvent(eventData)
      mockEventSource.onmessage?.(messageEvent)

      // Assert
      expect(mockUpdateWorkflow).toHaveBeenCalledWith('test-thread-123', {
        status: 'failed',
        currentStep: 'step2',
      })
    })

    it('should handle unknown event types gracefully', () => {
      // Arrange
      renderHook(() =>
        useWorkflowSSE({
          threadId: 'test-thread-123',
        })
      )

      const eventData = {
        type: 'unknown_event',
        threadId: 'test-thread-123',
        data: {},
        timestamp: '2025-01-09T10:00:00Z',
      }

      // Act
      const messageEvent = createMessageEvent(eventData)
      mockEventSource.onmessage?.(messageEvent)

      // Assert
      expect(consoleSpy.warn).toHaveBeenCalledWith('Unknown SSE event type:', 'unknown_event')
      expect(mockUpdateStep).not.toHaveBeenCalled()
      expect(mockUpdateWorkflow).not.toHaveBeenCalled()
    })

    it('should handle malformed JSON gracefully', () => {
      // Arrange
      const { result } = renderHook(() =>
        useWorkflowSSE({
          threadId: 'test-thread-123',
        })
      )

      // Act
      const badMessageEvent = new MessageEvent('message', {
        data: 'invalid-json',
      })
      act(() => {
        mockEventSource.onmessage?.(badMessageEvent)
      })

      // Assert
      expect(consoleSpy.error).toHaveBeenCalledWith('Failed to parse SSE event:', expect.any(Error))
      expect(result.current.error).toBe('Failed to parse event data')
    })

    it('should ignore events without stepId when stepId is required', () => {
      // Arrange
      renderHook(() =>
        useWorkflowSSE({
          threadId: 'test-thread-123',
        })
      )

      const eventData = {
        type: 'step_start',
        threadId: 'test-thread-123',
        // Missing stepId
        data: {
          agentId: 'dev_01',
        },
        timestamp: '2025-01-09T10:00:00Z',
      }

      // Act
      const messageEvent = createMessageEvent(eventData)
      mockEventSource.onmessage?.(messageEvent)

      // Assert
      expect(mockUpdateStep).not.toHaveBeenCalled()
      expect(mockUpdateWorkflow).not.toHaveBeenCalled()
    })
  })

  describe('Manual Controls', () => {
    it('should provide disconnect functionality', () => {
      // Arrange
      const { result } = renderHook(() =>
        useWorkflowSSE({
          threadId: 'test-thread-123',
        })
      )

      // Act
      result.current.disconnect()

      // Assert
      expect(mockEventSource.close).toHaveBeenCalled()
      expect(result.current.isConnected).toBe(false)
    })

    it('should provide reconnect functionality', () => {
      // Arrange
      const { result } = renderHook(() =>
        useWorkflowSSE({
          threadId: 'test-thread-123',
        })
      )

      // Simulate connection with error
      act(() => {
        mockEventSource.onerror?.(new Event('error'))
      })
      expect(result.current.error).toBe('Connection error')

      // Act
      act(() => {
        result.current.reconnect()
      })

      // Assert
      expect(mockEventSource.close).toHaveBeenCalled()
      expect(result.current.error).toBeNull()
      // Reconnect doesn't create new EventSource, just clears error and disconnects
      expect(MockEventSource).toHaveBeenCalledTimes(1)
    })

    it('should handle disconnect when EventSource is null', () => {
      // Arrange
      const { result } = renderHook(() =>
        useWorkflowSSE({
          threadId: 'test-thread-123',
        })
      )

      // Simulate unmount/cleanup
      result.current.disconnect()

      // Act - Try to disconnect again
      expect(() => result.current.disconnect()).not.toThrow()
    })
  })

  describe('Cleanup', () => {
    it('should close connection on unmount', () => {
      // Arrange
      const onDisconnect = vi.fn()
      const { unmount } = renderHook(() =>
        useWorkflowSSE({
          threadId: 'test-thread-123',
          onDisconnect,
        })
      )

      // Act
      unmount()

      // Assert
      expect(mockEventSource.close).toHaveBeenCalled()
      expect(onDisconnect).toHaveBeenCalled()
    })

    it('should recreate connection when threadId changes', () => {
      // Arrange
      const { rerender } = renderHook(({ threadId }) => useWorkflowSSE({ threadId }), {
        initialProps: { threadId: 'thread-1' },
      })

      expect(MockEventSource).toHaveBeenCalledWith('/api/invoke/stream/thread-1')
      MockEventSource.mockClear()

      // Act
      rerender({ threadId: 'thread-2' })

      // Assert
      expect(mockEventSource.close).toHaveBeenCalled()
      expect(MockEventSource).toHaveBeenCalledWith('/api/invoke/stream/thread-2')
    })

    it('should recreate connection when callbacks change', () => {
      // Arrange
      const { rerender } = renderHook(
        (props: { onConnect: () => void }) =>
          useWorkflowSSE({
            threadId: 'test-thread-123',
            onConnect: props.onConnect,
          }),
        { initialProps: { onConnect: vi.fn() } }
      )

      expect(MockEventSource).toHaveBeenCalledTimes(1)
      MockEventSource.mockClear()

      // Act - Change callback
      rerender({ onConnect: vi.fn() })

      // Assert - Should recreate connection due to dependency change
      expect(mockEventSource.close).toHaveBeenCalled()
      expect(MockEventSource).toHaveBeenCalledWith('/api/invoke/stream/test-thread-123')
    })
  })

  describe('Error Recovery', () => {
    it('should clear error on successful reconnection', () => {
      // Arrange
      const { result } = renderHook(() =>
        useWorkflowSSE({
          threadId: 'test-thread-123',
        })
      )

      // Simulate error
      act(() => {
        mockEventSource.onerror?.(new Event('error'))
      })
      expect(result.current.error).toBe('Connection error')

      // Act - Simulate successful reconnection
      act(() => {
        mockEventSource.onopen?.(new Event('open'))
      })

      // Assert
      expect(result.current.isConnected).toBe(true)
      expect(result.current.error).toBeNull()
    })

    it('should handle rapid error/success cycles', () => {
      // Arrange
      const { result } = renderHook(() =>
        useWorkflowSSE({
          threadId: 'test-thread-123',
        })
      )

      // Act - Rapid cycles
      act(() => {
        mockEventSource.onopen?.(new Event('open'))
      })
      expect(result.current.isConnected).toBe(true)

      act(() => {
        mockEventSource.onerror?.(new Event('error'))
      })
      expect(result.current.isConnected).toBe(false)
      expect(result.current.error).toBe('Connection error')

      act(() => {
        mockEventSource.onopen?.(new Event('open'))
      })
      expect(result.current.isConnected).toBe(true)
      expect(result.current.error).toBeNull()

      act(() => {
        mockEventSource.onerror?.(new Event('error'))
      })
      expect(result.current.isConnected).toBe(false)
      expect(result.current.error).toBe('Connection error')
    })
  })

  describe('Complex Workflow Events', () => {
    it('should handle sequential step events correctly', () => {
      // Arrange
      renderHook(() =>
        useWorkflowSSE({
          threadId: 'test-thread-123',
        })
      )

      // Act - Simulate step progression
      const step1Start = createMessageEvent({
        type: 'step_start',
        threadId: 'test-thread-123',
        stepId: 'step1',
        data: { agentId: 'dev_01' },
        timestamp: '2025-01-09T10:00:00Z',
      })

      const step1Complete = createMessageEvent({
        type: 'step_complete',
        threadId: 'test-thread-123',
        stepId: 'step1',
        data: { output: 'Step 1 done' },
        timestamp: '2025-01-09T10:05:00Z',
      })

      const step2Start = createMessageEvent({
        type: 'step_start',
        threadId: 'test-thread-123',
        stepId: 'step2',
        data: { agentId: 'reviewer_01' },
        timestamp: '2025-01-09T10:05:30Z',
      })

      mockEventSource.onmessage?.(step1Start)
      mockEventSource.onmessage?.(step1Complete)
      mockEventSource.onmessage?.(step2Start)

      // Assert
      expect(mockUpdateStep).toHaveBeenCalledTimes(3)
      expect(mockUpdateWorkflow).toHaveBeenCalledTimes(2) // currentStep updates

      // Verify step1 progression
      expect(mockUpdateStep).toHaveBeenNthCalledWith(1, 'test-thread-123', 'step1', {
        status: 'running',
        startTime: '2025-01-09T10:00:00Z',
        agentId: 'dev_01',
      })

      expect(mockUpdateStep).toHaveBeenNthCalledWith(2, 'test-thread-123', 'step1', {
        status: 'completed',
        endTime: '2025-01-09T10:05:00Z',
      })

      // Verify step2 start
      expect(mockUpdateStep).toHaveBeenNthCalledWith(3, 'test-thread-123', 'step2', {
        status: 'running',
        startTime: '2025-01-09T10:05:30Z',
        agentId: 'reviewer_01',
      })
    })

    it('should handle parallel step events correctly', () => {
      // Arrange
      renderHook(() =>
        useWorkflowSSE({
          threadId: 'test-thread-123',
        })
      )

      // Act - Simulate parallel steps
      const step2Start = createMessageEvent({
        type: 'step_start',
        threadId: 'test-thread-123',
        stepId: 'step2',
        data: { agentId: 'dev_01' },
        timestamp: '2025-01-09T10:00:00Z',
      })

      const step3Start = createMessageEvent({
        type: 'step_start',
        threadId: 'test-thread-123',
        stepId: 'step3',
        data: { agentId: 'dev_02' },
        timestamp: '2025-01-09T10:00:30Z',
      })

      mockEventSource.onmessage?.(step2Start)
      mockEventSource.onmessage?.(step3Start)

      // Assert - Both steps should be processed
      expect(mockUpdateStep).toHaveBeenCalledTimes(2)
      expect(mockUpdateWorkflow).toHaveBeenCalledTimes(2)

      expect(mockUpdateStep).toHaveBeenNthCalledWith(
        1,
        'test-thread-123',
        'step2',
        expect.any(Object)
      )
      expect(mockUpdateStep).toHaveBeenNthCalledWith(
        2,
        'test-thread-123',
        'step3',
        expect.any(Object)
      )
    })
  })
})
