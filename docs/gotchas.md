# Claude Studio Gotchas

## React Hooks & Infinite Loops (2025-01-10)

- **Problem**: "Maximum update depth exceeded" error when using Zustand store functions in useEffect dependencies
- **Root Cause**: Including non-memoized functions like `fetchWorkflows` in dependency arrays causes infinite re-renders
- **Solution**: Either:
  1. Use separate useEffect hooks with empty dependency arrays for mount-only effects
  2. Extract store functions with individual selectors: `useStore((state) => state.function)`
  3. Add ESLint disable comments when intentionally omitting dependencies
- **Pattern**: Zustand store functions are stable and don't need to be in dependency arrays
- **Files affected**: `useWorkflowEvents.ts` - fixed by separating mount effect from SSE setup

## Workflow Visibility UI (2025-01-10)

- **Enhancement**: Workflow details moved from cramped sidebar to spacious modal
- **Components**:
  - `WorkflowModal.tsx` - Full-featured modal for workflow details
  - `WorkflowList.tsx` - Simplified list that opens modal on click
- **Benefits**: Better readability, more space for step details, cleaner sidebar
- **SSE Pattern**: Single global SSE connection in `useWorkflowEvents` hook prevents connection storms
- **Infinite Loop Fix**: Use stable `workflowList` array in store instead of `Object.values()`

## LangGraph Workflow Listing (2025-01-10)

- **Finding**: LangGraph's BaseCheckpointSaver has a `list()` method to list checkpoints
- **But**: CheckpointMetadata only contains basic fields: source, step, writes, parents
- **Not**: Custom workflow metadata like status, projectName, sessionIds, etc.
- **Current Solution**: In-memory Map in `/api/invoke-status/workflows` is reasonable
- **Why**: LangGraph's metadata structure is too limited for rich workflow information
- **Future**: Could store workflow metadata separately in PostgreSQL alongside checkpoints
- **Note**: The in-memory approach means workflows are lost on server restart
- **Alternative**: Extend CheckpointMetadata type or maintain separate workflow metadata table

## HTTP & API

- Use `ky` not `fetch`
- API_BASE includes `/api` already: `http://localhost:3456/api`
- MCP tools use env var `CLAUDE_STUDIO_API` with `/api` included
- UI uses DEV server (port 3457), check `.claude-studio/dev-server.log` for debugging
- WebSocket always connects to stable server (3456) for real-time MCP compatibility

## TypeScript

- NO `any` types - will be blocked
- Use arrow functions in `.map()` to preserve `this`: `configs.map(config => this.method(config))`
- Import without extensions: `from './module'` not `from './module.js'`
- Never use `.js` extensions in imports - causes module resolution issues

## MCP Server

- Rebuild after changes: `cd web/server/mcp/studio-ai && npm run build`
- Restart required after rebuilding
- Template vars: `{CLAUDE_STUDIO_API}` resolves to full API URL with `/api`

## Testing

- Always run `npm run lint` and `npm run type-check`
- Server restart needed when changing API schemas or services
- Backend changes need `npm run build` then server restart to take effect
- tsx may cache code - full server restart sometimes needed for complex changes
- Multiple tsx processes can run simultaneously - check with `ps aux | grep tsx`

## State Management

- Zustand for global state
- Singleton services need proper `this` binding in callbacks

## File Operations

- MODIFY existing files, don't create new ones (YAGNI)
- Check if library exists before implementing (Library-First)
- Read files before editing them (required for Write tool)

## Agent System

- Use short IDs: `dev_01`, `ux_01`
- Use `/api/studio-projects` not `/api/projects`
- Tool permissions now use `ToolPermission[]` not `string[]`
- Studio projects API expects role-based operations:
  - Add agent: POST `/api/studio-projects/:id/agents` with `{ role, agentConfigId }`
  - Remove agent: DELETE `/api/studio-projects/:id/agents/:role`
  - Not compatible with old batch operations that used agent IDs

## Async Workflows & SSE

- LangGraph promises need to be kept alive - use WorkflowExecutor singleton
- Socket.io events don't automatically bridge to SSE - use EventEmitter
- Server needs restart after adding EventEmitter to existing endpoints
- `require()` doesn't work in ES modules - use imports at top of file
- SSE clients need proper event parsing - data comes after "data: " prefix
- WorkflowOrchestrator must emit to both Socket.io AND EventEmitter

## Server Management

- Use `npm run env:restart:stable` not custom restart scripts (DRY)
- Check for stale tsx processes with `ps aux | grep tsx`
- EventEmitter needs to be shared via `req.app.get/set` for SSE

## MCP (Model Context Protocol) Limitations

