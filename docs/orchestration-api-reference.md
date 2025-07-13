# Orchestration API Reference

## API Endpoints

### POST /api/messages/mention

Enhanced mention endpoint with synchronous response capability.

#### Request Headers
| Header | Type | Required | Description |
|--------|------|----------|-------------|
| Content-Type | string | Yes | Must be `application/json` |
| x-session-id | string | Yes | Session identifier |
| x-project-id | string | Yes | Current project ID |

#### Request Body
```typescript
interface MentionRequest {
  message: string;              // Must contain @mention
  fromAgentId: string;          // Sender agent ID
  projectId: string;            // Source project ID
  wait?: boolean;               // Enable synchronous mode (default: false)
  timeout?: number;             // Custom timeout in ms (default: from config)
  targetProjectId?: string;     // Target project for cross-project routing
}
```

#### Response (Wait Mode Enabled)
```typescript
interface MentionWaitResponse {
  message: string;              // "Mention processed with responses"
  fromAgentId: string;
  projectId: string;
  targets: string[];            // Array of mentioned agent IDs
  wait: true;
  responses: {
    [agentId: string]: {
      from: string;
      content: string;
      sessionId: string;
      timestamp: string;        // ISO 8601 format
    }
  };
  errors?: {
    [agentId: string]: string;  // Error messages for failed agents
  };
}
```

#### Response (Wait Mode Disabled)
```typescript
interface MentionAsyncResponse {
  message: string;              // "Mention sent"
  correlationId: string;        // Unique ID for tracking
  targets: string[];
}
```

#### Error Responses
| Status | Error | Description |
|--------|-------|-------------|
| 400 | "Message, fromAgentId, and projectId are required" | Missing required fields |
| 400 | "No valid mentions found in message" | No @mentions in message |
| 403 | "Cross-project mention not allowed" | Permission denied |
| 500 | "Failed to process mention" | Internal server error |

---

### POST /api/messages/batch

Execute multiple agent operations with configurable wait strategies.

#### Request Headers
| Header | Type | Required | Description |
|--------|------|----------|-------------|
| Content-Type | string | Yes | Must be `application/json` |
| x-session-id | string | Yes | Session identifier |

#### Request Body
```typescript
interface BatchRequest {
  messages: Array<{
    id: string;                 // Unique message ID
    targetAgentId: string;      // Target agent
    content: string;            // Message content
    projectId?: string;         // Override project (default: request projectId)
    dependencies?: string[];    // IDs of messages to wait for
  }>;
  fromAgentId: string;          // Sender agent ID
  projectId: string;            // Default project ID
  waitStrategy?: 'all' | 'any' | 'none'; // Default: from config
  timeout?: number;             // Custom timeout in ms
}
```

#### Response
```typescript
interface BatchResponse {
  batchId: string;              // Unique batch identifier
  waitStrategy: string;
  results: {
    [messageId: string]: {
      id: string;
      status: 'success' | 'failed' | 'timeout';
      response?: {
        response: string;
        sessionId: string;
      };
      error?: string;
      duration: number;         // Time in ms
    }
  };
  summary: {
    total: number;
    successful: number;
    failed: number;
    timedOut: number;
    duration: number;           // Total time in ms
  };
}
```

#### Error Responses
| Status | Error | Description |
|--------|-------|-------------|
| 400 | "Invalid batch request" | Schema validation failed |
| 403 | "Batch operations are disabled" | Feature disabled in config |
| 403 | "Batch size exceeds limit" | Too many messages |
| 500 | "Batch execution failed" | Internal server error |

---

### GET /api/storage/item/orchestration/config

Retrieve current orchestration configuration.

#### Response
```typescript
interface OrchestrationConfig {
  value: {
    enabled: boolean;
    defaults: {
      mentionTimeout: number;
      batchTimeout: number;
      maxBatchSize: number;
      waitStrategy: 'all' | 'any' | 'none';
      maxConcurrentBatches: number;
      responseCleanupInterval: number;
      maxPendingResponses: number;
    };
    permissions: {
      crossProjectMentions: 'none' | 'explicit' | 'all';
      batchOperations: boolean;
      maxGlobalConcurrency: number;
      requireExplicitWait: boolean;
      allowTimeoutOverride: boolean;
    };
    projects: {
      [projectId: string]: {
        allowCrossProject: boolean;
        allowedTargets: string[];
        customTimeout?: number;
        maxBatchSize?: number;
        waitStrategy?: 'all' | 'any' | 'none';
        disabled?: boolean;
      };
    };
    rateLimit: {
      enabled: boolean;
      messagesPerMinute: number;
      messagesPerHour: number;
      burstSize: number;
    };
  };
}
```

