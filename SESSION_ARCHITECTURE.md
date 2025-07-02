# Session Architecture Design

## Core Principles

- **SOLID**: Single responsibility, clear interfaces
- **DRY**: No duplicate session tracking logic
- **KISS**: Simple, direct session management
- **Library First**: Use existing Node.js/filesystem APIs

## Session Relationship

```
Project Directory → Claude Session Directory → Agent Session
/my-project     → ~/.claude/projects/-my-project → {sessionId}.jsonl
```

## Architecture

### 1. SessionService (Single Responsibility)

**Purpose**: Track current sessionId for each agent in each project

```typescript
interface SessionTracker {
  getSession(projectId: string, agentId: string): string | null
  updateSession(projectId: string, agentId: string, sessionId: string): void
  clearSession(projectId: string, agentId: string): void
  deleteProject(projectId: string): void
}
```

**Storage Format** (`~/.claude-studio/projects/{projectId}/sessions.json`):

```json
{
  "agent-id-1": "current-session-id",
  "agent-id-2": "another-session-id"
}
```

### 2. Integration Points

#### ClaudeAgent (Already tracks sessionId)

- **Current**: Updates internal sessionId on checkpoint
- **Change**: Notify SessionService when sessionId changes
- **KISS**: Minimal change, just add callback

#### Message Flow

- **Current**: Returns sessionId after message
- **Change**: Update SessionService with new sessionId
- **DRY**: Reuse existing sessionId tracking

#### ConfigService

- **Current**: Manages project/agent configs
- **Change**: Add session file management methods
- **Library First**: Use fs.promises for file operations

### 3. Key Decisions

1. **Simple JSON storage** - No database needed (KISS)
2. **Project-level tracking** - Matches Claude's organization
3. **Synchronous updates** - No complex async state (KISS)
4. **Direct JSONL access** - No discovery/scanning (Performance)

### 4. Session Lifecycle

```
1. Add Agent to Project
   └─ No session yet

2. First Message
   ├─ Claude creates session
   └─ Store: project+agent → sessionId

3. Checkpoint
   ├─ Claude creates new sessionId
   └─ Update: project+agent → new sessionId

4. Clear Context
   ├─ Force new session
   ├─ Delete old JSONL
   └─ Update: project+agent → new sessionId

5. Delete Agent
   ├─ Delete JSONL file
   └─ Remove from sessions.json
```

### 5. Benefits

- **Fast**: Direct sessionId lookup, no scanning
- **Clear**: One source of truth per project
- **Simple**: Just track current sessionId
- **Maintainable**: Clear separation of concerns
