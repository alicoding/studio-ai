# Claude Studio Session Management Refactor Plan

## Overview

Refactor Claude Studio to track sessionIds explicitly rather than trying to reverse-engineer Claude's native session management. This will make the system more robust and eliminate complex session reconciliation logic.

## Core Principles

1. **We track what we create** - Store sessionId when spawning agents
2. **Load what we track** - Use stored sessionId to load exact JSONL file
3. **No guessing** - Eliminate discovery/reconciliation logic
4. **Own the lifecycle** - From spawn to delete, we control everything

## Tasks

### 1. Remove Complex Session Reconciliation

- [ ] Remove `SessionReconciliation.ts` service
- [ ] Remove `/api/sessions` endpoints that use reconciliation
- [ ] Remove `useConsolidatedAgents` hook
- [ ] Remove session-related types that are no longer needed
- [ ] Clean up any UI components that depend on session reconciliation

### 2. Add SessionId Tracking to Agent Spawning

- [ ] Find where agents are spawned (likely in `claude-agent.ts`)
- [ ] Capture sessionId from Claude's response
- [ ] Store sessionId in agent configuration/metadata

**Questions:**

- Where exactly is the agent spawning code?
- What format does Claude return the sessionId in?
- Where should we store the sessionId? (in-memory, file, database?)

### 3. Update Agent Configuration Storage

- [ ] Add sessionId field to agent configuration schema
- [ ] Update agent config file format to include sessionId
- [ ] Ensure sessionId persists across server restarts

**Questions:**

- What is the current agent configuration format?
- Where are agent configurations stored?
- Should we support multiple sessionIds per agent (for history)?

### 4. Implement Direct JSONL Loading

- [ ] Update agent loading to use tracked sessionId
- [ ] Build JSONL filepath from sessionId (pattern: `{sessionId}.jsonl`)
- [ ] Remove all session discovery logic
- [ ] Handle case where JSONL file doesn't exist

**Questions:**

- What should happen if the tracked JSONL file is missing?
- Should we have a fallback mechanism?

### 5. Implement Proper Agent Deletion

- [ ] Delete agent from configuration
- [ ] Delete associated JSONL file(s) using tracked sessionId
- [ ] Clean up any other associated resources
- [ ] Update UI to reflect deletion

**Questions:**

- Are there other resources besides config and JSONL to clean up?
- Should we archive deleted sessions or hard delete?

### 6. Implement Context Clear (Trash Button)

- [ ] Create new Claude session when clearing context
- [ ] Update agent metadata with new sessionId
- [ ] Handle old JSONL file (delete or archive?)
- [ ] Ensure UI reflects fresh start

**Questions:**

- Should we keep old sessions for history/rollback?
- What's the UX flow for context clearing?
- Should clearing context reset other agent properties?

### 7. Update APIs and Endpoints

- [ ] Update `/api/agents` to return tracked sessionId
- [ ] Remove complex session consolidation from agent responses
- [ ] Ensure all endpoints use direct sessionId lookup
- [ ] Update WebSocket message handling for session tracking

### 8. UI Updates

- [ ] Remove checkpoint navigation UI (no longer needed)
- [ ] Update agent cards to show single session
- [ ] Ensure delete functionality works with new approach
- [ ] Update any session-related UI components

### 9. Testing and Validation

- [ ] Test agent spawning with sessionId tracking
- [ ] Test agent deletion (config + JSONL)
- [ ] Test context clearing
- [ ] Test persistence across server restarts
- [ ] Test error cases (missing files, corrupted data)

## Current Architecture Findings

### Agent Creation Flow

1. **ClaudeAgent** (`web/server/services/claude-agent.ts`):
   - Already tracks sessionId in the agent object
   - Updates sessionId when messages come through (lines 138-148)
   - Uses sessionId for `resume` option in query()

2. **ClaudeService** (`web/server/services/ClaudeService.ts`):
   - Creates ClaudeAgent instances with `getOrCreateAgent()`
   - Returns sessionId after sending messages

3. **Agent Configuration** (`src/services/ConfigService.ts`):
   - Stores agent configs in `~/.claude-studio/agents/`
   - AgentConfig interface doesn't currently include sessionId
   - Already has AgentSession interface but it's not used

