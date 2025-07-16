# Claude Studio Architecture

## Table of Contents

- [Cross-Server Communication Architecture](#cross-server-communication-architecture)
- [Component Overview](#component-overview)
- [Data Flow](#data-flow)

## Cross-Server Communication Architecture

### Overview

Claude Studio runs two servers:

- **Stable Server (3456)**: For MCP tools and production use
- **Dev Server (3457)**: Hot reload enabled for development

Both servers need to share real-time events (messages, status updates, etc).

### EventSystem Abstraction

Location: `web/server/services/EventSystem.ts`

The EventSystem provides an abstraction layer for event broadcasting:

- **Interface**: `IEventTransport` defines emit/on/off/destroy methods
- **Implementations**: In-memory (dev) and Redis adapter (production)
- **Factory Pattern**: Switches transport based on config

### Redis Adapter Implementation

Location: `web/server/services/transports/RedisAdapterTransport.ts`

Uses `@socket.io/redis-adapter` for Socket.IO integration:

- Connects to Redis at `redis://localhost:6379`
- Enables cross-server broadcasting
- All events emitted on one server appear on other servers

### Socket.IO Integration

- Each server creates its own Socket.IO instance
- Redis adapter syncs events between instances
- Frontend connects via `window.location.origin`

### Message Flow

1. Agent sends message on Server A (e.g., stable 3456)
2. ClaudeService emits via EventSystem: `message:new`
3. Redis broadcasts to all connected servers
4. Server B (e.g., dev 3457) receives and emits to its clients
5. Frontend filters by agentId and displays message

### Key Events

- `message:new`: New agent messages
- `agent:status-changed`: Agent busy/online status
- `agent:token-usage`: Token count updates

## Component Overview

### Backend Services

- **EventSystem**: Cross-server event abstraction
- **ClaudeService**: Manages Claude SDK interactions
- **StudioSessionService**: Handles session JSONL files
- **WorkflowOrchestrator**: Multi-agent workflow execution

### Frontend Components

- **MessageHistoryViewer**: Displays agent messages
- **useWebSocket**: WebSocket connection hook
- **AgentCard**: Shows agent status and messages

## Data Flow

### Session ID Mapping

1. **Agent ID** (stable): `knowledge-facilitator_01`
2. **Claude Session ID** (changes): `a6ef0489-803b-4c40-855f-44bc8315c5f7`
3. **JSONL File**: `~/.claude/projects/{path}/session-id.jsonl`

### Message Loading

1. Frontend requests: `/api/studio-projects/:id/sessions/:sessionId/messages`
2. StudioSessionService finds correct directory
3. Reads JSONL file and parses messages
4. Returns paginated results

See also: [gotchas.md](./gotchas.md#claude-session-file-location-issue)
