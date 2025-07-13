# Orchestration API Quick Start

## 🚀 Enable Orchestration

1. Go to **Settings** → **Orchestration** tab
2. Toggle **"Enable Orchestration"** to ON
3. Click **Save Settings**

## 📝 Quick Examples

### Wait for Agent Response (Synchronous Mention)

```bash
# Wait up to 10 seconds for agent response
curl -X POST http://localhost:3456/api/messages/mention \
  -H "Content-Type: application/json" \
  -H "x-session-id: my-session" \
  -H "x-project-id: my-project" \
  -d '{
    "message": "@my-agent Please analyze this data",
    "fromAgentId": "coordinator",
    "projectId": "my-project",
    "wait": true,
    "timeout": 10000
  }'
```

### Send Multiple Messages (Batch Operations)

```bash
# Wait for ALL responses
curl -X POST http://localhost:3456/api/messages/batch \
  -H "Content-Type: application/json" \
  -H "x-session-id: my-session" \
  -d '{
    "messages": [
      {"id": "1", "targetAgentId": "agent1", "content": "Task 1"},
      {"id": "2", "targetAgentId": "agent2", "content": "Task 2"}
    ],
    "fromAgentId": "coordinator",
    "projectId": "my-project",
    "waitStrategy": "all",
    "timeout": 15000
  }'
```

### Fire and Forget (No Waiting)

```bash
# Send notifications without waiting
curl -X POST http://localhost:3456/api/messages/batch \
  -H "Content-Type: application/json" \
  -H "x-session-id: my-session" \
  -d '{
    "messages": [
      {"id": "1", "targetAgentId": "logger", "content": "Log this event"},
      {"id": "2", "targetAgentId": "metrics", "content": "Track metric"}
    ],
    "fromAgentId": "app",
    "projectId": "my-project",
    "waitStrategy": "none"
  }'
```

## 🔧 JavaScript/TypeScript Usage

### Using Fetch API

```typescript
// Synchronous mention with wait mode
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
      projectId: projectId,
      wait: true,
      timeout: 10000
    })
  });
  
  const result = await response.json();
  
  if (result.responses && result.responses[agentId]) {
    return result.responses[agentId].content;
  }
  
  throw new Error(result.errors?.[agentId] || 'No response');
}

// Batch operation example
async function gatherData(userId: string) {
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
          content: `Get profile for ${userId}`
        },
        {
          id: 'orders',
          targetAgentId: 'order-service',
          content: `Get orders for ${userId}`
        },
        {
          id: 'recommendations',
          targetAgentId: 'ml-service',
          content: `Generate recommendations`,
          dependencies: ['profile', 'orders']
        }
      ],
      fromAgentId: 'api-gateway',
      projectId: projectId,
      waitStrategy: 'all',
      timeout: 20000
    })
  });
  
  const result = await response.json();
  
  return {
    profile: result.results.profile?.response?.response,
    orders: result.results.orders?.response?.response,
    recommendations: result.results.recommendations?.response?.response
  };
}
```

### Using MCP in Claude

```typescript
// In Claude, use the MCP tool
const response = await useMcpTool('studio-ai', {
  type: 'mention',
  input: '@data-analyzer Analyze sales trends',
  context: {
    projectId: 'analytics',
    sessionId: 'analysis-123'
  },
  wait: true,
  timeout: 15000
});

// Batch operation via MCP
const batchResult = await useMcpTool('studio-ai', {
  type: 'batch',
  input: 'Gather all metrics',
  waitStrategy: 'all',
  messages: [
    {
      id: '1',
      targetAgentId: 'sales-metrics',
      content: 'Get Q4 sales'
    },
    {
      id: '2',
      targetAgentId: 'user-metrics',
      content: 'Get active users'
    }
  ]
});
```

## ⚙️ Configuration Options

### Wait Strategies Explained

| Strategy | Behavior | Use Case |
|----------|----------|----------|
| `all` | Wait for ALL responses | Complete data collection |
| `any` | Return after FIRST response | Fastest response wins |
| `none` | Don't wait at all | Notifications, logging |

### Timeout Guidelines

| Operation Type | Recommended Timeout | Example |
|----------------|-------------------|---------|
| UI Query | 5-10 seconds | User-facing operations |
| Data Processing | 30-60 seconds | Complex calculations |
| Batch Collection | 20-30 seconds | Multiple data sources |
| Notifications | No wait (`none`) | Fire and forget |

### Permission Modes

| Mode | Description | Security Level |
|------|-------------|----------------|
| `none` | No cross-project allowed | High |
| `explicit` | Only configured targets | Medium |
| `all` | Any project can message any | Low |

## 🔍 Testing Your Setup

### 1. Test Basic Mention
```bash
# Replace 'your-agent-id' with an actual agent ID
curl -X POST http://localhost:3456/api/messages/mention \
  -H "Content-Type: application/json" \
  -d '{
    "message": "@your-agent-id Hello",
    "fromAgentId": "test",
    "projectId": "test-project",
    "wait": true,
    "timeout": 5000
  }'
```

### 2. Check Configuration
```bash
curl http://localhost:3456/api/storage/item/orchestration/config
```

### 3. Monitor Response Tracker
```bash
curl http://localhost:3456/api/diagnostics/response-tracker
```

## ❌ Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Batch operations are disabled" | Feature not enabled | Enable in Settings → Orchestration |
| "Response timeout" | Agent didn't respond in time | Increase timeout or check agent |
| "Cross-project mention not allowed" | Permission denied | Configure permissions in settings |
| "No valid mentions found" | Missing @ symbol | Use @agent-name format |
| "Rate limit exceeded" | Too many requests | Slow down or increase limits |

## 📊 Response Format Reference

### Successful Wait Response
```json
{
  "responses": {
    "agent-name": {
      "content": "Agent's response text",
      "sessionId": "session-id",
      "timestamp": "2025-07-05T03:01:05.120Z"
    }
  }
}
```

### Timeout Response
```json
{
  "errors": {
    "agent-name": "Response timeout for agent agent-name (5000ms)"
  }
}
```

### Batch Summary
```json
{
  "summary": {
    "total": 3,
    "successful": 2,
    "failed": 0,
    "timedOut": 1,
    "duration": 5234
  }
}
```

## 🎯 Best Practices

1. **Always handle timeouts** - Agents might be offline
2. **Use appropriate wait strategies** - Don't wait when not needed
3. **Set realistic timeouts** - Consider network latency
4. **Batch related operations** - More efficient than sequential
5. **Monitor rate limits** - Prevent service disruption

## 🚦 Next Steps

1. Read the [full documentation](./orchestration-api-guide.md)
2. Check the [implementation details](./orchestration-api-todo.md)
3. Explore advanced [cross-project routing](./orchestration-api-guide.md#cross-project-routing)
4. Learn about [MCP integration](./orchestration-api-guide.md#mcp-integration)