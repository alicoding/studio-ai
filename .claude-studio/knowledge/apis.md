# Claude Studio API Documentation

## Studio Session Messages API

### GET /api/studio-projects/:id/sessions/:sessionId/messages

Retrieves message history for a specific Claude session. This endpoint reads from Claude's JSONL files and returns paginated results.

#### Parameters

**Path Parameters:**

- `id` (string, required): The studio project ID
- `sessionId` (string, required): The Claude session ID (not the agent ID)

**Query Parameters:**

- `cursor` (string, optional): Pagination cursor for fetching next page
- `limit` (number, optional): Number of messages to return (default: 50, max: 100)

#### Response

```typescript
interface SessionMessagesResponse {
  messages: Message[]
  hasMore: boolean
  nextCursor?: string
}

interface Message {
  id: string
  type: 'human' | 'assistant' | 'system'
  content: string
  timestamp: string
  metadata?: Record<string, any>
}
```

#### Example Request

```bash
GET /api/studio-projects/proj_123/sessions/sess_abc/messages?limit=20

# With pagination
GET /api/studio-projects/proj_123/sessions/sess_abc/messages?cursor=msg_456&limit=20
```

#### Example Response

```json
{
  "messages": [
    {
      "id": "msg_123",
      "type": "human",
      "content": "Write a hello world function",
      "timestamp": "2025-01-10T12:00:00Z"
    },
    {
      "id": "msg_124",
      "type": "assistant",
      "content": "I'll create a hello world function for you...",
      "timestamp": "2025-01-10T12:00:01Z"
    }
  ],
  "hasMore": true,
  "nextCursor": "msg_125"
}
```

#### Error Responses

```json
// 404 - Session not found
{
  "error": "Session not found"
}

// 500 - Internal error
{
  "error": "Failed to read session messages"
}
```

#### Implementation Details

1. **Session ID Lookup**: The sessionId must be a valid Claude session ID, not an agent ID
2. **File Location**: Messages are read from `~/.claude/projects/{project-name}/{sessionId}.jsonl`
3. **Pagination**: Uses message IDs as cursors for efficient pagination
4. **Real-time Updates**: For live messages, use WebSocket connection instead

#### Important Notes

- Session IDs change frequently as Claude creates new sessions
- Use the agent's current session ID from the database
- Messages are stored in JSONL format (one JSON per line)
- File may be actively written to by Claude, handle gracefully

See also:

- [Services Documentation](./services.md#studiosessionservice)
- [WebSocket Events](#websocket-events)

## WebSocket Events

### Overview

Real-time events are transmitted via Socket.IO WebSocket connections. The frontend connects to the same origin as the UI to ensure proper event routing.

### Connection

```typescript
// Frontend connection (automatic origin detection)
const socket = io(window.location.origin, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
})
```

### Event Types

#### agent:message

Emitted when an agent sends or receives a message.

```typescript
interface AgentMessageEvent {
  agentId: string // Agent instance ID (e.g., "dev_01")
  sessionId: string // Claude session ID
  message: {
    id: string
    type: 'human' | 'assistant' | 'system'
    content: string
    timestamp: string
  }
}
```

#### agent:status-changed

Emitted when an agent's status changes.

```typescript
interface AgentStatusEvent {
  agentId: string
  status: 'idle' | 'busy' | 'error'
  sessionId?: string
}
```

#### agent:stream-chunk

Emitted for streaming message chunks during generation.

```typescript
interface StreamChunkEvent {
  agentId: string
  sessionId: string
  chunk: string
  messageId: string
}
```

#### workflow:status-update

Emitted during workflow execution.

```typescript
interface WorkflowStatusEvent {
  threadId: string
  status: 'running' | 'completed' | 'failed' | 'aborted'
  currentStep?: string
  progress?: {
    completed: number
    total: number
  }
}
```

### Event Filtering

Frontend filters events by agentId to prevent cross-agent message contamination:

```typescript
socket.on('agent:message', (data: AgentMessageEvent) => {
  if (data.agentId === currentAgentId) {
    // Process message for current agent only
  }
})
```

### Cross-Server Communication

Events are broadcast across all servers via Redis:

1. Agent on any server emits event
2. EventSystem publishes to Redis
3. All servers receive and broadcast to their clients
4. Clients filter by relevant IDs

### Reconnection Handling

The frontend automatically handles reconnection:

```typescript
socket.on('reconnect', () => {
  // Re-establish event handlers
  // Emit custom event for components to reload data
  window.dispatchEvent(new CustomEvent('websocket-reconnected'))
})
```

See also:

- [Architecture Documentation](./architecture.md#cross-server-communication-architecture)
- [Services Documentation](./services.md#eventsystem)

## Studio Projects API

### GET /api/studio-projects/:id/agents/short-ids

Returns agents with their short IDs for display in the UI.

#### Response

```typescript
interface ShortIdAgent {
  id: string // Short ID (e.g., "dev_01")
  name: string // Display name
  role: string // Agent role
  configId: string // Full agent config ID
  status: 'idle' | 'busy' | 'error'
  customTools?: string[]
}
```

### POST /api/studio-projects/:id/agents

Adds an agent to a studio project.

#### Request

```typescript
interface AddAgentRequest {
  role: string
  agentConfigId: string
  customTools?: string[]
}
```

### DELETE /api/studio-projects/:id/agents/:role

Removes an agent from a studio project by role.

See also:

- [Gotchas](./gotchas.md#studio-projects-api)
