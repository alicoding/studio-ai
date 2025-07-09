# MCP SSE/Streaming Implementation Analysis

## Current MCP Implementation Overview

### Architecture

1. **MCP Server** (`web/server/mcp/studio-ai/src/index.ts`)
   - Uses `@modelcontextprotocol/sdk` v0.5.0
   - Implements synchronous request-response pattern
   - Tools must return complete `TextContent` objects
   - No built-in streaming support in the protocol

2. **Invoke Tool** (`web/server/mcp/studio-ai/src/invokeTools.ts`)
   - Makes HTTP requests to Studio API endpoints
   - Waits for complete response (up to 1 hour timeout)
   - Returns formatted JSON/text response
   - Blocks until workflow completes

3. **Underlying Infrastructure**
   - **WorkflowOrchestrator**: Manages multi-agent workflows with LangGraph
   - **WebSocket (socket.io)**: Already streams real-time updates
   - **Status Tracking**: Exists via `/api/invoke/status/:threadId`
   - **Claude Agent**: Uses async generators for streaming responses

### Current Blocking Behavior

```typescript
// MCP tool handler must return complete response
export async function handleInvoke(args: unknown): Promise<{ type: 'text'; text: string }> {
  // Makes HTTP request and waits for full response
  const invokeResponse = await ky.post(`${API_URL}/invoke`, {
    json: { ... },
    timeout: REQUEST_TIMEOUT, // 1 hour
  }).json()

  // Returns complete formatted response
  return {
    type: 'text',
    text: formattedResponse,
  }
}
```

## SSE/Streaming Integration Options

### Option 1: Add SSE Endpoint (Recommended)

Create a new streaming endpoint alongside the existing blocking API:

```typescript
// New endpoint: /api/invoke/stream
router.post('/stream', async (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })

  const { workflow, projectId } = req.body
  const threadId = uuidv4()

  // Start workflow asynchronously
  const orchestrator = new WorkflowOrchestrator()

  // Subscribe to WebSocket events and forward as SSE
  const eventHandler = (data: any) => {
    if (data.threadId === threadId) {
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }
  }

  io.on('workflow:update', eventHandler)
  io.on('message:new', eventHandler)

  // Execute workflow
  orchestrator
    .execute({ workflow, projectId, threadId })
    .then((result) => {
      res.write(`data: ${JSON.stringify({ type: 'complete', result })}\n\n`)
      res.end()
    })
    .catch((error) => {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`)
      res.end()
    })
    .finally(() => {
      io.off('workflow:update', eventHandler)
      io.off('message:new', eventHandler)
    })
})
```

### Option 2: Async MCP Pattern

Create companion MCP tools for async operations:

1. **invoke_async** - Starts workflow, returns immediately with threadId
2. **invoke_status** - Checks workflow status
3. **invoke_result** - Gets final result when complete

```typescript
export const invokeAsyncTool: Tool = {
  name: 'invoke_async',
  description: 'Start workflow asynchronously and return tracking ID',
  inputSchema: { ... },
}

export async function handleInvokeAsync(args: unknown): Promise<{ type: 'text'; text: string }> {
  const threadId = uuidv4()

  // Start workflow in background
  setImmediate(async () => {
    await orchestrator.execute({ ...args, threadId })
  })

  return {
    type: 'text',
    text: JSON.stringify({
      threadId,
      status: 'started',
      checkStatus: `Use invoke_status tool with threadId: ${threadId}`
    })
  }
}
```

### Option 3: WebSocket Bridge in MCP

MCP tool could establish WebSocket connection to collect streaming updates:

```typescript
export async function handleInvokeWithStreaming(args: unknown): Promise<{ type: 'text'; text: string }> {
  const updates: any[] = []

  // Connect to WebSocket
  const ws = new WebSocket(`ws://localhost:3456`)

  ws.on('message', (data) => {
    updates.push(JSON.parse(data))
  })

  // Execute and wait
  const result = await ky.post(`${API_URL}/invoke`, { ... })

  // Return result with collected updates
  return {
    type: 'text',
    text: JSON.stringify({
      result,
      streamedUpdates: updates
    })
  }
}
```

## Recommended Implementation Strategy

### Phase 1: SSE Endpoint (Web Clients)

1. Add `/api/invoke/stream` endpoint
2. Emit SSE events from WorkflowOrchestrator
3. Web clients can use EventSource API
4. Keep MCP tools unchanged (blocking)

### Phase 2: Enhanced Status Tracking

1. Improve `/api/invoke/status` with detailed progress
2. Add estimated completion time
3. Include partial results
4. Add step-by-step status updates

### Phase 3: Async MCP Tools (Optional)

1. Add `invoke_async`, `invoke_status`, `invoke_result` tools
2. Allow MCP clients to use async pattern if desired
3. Maintain backward compatibility with blocking `invoke`

## Implementation Considerations

### Benefits

- **Non-breaking**: Existing MCP tools continue to work
- **Progressive Enhancement**: Clients can choose streaming or blocking
- **Real-time Updates**: Web clients get immediate feedback
- **Scalability**: Long-running workflows don't block connections

### Challenges

- **MCP Protocol Limits**: Cannot stream within MCP tool response
- **State Management**: Need to track multiple concurrent workflows
- **Error Handling**: Streaming errors need special handling
- **Client Compatibility**: Not all clients support SSE/WebSocket

### Technical Requirements

1. Modify WorkflowOrchestrator to emit SSE-compatible events
2. Add SSE endpoint with proper headers and keep-alive
3. Implement request ID tracking for event correlation
4. Handle client disconnections gracefully
5. Add streaming client examples/documentation

## Conclusion

The MCP protocol's synchronous nature is a fundamental constraint that cannot be changed. However, by adding SSE support at the API level and providing async MCP tool alternatives, we can deliver streaming capabilities to clients that support it while maintaining full backward compatibility with the existing MCP implementation.

The recommended approach is to implement SSE endpoints for web clients while keeping MCP tools blocking but with better progress feedback through the existing status tracking system.
