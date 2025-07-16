# Workflow Resume & Retry Implementation TODO

## Overview

Implement SSE-based real-time progress for MCP, non-blocking workflow execution, automatic retry on failures, and seamless resume capabilities.

## ✅ Completed Implementation (July 9, 2025)

### Key Achievements:

1. **Async Workflow Execution**
   - `POST /api/invoke/async` - Start workflows in background
   - `WorkflowExecutor` singleton manages active workflows
   - Prevents LangGraph promise garbage collection

2. **SSE Real-time Streaming**
   - `GET /api/invoke/stream/:threadId` - Server-Sent Events endpoint
   - EventEmitter bridges Socket.io to SSE clients
   - Recovery-focused events (minimal data for crash recovery)

3. **Status Tracking**
   - `GET /api/invoke-status/status/:threadId` - Check workflow state
   - In-memory status tracking with session IDs
   - Tracks current step and completion status

4. **MCP Tools**
   - `invoke_async` - Start workflows asynchronously
   - `invoke_status` - Check workflow progress
   - Both tools fully integrated and tested

5. **Event System**
   - Dual emission to Socket.io and EventEmitter
   - Event types: step_start, step_complete, workflow_complete
   - Session IDs preserved for each step

### Testing Results:

- ✅ Single and multi-step workflows working
- ✅ Dependencies and sequencing correct
- ✅ Real-time SSE events delivered
- ✅ Status tracking accurate
- ✅ Session preservation functional

## Pre-Work Audit Results

### Key File Locations Identified:

- **SSE Endpoints**: Add to `/web/server/api/invoke.ts` and create `/web/server/api/invoke-sse.ts`
- **WorkflowOrchestrator**: `/web/server/services/WorkflowOrchestrator.ts` (lines 83, 93 for key changes)
- **Status Tracking**: `/web/server/api/invoke-status.ts` (enhance existing endpoint)
- **WebSocket Bridge**: `/web/server/websocket.ts` (reuse for SSE events)

### DRY Opportunities:

- Reuse `StudioSessionService` for workflow session tracking
- Bridge existing WebSocket events to SSE (no duplication)
- Leverage `AbortError` utilities from `/web/server/utils/errorUtils.ts`
- Extend existing UI hooks (`useWebSocket.ts`) for SSE support

### SOLID Fixes Needed:

- Extract WebSocket event emission from WorkflowOrchestrator (SRP violation)
- Add dependency injection to WorkflowOrchestrator constructor
- Create event emitter interface for loose coupling

### Legacy Code Ready for Removal:

- `/web/server/api/projects.ts` (only redirect remains)
- Deleted services already removed from git
- No active file-based configs found

## Phase 1: API Foundation (Test First) ✅ COMPLETED

### 1.1 SSE Endpoint Implementation

- [x] Create `/api/invoke/stream` SSE endpoint
  - [x] Implement SSE headers and keep-alive
  - [x] Bridge WebSocket events to SSE format via EventEmitter
  - [x] Handle client disconnections gracefully
  - [x] Add event types: `step_start`, `step_complete`, `step_failed`, `workflow_complete`, `workflow_failed`
- [x] Create `/api/invoke/async` non-blocking endpoint
  - [x] Return immediate response with `threadId`
  - [x] Queue workflow for background execution via WorkflowExecutor
  - [x] Store initial state in memory (database pending)
- [x] Update `/api/invoke/status/:threadId`
  - [x] Add session IDs per step
  - [x] Include current step tracking
  - [x] Add status: running/completed/failed/aborted
  - [x] Include last update timestamp

### 1.2 WorkflowOrchestrator Enhancements ✅ PARTIALLY COMPLETED

- [x] Add LangGraph RetryPolicy ✅ COMPLETED (2025-01-09)
  ```typescript
  const retryPolicy: RetryPolicy = {
    maxAttempts: 3,
    initialInterval: 1000,
    backoffFactor: 2,
    maxInterval: 30000,
    jitter: true,
    retryOn: (error) => {
      // Retry on transient failures, not on validation/auth errors
      const message = error?.message || ''
      const nonRetryableErrors = [
        'validation failed',
        'invalid configuration',
        'unauthorized',
        'forbidden',
      ]
      return !nonRetryableErrors.some((err) => message.toLowerCase().includes(err))
    },
  }
  ```
