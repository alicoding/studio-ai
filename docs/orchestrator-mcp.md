# Claude Studio Orchestrator MCP Documentation

## Overview

The Claude Studio Orchestrator MCP (`studio-ai`) enables AI agent orchestration, cross-project routing, and batch operations through the Model Context Protocol (MCP). It acts as a bridge between Claude and the Claude Studio backend, allowing sophisticated multi-agent workflows.

## Installation & Configuration

### MCP Server Details

- **Name**: `studio-ai`
- **Command**: `node /path/to/claude-studio/web/server/mcp/studio-ai/dist/index.js`
- **Environment Variables**:
  - `CLAUDE_STUDIO_API`: Backend API URL (default: `http://localhost:3456/api`)

### Tool Access

Once configured, the tool is available as:

```
mcp__studio-ai__studio-ai
```

## Tool Operations

### 1. Mention Operation

Routes messages between agents with orchestration support.

```json
{
  "type": "mention",
  "input": "Please analyze this architecture and provide recommendations",
  "context": {
    "projectId": "current-project-id",
    "targetProjectId": "architect-project-id",
    "metadata": {
      "agentId": "current-agent",
      "targetAgent": "architect"
    }
  },
  "wait": true,
  "timeout": 60000
}
```

**Parameters:**

- `input`: The message content to send
- `context.targetProjectId`: The project containing the target agent
- `context.metadata.targetAgent`: The agent to mention
- `wait`: Whether to wait for response (default: false)
- `timeout`: Max wait time in milliseconds (default: 30000)

### 2. Command Operation

Executes AI capabilities through configured LangChain endpoints.

```json
{
  "type": "command",
  "capability": "code-analysis",
  "input": "Analyze the security vulnerabilities in this codebase",
  "context": {
    "projectId": "security-audit-project",
    "files": ["/src/auth/login.ts", "/src/api/endpoints.ts"]
  }
}
```

**Parameters:**

- `capability`: The AI capability ID to execute
- `input`: The command input/prompt
- `context.files`: Optional file paths for context

### 3. Chat Operation

General AI chat using configured capabilities.

```json
{
  "type": "chat",
  "input": "Explain the SOLID principles with examples",
  "context": {
    "projectId": "learning-project",
    "sessionId": "chat-session-123"
  }
}
```

**Parameters:**

- `input`: The chat message
- `context.sessionId`: Optional session ID for conversation continuity

### 4. Batch Operation

Execute multiple agent messages with dependency management.

```json
{
  "type": "batch",
  "input": "Coordinate multi-agent task",
  "messages": [
    {
      "id": "msg-1",
      "targetAgentId": "researcher",
      "content": "Research best practices for authentication",
      "projectId": "auth-project"
    },
    {
      "id": "msg-2",
      "targetAgentId": "architect",
      "content": "Design authentication system based on research",
      "projectId": "auth-project",
      "dependencies": ["msg-1"]
    },
    {
      "id": "msg-3",
      "targetAgentId": "developer",
      "content": "Implement the authentication design",
      "projectId": "auth-project",
      "dependencies": ["msg-2"]
    }
  ],
  "waitStrategy": "all",
  "timeout": 300000
}
```

**Parameters:**

- `messages`: Array of messages with dependencies
- `waitStrategy`: "all" | "any" | "none"
- `timeout`: Total timeout for batch operation

## Orchestration Configuration

Configure orchestration behavior at: `http://localhost:5173/settings?tab=orchestration`

### Key Settings

1. **Default Timeouts**
   - Mention Timeout: Default wait time for @mentions (30s default)
   - Batch Timeout: Default wait time for batch operations (60s default)

2. **Batch Operations**
   - Enable/Disable: Toggle batch processing capability
   - Max Batch Size: Maximum messages in a single batch (10 default)
   - Wait Strategy: Default strategy for batch operations
   - Max Concurrent Batches: Parallel batch limit (5 default)

3. **Cross-Project Routing**
   - **None**: No cross-project mentions allowed
   - **Explicit**: Only whitelisted projects can communicate
   - **All**: Any project can mention agents in other projects

4. **Response Tracking**
   - Max Pending Responses: Response buffer size (100 default)
   - Cleanup Interval: How often to clean old responses (60s default)
   - Require Explicit Wait: Force explicit `wait=true` parameter

