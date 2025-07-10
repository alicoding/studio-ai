# Workflow System Architecture

## Overview

Claude Studio's workflow system enables orchestrated multi-agent execution with real-time progress tracking, automatic retry, and seamless resume capabilities. Built on LangGraph with PostgreSQL persistence and SSE streaming.

## Core Architecture

### Event-Driven Execution

**Event Types:**

- `step_start` - Workflow step begins execution
- `step_complete` - Step completes successfully (with sessionId for resume)
- `step_failed` - Step fails with retry information
- `workflow_complete` - Entire workflow finishes
- `workflow_failed` - Workflow fails with last attempted step

**Event Flow:**

```
1. Step START → WorkflowMonitor.updateHeartbeat()
2. ClaudeService.sendMessage() → Agent execution
3. SimpleOperator.checkStatus() → Success/failure evaluation
4. If success: emit step_complete → WorkflowMonitor.updateHeartbeat()
5. If failure: emit step_failed → Retry or fail
```

### LangGraph Integration

**State Schema:**

```typescript
interface WorkflowState {
  steps: WorkflowStep[]
  currentStepIndex: number
  stepResults: Record<string, StepResult>
  stepOutputs: Record<string, string>
  sessionIds: Record<string, string>
  threadId: string
  projectId: string
  status: 'running' | 'completed' | 'partial' | 'failed'
  startNewConversation: boolean
}
```

**Checkpointing:**

- PostgreSQL persistence via `@langchain/langgraph-checkpoint-postgres`
- Feature flag: `USE_POSTGRES_SAVER=true/false` (fallback to MemorySaver)
- Schema: `workflow_checkpoints` with 4-5 auto-created tables
- Automatic setup via `PostgresSaver.fromConnString()`

**Retry Policy:**

```typescript
const retryPolicy: RetryPolicy = {
  maxAttempts: 3,
  initialInterval: 1000,
  backoffFactor: 2,
  maxInterval: 30000,
  jitter: true,
  retryOn: (error) => {
    // Retry transient failures, skip auth/validation errors
    const nonRetryableErrors = [
      'validation failed',
      'invalid configuration',
      'unauthorized',
      'forbidden',
    ]
    return !nonRetryableErrors.some((err) => error?.message?.toLowerCase().includes(err))
  },
}
```

### Template Variable System

**Supported Syntax:**

- `{stepId.output}` - Output from previous step
- `{stepId}` - Shorthand for step output
- `{previousOutput}` - Last completed step output

**Resolution Process:**

1. Build context from completed step outputs
2. Pre-process `{stepId.output}` patterns via regex replacement
3. Apply `string-template` library for remaining variables
4. Extensive logging for debugging template resolution

## API Endpoints

### Synchronous Execution

**POST /api/invoke**

```typescript
interface InvokeRequest {
  workflow: WorkflowStep | WorkflowStep[]
  threadId?: string // For resume
  startNewConversation?: boolean
  projectId: string
  format?: 'json' | 'text'
}

interface WorkflowStep {
  id?: string // Auto-generated if not provided
  role?: string // Legacy: Role-based lookup
  agentId?: string // New: Short ID (e.g., dev_01)
  task: string // With template variables
  sessionId?: string // Resume specific session
  deps?: string[] // Dependencies on other steps
}
```

**Response:**

```typescript
interface InvokeResponse {
  threadId: string
  sessionIds: Record<string, string> // stepId -> sessionId
  results: Record<string, string> // stepId -> response
  status: 'completed' | 'partial' | 'failed'
  summary: {
    total: number
    successful: number
    failed: number
    blocked: number
    duration: number
  }
}
```

### Asynchronous Execution

**POST /api/invoke/async**

- Immediate response with `threadId`
- Background execution via `WorkflowExecutor` singleton
- Proper promise management to prevent garbage collection

**Response:**

```json
{
  "threadId": "uuid-string",
  "status": "started"
}
```

### Server-Sent Events (SSE)

**GET /api/invoke/stream/:threadId**

- Real-time progress updates
- Recovery-focused minimal data
- Auto-reconnection support

**SSE Event Format:**

```typescript
interface WorkflowEvent {
  type: 'step_start' | 'step_complete' | 'step_failed' | 'workflow_complete' | 'workflow_failed'
  threadId: string
  stepId?: string
  sessionId?: string // For resume
  retry?: number
  status?: string
  lastStep?: string // For recovery
}
```

### Status Tracking

**GET /api/invoke/status/:threadId**

```typescript
interface StatusResponse {
  threadId: string
  status: 'running' | 'completed' | 'failed' | 'aborted'
  currentStep?: string
  sessionIds: Record<string, string>
  completedSteps: string[]
  pendingSteps: string[]
  canResume: boolean
  lastUpdated: string
}
```

## WorkflowOrchestrator Service

### Core Responsibilities

1. **Workflow Compilation** - Build LangGraph workflows with dependencies
2. **Step Execution** - Agent resolution, task execution, status evaluation
3. **Event Emission** - Dual emission to Socket.io and EventEmitter
4. **State Management** - Template variable resolution, session tracking
5. **Error Handling** - Abort detection, retry coordination, cleanup

### Agent Resolution Strategy

**Priority Order:**

1. Project agents by `agentId` (e.g., `dev_01`)
2. Project agents by `role` (legacy compatibility)
3. Global agent configs by `role` (fallback)

**Session Creation:**

