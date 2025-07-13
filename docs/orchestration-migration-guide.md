# Orchestration API Migration Guide

## Overview

This guide helps you migrate existing Claude Studio code to use the new orchestration features for better performance and reliability.

## Table of Contents
- [Why Migrate?](#why-migrate)
- [Migration Checklist](#migration-checklist)
- [Code Migration Examples](#code-migration-examples)
- [Configuration Migration](#configuration-migration)
- [Breaking Changes](#breaking-changes)
- [Rollback Plan](#rollback-plan)

## Why Migrate?

### Benefits of Orchestration API

1. **Synchronous Responses**: Get agent responses directly without polling
2. **Batch Operations**: Send multiple messages efficiently
3. **Better Error Handling**: Timeouts and error responses included
4. **Cross-Project Support**: Route messages between projects
5. **Rate Limiting**: Prevent API abuse automatically
6. **Performance**: Reduced latency and better resource usage

### When to Migrate

- You're currently polling for agent responses
- You send multiple sequential agent messages
- You need cross-project communication
- You want better timeout control
- You need guaranteed message delivery

## Migration Checklist

- [ ] Enable orchestration in Settings → Orchestration
- [ ] Update API calls to use wait mode
- [ ] Convert sequential calls to batch operations
- [ ] Add proper error handling for timeouts
- [ ] Configure project permissions if needed
- [ ] Test with appropriate timeouts
- [ ] Update MCP tool calls if applicable

## Code Migration Examples

### Example 1: Polling → Wait Mode

#### Before (Polling for Response)
```typescript
// Old approach: Send message and poll for response
async function askAgent(agentId: string, question: string) {
  // Send mention
  const mentionRes = await fetch('/api/messages/mention', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `@${agentId} ${question}`,
      fromAgentId: 'my-app',
      projectId: 'my-project'
    })
  });
  
  const { correlationId } = await mentionRes.json();
  
  // Poll for response (inefficient!)
  let response = null;
  let attempts = 0;
  while (!response && attempts < 30) {
    await sleep(1000); // Wait 1 second
    
    const messages = await fetch(`/api/messages?correlationId=${correlationId}`);
    const data = await messages.json();
    
    if (data.length > 0) {
      response = data[0];
    }
    attempts++;
  }
  
  if (!response) {
    throw new Error('Timeout waiting for response');
  }
  
  return response.content;
}
```

#### After (Using Wait Mode)
```typescript
// New approach: Use wait mode for synchronous response
async function askAgent(agentId: string, question: string) {
  const response = await fetch('/api/messages/mention', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-session-id': sessionId,
      'x-project-id': projectId
    },
    body: JSON.stringify({
      message: `@${agentId} ${question}`,
      fromAgentId: 'my-app',
      projectId: 'my-project',
      wait: true,              // Enable wait mode
      timeout: 30000           // 30 second timeout
    })
  });
  
  const result = await response.json();
  
  if (result.responses?.[agentId]) {
    return result.responses[agentId].content;
  }
  
  if (result.errors?.[agentId]) {
    throw new Error(result.errors[agentId]);
  }
  
  throw new Error('No response received');
}
```

### Example 2: Sequential → Batch Operations

#### Before (Sequential Calls)
```typescript
// Old approach: Multiple sequential API calls
async function collectUserData(userId: string) {
  const results = {};
  
  // Get profile (3-5 seconds)
  const profileRes = await askAgent('user-service', `Get profile ${userId}`);
  results.profile = profileRes;
  
  // Get orders (2-4 seconds)
  const ordersRes = await askAgent('order-service', `Get orders ${userId}`);
  results.orders = ordersRes;
  
  // Get recommendations (4-6 seconds)
  const recsRes = await askAgent('ml-service', 
    `Recommend for ${JSON.stringify(results)}`);
  results.recommendations = recsRes;
  
  return results; // Total: 9-15 seconds
}
```

#### After (Using Batch API)
```typescript
// New approach: Parallel batch operation
async function collectUserData(userId: string) {
  const response = await fetch('/api/messages/batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': sessionId
    },
    body: JSON.stringify({
      messages: [
        {
          id: 'profile',
          targetAgentId: 'user-service',
          content: `Get profile ${userId}`
        },
        {
          id: 'orders',
          targetAgentId: 'order-service',
          content: `Get orders ${userId}`
        },
        {
          id: 'recommendations',
          targetAgentId: 'ml-service',
          content: `Recommend for user ${userId}`,
          dependencies: ['profile', 'orders'] // Wait for data
        }
      ],
      fromAgentId: 'api-gateway',
      projectId: 'my-project',
      waitStrategy: 'all',
      timeout: 15000
    })
  });
  
  const result = await response.json();
  
  return {
    profile: result.results.profile?.response?.response,
    orders: result.results.orders?.response?.response,
    recommendations: result.results.recommendations?.response?.response
  }; // Total: 4-6 seconds (parallel execution)
}
```

### Example 3: Fire and Forget → Batch with 'none'

#### Before (Multiple Async Calls)
```typescript
// Old approach: Multiple fire-and-forget calls
async function notifyServices(event: string) {
  // Send notifications (no coordination)
  fetch('/api/messages/mention', {
    method: 'POST',
    body: JSON.stringify({
      message: `@logger ${event}`,
      fromAgentId: 'app',
      projectId: 'main'
    })
  });
  
  fetch('/api/messages/mention', {
    method: 'POST',
    body: JSON.stringify({
      message: `@metrics Track ${event}`,
      fromAgentId: 'app',
      projectId: 'main'
    })
  });
  
  fetch('/api/messages/mention', {
    method: 'POST',
    body: JSON.stringify({
      message: `@slack-bot Notify: ${event}`,
      fromAgentId: 'app',
      projectId: 'main'
    })
  });
  
  // No tracking, no confirmation
}
```

#### After (Batch with 'none' Strategy)
```typescript
// New approach: Coordinated batch operation
async function notifyServices(event: string) {
  const response = await fetch('/api/messages/batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': sessionId
    },
    body: JSON.stringify({
      messages: [
        {
          id: 'log',
          targetAgentId: 'logger',
          content: event
        },
        {
          id: 'metric',
          targetAgentId: 'metrics',
          content: `Track ${event}`
        },
        {
          id: 'notify',
          targetAgentId: 'slack-bot',
          content: `Notify: ${event}`
        }
      ],
      fromAgentId: 'app',
      projectId: 'main',
      waitStrategy: 'none'  // Fire and forget
    })
  });
  
  const result = await response.json();
  console.log(`Batch ${result.batchId} sent successfully`);
}
```

### Example 4: Cross-Project Communication

#### Before (Not Supported)
```typescript
// Old approach: Cross-project not possible
// Had to use workarounds or proxy agents
```

#### After (Direct Cross-Project)
```typescript
// New approach: Direct cross-project routing
async function queryDataService(query: string) {
  const response = await fetch('/api/messages/mention', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': sessionId,
      'x-project-id': 'frontend'
    },
    body: JSON.stringify({
      message: `@data-analyzer ${query}`,
      fromAgentId: 'ui-agent',
      projectId: 'frontend',
      targetProjectId: 'data-services', // Route to different project
      wait: true,
      timeout: 20000
    })
  });
  
  return response.json();
}
```

### Example 5: MCP Tool Migration

#### Before (Basic MCP)
```typescript
// Old MCP usage
const result = await useMcpTool('studio-ai', {
  type: 'mention',
  input: '@agent Do something'
});
```

#### After (Enhanced MCP)
```typescript
// New MCP with orchestration
const result = await useMcpTool('studio-ai', {
  type: 'mention',
  input: '@agent Do something',
  context: {
    projectId: 'my-project',
    sessionId: 'session-123'
  },
  wait: true,
  timeout: 15000
});

// Batch operation via MCP
const batchResult = await useMcpTool('studio-ai', {
  type: 'batch',
  input: 'Process multiple tasks',
  waitStrategy: 'all',
  messages: [
    {
      id: '1',
      targetAgentId: 'processor-1',
      content: 'Task 1'
    },
    {
      id: '2',
      targetAgentId: 'processor-2',
      content: 'Task 2'
    }
  ]
});
```

## Configuration Migration

### Step 1: Enable Orchestration

1. Navigate to Settings → Orchestration
2. Toggle "Enable Orchestration" ON
3. Configure default timeouts:
   - Mention timeout: 30000 (30s)
   - Batch timeout: 60000 (60s)

### Step 2: Configure Permissions

For cross-project communication:

```json
{
  "permissions": {
    "crossProjectMentions": "explicit",
    "batchOperations": true
  },
  "projects": {
    "frontend": {
      "allowCrossProject": true,
      "allowedTargets": ["backend", "services"]
    }
  }
}
```

### Step 3: Set Rate Limits

Prevent abuse:

```json
{
  "rateLimit": {
    "enabled": true,
    "messagesPerMinute": 60,
    "messagesPerHour": 600,
    "burstSize": 10
  }
}
```

## Breaking Changes

### 1. Required Headers

New required headers for some endpoints:
- `x-session-id`: Required for all orchestration calls
- `x-project-id`: Required for mention API

### 2. Response Format Changes

Wait mode returns different structure:
```typescript
// Old: correlationId only
{ correlationId: "abc-123" }

// New: Full response object
{
  responses: { 
    "agent-id": { 
      content: "Response",
      sessionId: "xyz",
      timestamp: "2025-..."
    }
  }
}
```

### 3. Error Handling

New error format includes details:
```typescript
// Old: Simple error
{ error: "Failed" }

// New: Detailed errors
{
  errors: {
    "agent-1": "Timeout after 5000ms",
    "agent-2": "Agent not found"
  }
}
```

## Rollback Plan

If you need to disable orchestration:

1. **Quick Disable**: Settings → Orchestration → Toggle OFF
2. **Remove Wait Mode**: Set `wait: false` in all calls
3. **Revert Batch Calls**: Convert back to sequential
4. **Clear Config**: Delete orchestration config if needed

### Gradual Migration

1. **Phase 1**: Enable orchestration but keep existing code
2. **Phase 2**: Add wait mode to critical paths
3. **Phase 3**: Convert sequential operations to batch
4. **Phase 4**: Enable cross-project routing
5. **Phase 5**: Add rate limiting

### Testing Strategy

```typescript
// Feature flag for gradual rollout
const USE_ORCHESTRATION = process.env.USE_ORCHESTRATION === 'true';

async function askAgent(agentId: string, question: string) {
  if (USE_ORCHESTRATION) {
    // New orchestration code
    return askAgentWithOrchestration(agentId, question);
  } else {
    // Legacy polling code
    return askAgentLegacy(agentId, question);
  }
}
```

## Performance Comparison

| Operation | Legacy | Orchestration | Improvement |
|-----------|---------|---------------|-------------|
| Single agent query | 5s + polling | 5s direct | No polling overhead |
| 3 sequential queries | 15s | 5s (parallel) | 3x faster |
| 10 notifications | 10 requests | 1 batch request | 90% fewer requests |
| Cross-project | Not supported | Direct routing | New capability |

## Common Issues

### Issue 1: Timeouts Too Short
**Symptom**: Frequent timeout errors
**Solution**: Increase timeout values in config or per-request

### Issue 2: Rate Limits Hit
**Symptom**: 429 errors
**Solution**: Implement exponential backoff or increase limits

### Issue 3: Cross-Project Denied
**Symptom**: 403 errors on cross-project
**Solution**: Configure explicit permissions

### Issue 4: Legacy Code Conflicts
**Symptom**: Duplicate messages
**Solution**: Ensure not mixing old and new patterns

## Support

- [Quick Start Guide](./orchestration-quick-start.md)
- [Full Documentation](./orchestration-api-guide.md)
- [API Reference](./orchestration-api-reference.md)
- [GitHub Issues](https://github.com/your-repo/issues)