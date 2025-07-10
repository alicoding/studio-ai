# Claude Studio Architecture

## Cross-Server Communication Architecture

### Overview

Claude Studio uses a multi-server architecture with an EventSystem abstraction layer to enable real-time communication between different server instances. This is crucial for development where the UI connects to the dev server (3457) but needs to receive events from both servers.

### Server Configuration

- **Stable Server (3456)**: Production-ready server for MCP tools and stable operations
- **Dev Server (3457)**: Hot-reload enabled server for active development
- **WebSocket**: Frontend connects to the same origin as the UI for Socket.IO events

### EventSystem Abstraction

The EventSystem provides a unified interface for event emission across servers:

```typescript
// Core abstraction in web/server/services/EventSystem.ts
export abstract class EventSystem {
  abstract emit(event: string, data: any): void
  abstract on(event: string, handler: (data: any) => void): void
  abstract off(event: string, handler: (data: any) => void): void
}
```

### Redis Adapter Implementation

The Redis adapter enables cross-server communication:

```typescript
// web/server/services/RedisEventSystem.ts
export class RedisEventSystem extends EventSystem {
  private publisher: Redis
  private subscriber: Redis
  private handlers: Map<string, Set<(data: any) => void>>

  constructor(io: Server) {
    // Publisher for sending events
    this.publisher = new Redis(redisConfig)

    // Subscriber for receiving events
    this.subscriber = new Redis(redisConfig)

    // Subscribe to all events
    this.subscriber.psubscribe('claude-studio:*')

    // Forward Redis events to Socket.IO
    this.subscriber.on('pmessage', (pattern, channel, message) => {
      const event = channel.replace('claude-studio:', '')
      const data = JSON.parse(message)
      io.emit(event, data)
    })
  }

  emit(event: string, data: any): void {
    // Publish to Redis for cross-server communication
    this.publisher.publish(`claude-studio:${event}`, JSON.stringify(data))
  }
}
```

### Socket.IO Integration

Events flow through Socket.IO to connected clients:

1. **Agent emits event** → EventSystem → Redis
2. **Redis publishes** → All subscribed servers
3. **Servers receive** → Socket.IO broadcast → All connected clients
4. **Clients filter** → By agentId/sessionId → UI updates

### Message Flow Example

```
1. Agent on dev server (3457) sends message
   ↓
2. ClaudeAgent.sendMessage() emits via EventSystem
   ↓
3. RedisEventSystem publishes to Redis channel
   ↓
4. Both servers (3456, 3457) receive via subscription
   ↓
5. Each server's Socket.IO emits to its clients
   ↓
6. Frontend (connected to 3457) receives and filters by agentId
```

### Key Benefits

1. **Server Independence**: Agents can run on any server
2. **Real-time Updates**: Messages appear instantly in UI
3. **Scalability**: Can add more servers as needed
4. **Flexibility**: EventSystem can be swapped (Redis → BullMQ → NATS)
5. **Development Experience**: Hot reload works without losing events

### Configuration

Enable Redis adapter in server initialization:

```typescript
// web/server/server.ts
const eventSystem = process.env.REDIS_URL ? new RedisEventSystem(io) : new SocketIOEventSystem(io)

app.set('eventSystem', eventSystem)
```

### Related Components

- **ClaudeAgent**: Uses EventSystem for all status/message events
- **WorkflowOrchestrator**: Emits workflow progress events
- **StudioSessionService**: Reads Claude's JSONL files
- **Frontend WebSocket Hook**: Filters events by agentId

See also:

- [Services Documentation](./services.md#eventsystem)
- [API Patterns](./apis.md#websocket-events)
- [Gotchas](./gotchas.md#websocket-connection)
