# Claude Studio Services

## Table of Contents

- [StudioSessionService](#studiosessionservice)
- [ClaudeService](#claudeservice)
- [EventSystem](#eventsystem)
- [WorkflowOrchestrator](#workfloworchestrator)

## StudioSessionService

**Location:** `web/server/services/StudioSessionService.ts`

### Purpose

Manages Claude session JSONL files, providing an interface between the Studio API and Claude's file-based session storage.

### Key Methods

#### `getSessionMessages(workspacePath, sessionId, options)`

- Loads messages from JSONL files
- Handles pagination with cursor/limit
- Uses caching for project paths
- Returns: `{ messages, hasMore, nextCursor }`

#### `findProjectFolderBySessionId(sessionId)`

- Searches all Claude project directories for a session
- Uses grep for efficient file searching
- Returns the directory containing the session

#### `getClaudeProjectFolder(workspacePath)`

- Converts workspace paths to Claude's directory format
- Handles both `-private` and regular prefixes
- **Updated Logic (2025-01-10):**
  - Checks both directory types
  - Prefers directory with more/recent JSONL files
  - Prevents empty `-private` directory selection

### Session Storage Structure

```
~/.claude/projects/
├── -Users-ali-project/           # Regular directory
│   ├── session-id-1.jsonl
│   └── session-id-2.jsonl
└── -private-Users-ali-project/   # Private directory (may be empty)
    └── old-session.jsonl
```

### Common Issues

- **Directory Selection**: May pick wrong directory if both exist
- **Session Not Found**: Check both directory prefixes
- **Path Normalization**: `/` replaced with `-` in directory names

## ClaudeService

**Location:** `web/server/services/ClaudeService.ts`

### Purpose

Manages Claude SDK interactions and agent instances.

### Key Features

- Creates and manages Claude agent instances
- Handles tool permissions (allowed/disallowed)
- Emits events via EventSystem
- Returns stable agent IDs (not Claude's changing session IDs)

### Important Methods

- `sendMessage()`: Sends messages to Claude agents
- Returns: `{ response, sessionId: agentId }` (stable ID for routing)

## EventSystem

**Location:** `web/server/services/EventSystem.ts`

### Purpose

Abstraction layer for cross-server event communication.

### Architecture

- **Interface**: `IEventTransport` (emit/on/off/destroy)
- **Implementations**:
  - InMemoryTransport (single server)
  - RedisAdapterTransport (multi-server)

### Key Events

- `message:new`: Agent messages
- `agent:status-changed`: Busy/online status
- `agent:token-usage`: Token updates

### Usage

```typescript
eventSystem.emit('message:new', { sessionId: agentId, message })
```

## WorkflowOrchestrator

**Location:** `web/server/services/WorkflowOrchestrator.ts`

### Purpose

Executes multi-agent workflows with LangGraph.

### Features

- Dependency resolution
- Template variable substitution
- Session management
- Checkpointing (PostgreSQL/Memory)

### Workflow Execution

1. Resolves agent configurations
2. Builds LangGraph workflow
3. Executes steps with dependencies
4. Emits events for UI updates

See also: [architecture.md](./architecture.md)