- MCP servers CANNOT be passed to Claude agents in Claude Studio
- The Claude Code CLI supports `--mcp-config` but the TypeScript SDK does NOT
- Claude Studio uses the programmatic SDK API, not the CLI
- MCP configurations are stored but not actually used when spawning agents
- **This means agents cannot use MCP tools like `mcp__studio-ai__*`**
- When asked about MCP tools, agents will search code instead of using the tools
- The SDK `Options` interface has no `mcpConfig` field
- To enable MCP for agents would require either:
  - SDK update to support MCP in programmatic API
  - Switch to spawning agents via CLI with `--mcp-config` flag

## Tool Permissions System

- Tools are properly passed to agents via allowedTools/disallowedTools
- Agent configs use ToolPermission[] format with {name, enabled} objects
- The spawn endpoint doesn't use config from request body - it loads from database
- Actual agent instances are created on-demand when messages are sent
- Tool restrictions are logged with [TOOLS DEBUG] prefix for debugging

## ToolPermissionEditor Data Flow Issues (2025-01-09)

- FIXED: ToolPermissionEditor now normalizes permissions to include all available tools
- Root cause: Component received partial permissions arrays (only enabled tools) from parent components
- Problem: detectPreset() requires ALL tools to be present with enabled: true/false for each
- Problem: getToolEnabled() defaulted to false for missing tools, causing checkboxes to appear unchecked
- Solution: Added useMemo to normalize permissions by adding missing tools as enabled: false
- Result: Preset detection now works correctly (e.g., "Read Only" preset is detected)
- Result: Checkbox states now reflect actual tool permissions (10/16 tools show as checked)
- Pattern: Always ensure UI components normalize partial data to complete data structures

## Dynamic Tool Discovery (2025-01-09)

- FIXED: Removed hardcoded TOOL_CATEGORIES mapping that only recognized 8 tools
- System now uses pattern-based categorization with TOOL_CATEGORY_PATTERNS
- Tools are discovered dynamically from Claude SDK (currently 16 tools)
- Updated applyPreset() to accept availableTools parameter for dynamic tool matching
- Preset detection now works correctly with dynamic tools via detectPreset() function
- getRoleDefaultTools() replaces static ROLE_DEFAULT_TOOLS for dynamic tool assignment
- ToolPermissionEditor automatically detects current preset from actual tool states
- Pattern matching supports: Read/Write/Edit (FILE_SYSTEM), Bash (EXECUTION), Grep/Glob (SEARCH), WebSearch/WebFetch (WEB), mcp\_\_\* (MCP), etc.
- All hardcoded tool references removed from CreateAgentModal and other components

## Tool Permission Isolation (2025-01-09)

- Project-specific tool customizations are stored in `agentRoleAssignments.customTools`
- Base agent configurations store tools in `agentConfigs.tools`
- Fixed useRoleResolver to properly handle both string[] and ToolPermission[] formats
- AssignRoleModal correctly displays customized tools vs base configuration tools
- AgentConfigCard on /agents page only shows base configuration tools
- customTools can be either string[] (legacy) or ToolPermission[] (new format)
- Always normalize to string[] for comparison in useRoleResolver

## Role Assignment API Mismatch (2025-01-09)

- Studio project agents use short IDs (e.g., `dev_01`) but agent-roles API expects full config IDs
- Fixed by detecting studio agents and using studio-projects API instead
- Studio pattern: DELETE `/api/studio-projects/:projectId/agents/:role` then POST new agent
- Legacy pattern: PUT `/api/agent-roles/:agentId` for non-studio agents
- Always pass projectId to assignRole hook for proper API routing
- useAgentRoles hook now checks for studio agents (ID contains underscore) and routes accordingly
- Tool permissions display fixed by mapping ToolPermission objects to their names in AssignRoleModal

## Agent Loading Issues

- After adding agent to project, UI may show "Loading Agent..." indefinitely
- Caused by timing issue between backend update and frontend fetch
- Fixed by adding 100ms delay in project-agents-updated event handler
- useProjectAgents hook listens for 'project-agents-updated' custom event
- Agent store population happens via useEffect in main route component

## Agent Display Issues

- Agent cards showing full UUID instead of short ID (e.g., "68c57432-3e06-4e0c-84d0-36f63bed17b2_01")
- Fixed by using studio-projects/agents/short-ids endpoint instead of regular agents endpoint
- Added studioProjects property to StudioProvider interface for new endpoints
- Backend must map shortId to id field: `id: agent.shortId` in the API response
- AgentCard component displays agent.id which should be the short ID from backend
- The studio-projects API endpoint needed to transform the data structure

## Tool Customization Save Issues (2025-01-09)

- Custom tools weren't saving properly in AssignRoleModal
- Root cause: Multiple missing data flows:
  1. Backend was saving customTools correctly but not returning them in workspace API
  2. Frontend ProjectAgent interface was missing customTools property
  3. Agent store interface was missing customTools property
  4. AssignRoleModal wasn't receiving or using currentCustomTools
