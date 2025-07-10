/**
 * Test for Redis Cross-Server Communication
 *
 * SOLID: Single responsibility - Test Redis event broadcasting
 * DRY: Reusable test utilities for Socket.IO and Redis
 * KISS: Simple, focused tests for cross-server messaging
 * Library-First: Uses Vitest, Socket.IO client, Redis client
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { Server as SocketIOServer } from 'socket.io'
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client'
import { createServer } from 'http'
import { createClient } from 'redis'
import { createAdapter } from '@socket.io/redis-adapter'

describe('Redis Cross-Server Communication', () => {
  let server1: ReturnType<typeof createServer>
  let server2: ReturnType<typeof createServer>
  let io1: SocketIOServer
  let io2: SocketIOServer
  let pubClient: ReturnType<typeof createClient>
  let subClient: ReturnType<typeof createClient>
  let client1: ClientSocket
  let client2: ClientSocket
  const PORT1 = 3456
  const PORT2 = 3457
  const REDIS_URL = 'redis://localhost:6379'

  beforeAll(async () => {
    // Create Redis clients
    pubClient = createClient({ url: REDIS_URL })
    subClient = pubClient.duplicate()

    await Promise.all([pubClient.connect(), subClient.connect()])

    // Create two HTTP servers
    server1 = createServer()
    server2 = createServer()

    // Create Socket.IO servers with Redis adapter
    io1 = new SocketIOServer(server1, {
      cors: { origin: '*' },
    })
    io2 = new SocketIOServer(server2, {
      cors: { origin: '*' },
    })

    // Configure both servers to use Redis adapter
    io1.adapter(createAdapter(pubClient, subClient))
    io2.adapter(createAdapter(pubClient.duplicate(), subClient.duplicate()))

    // Start servers
    await new Promise<void>((resolve) => {
      server1.listen(PORT1, () => {
        console.log(`Test server 1 listening on port ${PORT1}`)
        resolve()
      })
    })

    await new Promise<void>((resolve) => {
      server2.listen(PORT2, () => {
        console.log(`Test server 2 listening on port ${PORT2}`)
        resolve()
      })
    })
  })

  afterAll(async () => {
    // Clean up
    if (client1) client1.disconnect()
    if (client2) client2.disconnect()

    io1.close()
    io2.close()

    await new Promise<void>((resolve) => server1.close(() => resolve()))
    await new Promise<void>((resolve) => server2.close(() => resolve()))

    await pubClient.quit()
    await subClient.quit()
  })

  beforeEach(() => {
    // Clear any existing connections
    if (client1) client1.disconnect()
    if (client2) client2.disconnect()
  })

  it('should broadcast messages from server 1 to clients on server 2', async () => {
    // Connect client to server 2
    client2 = ioClient(`http://localhost:${PORT2}`)

    // Wait for connection
    await new Promise<void>((resolve) => {
      client2.on('connect', () => resolve())
    })

    // Set up message listener
    const messagePromise = new Promise<{ sessionId: string; message: unknown }>((resolve) => {
      client2.on('message:new', (data) => {
        resolve(data)
      })
    })

    // Emit message from server 1
    io1.emit('message:new', {
      sessionId: 'test-agent-01',
      message: {
        role: 'assistant',
        content: 'Cross-server test message from server 1',
        timestamp: new Date().toISOString(),
      },
    })

    // Verify client on server 2 receives the message
    const received = await messagePromise
    expect(received.sessionId).toBe('test-agent-01')
    expect(received.message).toMatchObject({
      role: 'assistant',
      content: 'Cross-server test message from server 1',
    })
  })

  it('should broadcast messages from server 2 to clients on server 1', async () => {
    // Connect client to server 1
    client1 = ioClient(`http://localhost:${PORT1}`)

    // Wait for connection
    await new Promise<void>((resolve) => {
      client1.on('connect', () => resolve())
    })

    // Set up message listener
    const messagePromise = new Promise<{ sessionId: string; message: unknown }>((resolve) => {
      client1.on('message:new', (data) => {
        resolve(data)
      })
    })

    // Emit message from server 2
    io2.emit('message:new', {
      sessionId: 'test-agent-02',
      message: {
        role: 'user',
        content: 'Cross-server test message from server 2',
        timestamp: new Date().toISOString(),
      },
    })

    // Verify client on server 1 receives the message
    const received = await messagePromise
    expect(received.sessionId).toBe('test-agent-02')
    expect(received.message).toMatchObject({
      role: 'user',
      content: 'Cross-server test message from server 2',
    })
  })

  it('should handle multiple simultaneous messages across servers', async () => {
    // Connect clients to both servers
    client1 = ioClient(`http://localhost:${PORT1}`)
    client2 = ioClient(`http://localhost:${PORT2}`)

    // Wait for connections
    await Promise.all([
      new Promise<void>((resolve) => client1.on('connect', () => resolve())),
      new Promise<void>((resolve) => client2.on('connect', () => resolve())),
    ])

    // Track received messages
    const messages1: unknown[] = []
    const messages2: unknown[] = []

    client1.on('message:new', (data) => messages1.push(data))
    client2.on('message:new', (data) => messages2.push(data))

    // Emit multiple messages from both servers
    const testMessages = [
      { server: io1, id: 'msg-1', content: 'Message 1 from server 1' },
      { server: io2, id: 'msg-2', content: 'Message 2 from server 2' },
      { server: io1, id: 'msg-3', content: 'Message 3 from server 1' },
      { server: io2, id: 'msg-4', content: 'Message 4 from server 2' },
    ]

    for (const { server, id, content } of testMessages) {
      server.emit('message:new', {
        sessionId: id,
        message: { content },
      })
    }

    // Wait for messages to propagate
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Both clients should receive all messages
    expect(messages1).toHaveLength(4)
    expect(messages2).toHaveLength(4)

    // Verify all messages were received
    for (const { id } of testMessages) {
      expect(messages1.some((m) => (m as { sessionId: string }).sessionId === id)).toBe(true)
      expect(messages2.some((m) => (m as { sessionId: string }).sessionId === id)).toBe(true)
    }
  })

  it('should maintain session isolation when broadcasting', async () => {
    // Connect two clients to different servers
    client1 = ioClient(`http://localhost:${PORT1}`)
    client2 = ioClient(`http://localhost:${PORT2}`)

    await Promise.all([
      new Promise<void>((resolve) => client1.on('connect', () => resolve())),
      new Promise<void>((resolve) => client2.on('connect', () => resolve())),
    ])

    // Each client listens for specific agent messages
    const agent1Messages: unknown[] = []
    const agent2Messages: unknown[] = []

    client1.on('message:new', (data: unknown) => {
      const typedData = data as { sessionId: string }
      if (typedData.sessionId === 'agent-01') {
        agent1Messages.push(data)
      }
    })

    client2.on('message:new', (data: unknown) => {
      const typedData = data as { sessionId: string }
      if (typedData.sessionId === 'agent-02') {
        agent2Messages.push(data)
      }
    })

    // Emit messages for different agents
    io1.emit('message:new', {
      sessionId: 'agent-01',
      message: { content: 'Message for agent 1' },
    })

    io2.emit('message:new', {
      sessionId: 'agent-02',
      message: { content: 'Message for agent 2' },
    })

    io1.emit('message:new', {
      sessionId: 'agent-03',
      message: { content: 'Message for agent 3' },
    })

    // Wait for propagation
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Verify session isolation
    expect(agent1Messages).toHaveLength(1)
    expect(agent2Messages).toHaveLength(1)
    expect(agent1Messages[0]).toMatchObject({
      sessionId: 'agent-01',
      message: { content: 'Message for agent 1' },
    })
    expect(agent2Messages[0]).toMatchObject({
      sessionId: 'agent-02',
      message: { content: 'Message for agent 2' },
    })
  })
})