- [x] Implement PostgresSaver for persistence ✅ COMPLETED (Phase 6)
- [x] Add granular progress tracking
  - [x] Emit progress events for each step start/end
  - [x] Include step details in events
  - [ ] Track individual step retries
- [x] Implement step-level session tracking
  - [x] Save sessionId per step
  - [ ] Allow resume from specific step
  - [x] Preserve completed step outputs

### 1.3 Auto-Resume Logic ✅ COMPLETED (2025-01-09)

- [x] Create WorkflowMonitor service
  - [x] Track active workflows and their Claude sessions
  - [x] Detect stale workflows (2 minute timeout)
  - [x] Monitor for non-responsive sessions via event tracking
  - [x] Auto-trigger resume for silent failures
- [x] Implement auto-resume triggers
  - [x] Stale workflow detection (no events for 2 minutes)
  - [x] Automatic recovery attempt via re-invocation
  - [x] Manual interruption handling (re-invoke with same threadId)
  - [x] Event-based monitoring (not true heartbeats)
- [x] Add resume strategies
  - [x] Re-invoke with same threadId (LangGraph resumes from checkpoint)
  - [x] Preserves all session IDs for step continuity
  - [x] Skip completed steps automatically
  - [x] Continues from last incomplete step

## Phase 2: Legacy Code Removal

### 2.1 Identify Legacy Components

- [ ] Audit all project-related endpoints
  - [ ] Mark `/api/projects/*` as deprecated
  - [ ] Document Studio projects as canonical
- [ ] Find file-based agent configs
  - [ ] Identify all `.claude-config.json` usage
  - [ ] Plan migration to database
- [ ] Review ClaudeProjectScanner
  - [ ] Confirm it's fully replaced
  - [ ] Remove all references
- [ ] Check for duplicate services
  - [ ] ProjectService vs StudioProjectService
  - [ ] AgentConfigService variations

### 2.2 Safe Removal Process

- [ ] Create migration scripts
  - [ ] Backup existing data
  - [ ] Migrate to new format
  - [ ] Verify data integrity
- [ ] Update all imports
  - [ ] Replace legacy service imports
  - [ ] Update type definitions
  - [ ] Fix test imports
- [ ] Remove legacy files
  - [ ] Delete deprecated services
  - [ ] Remove old API endpoints
  - [ ] Clean up unused types

## Phase 3: MCP Integration ✅ PARTIALLY COMPLETED

### 3.1 SSE-Enabled MCP Tools

- [ ] Create `invoke_stream` tool
  - [ ] Returns SSE endpoint URL
  - [ ] Includes authentication token
  - [ ] Provides event schema
- [x] Update `invoke_async` tool
  - [x] Non-blocking execution
  - [x] Returns threadId immediately
  - [ ] Includes estimated duration
- [x] Add `invoke_status` tool
  - [x] Check workflow status by threadId
  - [x] Returns current state and progress
  - [x] Shows session IDs and step status
- [ ] Add `invoke_resume` tool
  - [ ] Resume from specific step
  - [ ] Option to retry or skip
  - [ ] Preserve workflow context
- [ ] Create `workflow_monitor` tool
  - [ ] List active workflows
  - [ ] Show detailed progress
  - [ ] Identify stuck workflows

### 3.2 MCP Event Handling

- [ ] Design SSE event schema
  ```typescript
  interface WorkflowSSEEvent {
    type: 'progress' | 'message' | 'status' | 'error' | 'complete'
    threadId: string
    stepId?: string
    data: {
      progress?: number
      message?: string
      status?: 'running' | 'completed' | 'failed' | 'retrying'
      error?: string
      result?: unknown
    }
  }
  ```
- [ ] Implement event parsing
  - [ ] Handle connection errors
  - [ ] Reconnect logic
  - [ ] Event buffering

## Phase 4: Testing Strategy

### 4.1 API Testing

- [ ] Unit tests for SSE endpoint
  - [ ] Test event streaming
  - [ ] Test disconnection handling
  - [ ] Test event formatting
