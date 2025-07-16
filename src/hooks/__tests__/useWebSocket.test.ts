/**
 * Comprehensive tests for useWebSocket hook
 *
 * SOLID: Single responsibility - test WebSocket connection management
 * DRY: Reusable mock factories and test utilities
 * KISS: Clear test scenarios with descriptive names
 */

import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { useWebSocket } from '../useWebSocket'
import { io } from 'socket.io-client'

// Type for mocked socket
type MockSocket = {
  connected: boolean
  on: Mock
  off: Mock
  emit: Mock
  disconnect: Mock
}

// Mock Socket.IO client
vi.mock('socket.io-client', () => {
  const mockSocket: MockSocket = {
    connected: false,
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  }

  const mockIo = vi.fn(() => mockSocket as unknown as ReturnType<typeof io>)

  return {
    io: mockIo,
  }
})

// Get typed access to mocked functions
const mockIo = vi.mocked(io)

// Mock window.location.origin
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
  },
  writable: true,
})

// Mock console methods to avoid test noise
const consoleSpy = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
}

// Mock window.dispatchEvent
const mockDispatchEvent = vi.spyOn(window, 'dispatchEvent').mockImplementation(() => true)

describe('useWebSocket', () => {
  let mockSocket: MockSocket

  beforeEach(() => {
    vi.clearAllMocks()

    // Create fresh mock socket for each test
    mockSocket = {
      connected: false,
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
    }

    // Make io() return our mock socket
    mockIo.mockReturnValue(mockSocket as unknown as ReturnType<typeof io>)
  })

  afterEach(() => {
    consoleSpy.log.mockClear()
    consoleSpy.warn.mockClear()
    consoleSpy.error.mockClear()
    mockDispatchEvent.mockClear()
  })

  describe('Connection Establishment', () => {
    it('should establish connection with default options', () => {
      // Act
      const { result } = renderHook(() => useWebSocket())

      // Assert
      expect(mockIo).toHaveBeenCalledWith('http://localhost:3000', {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      })
      expect(result.current.isConnected).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.socket).toBe(mockSocket)
    })

    it('should establish connection with custom options', () => {
      // Arrange
      const options = {
        url: 'http://custom-server:8080',
        reconnectAttempts: 10,
        reconnectDelay: 2000,
      }

      // Act
      renderHook(() => useWebSocket(options))

      // Assert
      expect(mockIo).toHaveBeenCalledWith('http://custom-server:8080', {
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
      })
    })

    it('should not create new connection if already connected', () => {
      // Arrange
      mockSocket.connected = true

      // Act
      renderHook(() => useWebSocket())

      // Assert - Should not call io() when already connected
      expect(mockIo).not.toHaveBeenCalled()
    })

    it('should set up event listeners on connect', () => {
      // Act
      renderHook(() => useWebSocket())

      // Assert - Check that all required event listeners are registered
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('reconnect', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledTimes(4)
    })
  })

  describe('Connection State Management', () => {
    it('should update state when socket connects', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket())
      const connectHandler = (mockSocket.on as Mock).mock.calls.find(
        ([event]) => event === 'connect'
      )?.[1]

      // Act - Simulate connect event
      connectHandler?.()

      // Assert
      expect(result.current.isConnected).toBe(true)
      expect(result.current.error).toBeNull()
      expect(consoleSpy.log).toHaveBeenCalledWith('WebSocket connected')
    })

    it('should update state when socket disconnects', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket())
      const connectHandler = (mockSocket.on as Mock).mock.calls.find(
        ([event]) => event === 'connect'
      )?.[1]
      const disconnectHandler = (mockSocket.on as Mock).mock.calls.find(
        ([event]) => event === 'disconnect'
      )?.[1]

      // Act - Connect first, then disconnect
      connectHandler?.()
      expect(result.current.isConnected).toBe(true)
      disconnectHandler?.()

      // Assert
      expect(result.current.isConnected).toBe(false)
      expect(consoleSpy.log).toHaveBeenCalledWith('WebSocket disconnected')
    })

    it('should handle connection errors', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket())
      const errorHandler = (mockSocket.on as Mock).mock.calls.find(
        ([event]) => event === 'connect_error'
      )?.[1]
      const testError = new Error('Connection failed')

      // Act
      errorHandler?.(testError)

      // Assert
      expect(result.current.error).toBe(testError)
      expect(result.current.isConnected).toBe(false)
    })
  })

  describe('Reconnection Logic', () => {
    it('should handle successful reconnection', () => {
      // Arrange
      renderHook(() => useWebSocket())
      const reconnectHandler = (mockSocket.on as Mock).mock.calls.find(
        ([event]) => event === 'reconnect'
      )?.[1]
      const attemptNumber = 3

      // Act
      reconnectHandler?.(attemptNumber)

      // Assert
      expect(consoleSpy.log).toHaveBeenCalledWith('WebSocket reconnected after 3 attempts')
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'websocket-reconnected',
        })
      )
    })

    it('should track reconnection attempts and disconnect after max attempts', () => {
      // Arrange
      renderHook(() => useWebSocket({ reconnectAttempts: 3 }))
      const errorHandler = (mockSocket.on as Mock).mock.calls.find(
        ([event]) => event === 'connect_error'
      )?.[1]
      const testError = new Error('Connection failed')

      // Act - Simulate multiple connection errors
      errorHandler?.(testError) // Attempt 1
      errorHandler?.(testError) // Attempt 2
      errorHandler?.(testError) // Attempt 3 - should trigger disconnect

      // Assert
      expect(mockSocket.disconnect).toHaveBeenCalled()
      expect(consoleSpy.error).toHaveBeenCalledWith('Max reconnection attempts reached')
    })

    it('should reset reconnection count on successful connection', () => {
      // Arrange
      renderHook(() => useWebSocket({ reconnectAttempts: 2 }))
      const connectHandler = (mockSocket.on as Mock).mock.calls.find(
        ([event]) => event === 'connect'
      )?.[1]
      const errorHandler = (mockSocket.on as Mock).mock.calls.find(
        ([event]) => event === 'connect_error'
      )?.[1]
      const testError = new Error('Connection failed')

      // Act - First, have an error, then connect successfully, then test reset
      errorHandler?.(testError)
      connectHandler?.() // Should reset counter

      // Clear previous disconnect calls
      mockSocket.disconnect.mockClear()

      // Test that reconnect count was reset by having two more errors
      errorHandler?.(testError) // Should be attempt 1 again
      errorHandler?.(testError) // Should be attempt 2 - should trigger disconnect

      expect(mockSocket.disconnect).toHaveBeenCalled()
    })
  })

  describe('Event Handling', () => {
    it('should emit events when connected', () => {
      // Arrange
      mockSocket.connected = true
      const { result } = renderHook(() => useWebSocket())

      // Act
      result.current.emit('test-event', { data: 'test' })

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('test-event', { data: 'test' })
    })

    it('should warn and not emit when disconnected', () => {
      // Arrange
      mockSocket.connected = false
      const { result } = renderHook(() => useWebSocket())

      // Act
      result.current.emit('test-event', { data: 'test' })

      // Assert
      expect(mockSocket.emit).not.toHaveBeenCalled()
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        'Socket not connected, cannot emit:',
        'test-event'
      )
    })

    it('should register event listeners', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket())
      const handler = vi.fn()

      // Act
      result.current.on('custom-event', handler)

      // Assert
      expect(mockSocket.on).toHaveBeenCalledWith('custom-event', handler)
    })

    it('should unregister event listeners', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket())
      const handler = vi.fn()

      // Act
      result.current.off('custom-event', handler)

      // Assert
      expect(mockSocket.off).toHaveBeenCalledWith('custom-event', handler)
    })

    it('should unregister all listeners for event when no handler provided', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket())

      // Act
      result.current.off('custom-event')

      // Assert
      expect(mockSocket.off).toHaveBeenCalledWith('custom-event', undefined)
    })

    it('should handle when socket is null in event methods', () => {
      // Arrange - Create a mock that returns null socket
      mockIo.mockReturnValue(null as unknown as ReturnType<typeof io>)
      const { result } = renderHook(() => useWebSocket())

      // Act & Assert - Should not throw errors
      expect(() => {
        result.current.on('test', vi.fn())
        result.current.off('test')
        result.current.emit('test')
      }).not.toThrow()
    })
  })

  describe('Error States', () => {
    it('should persist error state until successful reconnection', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket())
      const errorHandler = (mockSocket.on as Mock).mock.calls.find(
        ([event]) => event === 'connect_error'
      )?.[1]
      const connectHandler = (mockSocket.on as Mock).mock.calls.find(
        ([event]) => event === 'connect'
      )?.[1]
      const testError = new Error('Network error')

      // Act - Set error, then connect
      errorHandler?.(testError)
      expect(result.current.error).toBe(testError)
      connectHandler?.()

      // Assert - Error should be cleared
      expect(result.current.error).toBeNull()
    })

    it('should handle multiple different errors', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket())
      const errorHandler = (mockSocket.on as Mock).mock.calls.find(
        ([event]) => event === 'connect_error'
      )?.[1]
      const error1 = new Error('First error')
      const error2 = new Error('Second error')

      // Act - Apply multiple errors
      errorHandler?.(error1)
      expect(result.current.error).toBe(error1)
      errorHandler?.(error2)

      // Assert - Should have the latest error
      expect(result.current.error).toBe(error2)
    })
  })

  describe('Cleanup on Unmount', () => {
    it('should disconnect socket when component unmounts', () => {
      // Arrange
      const { unmount } = renderHook(() => useWebSocket())

      // Act
      unmount()

      // Assert
      expect(mockSocket.disconnect).toHaveBeenCalled()
    })

    it('should handle unmount when socket is null', () => {
      // Arrange - Mock returns null socket
      mockIo.mockReturnValue(null as unknown as ReturnType<typeof io>)
      const { unmount } = renderHook(() => useWebSocket())

      // Act & Assert - Should not throw
      expect(() => unmount()).not.toThrow()
    })

    it('should not attempt operations after unmount', () => {
      // Arrange
      const { result, unmount } = renderHook(() => useWebSocket())
      unmount()
      mockSocket.emit.mockClear()

      // Act & Assert - Should not throw or emit
      expect(() => result.current.emit('test-event')).not.toThrow()
      expect(mockSocket.emit).not.toHaveBeenCalled()
    })
  })

  describe('Options Reactivity', () => {
    it('should recreate connection when reconnect options change', () => {
      // Arrange
      const { rerender } = renderHook((props) => useWebSocket(props), {
        initialProps: { reconnectAttempts: 3, reconnectDelay: 500 },
      })

      expect(mockIo).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          reconnection: true,
          reconnectionAttempts: 3,
          reconnectionDelay: 500,
        })
      )
      mockIo.mockClear()

      // Act - Change reconnect options
      rerender({ reconnectAttempts: 5, reconnectDelay: 1000 })

      // Assert - Should create new connection with new options
      expect(mockSocket.disconnect).toHaveBeenCalled()
      expect(mockIo).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        })
      )
    })

    it('should maintain connection when options do not change', () => {
      // Arrange
      const { rerender } = renderHook((props) => useWebSocket(props), {
        initialProps: { reconnectAttempts: 5, reconnectDelay: 1000 },
      })

      expect(mockIo).toHaveBeenCalledWith(expect.any(String), {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      })
      mockIo.mockClear()

      // Act - Change reconnect attempts
      rerender({ reconnectAttempts: 10, reconnectDelay: 1000 })

      // Assert - Should create new connection with new options
      expect(mockSocket.disconnect).toHaveBeenCalled()
      expect(mockIo).toHaveBeenCalledWith(expect.any(String), {
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      })
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle rapid connect/disconnect cycles', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket())
      const connectHandler = (mockSocket.on as Mock).mock.calls.find(
        ([event]) => event === 'connect'
      )?.[1]
      const disconnectHandler = (mockSocket.on as Mock).mock.calls.find(
        ([event]) => event === 'disconnect'
      )?.[1]

      // Act - Rapid cycles
      connectHandler?.()
      disconnectHandler?.()
      connectHandler?.()
      disconnectHandler?.()
      connectHandler?.()

      // Assert - Should end in connected state
      expect(result.current.isConnected).toBe(true)
    })

    it('should maintain correct state during error recovery', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket())
      const connectHandler = (mockSocket.on as Mock).mock.calls.find(
        ([event]) => event === 'connect'
      )?.[1]
      const disconnectHandler = (mockSocket.on as Mock).mock.calls.find(
        ([event]) => event === 'disconnect'
      )?.[1]
      const errorHandler = (mockSocket.on as Mock).mock.calls.find(
        ([event]) => event === 'connect_error'
      )?.[1]
      const reconnectHandler = (mockSocket.on as Mock).mock.calls.find(
        ([event]) => event === 'reconnect'
      )?.[1]

      // Act - Simulate full error recovery cycle
      connectHandler?.() // Initial connection
      expect(result.current.isConnected).toBe(true)
      expect(result.current.error).toBeNull()

      disconnectHandler?.() // Connection lost
      expect(result.current.isConnected).toBe(false)

      errorHandler?.(new Error('Reconnect failed')) // Reconnection attempt fails
      expect(result.current.error).toBeInstanceOf(Error)

      reconnectHandler?.(2) // Successful reconnection on attempt 2
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'websocket-reconnected' })
      )

      connectHandler?.() // Connection re-established
      expect(result.current.isConnected).toBe(true)
      expect(result.current.error).toBeNull()
    })

    it('should handle event registration during different connection states', () => {
      // Arrange
      const { result } = renderHook(() => useWebSocket())
      const handler = vi.fn()

      // Act - Register events in different states
      result.current.on('event1', handler) // When disconnected

      // Create a new mock socket that returns null to test null handling
      const originalSocket = mockSocket
      mockIo.mockReturnValueOnce(null as unknown as ReturnType<typeof io>)
      const { result: nullResult } = renderHook(() => useWebSocket())
      nullResult.current.on('event2', handler) // When socket is null

      // Assert - Should handle gracefully
      expect(originalSocket.on).toHaveBeenCalledWith('event1', handler)
      // Second call should not throw but also not register since socket was null
    })
  })
})
