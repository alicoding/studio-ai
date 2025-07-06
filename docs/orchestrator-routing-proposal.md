# Orchestrator Routing Enhancement Proposal

## Current Problem

The current implementation conflates the message content with routing information:

- `input` contains both the @mention and the message
- No clear separation between WHO to send to and WHAT to send
- Response routing back to the caller is ambiguous

## Proposed Solution: Structured Routing

### 1. Update Tool Interface

```typescript
interface EnhancedToolCallArgs {
  type: 'chat' | 'command' | 'mention' | 'batch'

  // For mention operations
  to?:
    | string
    | {
        agent: string
        project?: string
      }

  // Message content (no routing info)
  input: string

  // Enhanced context
  context?: {
    projectId?: string
    sessionId?: string
    replyMode?: 'sync' | 'async' | 'callback'
    callbackUrl?: string
    metadata?: Record<string, unknown>
  }

  // Orchestration parameters (unchanged)
  wait?: boolean
  timeout?: number
  waitStrategy?: 'all' | 'any' | 'none'
}
```

### 2. Auto-detection Logic

Implement smart routing that can handle multiple input formats:

```typescript
function parseRoutingInfo(args: ToolCallArgs): {
  target: string | null
  message: string
  projectId?: string
} {
  // Case 1: Explicit 'to' parameter
  if (args.to) {
    if (typeof args.to === 'string') {
      // Simple: "architect" or "@architect"
      return {
        target: args.to.replace('@', ''),
        message: args.input,
      }
    } else {
      // Structured: { agent: "architect", project: "auth-project" }
      return {
        target: args.to.agent,
        message: args.input,
        projectId: args.to.project,
      }
    }
  }

  // Case 2: Auto-detect from input (backward compatibility)
  const mentionMatch = args.input.match(/^@(\w+)\s+(.+)/)
  if (mentionMatch) {
    return {
      target: mentionMatch[1],
      message: mentionMatch[2],
    }
  }

  // Case 3: Session-based routing
  if (args.context?.sessionId) {
    // Use session to determine target
    return {
      target: null, // Will be resolved by session
      message: args.input,
    }
  }

  throw new Error('Unable to determine routing target')
}
```

### 3. Response Routing Implementation

```typescript
interface ResponseRoute {
  mode: 'sync' | 'async' | 'callback'
  destination: {
    agentId: string
    projectId: string
    sessionId?: string
  }
  callbackUrl?: string
}

function setupResponseRouting(args: ToolCallArgs): ResponseRoute {
  const mode = args.context?.replyMode || (args.wait ? 'sync' : 'async')

  return {
    mode,
    destination: {
      agentId: args.context?.metadata?.agentId || 'claude',
      projectId: args.context?.projectId || 'default',
      sessionId: args.context?.sessionId,
    },
    callbackUrl: args.context?.callbackUrl,
  }
}
```

### 4. Enhanced API Request Structure

```typescript
async function handleEnhancedMention(args: ToolCallArgs): Promise<TextContent> {
  const { target, message, projectId } = parseRoutingInfo(args)
  const responseRoute = setupResponseRouting(args)

  const requestBody = {
    // Clear routing
    to: target,
    message: message,

    // Source context
    from: {
      agentId: args.context?.metadata?.agentId || 'claude',
      projectId: args.context?.projectId || 'default',
      sessionId: args.context?.sessionId,
    },

    // Target context
    targetProjectId: projectId || args.context?.targetProjectId,

    // Response routing
    responseRoute: responseRoute,

    // Orchestration
    orchestration: {
      wait: args.wait,
      timeout: args.timeout,
      priority: args.context?.metadata?.priority,
    },
  }

  const response = await fetch(`${API_BASE}/messages/mention/v2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  })

  // Handle response based on mode
  if (responseRoute.mode === 'sync' && response.ok) {
    const result = await response.json()
    return {
      type: 'text',
      text: formatSyncResponse(result),
    }
  } else if (responseRoute.mode === 'async') {
    const { trackingId } = await response.json()
    return {
      type: 'text',
      text: `Message sent to @${target}. Tracking ID: ${trackingId}`,
    }
  }
}
```

## Usage Examples

### Example 1: Simple Mention

```json
{
  "type": "mention",
  "to": "architect",
  "input": "Please review the authentication design",
  "wait": true
}
```

### Example 2: Cross-Project Mention

```json
{
  "type": "mention",
  "to": {
    "agent": "security-auditor",
    "project": "security-team"
  },
  "input": "Audit our OAuth implementation",
  "context": {
    "projectId": "main-app",
    "metadata": {
      "priority": "high",
      "category": "security"
    }
  }
}
```

### Example 3: Async with Callback

```json
{
  "type": "mention",
  "to": "long-running-analyzer",
  "input": "Analyze codebase for performance issues",
  "context": {
    "replyMode": "callback",
    "callbackUrl": "https://webhooks.example.com/analysis-complete"
  }
}
```

### Example 4: Session-based Conversation

```json
{
  "type": "mention",
  "input": "What about the error handling approach?",
  "context": {
    "sessionId": "design-review-session-123",
    "projectId": "current-project"
  }
}
```

## Implementation Plan

### Phase 1: Backward Compatible Enhancement

1. Add `to` parameter to tool schema
2. Implement `parseRoutingInfo` with fallback to current behavior
3. Deploy without breaking existing usage

### Phase 2: API Enhancement

1. Create `/api/messages/mention/v2` endpoint
2. Implement structured request/response format
3. Add response routing capabilities

### Phase 3: Session Management

1. Implement session-based routing
2. Add conversation thread tracking
3. Enable multi-party conversations

### Phase 4: Advanced Features

1. Priority queuing
2. Callback webhooks
3. Message delivery guarantees
4. Dead letter queue for failed messages

## Benefits

1. **Clear Separation**: Routing is separate from message content
2. **Flexible Routing**: Support multiple routing patterns
3. **Better Response Handling**: Clear path for responses
4. **Backward Compatible**: Existing usage continues to work
5. **Future Proof**: Extensible for advanced orchestration

## Migration Guide

### Current Usage

```javascript
mcp__studio -
  ai__studio -
  ai({
    type: 'mention',
    input: '@architect Please review this design',
    wait: true,
  })
```

### New Usage (Recommended)

```javascript
mcp__studio -
  ai__studio -
  ai({
    type: 'mention',
    to: 'architect',
    input: 'Please review this design',
    wait: true,
  })
```

Both patterns will be supported during transition.
