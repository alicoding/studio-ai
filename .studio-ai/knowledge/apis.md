# Studio AI APIs

## Table of Contents

- [Workflow APIs](#workflow-apis)
- [Studio Session Messages API](#studio-session-messages-api)
- [Studio Projects API](#studio-projects-api)
- [Agent Management APIs](#agent-management-apis)
- [WebSocket Events](#websocket-events)

## Workflow APIs

### POST /api/invoke

**Purpose:** Execute single agent or multi-agent workflow synchronously

**Body:**

```typescript
interface InvokeRequest {
  workflow: WorkflowStep | WorkflowStep[]
  threadId?: string // For resume capability
  startNewConversation?: boolean
  projectId: string
  format?: 'json' | 'text'
}

interface WorkflowStep {
  id?: string // Auto-generated if not provided
  role?: string // Legacy: Role-based agent lookup
  agentId?: string // New: Short agent ID (e.g., dev_01)
  task: string // Task with template variables like {step1.output}
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

**Example:**

```bash
curl -X POST http://localhost:3457/api/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": [
      {
        "id": "architect",
        "role": "architect",
        "task": "Design a REST API for user management"
      },
      {
        "id": "implement",
        "agentId": "dev_01",
        "task": "Implement {architect.output}",
        "deps": ["architect"]
      }
    ],
    "projectId": "project-123"
  }'
```

### POST /api/invoke/async

**Purpose:** Start workflow asynchronously for non-blocking execution

**Body:** Same as `/api/invoke`

**Response:**

```json
{
  "threadId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "started"
}
```

**Usage Pattern:**

1. POST to `/api/invoke/async` → Get threadId
2. GET `/api/invoke/stream/:threadId` → Real-time events via SSE
3. GET `/api/invoke/status/:threadId` → Check final status

### GET /api/invoke/stream/:threadId

**Purpose:** Server-Sent Events for real-time workflow progress

**Response Format:** SSE stream with JSON events

**Event Types:**

```typescript
interface WorkflowEvent {
  type: 'step_start' | 'step_complete' | 'step_failed' | 'workflow_complete' | 'workflow_failed'
  threadId: string
  stepId?: string
  sessionId?: string // For recovery
  retry?: number
  status?: string
  lastStep?: string // For failure recovery
}
```

**Example Events:**

```bash
# Connection established
data: {"type":"connected","threadId":"550e8400-e29b-41d4-a716-446655440000"}

# Step execution starts
data: {"type":"step_start","threadId":"550e8400-e29b-41d4-a716-446655440000","stepId":"architect"}

# Step completes with session for resume
data: {"type":"step_complete","threadId":"550e8400-e29b-41d4-a716-446655440000","stepId":"architect","sessionId":"session-123"}

# Workflow completes
data: {"type":"workflow_complete","threadId":"550e8400-e29b-41d4-a716-446655440000","status":"completed"}
```

**Client Integration:**

```javascript
const eventSource = new EventSource('/api/invoke/stream/550e8400-e29b-41d4-a716-446655440000')
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log('Workflow event:', data)
}
```

### GET /api/invoke/status/:threadId

**Purpose:** Check workflow status and progress

**Response:**

```typescript
interface StatusResponse {
  threadId: string
  status: 'running' | 'completed' | 'failed' | 'aborted'
  currentStep?: string
  sessionIds: Record<string, string> // stepId -> sessionId
  completedSteps: string[]
  pendingSteps: string[]
  canResume: boolean
  lastUpdated: string
}
```

**Example:**

```json
{
  "threadId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "running",
  "currentStep": "implement",
  "sessionIds": {
    "architect": "session-123",
    "implement": "session-456"
  },
  "completedSteps": ["architect"],
  "pendingSteps": ["implement"],
  "canResume": true,
  "lastUpdated": "2025-01-10T12:30:45.123Z"
}
```

### GET /api/invoke/roles/:projectId

**Purpose:** Get available agent roles for workflow step configuration

**Response:**

```json
{
  "roles": [
    {
      "role": "developer",
      "agentId": "68c57432-3e06-4e0c-84d0-36f63bed17b2"
    },
    {
      "role": "architect",
      "agentId": "72d84521-1a23-4b56-9c78-def012345678"
    }
  ]
}
```

## Workflow Data Schemas

### WorkflowStep Schema

```typescript
interface WorkflowStep {
  id?: string // Auto-generated if omitted
  role?: string // Legacy: agent role lookup
  agentId?: string // Preferred: short agent ID (dev_01, ux_01)
  task: string // Task description with template variables
  sessionId?: string // Specific session to resume
  deps?: string[] // Array of step IDs this step depends on
}
```

**Template Variable Support:**

- `{stepId.output}` - Output from previous step
- `{stepId}` - Shorthand for step output
- `{previousOutput}` - Last completed step

**Dependency Rules:**

- Steps with no `deps` run in parallel from start
- Steps with `deps` wait for all dependencies to complete
- Failed dependencies cause step to be marked as "blocked"

### StepResult Schema

```typescript
interface StepResult {
  id: string
  status: 'success' | 'blocked' | 'failed'
  response: string
  sessionId: string
  duration: number // Execution time in milliseconds
  abortedAt?: string // ISO timestamp if aborted
}
```

### Workflow State Schema

```typescript
interface WorkflowState {
  steps: WorkflowStep[]
  currentStepIndex: number
  stepResults: Record<string, StepResult>
  stepOutputs: Record<string, string> // stepId -> response text
  sessionIds: Record<string, string> // stepId -> Claude session ID
  threadId: string
  projectId: string
  status: 'running' | 'completed' | 'partial' | 'failed'
  startNewConversation: boolean
}
```

## Studio Session Messages API

### GET /api/studio-projects/:id/sessions/:sessionId/messages

**Purpose:** Retrieve messages from a Claude session

**Parameters:**

- `id`: Studio project ID
- `sessionId`: Claude session ID (from agent)
- `cursor` (query): Pagination cursor
- `limit` (query): Number of messages (default: 50)

**Response:**

```json
{
  "messages": [
    {
      "id": "session-id-74",
      "role": "assistant",
      "content": "...",
      "timestamp": "2025-01-10T11:36:45.949Z",
      "type": "assistant",
      "model": "claude-opus-4-20250514",
      "usage": {
        "input_tokens": 4,
        "output_tokens": 34
      }
    }
  ],
  "hasMore": true,
  "nextCursor": "71"
}
```

**Common Issues:**

- Returns empty if session file in wrong directory
- Check server logs for "Session X not found" errors
- Verify with: `curl http://localhost:3457/api/studio-projects/{id}/sessions/{sessionId}/messages`

## Studio Projects API

### GET /api/studio-projects/:id/agents/:agentId/session

**Purpose:** Get current Claude session ID for an agent

**Response:**

```json
{
  "sessionId": "a6ef0489-803b-4c40-855f-44bc8315c5f7"
}
```

**Notes:**

- Session IDs change with each new conversation
- Use this to get current session before loading messages

### POST /api/studio-projects/:id/agents

**Purpose:** Add agent to project

**Body:**

```json
{
  "role": "developer",
  "agentConfigId": "68c57432-3e06-4e0c-84d0-36f63bed17b2"
}
```

### DELETE /api/studio-projects/:id/agents/:role

**Purpose:** Remove agent from project by role

## Agent Management APIs

### GET /api/agents

**Purpose:** List all agent configurations

### POST /api/agents

**Purpose:** Create new agent configuration

**Body:**

```json
{
  "name": "Knowledge Facilitator",
  "role": "knowledge-facilitator",
  "systemPrompt": "...",
  "tools": [
    { "name": "read", "enabled": true },
    { "name": "write", "enabled": true }
  ],
  "model": "claude-3-opus",
  "maxTokens": 200000
}
```

## WebSocket Events

### Client → Server

**Connection:**

```javascript
const socket = io(window.location.origin)
```

### Server → Client Events

**message:new**

```json
{
  "sessionId": "knowledge-facilitator_01",
  "message": {
    "role": "assistant",
    "content": "...",
    "timestamp": "2025-01-10T11:36:45.949Z"
  }
}
```

**agent:status-changed**

```json
{
  "agentId": "knowledge-facilitator_01",
  "status": "busy" | "online"
}
```

**agent:token-usage**

```json
{
  "agentId": "knowledge-facilitator_01",
  "tokens": 38,
  "maxTokens": 200000
}
```

**workflow:update**

```json
{
  "type": "step_start" | "step_complete" | "step_failed" | "workflow_complete" | "workflow_failed",
  "threadId": "550e8400-e29b-41d4-a716-446655440000",
  "stepId": "architect",
  "sessionId": "session-123",
  "retry": 0,
  "status": "completed",
  "lastStep": "implement"
}
```

### Important Notes

- WebSocket uses agentId for routing, not sessionId
- Frontend must connect to same server as API calls
- Redis enables cross-server event broadcasting
- Workflow events are emitted to both WebSocket and SSE simultaneously
- SSE provides filtered events optimized for recovery scenarios

See also: [architecture.md](./architecture.md#cross-server-communication-architecture)
