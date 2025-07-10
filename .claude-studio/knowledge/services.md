# Claude Studio Services Documentation

## StudioSessionService

### Purpose

Manages Claude session JSONL files and provides access to message history. This service bridges the gap between Claude's file-based message storage and the Studio UI's need for message data.

### Key Responsibilities

- Locating Claude project directories
- Reading JSONL message files
- Mapping agent IDs to Claude session IDs
- Providing paginated message access
- Handling multiple project directory patterns

### Architecture

```typescript
// web/server/services/StudioSessionService.ts
export class StudioSessionService {
  private knex: Knex

  constructor(knex: Knex) {
    this.knex = knex
  }

  // Main public methods
  async getSessionMessages(sessionId: string, cursor?: string, limit?: number)
  async findProjectFolderBySessionId(sessionId: string): Promise<string | null>

  // Internal methods
  private async getClaudeProjectFolder(projectPath: string): Promise<string | null>
  private async readJsonlFile(filePath: string): Promise<Message[]>
  private async fileExists(filePath: string): Promise<boolean>
}
```

### Session ID Mapping

The service maintains a three-level mapping:

1. **Agent ID** → **Claude Session ID** (via agent_claude_sessions table)
2. **Claude Session ID** → **JSONL File** (via file system search)
3. **JSONL File** → **Messages** (via file parsing)

```sql
-- agent_claude_sessions table structure
CREATE TABLE agent_claude_sessions (
  agent_id TEXT NOT NULL,
  claude_session_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (agent_id, claude_session_id)
);
```

### Directory Structure

Claude stores messages in a specific directory structure:

```
~/.claude/
└── projects/
    ├── {project-name}/           # Regular project directory
    │   ├── session-id-1.jsonl
    │   └── session-id-2.jsonl
    └── {project-name}-private/   # Private variant (often empty)
        └── session-id-3.jsonl
```

### Key Methods

#### getSessionMessages

Retrieves messages for a specific session with pagination support:

```typescript
async getSessionMessages(
  sessionId: string,
  cursor?: string,
  limit: number = 50
): Promise<{
  messages: Message[]
  hasMore: boolean
  nextCursor?: string
}>
```

#### findProjectFolderBySessionId

Searches all Claude project directories for a specific session file:

```typescript
async findProjectFolderBySessionId(
  sessionId: string
): Promise<string | null>
```

#### getClaudeProjectFolder

Determines the correct Claude project folder for a given project path:

```typescript
private async getClaudeProjectFolder(
  projectPath: string
): Promise<string | null>
```

**Important**: This method now checks for the most recent JSONL files to determine the active directory, fixing the issue where empty `-private` directories were incorrectly preferred.

### Message Format

Claude stores messages in JSONL format (one JSON object per line):

```json
{"id":"msg_123","type":"human","content":"Hello","timestamp":"2025-01-10T12:00:00Z"}
{"id":"msg_124","type":"assistant","content":"Hi there!","timestamp":"2025-01-10T12:00:01Z"}
```

### Error Handling

The service handles several edge cases:

- Missing project directories
- Non-existent session files
- Malformed JSONL entries
- Permission issues
- Race conditions during file writes

### Performance Considerations

1. **File System Caching**: Directory lookups are expensive, consider caching
2. **Large Files**: JSONL files can grow large, pagination is essential
3. **Concurrent Access**: Claude may be writing while we're reading
4. **Directory Scanning**: Finding session files requires directory traversal

### Integration Points

- **ClaudeAgent**: Creates sessions and writes agent ID mappings
- **API Endpoints**: `/api/studio-projects/:id/sessions/:sessionId/messages`
- **Frontend**: MessageHistoryViewer component
- **WebSocket**: Real-time message updates bypass file reading

### Common Issues

1. **Wrong Directory**: Service finds empty `-private` directory instead of active one
2. **Timing**: File may not be fully written when reading
3. **Session Changes**: Claude creates new sessions frequently
4. **Path Normalization**: Project names need consistent normalization

See also:

- [Architecture Documentation](./architecture.md#cross-server-communication-architecture)
- [API Documentation](./apis.md#studio-session-messages-api)
- [Gotchas](./gotchas.md#claude-session-file-location-issue)

## EventSystem

### Purpose

Provides an abstraction layer for event emission that can work across multiple server instances. This enables real-time communication between the dev server (3457) and stable server (3456).

### Architecture

```typescript
// Base abstraction
export abstract class EventSystem {
  abstract emit(event: string, data: any): void
  abstract on(event: string, handler: (data: any) => void): void
  abstract off(event: string, handler: (data: any) => void): void
}

// Implementations
export class SocketIOEventSystem extends EventSystem // Direct Socket.IO
export class RedisEventSystem extends EventSystem    // Redis pub/sub
```

### Event Flow

1. **Agent/Service** calls `eventSystem.emit(event, data)`
2. **EventSystem** implementation handles distribution
3. **Socket.IO** broadcasts to all connected clients
4. **Frontend** filters by agentId/sessionId

### Benefits

- Swappable implementations (Socket.IO → Redis → BullMQ)
- Cross-server communication
- Consistent API for all services
- Future scalability

See also:

- [Architecture Documentation](./architecture.md#eventsystem-abstraction)
