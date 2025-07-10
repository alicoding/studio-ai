# Claude Studio Design Patterns

## WebSocket Message Routing

### Problem

Claude's session IDs change frequently as it creates new sessions, making it difficult to maintain consistent message routing in the UI. Additionally, with multiple servers (stable and dev), messages need to be routed correctly regardless of which server the agent is running on.

### Solution

Use stable agent IDs for routing while maintaining Claude session IDs internally for SDK communication.

### Pattern Implementation

#### 1. Stable Identifiers for Routing

```typescript
// Frontend uses agentId for all WebSocket filtering
socket.on('agent:message', (data) => {
  if (data.agentId === currentAgentId) {  // Stable ID like "dev_01"
    handleMessage(data)
  }
})

// Backend emits with agentId, not sessionId
this.eventSystem.emit('agent:message', {
  agentId: this.agentId,      // Stable: "dev_01"
  sessionId: this.sessionId,   // Changes: "sess_abc123..."
  message: { ... }
})
```

#### 2. Internal Session ID Mapping

```typescript
// agent_claude_sessions table maintains the mapping
interface AgentClaudeSession {
  agent_id: string // "dev_01"
  claude_session_id: string // "sess_abc123..."
  created_at: Date
  updated_at: Date
}

// ClaudeAgent maintains current session internally
class ClaudeAgent {
  private sessionId?: string // Current Claude session

  async ensureSession() {
    if (!this.sessionId) {
      // Create new session via SDK
      this.sessionId = await this.createSession()
      // Store mapping in database
      await this.storeSessionMapping(this.agentId, this.sessionId)
    }
  }
}
```

#### 3. Cross-Server Event Distribution

```typescript
// EventSystem abstracts the distribution mechanism
class RedisEventSystem extends EventSystem {
  emit(event: string, data: any): void {
    // Publish to Redis for all servers
    this.publisher.publish(`claude-studio:${event}`, JSON.stringify(data))
  }
}

// All servers receive and filter locally
this.subscriber.on('pmessage', (pattern, channel, message) => {
  const event = channel.replace('claude-studio:', '')
  const data = JSON.parse(message)

  // Broadcast to all connected clients
  this.io.emit(event, data)

  // Clients filter by agentId
})
```

### Benefits

1. **Stability**: Agent IDs don't change during a session
2. **Scalability**: Works across multiple servers
3. **Flexibility**: Session IDs can change without breaking UI
4. **Performance**: Client-side filtering is efficient
5. **Debugging**: Clear which agent owns which messages

### Anti-Patterns to Avoid

❌ **Don't route by session ID**

```typescript
// Bad: Session IDs change frequently
socket.on('message', (data) => {
  if (data.sessionId === currentSessionId) { ... }
})
```

❌ **Don't assume single server**

```typescript
// Bad: Only works on same server
this.io.to(socketId).emit('message', data)
```

❌ **Don't mix identifiers**

```typescript
// Bad: Inconsistent ID usage
emit('message', {
  id: sessionId, // Which ID?
  agentId: agentId, // Redundant?
  agent: configId, // Confusing!
})
```

### Related Patterns

See also:

- [Architecture Documentation](./architecture.md#cross-server-communication-architecture)
- [API Documentation](./apis.md#websocket-events)
- [Services Documentation](./services.md#eventsystem)

## Component State Management

### Problem

Components need to react to various events (WebSocket messages, URL changes, agent updates) while maintaining clean separation of concerns.

### Solution

Use event-driven architecture with custom events for cross-component communication.

### Pattern Implementation

```typescript
// Emit custom events for component communication
window.dispatchEvent(
  new CustomEvent('agent-updated', {
    detail: { agentId },
  })
)

// Components listen and react
useEffect(() => {
  const handleUpdate = (e: CustomEvent) => {
    if (e.detail.agentId === agentId) {
      refetch()
    }
  }

  window.addEventListener('agent-updated', handleUpdate)
  return () => window.removeEventListener('agent-updated', handleUpdate)
}, [agentId])
```

## Error Handling Patterns

### Graceful Degradation

```typescript
// Try Redis, fall back to Socket.IO
let eventSystem: EventSystem
try {
  eventSystem = new RedisEventSystem(io)
} catch (error) {
  console.warn('Redis unavailable, using Socket.IO only')
  eventSystem = new SocketIOEventSystem(io)
}
```

### Session Recovery

```typescript
// Detect stale session and create new one
async sendMessage(content: string) {
  try {
    await this.claude.sendMessage(this.sessionId, content)
  } catch (error) {
    if (error.message.includes('session not found')) {
      // Create new session and retry
      this.sessionId = await this.createSession()
      await this.claude.sendMessage(this.sessionId, content)
    }
  }
}
```

## File System Patterns

### Directory Discovery

```typescript
// Check activity, not just existence
async findActiveDirectory(candidates: string[]): Promise<string | null> {
  let mostRecent: { dir: string; time: number } | null = null

  for (const dir of candidates) {
    const activity = await this.getDirectoryActivity(dir)
    if (activity && (!mostRecent || activity.time > mostRecent.time)) {
      mostRecent = { dir, time: activity.time }
    }
  }

  return mostRecent?.dir || null
}
```

See also:

- [Gotchas](./gotchas.md#claude-session-file-location-issue)