- Fixes applied:
  1. Added customTools to workspace API response (`web/server/api/workspace.ts`)
  2. Added customTools to ProjectAgent interface (`src/hooks/useWorkspaceData.ts`)
  3. Added customTools to Agent interface in store (`src/stores/agents.ts`)
  4. Passed customTools when syncing agents to store (`src/routes/index.tsx`)
  5. Added currentCustomTools prop to AssignRoleModal
  6. Added event dispatch after save to refresh UI (`src/hooks/useAgentRoles.ts`)
- Always ensure data flows completely from backend → API → frontend → components

## Claude SDK Crashes

- Claude Code SDK exits with code -2 when project path contains tilde (~)
- SDK requires absolute paths - tilde expansion must be done before passing to SDK
- Fixed in claude-agent.ts by expanding `~/` to actual home directory path
- Example: `~/projects/bns-ai` → `/Users/username/projects/bns-ai`
- Database connections should use lazy loading to avoid initialization issues

## Message Caching Issues

- Messages may appear cached when switching between agent cards
- Fixed by adding agentId to dependency array in MessageHistoryViewer
- WebSocket handler now requires both sessionId and agentId
- Messages are cleared when either sessionId or agentId changes
- WebSocket messages are filtered by agentId to prevent cross-agent contamination
- JSONL files may not be fully written when switching quickly between agents
- Added 200ms delay in StudioSessionService to ensure file is fully written before reading
- Always search by session ID first to find correct JSONL file location
- Claude may create new sessions in different subfolders, so cached paths can be stale
- Added session ID lookup endpoint to get current session ID before loading messages
- UI now fetches current session ID to ensure loading from correct JSONL file
- Claude SDK writes many messages with identical timestamps (same millisecond)

## PostgresSaver Implementation (2025-01-09)

- PostgresSaver requires `setup()` to be called to create tables - this is MANDATORY
- Use `PostgresSaver.fromConnString(connectionString, { schema })` not `new PostgresSaver(pool)`
- WorkflowOrchestrator needs async initialization for checkpointer - use lazy loading pattern
- Feature flags should check both existence and value: `process.env.USE_POSTGRES_SAVER === 'true'`
- Docker Compose healthchecks prevent connection issues during startup
- Always provide fallback to MemorySaver when PostgreSQL connection fails
- Test both MemorySaver and PostgresSaver paths in parallel before switching
- Import PostgresSaver dynamically to avoid circular dependencies
- BaseCheckpointSaver is the correct type for checkpointer abstraction
- Host PostgreSQL can conflict with Docker on port 5432 - stop host service first
- PostgresSaver creates 4-5 tables automatically in the specified schema
- Architecture: SQLite for app data, PostgreSQL for LangGraph checkpoints only

## WebSocket Reconnection (2025-01-09)

- Socket.io automatically reconnects but frontend needs to re-establish event handlers
- Added 'reconnect' event handler in useWebSocket hook to emit custom event
- MessageHistoryViewer listens for 'websocket-reconnected' event to reload messages
- Messages sent during disconnect/reconnect period may be missed without this fix
- Always test with frontend refresh to ensure real-time messages continue working
- WebSocket messages are matched using agentId (agent instance ID) not sessionId
- Frontend emits 'reload-messages-after-reconnect' event to trigger message reload

## Workflow Auto-Resume Limitations (2025-01-09)

- WorkflowMonitor only detects workflows started AFTER server restart
- Workflows are registered in memory only - lost on server restart
- This is the key gap preventing full auto-resume capability
- Manual resume (re-invoke with threadId) works correctly
- Need to persist workflow registrations to detect stale workflows after restart

## Agent Status Updates and Abort Timing (2025-01-09)

- Agent status must be set to 'busy' when processing messages for interruption to work
- Status updates are emitted via WebSocket with 'agent:status-changed' event
- Frontend listens for status updates in useWebSocketOperations hook
- Agent ID must match between backend and frontend (e.g., developer_01)
- If interruption shows "Selected agent is not busy", check:
  - Backend is emitting status updates (check dev-server.log for "[ClaudeAgent] Emitting status change")
  - Frontend is receiving updates (check browser console for "[WebSocket] Agent status update")
  - Agent IDs match between backend and frontend
- **Fixed**: Events from dev server (3457) weren't reaching frontend connected to stable server (3456)
- **Solution**: Implemented EventSystem abstraction to ensure all events go through Socket.io properly
- EventSystem can be swapped for Redis/BullMQ/NATS later without changing client code
- **Important**: WebSocket must connect to the same server handling API calls for events to work
- Changed `useWebSocket` to use `window.location.origin` instead of hardcoded port
- **Abort Timing**: Abort only works if ESC is pressed before Claude finishes generating the response
  - Quick prompts like "hello" or "test" complete too fast to interrupt
  - To test abort, use longer prompts like "Write a detailed 500-word essay about..." and press ESC quickly
  - If assistant message is already received, abort flag prevents UI display but doesn't stop generation