---

### POST /api/storage/item/orchestration/config

Update orchestration configuration.

#### Request Body
```typescript
interface UpdateConfigRequest {
  value: OrchestrationConfig;  // Same structure as GET response
  type: 'state';                // Storage type
}
```

---

### GET /api/diagnostics/response-tracker

Monitor ResponseTracker statistics.

#### Response
```typescript
interface ResponseTrackerStats {
  pendingCount: number;         // Current pending responses
  totalTracked: number;         // Total responses tracked
  cleanupRuns: number;          // Cleanup cycles executed
  lastCleanup: string;          // ISO 8601 timestamp
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
  };
}
```

---

### GET /api/diagnostics/rate-limit

Check rate limit status for a session.

#### Request Headers
| Header | Type | Required | Description |
|--------|------|----------|-------------|
| x-session-id | string | Yes | Session to check |

#### Response
```typescript
interface RateLimitStatus {
  messagesThisMinute: number;
  messagesThisHour: number;
  remainingThisMinute: number;
  remainingThisHour: number;
  resetInSeconds: {
    minute: number;
    hour: number;
  };
}
```

## MCP Tool Integration

### Tool: studio-ai

#### Tool Schema
```typescript
interface StudioAIToolArgs {
  type: 'chat' | 'command' | 'mention' | 'batch';
  input: string;
  capability?: string;
  context?: {
    projectId?: string;
    targetProjectId?: string;
    sessionId?: string;
    files?: string[];
    metadata?: Record<string, unknown>;
  };
  wait?: boolean;               // For mention operations
  timeout?: number;             // Timeout in milliseconds
  waitStrategy?: 'all' | 'any' | 'none'; // For batch operations
  messages?: Array<{            // For batch operations
    id: string;
    targetAgentId: string;
    content: string;
    projectId?: string;
    dependencies?: string[];
  }>;
}
```

## Configuration Schema (Zod)

```typescript
import { z } from 'zod'

const ProjectConfigSchema = z.object({
  allowCrossProject: z.boolean().default(false),
  allowedTargets: z.array(z.string()).default([]),
  customTimeout: z.number().min(1000).max(300000).optional(),
  maxBatchSize: z.number().min(1).max(100).optional(),
  waitStrategy: z.enum(['all', 'any', 'none']).optional(),
  disabled: z.boolean().default(false)
})

const OrchestrationConfigSchema = z.object({
  enabled: z.boolean().default(false),
  defaults: z.object({
    mentionTimeout: z.number().min(1000).max(300000).default(30000),
    batchTimeout: z.number().min(1000).max(600000).default(60000),
    maxBatchSize: z.number().min(1).max(100).default(10),
    waitStrategy: z.enum(['all', 'any', 'none']).default('all'),
    maxConcurrentBatches: z.number().min(1).max(50).default(5),
    responseCleanupInterval: z.number().min(10000).default(60000),
    maxPendingResponses: z.number().min(10).max(1000).default(100)
  }),
  permissions: z.object({
    crossProjectMentions: z.enum(['none', 'explicit', 'all']).default('none'),
    batchOperations: z.boolean().default(false),
    maxGlobalConcurrency: z.number().min(1).max(100).default(20),
    requireExplicitWait: z.boolean().default(false),
    allowTimeoutOverride: z.boolean().default(true)
  }),
  projects: z.record(z.string(), ProjectConfigSchema).default({}),
  rateLimit: z.object({
    enabled: z.boolean().default(false),
    messagesPerMinute: z.number().min(1).max(1000).default(60),
    messagesPerHour: z.number().min(1).max(10000).default(600),
    burstSize: z.number().min(1).max(100).default(10)
  })
})
```