- [ ] Integration tests for async workflow
  - [ ] Test immediate response
  - [ ] Test background execution
  - [ ] Test status polling
- [ ] Resume/retry scenarios
  - [ ] Test mid-workflow failure
  - [ ] Test server restart
  - [ ] Test Claude Code crash
  - [ ] Test network interruption

### 4.2 End-to-End Testing

- [ ] Create test workflows
  - [ ] Simple single-step
  - [ ] Complex multi-agent
  - [ ] Failure-prone steps
  - [ ] Long-running tasks
- [ ] Test auto-resume
  - [ ] Kill Claude process mid-workflow
  - [ ] Restart server during execution
  - [ ] Simulate network failures
- [ ] Performance testing
  - [ ] Multiple concurrent workflows
  - [ ] SSE connection limits
  - [ ] Database checkpoint size

## Phase 5: UI Integration (Later)

### 5.1 Real-time Progress Display

- [ ] Add EventSource client
- [ ] Update workflow status UI
- [ ] Show step-by-step progress
- [ ] Display retry attempts

### 5.2 Manual Controls

- [ ] Add resume button
- [ ] Add retry options
- [ ] Show failure details
- [ ] Allow step skipping

## Success Criteria

1. **Zero Lost Work**: Workflows always resume from last successful step
2. **Real-time Visibility**: MCP clients see progress as it happens
3. **Non-blocking**: Claude Code can manage 10+ workflows simultaneously
4. **Auto-recovery**: 95% of failures recover automatically
5. **Clean Codebase**: No legacy code or duplicate implementations
6. **Comprehensive Testing**: 90%+ code coverage for critical paths

## Implementation Order

1. **Week 1**: API Foundation (SSE, async, status)
2. **Week 2**: Resume/Retry Logic + LangGraph enhancements
3. **Week 3**: Legacy code removal + migration
4. **Week 4**: MCP integration + testing
5. **Week 5**: Final testing + documentation

## Phase 6: PostgresSaver Implementation (CRITICAL PRIORITY)

### 6.1 Infrastructure Setup

- [x] Add PostgreSQL dependencies
  ```json
  "@langchain/langgraph-checkpoint-postgres": "^0.x.x",
  "pg": "^8.x.x",
  "@types/pg": "^8.x.x"
  ```
- [x] Create Docker Compose for PostgreSQL
  ```yaml
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: claude_studio
      POSTGRES_USER: claude
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - '5432:5432'
  ```
- [x] Add database connection service
  - [x] Create `/web/server/services/database/postgres.ts`
  - [x] Implement connection pooling with `pg.Pool`
  - [x] Add health check endpoint
  - [x] Handle connection errors gracefully

### 6.2 Feature Flag Implementation ✅ COMPLETED

- [x] Add environment variables
  ```env
  # .env.example
  USE_POSTGRES_SAVER=false
  POSTGRES_CONNECTION_STRING=postgresql://claude:password@localhost:5432/claude_studio
  POSTGRES_SCHEMA=workflow_checkpoints
  ```
- [x] Update WorkflowOrchestrator constructor (with async initialization)
- [x] Add runtime switching capability
  - [x] Health check endpoint shows active checkpointer
  - [x] Log which mode is active on startup
  - [x] PostgreSQL connection verified and working

**RESOLVED ISSUES:**

- ✅ Fixed "role does not exist" error - was connecting to host PostgreSQL instead of Docker
- ✅ Stopped conflicting host PostgreSQL service (brew services stop postgresql@15)
- ✅ Verified PostgresSaver connects successfully

### 6.3 Database Schema & Migration ✅ COMPLETED

- [x] Create LangGraph checkpoint schema
  ```sql
  -- PostgresSaver automatically creates these tables on setup():
  -- workflow_checkpoints.checkpoints - Main checkpoint storage
  -- workflow_checkpoints.checkpoint_blobs - Binary data storage
  -- workflow_checkpoints.checkpoint_writes - Write operations log
  -- workflow_checkpoints.checkpoint_migrations - Schema versioning
  -- workflow_checkpoints.workflow_metadata - Our custom metadata table
  ```
