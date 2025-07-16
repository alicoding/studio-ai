# Studio AI Patterns

## Table of Contents

- [WebSocket Message Routing](#websocket-message-routing)
- [Session ID Management](#session-id-management)
- [Tool Permission Handling](#tool-permission-handling)
- [Error Recovery Patterns](#error-recovery-patterns)

## WebSocket Message Routing

### Pattern: Stable IDs for Routing

**Problem:** Claude SDK session IDs change with every message, making routing impossible.

**Solution:** Use stable agent IDs for all WebSocket routing.

```typescript
// BAD: Using Claude's changing session ID
socket.emit('message:new', { sessionId: claudeSessionId, message })

// GOOD: Using stable agent ID
socket.emit('message:new', { sessionId: agentId, message })
```

### Implementation

1. ClaudeService returns `{ sessionId: agentId }` (not Claude's ID)
2. Frontend filters messages by matching agentId
3. EventSystem broadcasts with agentId as identifier

## Session ID Management

### Pattern: Internal Mapping Only

**Problem:** External systems can't track Claude's changing session IDs.

**Solution:** Map stable IDs to Claude IDs internally, expose only stable IDs.

```typescript
// Internal: agentId → claudeSessionId → JSONL file
// External: Always use agentId

// Get current Claude session for agent
const session = await getAgentSession(agentId)
const messages = await loadMessages(session.claudeSessionId)
```

### Key Points

- Never expose Claude session IDs in APIs
- Store mapping in agent instance or cache
- Update mapping when Claude creates new session

## Tool Permission Handling

### Pattern: Preserve Tool Name Casing

**Problem:** Claude SDK expects exact tool names ("Write" not "write").

**Solution:** Get tool names from ToolDiscoveryService and preserve exactly.

```typescript
// BAD: Converting to lowercase
const toolName = tool.name.toLowerCase()

// GOOD: Preserve exact casing
const correctToolName = discoveredTools.find((t) => t.toLowerCase() === toolName.toLowerCase())
restrictions.push(correctToolName) // "Write", not "write"
```

## Error Recovery Patterns

### Pattern: Directory Fallback

**Problem:** Claude may use different directories for same project.

**Solution:** Check multiple locations with intelligent fallback.

```typescript
// Check both directory patterns
const paths = [
  `${home}/.claude/projects/-private${normalized}`,
  `${home}/.claude/projects/${normalized}`,
]

// Use directory with most recent activity
const activeDir = paths.filter(exists).sort((a, b) => getLatestMtime(b) - getLatestMtime(a))[0]
```

### Pattern: Session Search

**Problem:** Session might be in unexpected directory.

**Solution:** Search all Claude directories if primary lookup fails.

```typescript
// Primary: Check expected directory
let projectFolder = getClaudeProjectFolder(workspace)

// Fallback: Search all directories
if (!found) {
  projectFolder = await findProjectFolderBySessionId(sessionId)
}
```

## Common Anti-Patterns to Avoid

### ❌ Don't expose internal IDs

```typescript
// BAD
return { sessionId: claude.sessionId }
```

### ❌ Don't assume directory structure

```typescript
// BAD
const path = `~/.claude/projects/-private${project}`
```

### ❌ Don't modify tool names

```typescript
// BAD
tools.map((t) => t.toLowerCase())
```

### ✅ Do use abstractions

```typescript
// GOOD
return { sessionId: stableAgentId }
const path = findActiveProjectDirectory(project)
const tools = preserveOriginalToolNames(discovered)
```

See also: [gotchas.md](./gotchas.md)