## Service Classes

### ResponseTracker

Manages pending responses with timeout handling.

```typescript
class ResponseTracker {
  track(correlationId: string, options: {
    agentId: string;
    timeout: number;
    onTimeout?: () => void;
  }): Promise<any>
  
  resolve(correlationId: string, response: any): void
  
  reject(correlationId: string, error: Error): void
  
  cleanup(): void
  
  getStats(): ResponseTrackerStats
}
```

### BatchExecutor

Executes batch operations with dependency resolution.

```typescript
class BatchExecutor extends ResponseTracker {
  executeBatch(params: {
    messages: BatchMessage[];
    fromAgentId: string;
    projectId: string;
    waitStrategy: 'all' | 'any' | 'none';
    timeout: number;
    sessionId: string;
    onProgress?: (update: ProgressUpdate) => void;
  }): Promise<BatchResult>
}
```

### ProjectResolver

Validates cross-project permissions.

```typescript
class ProjectResolver {
  async resolveProjectContext(params: {
    sourceProjectId: string;
    targetProjectId?: string;
    action: 'mention' | 'batch';
  }): Promise<ProjectContext>
  
  async validateBatchTargets(params: {
    sourceProjectId: string;
    messages: Array<{ projectId?: string }>;
  }): Promise<ValidationResult>
  
  async getAccessibleProjects(
    sourceProjectId: string
  ): Promise<string[]>
}
```

## WebSocket Events

### Mention Events
```typescript
// Emitted when mention is sent
{
  type: 'mention:sent',
  data: {
    correlationId: string;
    fromAgentId: string;
    targetAgentIds: string[];
    projectId: string;
    targetProjectId?: string;
  }
}

// Emitted when response received
{
  type: 'mention:response',
  data: {
    correlationId: string;
    agentId: string;
    response: any;
  }
}

// Emitted on timeout
{
  type: 'mention:timeout',
  data: {
    correlationId: string;
    agentId: string;
    timeout: number;
  }
}
```

### Batch Events
```typescript
// Batch started
{
  type: 'batch:started',
  data: {
    batchId: string;
    totalMessages: number;
    waitStrategy: string;
  }
}

// Progress update
{
  type: 'batch:progress',
  data: {
    batchId: string;
    completed: number;
    total: number;
    failed: number;
  }
}

// Batch completed
{
  type: 'batch:completed',
  data: {
    batchId: string;
    summary: BatchSummary;
  }
}
```

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| ORCH001 | CONFIG_NOT_FOUND | Orchestration config not initialized |
| ORCH002 | FEATURE_DISABLED | Requested feature is disabled |
| ORCH003 | PERMISSION_DENIED | Cross-project permission denied |
| ORCH004 | TIMEOUT | Operation timed out |
| ORCH005 | BATCH_SIZE_EXCEEDED | Batch size exceeds limit |
| ORCH006 | RATE_LIMIT_EXCEEDED | Rate limit exceeded |
| ORCH007 | INVALID_PROJECT | Project not found or inactive |
| ORCH008 | DEPENDENCY_CYCLE | Circular dependency detected |
| ORCH009 | TRACKER_OVERFLOW | Too many pending responses |
| ORCH010 | INVALID_STRATEGY | Invalid wait strategy |

## Performance Metrics

| Operation | Average Latency | Max Throughput |
|-----------|----------------|----------------|
| Mention (async) | 5ms | 1000/sec |
| Mention (wait) | 5ms + agent response time | 100/sec |
| Batch (none) | 10ms | 500/sec |
| Batch (any) | 10ms + first response | 200/sec |
| Batch (all) | 10ms + max response time | 100/sec |
| Permission check | 2ms | 5000/sec |
| Rate limit check | 1ms | 10000/sec |

## Resource Limits

| Resource | Default | Maximum | Notes |
|----------|---------|---------|-------|
| Pending responses | 100 | 1000 | Per instance |
| Batch size | 10 | 100 | Per request |
| Concurrent batches | 5 | 50 | Global |
| Timeout | 30s/60s | 5 min | Mention/Batch |
| Message size | - | 1MB | Content length |
| Dependencies | - | 10 | Per message |
| Projects | - | 100 | Active projects |