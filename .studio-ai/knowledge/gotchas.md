# Claude Studio Gotchas & Known Issues

## Table of Contents

- [Claude Session File Location Issue](#claude-session-file-location-issue)
- [WebSocket Connection Issues](#websocket-connection-issues)
- [Cross-Server Communication](#cross-server-communication)

## Claude Session File Location Issue

### Problem

Messages not appearing in workspace UI despite activity being tracked in /projects.

### Root Cause

`StudioSessionService.getClaudeProjectFolder()` was preferring `-private` prefixed directories even when they were empty or outdated.

**Example:**

- Active sessions in: `~/.claude/projects/-Users-ali-claude-swarm-claude-team-claude-studio/`
- But searching in: `~/.claude/projects/-private-Users-ali-claude-swarm-claude-team-claude-studio/`

### Solution

Updated `getClaudeProjectFolder()` to check which directory has more recent JSONL files.

**Code Location:** `web/server/services/StudioSessionService.ts:79-128`

```typescript
// Now checks:
// 1. If both directories exist
// 2. Which has more JSONL files
// 3. Which has more recent activity
// 4. Returns the active directory
```

### How to Debug

1. Check server logs for "Session X not found in Claude projects"
2. Look for ENOENT errors with file paths
3. Verify JSONL files exist: `ls ~/.claude/projects/*/session-id.jsonl`
4. Test API directly: `curl http://localhost:3457/api/studio-projects/{id}/sessions/{sessionId}/messages`

## WebSocket Connection Issues

### Frontend Must Connect to Same Server

- UI connects to `window.location.origin`
- If UI on different port than API server, WebSocket events won't reach UI
- Solution: Ensure consistent server connection

### Session ID vs Agent ID

- **WebSocket routing**: Uses stable agentId (e.g., `knowledge-facilitator_01`)
- **Claude SDK**: Uses changing session IDs
- **Never use Claude session ID for WebSocket routing!**

## Cross-Server Communication

### Redis Required for Multi-Server

- Stable server (3456) and Dev server (3457) need Redis
- Without Redis, events only broadcast locally
- Check logs for: "EventSystem initialized with Redis adapter"

### Event Flow

1. API call on server A triggers event
2. EventSystem emits via Redis
3. All connected servers receive event
4. Each server broadcasts to its WebSocket clients

See also: [architecture.md](./architecture.md#cross-server-communication-architecture)

## Workflow Agent Allocation Issues

### Problem: Agent Conflicts in Parallel Tasks

**Symptoms:**

- Workflow fails at execution time rather than validation
- Same agent assigned to multiple parallel tasks
- "Agent busy" errors during workflow execution

**Root Cause:**
Using specific agentId for parallel tasks causes conflicts:

```javascript
// ❌ WRONG - Causes conflict
{ id: "task1", agentId: "dev_01", task: "..." },
{ id: "task2", agentId: "dev_01", task: "..." }  // Same agent!
```

**Solutions:**

1. **Use roles for parallel tasks:**

```javascript
// ✅ CORRECT - System assigns different developers
{ id: "task1", role: "developer", task: "..." },
{ id: "task2", role: "developer", task: "..." }
```

2. **Use different specific agents:**

```javascript
// ✅ CORRECT - Different agents
{ id: "task1", agentId: "dev_01", task: "..." },
{ id: "task2", agentId: "developer_01", task: "..." }
```

### Future Enhancement Needed: Pre-flight Validation

The invoke system should validate workflows before execution:

- Count required agents per role
- Check agent availability
- Detect agent ID conflicts
- Provide auto-provisioning options

### Workaround Until Fixed

Always use role-based assignment for parallel workflows:

```javascript
// Safe pattern for parallel execution
workflow: [
  { role: 'orchestrator', task: 'analyze requirements' },
  { role: 'developer', task: 'create tests A' },
  { role: 'developer', task: 'create tests B' }, // Different developer
  { role: 'reviewer', task: 'review all tests', deps: ['task_a', 'task_b'] },
]
```
