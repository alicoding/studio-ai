# Claude Studio Orchestration API Guide

## Table of Contents
- [Overview](#overview)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
  - [Mention API (Wait Mode)](#mention-api-wait-mode)
  - [Batch Operations API](#batch-operations-api)
  - [Cross-Project Routing](#cross-project-routing)
- [MCP Integration](#mcp-integration)
- [UI Configuration](#ui-configuration)
- [Examples & Use Cases](#examples--use-cases)
- [Troubleshooting](#troubleshooting)

## Overview

The Claude Studio Orchestration API enables synchronous agent communication, batch operations, and cross-project routing. It provides:

- **Synchronous Mentions**: Wait for agent responses with configurable timeouts
- **Batch Operations**: Send multiple messages with different wait strategies
- **Cross-Project Routing**: Control agent communication across projects
- **Rate Limiting**: Prevent API abuse with configurable limits
- **Response Tracking**: Automatic cleanup of expired responses

## Configuration

### Default Configuration Structure

```json
{
  "enabled": true,
  "defaults": {
    "mentionTimeout": 30000,        // 30 seconds
    "batchTimeout": 60000,          // 60 seconds
    "maxBatchSize": 10,             // Max messages per batch
    "waitStrategy": "all",          // Default: wait for all responses
    "maxConcurrentBatches": 5,      // Max parallel batch operations
    "responseCleanupInterval": 60000, // Clean expired responses every minute
    "maxPendingResponses": 100      // Max tracked responses
  },
  "permissions": {
    "crossProjectMentions": "all",  // "none" | "explicit" | "all"
    "batchOperations": true,
    "maxGlobalConcurrency": 20,
    "requireExplicitWait": false,
    "allowTimeoutOverride": true
  },
  "projects": {
    "project-id": {
      "allowCrossProject": true,
      "allowedTargets": ["other-project"],
      "customTimeout": 45000,
      "maxBatchSize": 5,
      "waitStrategy": "any",
      "disabled": false
    }
  },
  "rateLimit": {
    "enabled": true,
    "messagesPerMinute": 60,
    "messagesPerHour": 600,
    "burstSize": 10
  }
}
```

## API Endpoints

### Mention API (Wait Mode)

Enhanced mention endpoint that supports synchronous responses.

**Endpoint**: `POST /api/messages/mention`

**Headers**:
```
Content-Type: application/json
x-session-id: <session-id>
x-project-id: <project-id>
```

**Request Body**:
```json
{
  "message": "@agent-name Your message here",
  "fromAgentId": "sender-agent-id",
  "projectId": "current-project-id",
  "wait": true,                    // Enable wait mode
  "timeout": 15000,                // Custom timeout (ms)
  "targetProjectId": "other-project" // Optional: cross-project
}
```

**Response (Wait Mode)**:
```json
{
  "message": "Mention processed with responses",
  "fromAgentId": "sender-agent-id",
  "projectId": "current-project-id",
  "targets": ["agent-name"],
  "wait": true,
  "responses": {
    "agent-name": {
      "from": "agent-name",
      "content": "Agent's response here",
      "sessionId": "response-session-id",
      "timestamp": "2025-07-05T03:01:05.120Z"
    }
  }
}
```

**Response (Non-Wait Mode)**:
```json
{
  "message": "Mention sent",
  "correlationId": "mention-1234567890-abc",
  "targets": ["agent-name"]
}
```

### Batch Operations API

Send multiple messages with configurable wait strategies.

**Endpoint**: `POST /api/messages/batch`

**Headers**:
```
Content-Type: application/json
x-session-id: <session-id>
```

**Request Body**:
```json
{
  "messages": [
    {
      "id": "msg1",
      "targetAgentId": "agent1",
      "content": "First message",
      "projectId": "project1",
      "dependencies": []           // Optional: message dependencies
    },
    {
      "id": "msg2",
      "targetAgentId": "agent2",
      "content": "Second message",
      "projectId": "project2",
      "dependencies": ["msg1"]     // Will wait for msg1 to complete
    }
  ],
  "fromAgentId": "orchestrator",
  "projectId": "main-project",
  "waitStrategy": "all",           // "all" | "any" | "none"
  "timeout": 30000
}
```

**Wait Strategies**:
- `all`: Wait for all agent responses or timeout
- `any`: Return after first response
- `none`: Fire and forget, return immediately

**Response**:
```json
{
  "batchId": "batch-1234567890-xyz",
  "waitStrategy": "all",
  "results": {
    "msg1": {
      "id": "msg1",
      "status": "success",
      "response": {
        "response": "Agent 1's response",
        "sessionId": "session-123"
      },
      "duration": 2500
    },
    "msg2": {
      "id": "msg2",
      "status": "timeout",
      "error": "Response timeout",
      "duration": 30000
    }
  },
  "summary": {
    "total": 2,
    "successful": 1,
    "failed": 0,
    "timedOut": 1,
    "duration": 30000
  }
}
```

### Cross-Project Routing

Control how agents communicate across projects.

**Permission Modes**:
- `none`: No cross-project communication allowed
- `explicit`: Only allowed targets can be messaged
- `all`: Any project can message any other

**Per-Project Configuration**:
```json
{
  "projects": {
    "frontend": {
      "allowCrossProject": true,
      "allowedTargets": ["backend", "database"],
      "customTimeout": 20000
    },
    "backend": {
      "allowCrossProject": true,
      "allowedTargets": ["database"],
      "maxBatchSize": 5
    },
    "database": {
      "allowCrossProject": false    // Can't initiate cross-project
    }
  }
}
```

## MCP Integration

The orchestration features are fully integrated with the Model Context Protocol (MCP).

### Using MCP for Orchestration

**Tool**: `studio-ai`

**Synchronous Mention via MCP**:
```typescript
{
  "type": "mention",
  "input": "@agent Hello from MCP",
  "context": {
    "projectId": "my-project",
    "targetProjectId": "other-project",  // Optional
    "sessionId": "session-123"
  },
  "wait": true,
  "timeout": 10000
}
```

**Batch Operation via MCP**:
```typescript
{
  "type": "batch",
  "input": "Batch operation description",
  "waitStrategy": "any",
  "timeout": 20000,
  "messages": [
    {
      "id": "1",
      "targetAgentId": "agent1",
      "content": "Message 1",
      "projectId": "project1"
    },
    {
      "id": "2",
      "targetAgentId": "agent2",
      "content": "Message 2",
      "projectId": "project2"
    }
  ]
}
```

## UI Configuration

Access orchestration settings through the UI:

1. Navigate to **Settings** → **Orchestration** tab
2. Configure the following sections:

### General Settings
- **Enable Orchestration**: Master on/off switch
- **Default Timeouts**: Set mention and batch timeouts
- **Response Cleanup**: Configure cleanup interval

### Batch Operations
- **Max Batch Size**: Limit messages per batch
- **Default Wait Strategy**: Choose default behavior
- **Max Concurrent Batches**: Control parallel execution

### Cross-Project Routing
- **Permission Mode**: Set global permission level
- **Require Explicit Wait**: Force explicit wait parameter
- **Allow Timeout Override**: Let requests override defaults

### Rate Limiting
- **Enable/Disable**: Toggle rate limiting
- **Messages per Minute/Hour**: Set rate limits
- **Burst Size**: Allow temporary spikes

### Per-Project Overrides
Configure specific settings for individual projects.

## Examples & Use Cases

### Example 1: Synchronous Data Collection

Collect data from multiple services synchronously:

```bash
curl -X POST http://localhost:3456/api/messages/batch \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "id": "user-data",
        "targetAgentId": "user-service",
        "content": "Get user profile for ID 123"
      },
      {
        "id": "order-data",
        "targetAgentId": "order-service",
        "content": "Get recent orders for user 123"
      },
      {
        "id": "recommendation",
        "targetAgentId": "ml-service",
        "content": "Generate recommendations",
        "dependencies": ["user-data", "order-data"]
      }
    ],
    "fromAgentId": "api-gateway",
    "projectId": "main",
    "waitStrategy": "all",
    "timeout": 10000
  }'
```

### Example 2: Fast Response with Fallback

Get the fastest response from multiple agents:

```bash
curl -X POST http://localhost:3456/api/messages/batch \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "id": "primary",
        "targetAgentId": "fast-agent",
        "content": "Process request"
      },
      {
        "id": "backup",
        "targetAgentId": "slow-but-reliable-agent",
        "content": "Process request"
      }
    ],
    "fromAgentId": "coordinator",
    "projectId": "main",
    "waitStrategy": "any",
    "timeout": 5000
  }'
```

### Example 3: Fire and Forget Notifications

Send notifications without waiting:

```bash
curl -X POST http://localhost:3456/api/messages/batch \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "id": "email",
        "targetAgentId": "email-service",
        "content": "Send welcome email to user@example.com"
      },
      {
        "id": "slack",
        "targetAgentId": "slack-bot",
        "content": "New user registered: user@example.com"
      },
      {
        "id": "analytics",
        "targetAgentId": "analytics-service",
        "content": "Track signup event"
      }
    ],
    "fromAgentId": "signup-handler",
    "projectId": "main",
    "waitStrategy": "none"
  }'
```

### Example 4: Cross-Project Data Pipeline

Route messages across project boundaries:

```bash
curl -X POST http://localhost:3456/api/messages/mention \
  -H "Content-Type: application/json" \
  -d '{
    "message": "@data-processor Transform this dataset",
    "fromAgentId": "frontend-agent",
    "projectId": "web-ui",
    "targetProjectId": "data-pipeline",
    "wait": true,
    "timeout": 30000
  }'
```

## Troubleshooting

### Common Issues

**1. "Response timeout" errors**
- Increase timeout values in configuration
- Check if target agent is online and responding
- Verify network connectivity

**2. "Batch operations are disabled"**
- Enable batch operations in Settings → Orchestration
- Check permissions.batchOperations is set to true

**3. "Cross-project mention not allowed"**
- Check permissions.crossProjectMentions setting
- Verify project-specific allowedTargets configuration
- Ensure both projects exist and are active

**4. "Rate limit exceeded"**
- Reduce request frequency
- Increase rate limits in configuration
- Use burst capacity wisely

### Debug Information

**Check Current Configuration**:
```bash
curl http://localhost:3456/api/storage/item/orchestration/config
```

**Monitor Response Tracker**:
```bash
curl http://localhost:3456/api/diagnostics/response-tracker
```

**View Rate Limit Status**:
```bash
curl http://localhost:3456/api/diagnostics/rate-limit \
  -H "x-session-id: your-session-id"
```

### Best Practices

1. **Set Appropriate Timeouts**
   - Use shorter timeouts for UI operations (5-10s)
   - Use longer timeouts for data processing (30-60s)
   - Consider network latency in timeout calculations

2. **Choose Right Wait Strategy**
   - Use `all` when you need complete data
   - Use `any` for redundancy/fallback scenarios
   - Use `none` for notifications and logging

3. **Manage Concurrency**
   - Limit batch sizes to prevent overload
   - Use dependencies to control execution order
   - Monitor maxConcurrentBatches setting

4. **Handle Errors Gracefully**
   - Always check response status
   - Implement retry logic for timeouts
   - Provide fallback behavior

5. **Optimize Cross-Project Communication**
   - Use explicit permissions for security
   - Group related projects together
   - Monitor cross-project latency

## Architecture Notes

The orchestration system uses:
- **p-queue**: For promise queue management
- **p-timeout**: For timeout handling
- **p-all**: For controlled parallel execution
- **Zod**: For schema validation
- **Unified Storage API**: For configuration persistence

All components follow SOLID principles with single responsibilities:
- `ResponseTracker`: Manages pending responses
- `BatchExecutor`: Handles batch operations
- `ProjectResolver`: Validates cross-project permissions
- `OrchestrationTab`: UI configuration component

## Performance Considerations

- Response tracking adds ~5ms overhead per request
- Batch operations scale linearly with message count
- Cross-project routing adds ~10ms for permission checks
- Rate limiting checks add ~2ms per request
- WebSocket events are debounced to prevent flooding

## Security Notes

- Cross-project permissions are enforced at API level
- Rate limiting prevents abuse
- Timeouts prevent resource exhaustion
- All inputs are validated with Zod schemas
- Session isolation ensures data privacy