## MCP Invoke Agent Resolution (2025-01-09)

- Studio projects don't have active agents by default - agents must be added first
- Use `mcp__studio-ai__add_agent_to_project` to add agents before invoking workflows
- Agent IDs in Studio use short format: `dev_01`, `developer_01`, `reviewer_01` etc.
- The invoke tool accepts both `role` (legacy) and `agentId` (new) patterns
- If workflow fails with "No agent found", check:
  - Project has agents added (use `list_project_agents` to verify)
  - Using correct agentId format (e.g., `developer_01` not `dev`)
  - Agent with that ID exists in the project

## Async Workflow API Testing (2025-01-09)

- EventSource in tests requires proper TypeScript typing - mock or cast to avoid type errors
- EventSource.onerror expects Event, not ErrorEvent in browser spec
- Always type API responses to avoid TS18046 'unknown' errors
- SSE test pattern: Use Promise wrapper around EventSource for async/await compatibility
- Mock EventSource for unit tests to simulate SSE events without real server
- Status endpoints may return 404 initially - handle this gracefully in tests
- Use `ky` for HTTP requests to match production code patterns

## Comprehensive Workflow Testing Patterns (2025-01-09)

### Test Coverage Requirements

- **Basic Operations**: sync/async execution, template variables, dependencies
- **Edge Cases**: circular dependencies, missing variables, special characters
- **Concurrency**: multiple agents, session isolation, race conditions
- **Error Handling**: agent failures, network errors, partial failures
- **Performance**: parallel execution timing, resource contention
- **SSE Streaming**: event isolation, rapid connect/disconnect, concurrent streams

### Key Testing Scenarios

- Template variable resolution across concurrent workflows (prevent cross-contamination)
- Session isolation when same agent handles multiple workflows
- Database race conditions during rapid session creation
- WebSocket event broadcasting to multiple SSE clients
- Mixed sync/async workflow execution
- Resource limits with many concurrent workflows (8+ recommended)
- Error propagation isolation between concurrent workflows
- Large workflow handling (10+ steps with dependencies)

### Test File Organization

- `invoke-async.test.ts`: Basic async/sync functionality
- `invoke-edge-cases.test.ts`: Edge cases and bug prevention
- `invoke-concurrency.test.ts`: Race conditions and concurrent execution
- `invoke-comprehensive.test.ts`: Integration test patterns
- `run-all-workflow-tests.ts`: Comprehensive test runner

### Performance Benchmarks

- Concurrent workflows should complete faster than sequential
- 8+ concurrent workflows should finish within 2 minutes
- Session creation should handle rapid bursts without conflicts
- SSE connections should handle rapid connect/disconnect cycles

## Cross-Server Communication & Message Loading (2025-01-10)

### Redis EventSystem Implementation

- Implemented EventSystem abstraction to enable cross-server communication
- Frontend connects to dev server (3457) but needs events from both servers
- Redis adapter publishes events to all servers via pub/sub channels
- Socket.IO broadcasts Redis events to connected clients
- Enables real-time updates regardless of which server handles the agent
- See `.claude-studio/knowledge/architecture.md` for full details

### Claude Session File Location Fix

- **Problem**: StudioSessionService couldn't find messages - "Session not found in Claude projects"
- **Root Cause**: `getClaudeProjectFolder` preferred empty `-private` directories over active ones
- **Solution**: Check for most recent JSONL files instead of just directory existence
- Claude creates both `project-name` and `project-name-private` directories
- Fixed by comparing file modification times to find active directory
- Location: `web/server/services/StudioSessionService.ts` lines 79-128
- See `.claude-studio/knowledge/gotchas.md` for debugging steps

### WebSocket Message Routing Pattern

- Messages routed by stable agentId (e.g., "dev_01") not changing sessionId
- Frontend filters all WebSocket events by agentId match
- Internal Claude session IDs mapped via agent_claude_sessions table
- Pattern: Use stable IDs for routing, internal IDs for SDK only
- Prevents message contamination between agents
- See `.claude-studio/knowledge/patterns.md` for implementation details

### Tool Name Case Sensitivity

- **Problem**: Agents couldn't use Write tool despite having permissions
- **Root Cause**: Claude SDK expects exact tool names ("Write" not "write")
- **Solution**: Preserve tool names exactly as discovered by ToolDiscoveryService
- Never convert tool names to lowercase - SDK is case-sensitive
- Fixed in `web/server/services/claude-agent.ts` - preserve original casing
- Pattern: Always use discovered tool names without modification