5. **Rate Limiting** (Optional)
   - Messages Per Minute: Rate limit per minute
   - Messages Per Hour: Rate limit per hour
   - Burst Size: Allowed burst above rate limit

## Routing Architecture Issues & Proposed Solutions

### Current Issue

The current implementation has routing ambiguity:

- `input` contains the full message including @mention
- No clear way to specify the target agent
- Response routing back to caller is unclear

### Proposed Solution 1: Explicit Target Parameter

Add a `target` parameter to the tool:

```json
{
  "type": "mention",
  "target": "@architect",
  "input": "Please review this system design",
  "context": {
    "projectId": "current-project",
    "responseMode": "direct" | "callback" | "poll"
  }
}
```

### Proposed Solution 2: Structured Message Format

Use a structured message format:

```json
{
  "type": "mention",
  "message": {
    "to": "architect",
    "content": "Please review this system design",
    "replyTo": {
      "agentId": "caller-agent",
      "projectId": "caller-project",
      "sessionId": "conversation-123"
    }
  },
  "orchestration": {
    "wait": true,
    "timeout": 60000
  }
}
```

### Proposed Solution 3: Auto-routing with Conventions

Implement routing conventions:

1. **Agent Naming Convention**: `project-id/agent-name`

   ```
   auth-project/architect
   frontend-project/developer
   ```

2. **Reply Channel**: Automatic reply routing

   ```json
   {
     "type": "mention",
     "to": "auth-project/architect",
     "input": "Design the authentication flow",
     "replyChannel": "auto" | "session" | "queue"
   }
   ```

3. **Session-based Routing**: Use session IDs for conversation threads
   ```json
   {
     "type": "mention",
     "input": "Continue our discussion about authentication",
     "context": {
       "sessionId": "auth-discussion-123",
       "participantAgents": ["architect", "security-expert", "developer"]
     }
   }
   ```

## Best Practices

1. **Always specify project context** when doing cross-project operations
2. **Use wait mode judiciously** - it blocks until response
3. **Set appropriate timeouts** based on expected operation duration
4. **Structure batch operations** with clear dependencies
5. **Monitor rate limits** in high-volume scenarios

## Error Handling

The MCP will return errors in this format:

```json
{
  "type": "text",
  "text": "Error: [error message]"
}
```

Common errors:

- `Mention failed: Target agent not found`
- `Timeout waiting for response`
- `Cross-project routing not allowed`
- `Rate limit exceeded`
- `Invalid capability ID`

## Examples

### Example 1: Simple Agent Query

```javascript
// Ask architect about system design
mcp__studio -
  ai__studio -
  ai({
    type: 'mention',
    input: "@architect What's the best way to implement authentication?",
    wait: true,
  })
```

### Example 2: Multi-stage Workflow

```javascript
// Coordinate research -> design -> implementation
mcp__studio -
  ai__studio -
  ai({
    type: 'batch',
    input: 'Build authentication system',
    messages: [
      {
        id: 'research',
        targetAgentId: 'researcher',
        content: 'Research OAuth 2.0 best practices',
      },
      {
        id: 'design',
        targetAgentId: 'architect',
        content: 'Design OAuth implementation',
        dependencies: ['research'],
      },
      {
        id: 'implement',
        targetAgentId: 'developer',
        content: 'Implement OAuth flow',
        dependencies: ['design'],
      },
    ],
    waitStrategy: 'all',
  })
```

### Example 3: Cross-project Collaboration

```javascript
// Security audit across projects
mcp__studio -
  ai__studio -
  ai({
    type: 'mention',
    input: 'Review authentication implementation for vulnerabilities',
    context: {
      projectId: 'main-app',
      targetProjectId: 'security-team',
      metadata: {
        targetAgent: 'security-auditor',
        priority: 'high',
      },
    },
    wait: true,
    timeout: 120000,
  })
```

## Monitoring & Debugging

1. **Check Orchestration Status**: View active operations in settings
2. **Backend Logs**: Check `/api/messages/mention` endpoint logs
3. **MCP Server Logs**: View studio-ai MCP server output
4. **Event Bus**: Monitor orchestration events in browser console

## Future Enhancements

1. **Visual Workflow Builder**: Drag-and-drop orchestration designer
2. **Routing Rules Engine**: Configurable routing policies
3. **Message Queue Integration**: Persistent message queuing
4. **Webhook Support**: External system integration
5. **Orchestration Templates**: Reusable workflow patterns
