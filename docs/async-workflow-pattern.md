# Async Workflow Pattern for Claude Studio

## Problem Statement

Current workflow execution blocks Claude Code for extended periods (up to hours), preventing parallel task management and reducing overall productivity.

## Proposed Solution

Instead of complex workflow joining in LangGraph, implement a simple **job queue pattern** with async execution and notifications.

## Architecture

### 1. Job Queue Pattern

```typescript
// Claude Code usage
invoke({ workflow: { role: 'dev', task: 'implement feature X' } })
// Returns immediately: { jobId: 'job-123', status: 'queued' }

// Later check status
check_workflow_status({ jobId: 'job-123' })
// Returns: { status: 'completed', results: {...}, duration: '45m' }
```

### 2. Parallel Workflow Management

Instead of one complex workflow:

```
Complex Workflow (1 hour, blocking)
└── Step 1 → Step 2 → Step 3 → ... → Step 10
```

Use multiple simple workflows:

```
Workflow A (10 min) → Notification → Claude coordinates
Workflow B (15 min) → Notification → Claude coordinates
Workflow C (20 min) → Notification → Claude coordinates
```

## Implementation Phases

### Phase 1: Core Reliability (Immediate)

1. **Add RetryPolicy to WorkflowOrchestrator**

   ```typescript
   const retryPolicy = new RetryPolicy({
     maxAttempts: 3,
     initialInterval: 1000,
     backoffFactor: 2,
     maxInterval: 30000,
     jitter: true,
   })
   ```

2. **Upgrade to PostgresSaver**

   ```typescript
   import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres'
   const checkpointer = new PostgresSaver(connectionString)
   ```

3. **Add MCP Tools for Status**
   - `check_workflow_status` - Get status of running workflow
   - `list_active_workflows` - See all running workflows
   - `get_workflow_history` - Get completed workflows

### Phase 2: Async Execution

1. **Background Job Processor**
   - Workflows submitted to queue
   - Immediate return with jobId
   - Background worker processes queue

2. **Progress Streaming**

   ```typescript
   // In workflow nodes
   const writer = get_stream_writer()
   writer({
     type: 'progress',
     step: 'analyzing_code',
     progress: 30,
     message: 'Found 15 files to analyze',
   })
   ```

3. **Notification System**
   - WebSocket for real-time updates
   - MCP tool: `get_workflow_notifications`
   - Batch updates for efficiency

### Phase 3: Coordination Tools

1. **Workflow Templates**
   - Pre-defined workflow patterns
   - Parameterized execution
   - Reusable components

2. **Smart Orchestration**
   - Dependency tracking between workflows
   - Automatic sequencing
   - Resource optimization

## Benefits

1. **Non-blocking**: Claude Code remains responsive
2. **Parallel Execution**: Manage multiple workflows simultaneously
3. **Better Debugging**: Smaller, focused workflows are easier to debug
4. **Natural Checkpoints**: Each workflow completion is a checkpoint
5. **Flexible Coordination**: Claude Code decides how to combine results

## Example Usage

```typescript
// Claude Code in Studio
// Start multiple workflows
const jobA = await invoke({ workflow: { role: 'dev', task: 'implement auth' } })
const jobB = await invoke({ workflow: { role: 'dev', task: 'implement API' } })
const jobC = await invoke({ workflow: { role: 'ux', task: 'design dashboard' } })

// Continue with other work...
// Later, check status
const updates = await get_workflow_notifications()
// Process completed workflows and coordinate next steps
```

## Key Design Decisions

1. **No Complex Workflow Joining**: Keep LangGraph usage simple
2. **Job Queue > Complex Graphs**: More flexible and debuggable
3. **Pull > Push**: Claude Code pulls status when ready
4. **Database as Truth**: All state in PostgreSQL, not in memory

## Migration Path

1. Keep existing sync workflow for simple tasks
2. Add async option: `invoke({ async: true, workflow: {...} })`
3. Gradually migrate long-running workflows
4. Monitor and optimize based on usage patterns

## Success Metrics

- Reduce Claude Code idle time from hours to seconds
- Increase parallel workflow capacity from 1 to 10+
- Improve workflow completion rate with retries
- Enable complex multi-agent projects previously impossible