### Key Discoveries

- SessionId is already being tracked in ClaudeAgent during message flow
- Claude's query() can create new sessionIds during checkpoints (lines 138-148 in claude-agent.ts)
- Agent configurations are stored as JSON files in user's home directory
- There's already an unused `AgentSession` interface that could be leveraged

## Architecture Decision

### Session Lifecycle

1. **Agent Creation**: Agent added to project → NO sessionId yet
2. **First Message**: Send first message → Receive sessionId from Claude
3. **Continuation**: Always use latest sessionId (updates at checkpoints)
4. **Storage**: Need clear, separate session tracking

### Key Decisions Made

1. **Always use latest sessionId** - Required for continuation after checkpoints
2. **No archiving** - Delete old sessions when clearing context
3. **Lazy session creation** - SessionId only exists after first message

### Proposed Architecture

To keep things clear and avoid confusion:

#### Option 1: Project-Level Session Tracking

```
~/.claude-studio/
  projects/
    {projectId}/
      config.json      # Project config
      sessions.json    # NEW: Track agent sessions
```

```json
// sessions.json
{
  "sessions": {
    "agentId-1": {
      "sessionId": "current-session-id",
      "lastUpdated": "2024-01-15T10:00:00Z"
    },
    "agentId-2": {
      "sessionId": "another-session-id",
      "lastUpdated": "2024-01-15T11:00:00Z"
    }
  }
}
```

#### Option 2: Agent-Level Session Tracking

```
~/.claude-studio/
  agents/
    {agentId}/
      config.json      # Agent config (unchanged)
      session.json     # NEW: Current session info
```

```json
// session.json
{
  "projectSessions": {
    "projectId-1": {
      "sessionId": "session-id-1",
      "lastUpdated": "2024-01-15T10:00:00Z"
    },
    "projectId-2": {
      "sessionId": "session-id-2",
      "lastUpdated": "2024-01-15T11:00:00Z"
    }
  }
}
```

**Recommendation**: Option 1 (Project-Level) because:

- Agents can work in multiple projects
- Easier to clean up when deleting a project
- Clear separation of concerns
- Matches how Claude organizes sessions (by project directory)

## Implementation Order

### Phase 1: Add Session Tracking Infrastructure

1. **Create SessionService** (`web/server/services/SessionService.ts`)
   - Store/retrieve sessionIds per project+agent
   - Update sessionId after each message
   - Handle session clearing
   - Load exact JSONL file by sessionId

2. **Update ConfigService**
   - Add methods to manage `sessions.json` in project directories
   - Ensure sessions.json is created when project is created

### Phase 2: Integrate Session Tracking

3. **Update ClaudeAgent**
   - Modify to notify SessionService when sessionId changes
   - Ensure it uses SessionService to get initial sessionId

4. **Update message flow** (`/api/messages`)
   - After sending message, update SessionService with new sessionId
   - On first message (no sessionId), store the initial one

### Phase 3: Remove Old System

5. **Remove SessionReconciliation**
   - Delete `web/server/services/SessionReconciliation.ts`
   - Remove `/api/sessions` endpoints
   - Remove `useConsolidatedAgents` hook
   - Clean up related types

6. **Update agent loading**
   - Load agents from config
   - For each agent, get sessionId from SessionService
   - Load JSONL directly using sessionId

### Phase 4: Implement Core Features

7. **Agent Deletion**
   - Delete from agent config
   - Delete JSONL file using tracked sessionId
   - Remove from project's sessions.json

8. **Context Clearing**
   - Start new Claude session (forceNewSession: true)
   - Delete old JSONL file
   - Update sessions.json with new sessionId

### Phase 5: Update UI

9. **Simplify UI Components**
   - Remove checkpoint/branch UI elements
   - Update agent cards to show single session
   - Ensure delete button works with new system

## Success Criteria

- No more session reconciliation complexity
- Agents load instantly with no discovery phase
- Delete removes both config and JSONL cleanly
- Clear context creates fresh session properly
- System is more maintainable and predictable