- [x] PostgresSaver.setup() method handles table creation automatically
- [x] Verified tables are created properly in workflow_checkpoints schema
- [ ] Add migration runner (OPTIONAL - PostgresSaver handles its own migrations)
  - [x] Create `/web/server/database/migrations/` directory (init script in place)
  - [ ] Implement versioned migration system
  - [ ] Add rollback capability
  - [ ] Log migration history

### 6.4 Comprehensive Testing Strategy

- [x] **Phase A: Basic Integration Testing** ✅ COMPLETED
  - [x] PostgresSaver initialization with setup()
  - [x] Table creation in correct schema
  - [x] Workflow execution with checkpoint saving
  - [x] Template variable resolution works
  - [x] Multiple checkpoints saved per workflow

- [x] **Phase B: Feature Flag Testing** ✅ COMPLETED
  - [x] Uses MemorySaver when flag is false
  - [x] Uses PostgresSaver when flag is true
  - [x] Falls back to MemorySaver on connection failure
  - [x] Health endpoint reflects active checkpointer

- [ ] **Phase C: Persistence Testing** (IN PROGRESS)
  - [ ] Recovers workflow state after server restart
  - [ ] Handles concurrent workflow updates
  - [ ] Manages checkpoint size limits
  - [ ] Cleans up old checkpoints
  - [x] Preserves step outputs accurately (verified with template vars)

- [ ] **Phase D: Performance Testing**
  - [ ] Benchmark checkpoint write speed
  - [ ] Test with 100+ concurrent workflows
  - [ ] Measure memory usage comparison
  - [ ] Test database connection pool limits
  - [ ] Verify no memory leaks

### 6.5 Monitoring & Observability

- [ ] Add metrics collection
  ```typescript
  interface CheckpointerMetrics {
    saveTime: Histogram
    loadTime: Histogram
    errorCount: Counter
    activeConnections: Gauge
  }
  ```
- [ ] Create health check endpoint
  - [ ] Database connection status
  - [ ] Checkpoint operation latency
  - [ ] Error rate monitoring
  - [ ] Storage usage tracking

- [ ] Add detailed logging
  ```typescript
  logger.info('[CHECKPOINTER] Using PostgresSaver', {
    connectionString: process.env.POSTGRES_CONNECTION_STRING?.replace(/:[^@]+@/, ':***@'),
    schema: process.env.POSTGRES_SCHEMA,
  })
  ```

### 6.6 Safe Rollout Plan

- [ ] **Week 1: Development Environment**
  - [ ] Deploy with flag disabled
  - [ ] Test flag enable/disable
  - [ ] Verify no impact when disabled
  - [ ] Run integration tests

- [ ] **Week 2: Staging Environment**
  - [ ] Enable for 10% of workflows
  - [ ] Monitor error rates
  - [ ] Compare performance metrics
  - [ ] Test failure scenarios

- [ ] **Week 3: Production Canary**
  - [ ] Enable for specific test projects
  - [ ] Run A/B comparison
  - [ ] Monitor user feedback
  - [ ] Verify checkpoint integrity

- [ ] **Week 4: Gradual Rollout**
  - [ ] 25% → 50% → 75% → 100%
  - [ ] Monitor at each stage
  - [ ] Keep rollback ready
  - [ ] Document any issues

### 6.7 Cleanup & Deprecation (ONLY AFTER 30 DAYS STABLE)

- [ ] **Pre-cleanup Checklist**
  - [ ] ✓ 30 days in production at 100%
  - [ ] ✓ Zero rollback incidents
  - [ ] ✓ Performance metrics acceptable
  - [ ] ✓ All tests passing with PostgresSaver
  - [ ] ✓ Backup of any MemorySaver data
  - [ ] ✓ Team approval for removal

- [ ] **Cleanup Steps**
  1. [ ] Remove feature flag checks
  2. [ ] Remove MemorySaver imports
  3. [ ] Update documentation
  4. [ ] Remove MemorySaver tests
  5. [ ] Clean up environment variables
  6. [ ] Archive migration code

