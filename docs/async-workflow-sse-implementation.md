# Async Workflow with SSE Implementation

## Overview

Successfully implemented non-blocking async workflow execution with Server-Sent Events (SSE) for real-time progress monitoring in Claude Studio.

## Implementation Details

### 1. Async Endpoints

**POST /api/invoke/async**

- Starts workflows asynchronously
- Returns immediately with `threadId`
- Uses `WorkflowExecutor` to manage background execution
- Prevents garbage collection of LangGraph promises

**GET /api/invoke/stream/:threadId**

- SSE endpoint for real-time progress
- Connects via shared EventEmitter
- Streams recovery-focused events

**GET /api/invoke-status/status/:threadId**

- Check workflow status
- Returns current state, sessionIds, and progress

### 2. Event System

**Dual Event Emission**

```typescript
// WorkflowOrchestrator emits to both Socket.io and EventEmitter
private emitWorkflowEvent(event: WorkflowEvent): void {
  if (this.io) {
    this.io.emit('workflow:update', event)
  }
  if (this.workflowEvents) {
    this.workflowEvents.emit('workflow:update', event)
  }
}
```

**Event Types**

- `step_start` - Step execution begins
- `step_complete` - Step finishes with sessionId
- `step_failed` - Step encounters error
- `workflow_complete` - All steps done
- `workflow_failed` - Workflow aborted/failed

### 3. MCP Tools

**invoke_async**

```typescript
invoke_async({
  workflow: { role: 'dev', task: 'implement feature' },
})
// Returns: { threadId: "abc-123", status: "started" }
```

**invoke_status**

```typescript
invoke_status({ threadId: 'abc-123' })
// Returns: { status: "running", sessionIds: {...}, currentStep: "step1" }
```

### 4. Testing Results

✅ **Single-step workflows** - Basic async execution working
✅ **Multi-step workflows** - Dependencies and sequencing correct
✅ **Socket.io events** - All workflow events emitting properly
✅ **SSE streaming** - Real-time events delivered to clients
✅ **Status tracking** - Accurate state management
✅ **Session preservation** - SessionIds maintained for recovery

### 5. Key Fixes Applied

1. **WorkflowExecutor Pattern** - Keeps LangGraph promises alive
2. **EventEmitter Bridge** - Connects Socket.io to SSE clients
3. **Import Resolution** - Fixed ES module imports
4. **Status Updates** - Added workflow status tracking on start
5. **Server Management** - Added proper restart commands

## Usage Examples

### Simple Async Workflow

```javascript
// Start workflow
const response = await fetch('/api/invoke/async', {
  method: 'POST',
  body: JSON.stringify({
    workflow: { role: 'developer', task: 'implement feature' },
  }),
})
const { threadId } = await response.json()

// Monitor progress via SSE
const eventSource = new EventSource(`/api/invoke/stream/${threadId}`)
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log('Progress:', data)
}
```

### Complex Multi-Agent Workflow

```javascript
await invoke_async({
  workflow: [
    { id: 'design', role: 'architect', task: 'Design system' },
    { id: 'implement', role: 'developer', task: 'Build {design.output}', deps: ['design'] },
    { id: 'test', role: 'tester', task: 'Test {implement.output}', deps: ['implement'] },
  ],
})
```

## Architecture Benefits

1. **Non-blocking** - UI remains responsive during long workflows
2. **Real-time Updates** - Progress visible as it happens
3. **Crash Recovery** - Minimal context for resuming failed workflows
4. **Scalable** - Can handle multiple concurrent workflows
5. **Token Efficient** - Only essential data in recovery events

## Next Steps

- [ ] Add PostgresSaver for persistent workflow state
- [ ] Implement RetryPolicy for automatic retries
- [ ] Create auto-resume logic for Claude crashes
- [ ] Add workflow cancellation support
- [ ] Implement workflow history/replay
