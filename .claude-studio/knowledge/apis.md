# Claude Studio APIs

## Table of Contents

- [Studio Session Messages API](#studio-session-messages-api)
- [Studio Projects API](#studio-projects-api)
- [Agent Management APIs](#agent-management-apis)
- [WebSocket Events](#websocket-events)

## Studio Session Messages API

### GET /api/studio-projects/:id/sessions/:sessionId/messages

**Purpose:** Retrieve messages from a Claude session

**Parameters:**

- `id`: Studio project ID
- `sessionId`: Claude session ID (from agent)
- `cursor` (query): Pagination cursor
- `limit` (query): Number of messages (default: 50)

**Response:**

```json
{
  "messages": [
    {
      "id": "session-id-74",
      "role": "assistant",
      "content": "...",
      "timestamp": "2025-01-10T11:36:45.949Z",
      "type": "assistant",
      "model": "claude-opus-4-20250514",
      "usage": {
        "input_tokens": 4,
        "output_tokens": 34
      }
    }
  ],
  "hasMore": true,
  "nextCursor": "71"
}
```

**Common Issues:**

- Returns empty if session file in wrong directory
- Check server logs for "Session X not found" errors
- Verify with: `curl http://localhost:3457/api/studio-projects/{id}/sessions/{sessionId}/messages`

## Studio Projects API

### GET /api/studio-projects/:id/agents/:agentId/session

**Purpose:** Get current Claude session ID for an agent

**Response:**

```json
{
  "sessionId": "a6ef0489-803b-4c40-855f-44bc8315c5f7"
}
```

**Notes:**

- Session IDs change with each new conversation
- Use this to get current session before loading messages

### POST /api/studio-projects/:id/agents

**Purpose:** Add agent to project

**Body:**

```json
{
  "role": "developer",
  "agentConfigId": "68c57432-3e06-4e0c-84d0-36f63bed17b2"
}
```

### DELETE /api/studio-projects/:id/agents/:role

**Purpose:** Remove agent from project by role

## Agent Management APIs

### GET /api/agents

**Purpose:** List all agent configurations

### POST /api/agents

**Purpose:** Create new agent configuration

**Body:**

```json
{
  "name": "Knowledge Facilitator",
  "role": "knowledge-facilitator",
  "systemPrompt": "...",
  "tools": [
    { "name": "read", "enabled": true },
    { "name": "write", "enabled": true }
  ],
  "model": "claude-3-opus",
  "maxTokens": 200000
}
```

## WebSocket Events

### Client → Server

**Connection:**

```javascript
const socket = io(window.location.origin)
```

### Server → Client Events

**message:new**

```json
{
  "sessionId": "knowledge-facilitator_01",
  "message": {
    "role": "assistant",
    "content": "...",
    "timestamp": "2025-01-10T11:36:45.949Z"
  }
}
```

**agent:status-changed**

```json
{
  "agentId": "knowledge-facilitator_01",
  "status": "busy" | "online"
}
```

**agent:token-usage**

```json
{
  "agentId": "knowledge-facilitator_01",
  "tokens": 38,
  "maxTokens": 200000
}
```

### Important Notes

- WebSocket uses agentId for routing, not sessionId
- Frontend must connect to same server as API calls
- Redis enables cross-server event broadcasting

See also: [architecture.md](./architecture.md#cross-server-communication-architecture)