- [ ] **Post-cleanup Validation**
  - [ ] Run full test suite
  - [ ] Deploy to staging first
  - [ ] Monitor for 48 hours
  - [ ] Deploy to production
  - [ ] Keep monitoring for 1 week

### 6.8 Rollback Plan

- [ ] **Emergency Rollback Procedure**

  ```bash
  # 1. Set environment variable
  USE_POSTGRES_SAVER=false

  # 2. Restart servers
  npm run env:restart

  # 3. Verify MemorySaver active
  curl http://localhost:3456/api/health/checkpointer
  ```

- [ ] **Data Recovery Steps**
  - [ ] Export active workflows from PostgreSQL
  - [ ] Convert to MemorySaver format if needed
  - [ ] Restore critical workflow states
  - [ ] Document any data loss

### 6.9 Success Metrics

- [ ] **Reliability**
  - [ ] 100% workflow recovery after restart
  - [ ] Zero data loss incidents
  - [ ] < 1% checkpoint operation failures

- [ ] **Performance**
  - [ ] Checkpoint save < 50ms (p95)
  - [ ] Checkpoint load < 100ms (p95)
  - [ ] No impact on workflow execution speed

- [ ] **Operational**
  - [ ] Database size growth < 1GB/month
  - [ ] Connection pool never exhausted
  - [ ] Automated cleanup working

## DOGFOODING READINESS AUDIT (2025-01-09)

### Current Status: 80% Backend Complete, 0% Frontend Complete

**✅ SOLID BACKEND FOUNDATION**

- Async workflows with PostgresSaver persistence ✅
- SSE real-time streaming ✅
- Auto-resume and retry logic ✅
- MCP tools (invoke_async, invoke_status) ✅
- API endpoints fully functional ✅

**❌ CRITICAL GAPS FOR DOGFOODING**

- No UI for workflow monitoring (BLOCKING)
- No real-time progress visualization (BLOCKING)
- No manual retry/resume controls (BLOCKING)
- Limited testing coverage (RISK)
- Missing advanced MCP tools (NICE-TO-HAVE)

### IMMEDIATE ACTION PLAN (3-4 Days to Dogfooding)

**🚨 PRIORITY 1: UI Integration (1-2 days) - BLOCKING**

- [ ] Create WorkflowMonitor component with real-time status
- [ ] Add useWorkflowSSE hook for EventSource management
- [ ] Integrate workflow panel into workspace sidebar
- [ ] Add manual retry/resume buttons

**🚨 PRIORITY 2: E2E Testing (1-2 days) - CRITICAL**

- [ ] Write workflow lifecycle tests (start → progress → complete)
- [ ] Test failure scenarios and auto-recovery
- [ ] Test server restart during workflow execution
- [ ] Add UI component tests for WorkflowMonitor

**🔧 PRIORITY 3: Complete MCP Toolset (1 day) - ENHANCEMENT**

- [ ] Add invoke_stream tool for SSE endpoint access
- [ ] Add workflow_monitor tool for listing active workflows
- [ ] Add invoke_resume tool for step-specific recovery

**🗃️ PRIORITY 4: Workflow Persistence (1 day) - FIX**

- [ ] Add workflow_registrations table
- [ ] Fix WorkflowMonitor to survive server restarts
- [ ] Enable cross-restart stale workflow detection

### DOGFOODING SUCCESS CRITERIA

1. **User Visibility**: See workflow progress in real-time ✅ Ready after Priority 1
2. **Manual Control**: Retry/resume failed workflows ✅ Ready after Priority 1
3. **Reliability**: Workflows survive server restarts ✅ Ready after Priority 4
4. **Testing**: Prove system works under failure ✅ Ready after Priority 2

### IMPLEMENTATION ORDER FOR DOGFOODING

1. **Day 1**: UI components (WorkflowMonitor + SSE hook)
2. **Day 2**: Workspace integration + basic testing
3. **Day 3**: E2E tests + failure scenarios
4. **Day 4**: Polish + workflow persistence fix

**Result**: Internal team can dogfood async workflows with full visibility and control

## Implementation Summary (2025-01-09)

### Phase 6: PostgresSaver Implementation ✅ COMPLETED

