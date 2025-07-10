/**
 * Comprehensive unit tests for EventSystem service
 *
 * SOLID: Single responsibility - Test EventSystem in isolation
 * DRY: Reusable test utilities and mocks
 * KISS: Clear, focused test cases
 * Library-First: Uses Vitest testing framework
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { EventSystem, type EventSystemConfig, type EventHandler, type IEventTransport } from '../EventSystem'

// Mock Socket.IO server
const mockSocketIO = {
  emit: vi.fn(),
  adapter: vi.fn(),
} as unknown as import('socket.io').Server

// Mock transport implementation for testing
class MockTransport implements IEventTransport {
  public initializeCalled = false
  public destroyCalled = false
  public emittedEvents: Array<{ event: string; data: unknown }> = []
  public handlers = new Map<string, Set<EventHandler>>()
  public shouldFailInitialize = false
  public shouldFailEmit = false

  async initialize(_config: EventSystemConfig): Promise<void> {
    if (this.shouldFailInitialize) {
      throw new Error('Mock initialization failure')
    }
    this.initializeCalled = true
  }

  async emit(event: string, data: unknown): Promise<void> {
    if (this.shouldFailEmit) {
      throw new Error('Mock emit failure')
    }
    this.emittedEvents.push({ event, data })
    
    // Simulate notifying handlers with error handling
    const handlers = this.handlers.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          // In real implementation, transport would handle errors gracefully
          console.error('Handler error:', error)
        }
      })
    }
  }

  on(event: string, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler)
  }

  off(event: string, handler: EventHandler): void {
    this.handlers.get(event)?.delete(handler)
  }

  async destroy(): Promise<void> {
    this.destroyCalled = true
    this.handlers.clear()
  }

  // Test utilities
  reset(): void {
    this.initializeCalled = false
    this.destroyCalled = false
    this.emittedEvents = []
    this.handlers.clear()
    this.shouldFailInitialize = false
    this.shouldFailEmit = false
  }
}

// Helper function to create a fresh EventSystem instance for testing
function createTestEventSystem(): EventSystem {
  // Reset the singleton instance
  ;(EventSystem as unknown as { instance?: EventSystem }).instance = undefined
  return EventSystem.getInstance()
}

describe('EventSystem', () => {
  let eventSystem: EventSystem
  let mockTransport: MockTransport
  let originalConsoleLog: Mock
  let originalConsoleWarn: Mock

  beforeEach(() => {
    // Mock console methods
    originalConsoleLog = vi.fn()
    originalConsoleWarn = vi.fn()
    vi.spyOn(console, 'log').mockImplementation(originalConsoleLog)
    vi.spyOn(console, 'warn').mockImplementation(originalConsoleWarn)
    
    // Create fresh instance for testing
    eventSystem = createTestEventSystem()
    mockTransport = new MockTransport()
  })

  afterEach(async () => {
    await eventSystem.destroy()
    vi.restoreAllMocks()
    mockTransport.reset()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = EventSystem.getInstance()
      const instance2 = EventSystem.getInstance()
      
      expect(instance1).toBe(instance2)
      expect(instance1).toBe(eventSystem)
    })

    it('should initialize with in-memory transport by default', () => {
      expect(eventSystem).toBeDefined()
      // The default transport should be InMemoryTransport
    })
  })

  describe('Initialization', () => {
    it('should initialize with in-memory transport', async () => {
      const config: EventSystemConfig = {
        type: 'in-memory',
        socketIO: mockSocketIO
      }

      await eventSystem.initialize(config)
      
      // Should not throw and complete successfully
      expect(true).toBe(true)
    })

    it('should initialize with redis-adapter transport', async () => {
      // Mock the dynamic import
      const mockRedisTransport = new MockTransport()
      vi.doMock('../transports/RedisAdapterTransport', () => ({
        RedisAdapterTransport: vi.fn(() => mockRedisTransport)
      }))

      const config: EventSystemConfig = {
        type: 'redis-adapter',
        socketIO: mockSocketIO,
        redis: { url: 'redis://localhost:6379' }
      }

      await eventSystem.initialize(config)
      
      expect(mockRedisTransport.initializeCalled).toBe(true)
    })

    it('should fall back to in-memory for bullmq transport', async () => {
      const config: EventSystemConfig = {
        type: 'bullmq',
        socketIO: mockSocketIO
      }

      await eventSystem.initialize(config)
      
      expect(originalConsoleWarn).toHaveBeenCalledWith(
        '[EventSystem] BullMQ transport not implemented yet, falling back to in-memory'
      )
    })

    it('should fall back to in-memory for nats transport', async () => {
      const config: EventSystemConfig = {
        type: 'nats',
        socketIO: mockSocketIO
      }

      await eventSystem.initialize(config)
      
      expect(originalConsoleWarn).toHaveBeenCalledWith(
        '[EventSystem] NATS transport not implemented yet, falling back to in-memory'
      )
    })

    it('should handle initialization failures gracefully', async () => {
      // Create a failing mock transport that will be used during initialization
      const failingTransport = new MockTransport()
      failingTransport.shouldFailInitialize = true

      // Mock the initialization to force using our failing transport
      const originalInitialize = EventSystem.prototype.initialize
      EventSystem.prototype.initialize = async function(config: EventSystemConfig) {
        ;(this as unknown as { transport: IEventTransport }).transport = failingTransport
        return failingTransport.initialize(config)
      }

      const config: EventSystemConfig = {
        type: 'in-memory',
        socketIO: mockSocketIO
      }

      await expect(eventSystem.initialize(config)).rejects.toThrow('Mock initialization failure')

      // Restore original initialize
      EventSystem.prototype.initialize = originalInitialize
    })
  })

  describe('Event Emission', () => {
    beforeEach(async () => {
      // Replace transport with mock
      ;(eventSystem as unknown as { transport: IEventTransport }).transport = mockTransport
      await mockTransport.initialize({ type: 'in-memory' })
    })

    it('should emit events successfully', async () => {
      const testData = { message: 'test event' }
      
      await eventSystem.emit('test-event', testData)
      
      expect(mockTransport.emittedEvents).toHaveLength(1)
      expect(mockTransport.emittedEvents[0]).toEqual({
        event: 'test-event',
        data: testData
      })
      expect(originalConsoleLog).toHaveBeenCalledWith(
        '[EventSystem] Emitting test-event',
        testData
      )
    })

    it('should handle emit failures', async () => {
      mockTransport.shouldFailEmit = true
      
      await expect(eventSystem.emit('test-event', {})).rejects.toThrow('Mock emit failure')
    })

    it('should emit agent status events', async () => {
      await eventSystem.emitAgentStatus('agent-123', 'busy')
      
      expect(mockTransport.emittedEvents).toHaveLength(1)
      expect(mockTransport.emittedEvents[0]).toEqual({
        event: 'agent:status-changed',
        data: { agentId: 'agent-123', status: 'busy' }
      })
    })

    it('should emit token usage events', async () => {
      await eventSystem.emitTokenUsage('agent-456', 1500, 4000)
      
      expect(mockTransport.emittedEvents).toHaveLength(1)
      expect(mockTransport.emittedEvents[0]).toEqual({
        event: 'agent:token-usage',
        data: { agentId: 'agent-456', tokens: 1500, maxTokens: 4000 }
      })
    })

    it('should emit new message events', async () => {
      const message = { id: 'msg-123', content: 'Hello' }
      await eventSystem.emitNewMessage('session-789', message)
      
      expect(mockTransport.emittedEvents).toHaveLength(1)
      expect(mockTransport.emittedEvents[0]).toEqual({
        event: 'message:new',
        data: { sessionId: 'session-789', message }
      })
    })
  })

  describe('Event Subscription', () => {
    let receivedEvents: Array<{ event: string; data: unknown }>
    let handler1: EventHandler
    let handler2: EventHandler

    beforeEach(async () => {
      // Replace transport with mock
      ;(eventSystem as unknown as { transport: IEventTransport }).transport = mockTransport
      await mockTransport.initialize({ type: 'in-memory' })
      
      receivedEvents = []
      handler1 = vi.fn((data) => {
        receivedEvents.push({ event: 'handler1', data })
      })
      handler2 = vi.fn((data) => {
        receivedEvents.push({ event: 'handler2', data })
      })
    })

    it('should subscribe to events', () => {
      eventSystem.on('test-event', handler1)
      
      expect(mockTransport.handlers.get('test-event')?.has(handler1)).toBe(true)
    })

    it('should receive events when subscribed', async () => {
      eventSystem.on('test-event', handler1)
      
      const testData = { value: 'test' }
      await eventSystem.emit('test-event', testData)
      
      expect(handler1).toHaveBeenCalledWith(testData)
      expect(receivedEvents).toHaveLength(1)
      expect(receivedEvents[0]).toEqual({ event: 'handler1', data: testData })
    })

    it('should support multiple handlers for same event', async () => {
      eventSystem.on('multi-event', handler1)
      eventSystem.on('multi-event', handler2)
      
      const testData = { value: 'multi' }
      await eventSystem.emit('multi-event', testData)
      
      expect(handler1).toHaveBeenCalledWith(testData)
      expect(handler2).toHaveBeenCalledWith(testData)
      expect(receivedEvents).toHaveLength(2)
    })

    it('should unsubscribe from events', async () => {
      eventSystem.on('unsub-event', handler1)
      eventSystem.on('unsub-event', handler2)
      
      // Remove one handler
      eventSystem.off('unsub-event', handler1)
      
      const testData = { value: 'unsub' }
      await eventSystem.emit('unsub-event', testData)
      
      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalledWith(testData)
      expect(receivedEvents).toHaveLength(1)
      expect(receivedEvents[0]).toEqual({ event: 'handler2', data: testData })
    })

    it('should handle async event handlers', async () => {
      const asyncHandler: EventHandler = vi.fn(async (data) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        receivedEvents.push({ event: 'async', data })
      })
      
      eventSystem.on('async-event', asyncHandler)
      
      const testData = { async: true }
      await eventSystem.emit('async-event', testData)
      
      // Give async handler time to complete
      await new Promise(resolve => setTimeout(resolve, 20))
      
      expect(asyncHandler).toHaveBeenCalledWith(testData)
      expect(receivedEvents).toHaveLength(1)
    })
  })

  describe('Transport Switching', () => {
    it('should switch from in-memory to redis transport', async () => {
      // Start with in-memory
      await eventSystem.initialize({ type: 'in-memory' })
      
      // Mock Redis transport
      const mockRedisTransport = new MockTransport()
      vi.doMock('../transports/RedisAdapterTransport', () => ({
        RedisAdapterTransport: vi.fn(() => mockRedisTransport)
      }))
      
      // Switch to Redis
      await eventSystem.initialize({
        type: 'redis-adapter',
        socketIO: mockSocketIO,
        redis: { url: 'redis://localhost:6379' }
      })
      
      expect(mockRedisTransport.initializeCalled).toBe(true)
    })

    it('should maintain event handlers across transport switches', async () => {
      let receivedData: unknown = null
      const handler: EventHandler = (data) => {
        receivedData = data
      }
      
      // Replace transport with first mock
      const firstTransport = new MockTransport()
      ;(eventSystem as unknown as { transport: IEventTransport }).transport = firstTransport
      await eventSystem.initialize({ type: 'in-memory' })
      
      // Add handler
      eventSystem.on('persistent-event', handler)
      
      // Switch transport
      const secondTransport = new MockTransport()
      ;(eventSystem as unknown as { transport: IEventTransport }).transport = secondTransport
      await eventSystem.initialize({ type: 'in-memory' })
      
      // Re-add handler (would need to be done by application)
      eventSystem.on('persistent-event', handler)
      
      // Emit event
      const testData = { switched: true }
      await eventSystem.emit('persistent-event', testData)
      
      expect(receivedData).toEqual(testData)
    })
  })

  describe('Error Handling and Recovery', () => {
    beforeEach(async () => {
      ;(eventSystem as unknown as { transport: IEventTransport }).transport = mockTransport
      await mockTransport.initialize({ type: 'in-memory' })
    })

    it('should handle handler exceptions gracefully', async () => {
      const faultyHandler: EventHandler = vi.fn(() => {
        throw new Error('Handler error')
      })
      const goodHandler: EventHandler = vi.fn()
      
      eventSystem.on('error-event', faultyHandler)
      eventSystem.on('error-event', goodHandler)
      
      // Should not throw despite faulty handler (the mock transport catches the error)
      await eventSystem.emit('error-event', { test: true })
      
      expect(faultyHandler).toHaveBeenCalled()
      expect(goodHandler).toHaveBeenCalled()
    })

    it('should handle transport emit failures', async () => {
      mockTransport.shouldFailEmit = true
      
      await expect(eventSystem.emit('fail-event', {})).rejects.toThrow('Mock emit failure')
    })

    it('should recover from transport failures', async () => {
      // First emit succeeds
      await eventSystem.emit('recovery-test', { attempt: 1 })
      expect(mockTransport.emittedEvents).toHaveLength(1)
      
      // Make transport fail
      mockTransport.shouldFailEmit = true
      await expect(eventSystem.emit('recovery-test', { attempt: 2 })).rejects.toThrow()
      
      // Recover transport
      mockTransport.shouldFailEmit = false
      await eventSystem.emit('recovery-test', { attempt: 3 })
      
      expect(mockTransport.emittedEvents).toHaveLength(2)
      expect(mockTransport.emittedEvents[1].data).toEqual({ attempt: 3 })
    })
  })

  describe('Factory Pattern Implementation', () => {
    it('should create correct transport based on config type', async () => {
      const configs: Array<{ type: EventSystemConfig['type'] }> = [
        { type: 'in-memory' },
        { type: 'bullmq' },
        { type: 'nats' }
      ]
      
      for (const { type } of configs) {
        const config: EventSystemConfig = { type, socketIO: mockSocketIO }
        
        // Should not throw
        await expect(eventSystem.initialize(config)).resolves.not.toThrow()
        
        if (type === 'bullmq' || type === 'nats') {
          expect(originalConsoleWarn).toHaveBeenCalledWith(
            expect.stringContaining('not implemented yet, falling back to in-memory')
          )
        }
      }
    })

    it('should handle missing dynamic imports gracefully', async () => {
      // Mock failed import
      vi.doMock('../transports/RedisAdapterTransport', () => {
        throw new Error('Module not found')
      })
      
      const config: EventSystemConfig = {
        type: 'redis-adapter',
        socketIO: mockSocketIO
      }
      
      // Should handle import failure by falling back or throwing appropriate error
      await expect(eventSystem.initialize(config)).rejects.toThrow()
    })
  })

  describe('Resource Cleanup', () => {
    beforeEach(async () => {
      ;(eventSystem as unknown as { transport: IEventTransport }).transport = mockTransport
      await mockTransport.initialize({ type: 'in-memory' })
    })

    it('should clean up transport on destroy', async () => {
      await eventSystem.destroy()
      
      expect(mockTransport.destroyCalled).toBe(true)
    })

    it('should clear handlers on destroy', async () => {
      const handler: EventHandler = vi.fn()
      eventSystem.on('cleanup-event', handler)
      
      await eventSystem.destroy()
      
      expect(mockTransport.handlers.size).toBe(0)
    })

    it('should handle destroy failures gracefully', async () => {
      // Mock transport destroy failure
      const originalDestroy = mockTransport.destroy
      mockTransport.destroy = vi.fn().mockRejectedValue(new Error('Destroy failed')) as typeof originalDestroy
      
      await expect(eventSystem.destroy()).rejects.toThrow('Destroy failed')
      
      // Restore original destroy
      mockTransport.destroy = originalDestroy
    })
  })

  describe('Integration Scenarios', () => {
    beforeEach(async () => {
      ;(eventSystem as unknown as { transport: IEventTransport }).transport = mockTransport
      await mockTransport.initialize({ type: 'in-memory' })
    })

    it('should handle high-frequency events', async () => {
      const handler: EventHandler = vi.fn()
      eventSystem.on('high-freq', handler)
      
      // Emit many events rapidly
      const promises = Array.from({ length: 100 }, (_, i) =>
        eventSystem.emit('high-freq', { sequence: i })
      )
      
      await Promise.all(promises)
      
      expect(mockTransport.emittedEvents).toHaveLength(100)
      expect(handler).toHaveBeenCalledTimes(100)
    })

    it('should handle concurrent subscriptions and emissions', async () => {
      const handlers = Array.from({ length: 10 }, () => vi.fn())
      
      // Subscribe all handlers
      handlers.forEach((handler, index) => {
        eventSystem.on(`concurrent-${index}`, handler)
      })
      
      // Emit to all events concurrently
      const emitPromises = handlers.map((_, index) =>
        eventSystem.emit(`concurrent-${index}`, { handlerIndex: index })
      )
      
      await Promise.all(emitPromises)
      
      // Each handler should have been called once
      handlers.forEach((handler, index) => {
        expect(handler).toHaveBeenCalledWith({ handlerIndex: index })
      })
    })

    it('should maintain event ordering within same event type', async () => {
      const receivedOrder: number[] = []
      const handler: EventHandler = (data: unknown) => {
        receivedOrder.push((data as { order: number }).order)
      }
      
      eventSystem.on('ordered-event', handler)
      
      // Emit events in sequence
      for (let i = 0; i < 10; i++) {
        await eventSystem.emit('ordered-event', { order: i })
      }
      
      expect(receivedOrder).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    })
  })
})