- Uses short agent IDs (`dev_01`) for UI compatibility
- Passes full config IDs for agent loading
- Preserves workspace paths for Studio projects

### Dependency Management

**Execution Model:**

- Parallel execution for independent steps
- Sequential execution for dependent steps
- Blocked status for failed dependencies

**Graph Construction:**

```typescript
// Independent steps connect to __start__
workflow.addEdge('__start__', stepId)

// Dependent steps connect from dependencies
step.deps.forEach((depId) => {
  workflow.addEdge(depId, stepId)
})

// Final steps connect to __end__
findFinalSteps().forEach((stepId) => {
  workflow.addEdge(stepId, '__end__')
})
```

## WorkflowMonitor Service

### Auto-Resume Logic

**Monitoring Strategy:**

- Event-based heartbeat updates (not true heartbeats)
- 2-minute timeout for stale workflow detection
- Automatic recovery via re-invocation with same threadId

**Current Limitations:**

- Long-running steps (>2 min) falsely detected as stale
- No heartbeats during Claude SDK execution
- Would need SDK modification for true heartbeat monitoring

**Recovery Process:**

1. Detect stale workflow (no events for 2 minutes)
2. Re-invoke with same `threadId`
3. LangGraph resumes from last checkpoint
4. Skip completed steps automatically
5. Continue from last incomplete step

## WorkflowExecutor Service

### Async Execution Management

**Singleton Pattern:**

- Global registry of active workflows
- Prevents LangGraph promise garbage collection
- Proper cleanup on completion/failure

**Memory Management:**

- Maintains active workflow promises
- Removes completed/failed workflows
- Logs execution lifecycle

## Event System Architecture

### Dual Emission Pattern

**Components:**

1. **Socket.io** - WebSocket events for UI updates
2. **EventEmitter** - Bridge for SSE streaming

**Event Flow:**

```
WorkflowOrchestrator.emitWorkflowEvent()
├── io.emit('workflow:update', event) // WebSocket
└── workflowEvents.emit('workflow:update', event) // SSE
```

### Cross-Communication

**WebSocket → SSE Bridge:**

- Shared EventEmitter instance via `req.app.get/set`
- SSE endpoints listen to EventEmitter events
- Filtered events for recovery-focused data

## Database Integration

### PostgreSQL Setup

**Docker Configuration:**

```yaml
postgres:
  image: postgres:15-alpine
  environment:
    POSTGRES_DB: claude_studio
    POSTGRES_USER: claude
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  ports:
    - '5432:5432'
```

**Connection Management:**

```typescript
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres'

const checkpointer = PostgresSaver.fromConnString(connectionString, {
  schema: 'workflow_checkpoints',
})
await checkpointer.setup() // Creates tables
```

### Data Persistence

**Application Data (SQLite):**

- Agent configurations
- Project settings
- User preferences

**Workflow Checkpoints (PostgreSQL):**

- LangGraph state snapshots
- Session recovery data
- Step execution history

## Testing Patterns

### Comprehensive Test Coverage

**Basic Operations:**

- Single/multi-step workflows
- Template variable resolution
- Dependency management

**Edge Cases:**

- Circular dependencies
- Missing variables
- Special characters

**Concurrency:**

- Multiple agents
- Session isolation
- Race conditions

**Error Handling:**

- Agent failures
- Network errors
- Partial failures

**Performance:**

- Parallel execution timing
- Resource contention
- 8+ concurrent workflows

### SSE Testing

**Event Isolation:**

- Concurrent workflows don't cross-contaminate
- Client disconnect handling
- Rapid connect/disconnect cycles

**Status Tracking:**

- Accurate progress reporting
- Resume capability verification
- Database consistency checks

## Production Considerations

### Feature Flags

**Environment Variables:**

```bash
USE_POSTGRES_SAVER=true
POSTGRES_CONNECTION_STRING=postgresql://claude:password@localhost:5432/claude_studio
POSTGRES_SCHEMA=workflow_checkpoints
LOG_FLOWS=true # Enable flow documentation
```

### Performance Metrics

**Benchmarks:**

- Checkpoint save < 50ms (p95)
- Checkpoint load < 100ms (p95)
- Support 10+ concurrent workflows
- Database size growth < 1GB/month

### Rollback Strategy

**Emergency Procedure:**

1. Set `USE_POSTGRES_SAVER=false`
2. Restart servers via `npm run env:restart`
3. Verify MemorySaver active via health endpoint
4. Export/convert active workflows if needed

## Implementation Status

### ✅ Completed (2025-01-09)

1. **Backend Foundation** - PostgreSQL, SSE, async execution
2. **Event System** - Dual emission, auto-resume, monitoring
3. **API Endpoints** - All invoke endpoints functional
4. **Testing Suite** - Comprehensive workflow testing
5. **MCP Integration** - invoke_async, invoke_status tools

### ❌ Missing for UI Visualization

1. **Frontend Components** - WorkflowMonitor, real-time UI
2. **SSE Client Hooks** - useWorkflowSSE for EventSource
3. **Visual Progress** - n8n-style workflow visualization
4. **Manual Controls** - Retry/resume buttons
5. **Workspace Integration** - Sidebar workflow panel

### 🔄 Partial Implementation

1. **Auto-Resume** - Works but limited by event-based monitoring
2. **Error Recovery** - Basic retry with PostgreSQL persistence
3. **Template Variables** - Full support with extensive logging
4. **Agent Resolution** - Studio + legacy compatibility