1. **PostgreSQL Infrastructure** ✅
   - Docker Compose configuration for postgres:15-alpine
   - Connection pooling service with pg library
   - Health check endpoints
   - Feature flag system (USE_POSTGRES_SAVER)

2. **PostgresSaver Integration** ✅
   - Updated checkpointer.ts to use PostgresSaver.fromConnString()
   - Added automatic setup() call to create tables
   - Fixed schema configuration to use workflow_checkpoints
   - Verified checkpoint saving with 4-5 checkpoints per workflow

3. **Testing Results** ✅
   - Workflows execute successfully with PostgresSaver
   - Template variables ({step1.output}) work correctly
   - Checkpoints are saved to PostgreSQL
   - Health endpoint correctly reports PostgresSaver status

### Phase 1.2: RetryPolicy Implementation ✅ COMPLETED

1. **LangGraph RetryPolicy** ✅
   - Added RetryPolicy configuration to all workflow nodes
   - 3 max attempts with exponential backoff (1s → 2s → 4s)
   - Jitter enabled to prevent thundering herd
   - Smart retry logic: retries transient failures, skips auth/validation errors

2. **Testing** ✅
   - Created test script for retry scenarios
   - Verified workflow execution continues with RetryPolicy
   - Checkpoints saved properly during execution

### Key Learnings:

- PostgresSaver requires setup() to be called to create tables
- Use fromConnString() with schema option, not direct Pool constructor
- Host PostgreSQL can conflict with Docker (port 5432)
- LangGraph handles its own checkpoint schema migrations
- RetryPolicy is configured per node in addNode() options

### Architecture Status:

- **SQLite**: All application data (agents, projects, configs)
- **PostgreSQL**: Only LangGraph workflow checkpoints
- **Persistence**: ✅ PostgresSaver active
- **Retry Logic**: ✅ RetryPolicy configured
- **Auto-Resume**: ✅ WorkflowMonitor implemented (event-based)

### Auto-Resume Implementation Details (2025-01-09)

**Key Components:**

1. **WorkflowMonitor Service** (`/web/server/services/WorkflowMonitor.ts`)
   - Singleton pattern for global workflow tracking
   - Monitors active workflows for stale/silent failures
   - 2-minute timeout for detecting non-responsive workflows
   - Auto-triggers recovery via re-invocation

2. **Event-Based Monitoring** (Not True Heartbeats)
   - Updates on `step_start` and `step_complete` events only
   - No updates during actual Claude SDK execution
   - Problem: Long-running steps (>2 min) appear stale
   - Solution would require true heartbeat during execution

3. **FlowLogger Utility** (`/web/server/utils/FlowLogger.ts`)
   - Self-discovering flow documentation
   - Tracks execution paths at runtime
   - Enabled via LOG_FLOWS=true environment variable
   - Helps avoid manual code tracing

**Documented Execution Flow:**

```
1. Step START
   -> WorkflowMonitor.updateHeartbeat()
2. ClaudeService.sendMessage()
3. SimpleOperator.checkStatus()
   (Operator determines if response is success/blocked/failed)
4. If success: emit step_complete
   -> WorkflowMonitor.updateHeartbeat()
```

**Key Finding:** step_complete events DO go through SimpleOperator first. The operator evaluates the agent's response and determines success/failure before any events are emitted.

**Auto-Resume Strategy:**

- Silent failures detected via stale workflow monitoring
- Recovery triggered by re-invoking with same threadId
- LangGraph automatically resumes from last checkpoint
- All session IDs preserved for step continuity
- Completed steps automatically skipped

**Current Limitations:**

- Event-based, not true heartbeat monitoring
- Steps taking >2 minutes falsely detected as stale
- No heartbeat during Claude SDK execution phase
- Would need SDK modification for true heartbeats

## Notes

- KISS: Start with simple SSE, add complexity only as needed
- DRY: Reuse existing WebSocket infrastructure for events
- Test First: Every feature needs API tests before UI
- Incremental: Each phase should be deployable independently
- Monitor: Add metrics for retry success rates
- **CRITICAL**: PostgresSaver is the foundation for true workflow reliability
- **SAFETY**: Never remove MemorySaver until 30 days of stable production use
