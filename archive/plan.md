# Claude Studio: AI Agent Team System - Implementation Plan

## Overview

Clean rebuild of the AI agent team system, fixing critical issues while preserving proven patterns. Focus on KISS principle with SOLID architecture, library-first approach, and proper process management.

## Core Problems to Solve

1. **Zombie Processes**: 30+ Claude processes running without cleanup ✅ NOT AN ISSUE (no processes spawned)
2. **Memory Leaks**: Processes not properly terminated ✅ NOT AN ISSUE (uses SDK instances)
3. **Poor Organization**: Messy file structure, no clear abstractions ✅ MOSTLY RESOLVED
4. **UI Issues**: WebSocket errors causing full page crashes ✅ RESOLVED
5. **No Process Lifecycle Management**: Unclear agent states ✅ SOLVED DIFFERENTLY (SDK sessions)

## Key Requirements

- Multiple AI agents with customizable roles and system prompts
- Controlled tool access per agent (prevent hallucination issues)
- Track session_ids from Claude's json-stream for checkpointing
- IPC communication between agents using @mentions
- Command system (#team, #spawn, #clear, etc.)
- Web UI with multiple views (grid, unified, split)
- Mobile-responsive design for remote access
- Team templates for quick project setup
- Project isolation with proper cwd handling

## Architecture Decisions

### 1. Process Management ❌ NOT IMPLEMENTED

- Use TypeScript SDK (`@anthropic-ai/claude-code`) for better control ✅ DONE
- Each agent = persistent process that idles between tasks ✅ DONE
- Proper PID tracking and cleanup on shutdown ❌ NOT DONE
- Health checks to detect and clean zombie processes ❌ NOT DONE

### 2. Agent States ⚠️ PARTIALLY IMPLEMENTED

- `online`: Agent running and idle ✅ UI ONLY
- `busy`: Agent processing a message ✅ UI ONLY
- `offline`: Process stopped but agent not removed from team ✅ UI ONLY
- Removing agent = kill process + cleanup + remove from registry ⚠️ PARTIAL (no process cleanup)

### 3. Storage Strategy ✅ IMPLEMENTED

- Start with JSON files (KISS) ✅ DONE
- Structure for future SQLite migration ✅ READY
- Files:
  - `/tmp/claude-agents/registry.json` - Process registry ❌ NOT IMPLEMENTED
  - `~/.claude/agent-sessions.json` - Session tracking ✅ CLAUDE NATIVE
  - `~/.claude-studio/projects/{project-id}/` - Project data ✅ IMPLEMENTED
  - `~/.claude-studio/teams/` - Team templates ✅ IMPLEMENTED

### 4. UI/UX Design ✅ MOSTLY IMPLEMENTED

- **Multi-page architecture**: ✅ IMPLEMENTED
  - Projects Page: Active project workspace with chat interface ✅ DONE
  - Workspace Page: Centralized multi-agent management ✅ ADDED (not in original plan)
  - Agents Page: Agent configuration management ✅ DONE
  - Teams Page: Team template management ✅ DONE
  - Settings Page: Hooks, keyboard shortcuts, project config ✅ DONE
- **Projects Page** (main workspace):
  - Tab-based project navigation
  - Collapsible sidebar with active team agents
  - Agent card shows: status, tokens used, last message
  - Terminal/chat interface with xterm.js
  - Message queue display
  - ESC to interrupt, Enter to send
  - **View Modes**:
    - Single: One agent terminal
    - Split: Two agent terminals side-by-side
    - Grid: Four agent terminals in grid
    - Develop: Dedicated development workspace
- **Develop View** (integrated development environment):
  - Side-by-side layout: Terminal (40%) + Preview (60%)
  - Collapsible terminal panel (full-screen preview mode)
  - Multiple terminal tabs (Server, Console, Tests)
  - Server connection management
  - URL input for localhost or remote servers
  - Device viewport switching (desktop/tablet/mobile)
  - Auto-connect when server starts
  - Live server log monitoring
  - Refresh and open in new tab options
  - CORS/proxy guidance for remote development
- **Agents Page**:
  - List of all agent configurations
  - Predefined roles with default configs
  - Create/edit agent configurations
  - System prompts, tool permissions, model settings
  - Clone existing configurations
- **Teams Page**:
  - Team templates (Prototype, Backend, Full Stack, etc.)
  - Drag-and-drop agents into teams
  - Clone team templates
  - Export/import team configurations
- Mobile-first responsive design

## Implementation Status

### ✅ COMPLETED: Framework Modernization (Not in Original Plan)

- Migrated from vanilla JS to React + TypeScript + Tailwind CSS v4
- Implemented Shadcn/ui component library
- Added Tanstack Router for navigation
- Removed 2700+ lines of custom CSS
- Added ESLint, Prettier, Vitest, Husky

### ✅ COMPLETED: Native Hooks Integration (Not in Original Plan)

- Full Claude Code hooks system (PreToolUse, PostToolUse, Stop, Notification)
- Multi-tier hooks (Studio, Project, System scopes)
- TypeScript and ESLint checking hooks
- Discord notification integration
- ~85% hooks system complete

### ❌ NOT STARTED: Phase 1: Core Libraries

```
claude-studio/
├── lib/
│   ├── process/          # Process lifecycle management
│   │   ├── ProcessManager.ts      # Spawn, monitor, cleanup processes
│   │   ├── ProcessRegistry.ts     # Track PIDs and health
│   │   └── ProcessCleaner.ts      # Cleanup zombie processes
│   │
│   ├── ipc/             # Inter-process communication
│   │   ├── IPCServer.ts          # Agent IPC server
│   │   ├── IPCClient.ts          # IPC client for messaging
│   │   ├── MessageRouter.ts      # Route @mentions
│   │   └── RetryHandler.ts       # Connection retry logic
│   │
│   ├── agent/           # Agent management
│   │   ├── BaseAgent.ts          # Base agent class
│   │   ├── AgentFactory.ts       # Create agents with roles
│   │   ├── AgentLifecycle.ts     # State management + ESC interrupt
│   │   └── types.ts              # Agent interfaces
│   │
│   ├── queue/           # Message queue system
│   │   ├── MessageQueue.ts       # Queue pending messages
│   │   ├── QueueDisplay.ts       # Show pending messages
│   │   └── InterruptHandler.ts   # ESC key interrupt logic
│   │
│   ├── session/         # Session tracking
│   │   ├── SessionTracker.ts     # Track session IDs
│   │   ├── TokenCounter.ts       # Monitor token usage
│   │   └── HistoryManager.ts     # JSONL history handling
│   │
│   └── command/         # Command system
│       ├── CommandParser.ts      # Parse # and @ commands
│       ├── CommandRegistry.ts    # Extensible command registry
│       └── handlers/             # Individual command handlers
│           ├── TeamCommand.ts
│           ├── SpawnCommand.ts
│           ├── ClearCommand.ts
│           ├── MentionCommand.ts
│           └── BroadcastCommand.ts  # Send to all online agents
```

### Phase 2: Agent System (Week 1-2)

```
├── agents/
│   ├── ClaudeAgent.ts           # Main agent implementation
│   ├── AgentSpawner.ts          # Spawn agents from templates
│   └── AgentConfig.ts           # Role configurations
│
├── teams/
│   ├── TeamManager.ts           # Manage agent teams
│   ├── TeamTemplate.ts          # Template system
│   └── templates/               # Predefined teams
│       ├── prototype-team.json
│       ├── backend-team.json
│       └── custom-team.json
│
├── config/
│   ├── roles.json              # Role definitions
│   ├── tools.json              # Tool permissions
│   └── system-prompts.json     # System prompts per role
```

### Phase 3: Web UI (Week 2)

```
├── web/
│   ├── server/
│   │   ├── app.ts              # Express server
│   │   ├── websocket.ts        # Socket.IO setup
│   │   ├── api/                # REST endpoints
│   │   │   ├── agents.ts
│   │   │   ├── projects.ts
│   │   │   └── teams.ts
│   │   └── middleware/         # Auth, error handling
│   │
│   ├── client/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── AgentCard.tsx
│   │   │   │   ├── ChatPanel.tsx
│   │   │   │   ├── ProjectTabs.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Terminal.tsx        # xterm.js integration
│   │   │   │   └── MessageQueue.tsx    # Visual queue display
│   │   │   ├── hooks/
│   │   │   │   ├── useWebSocket.ts
│   │   │   │   ├── useAgents.ts
│   │   │   │   ├── useCommands.ts
│   │   │   │   ├── useMentions.ts      # @mention autocomplete
│   │   │   │   └── useMessageQueue.ts  # Queue management
│   │   │   └── views/
│   │   │       ├── GridView.tsx
│   │   │       ├── UnifiedView.tsx
│   │   │       └── SplitView.tsx
│   │   └── public/
│   │
│   └── shared/
│       └── types.ts            # Shared TypeScript types
```

### Phase 4: Advanced Features (Week 3)

- Token management with auto-warning at 80%
- Custom compaction strategies
- Command extensions (#search, #task)
- Analytics and metrics
- API for mobile app
- Export/import team configurations

## Major Pivots from Original Plan

1. **Technology Stack**: Moved from vanilla JS to React + TypeScript + modern tooling
2. **Hooks System**: Added comprehensive Claude Code hooks integration (not in original plan)
3. **UI Framework**: Adopted Tailwind CSS v4 and Shadcn/ui instead of custom CSS
4. **Navigation**: Added multi-page architecture with Tanstack Router
5. **Architecture**: PIVOTED from distributed processes to monolithic app with SDK instances
6. **IPC System**: REPLACED with HTTP/WebSocket routing (simpler, works well)
7. **Command System**: FULLY IMPLEMENTED with all planned commands

## Current Implementation Status (CORRECTED)

- **Overall Application**: ~80-85% functional
- **Hooks System**: ~85% complete
- **Agent Management**: ~90% complete (uses SDK instances)
- **Process Management**: Not needed (architecture changed to monolithic)
- **Commands**: 100% complete (#spawn, #team, #broadcast, etc.)
- **@mentions**: 100% complete (routes through server)
- **Settings Tabs**: 3 of 6 are placeholders

## Key Implementation Details

### Process Management

```typescript
// Proper cleanup on shutdown
process.on('SIGINT', async () => {
  await ProcessManager.cleanupAll()
  await IPCManager.closeAll()
  process.exit(0)
})

// Health check for zombies
setInterval(() => {
  ProcessRegistry.detectZombies()
}, 30000)
```

### IPC Communication

```typescript
// Reuse working pattern with improvements
const socket = `claude-agents.${agentId}`
const server = new IPCServer(socket)
server.on('message', (msg: IPCMessage) => {
  // Handle with proper error boundaries
})
```

### Agent Lifecycle

```typescript
class AgentLifecycle {
  async spawn(role: string, id: string): Promise<Agent> {
    // 1. Create process
    // 2. Register PID
    // 3. Start IPC server
    // 4. Load system prompt (but don't send)
    // 5. Set status to 'ready' (not 'online' yet)
    // 6. Wait for first interaction to go 'online'
  }

  async interrupt(id: string): Promise<void> {
    // ESC key handling
    // 1. Send interrupt signal to agent
    // 2. Clear current processing
    // 3. Set status back to 'online'
    // 4. Clear message queue for this agent
  }

  async shutdown(id: string): Promise<void> {
    // 1. Set status to 'offline'
    // 2. Close IPC
    // 3. Kill process gracefully
    // 4. Cleanup registry
  }
}
```

### Message Queue System

```typescript
class MessageQueue {
  private queues: Map<string, QueuedMessage[]> = new Map()

  enqueue(agentId: string, message: string): void {
    // Add to agent's queue
    // Emit update event for UI
  }

  dequeue(agentId: string): QueuedMessage | null {
    // Get next message
    // Update UI display
  }

  interrupt(agentId: string): void {
    // Clear queue on ESC
    // Notify UI
  }
}
```

### @Mention Autocomplete

```typescript
// In useMentions.ts
function useMentions() {
  const onlineAgents = useAgents({ status: 'online' })

  return {
    suggestions: onlineAgents.map((a) => ({
      id: a.id,
      display: `@${a.id}`,
      role: a.role,
    })),
    complete: (partial: string) => {
      // Return matching agents
    },
  }
}
```

### Broadcast Command

```typescript
// In BroadcastCommand.ts
class BroadcastCommand implements CommandHandler {
  async execute(message: string): Promise<void> {
    const onlineAgents = await AgentRegistry.getOnlineAgents()

    for (const agent of onlineAgents) {
      await IPCClient.send(agent.id, {
        from: 'broadcast',
        content: message,
        timestamp: Date.now(),
      })
    }
  }
}
```

### WebSocket Resilience

```typescript
// Auto-reconnect without losing state
socket.on('disconnect', () => {
  // Don't crash the UI
  showReconnecting()
  attemptReconnect()
})
```

## Testing Strategy (Local Use)

1. Manual testing of core flows
2. Basic smoke tests for process cleanup
3. Test IPC communication between 2-3 agents
4. Verify no zombie processes remain

## Local Setup

- Simple .env file for configuration
- Run with `npm start` or `tsx src/index.ts`
- Logs to console for debugging
- Let OS handle resource management

## Success Criteria

- Zero zombie processes after shutdown
- Agents communicate reliably
- Web UI works on desktop and mobile
- Can resume sessions properly
- Commands work as expected

## Next Steps

1. Set up project structure
2. Implement ProcessManager to fix zombie issue
3. Port working IPC code with improvements
4. Create BaseAgent abstraction
5. Build minimal UI prototype
6. Iterate based on testing

## Additional Implementation Details

### Terminal Integration (xterm.js)

```typescript
// Terminal.tsx
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'

const terminal = new Terminal({
  theme: {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
  },
  cursorBlink: true,
})
```

### Develop View Implementation

```typescript
// DevelopView.tsx
interface DevelopViewState {
  terminalCollapsed: boolean
  serverConnected: boolean
  serverUrl: string
  activeTerminal: 'server' | 'console' | 'tests'
}

// Terminal management for development
const developTerminals = {
  server: createTerminal('Server Terminal'),
  console: createTerminal('Console'),
  tests: createTerminal('Test Runner'),
}

// Server connection handling
async function connectToServer(url: string) {
  try {
    // Check if URL is accessible
    const response = await fetch(url, { mode: 'no-cors' })
    updateServerStatus('connected')
    loadPreviewIframe(url)
  } catch (error) {
    updateServerStatus('failed')
    showConnectionError()
  }
}

// Terminal toggle for full-screen preview
function toggleTerminal() {
  setTerminalCollapsed(!terminalCollapsed)
  if (!terminalCollapsed) {
    // Expand preview to full width
    previewSection.style.width = '100%'
  }
}
```

### Agent States

- `ready`: System prompt loaded, waiting for first interaction
- `online`: Active and idle, ready for messages
- `busy`: Currently processing a message
- `offline`: Process stopped but not removed from team

### Key Features Summary

1. **Message Queue**: Visual display of pending messages with ESC interrupt
2. **@Mention Autocomplete**: Shows online agents as you type @
3. **Broadcast**: Send message to all online agents at once
4. **Terminal**: Full xterm.js integration for rich terminal experience
5. **Agent Ready State**: Prevents auto-execution on spawn

## Notes for Claude Code

- The existing IPC and command parsing work well - just need better organization
- Focus on process cleanup first - this is the critical issue
- Use dependency injection for testability
- Keep libraries small and focused
- Build incrementally - don't try to implement everything at once
- Test process cleanup thoroughly
- Ensure proper error boundaries everywhere
- Implement message queue early - it's core to the UX
- Use xterm.js for terminal component
- Agent 'ready' state prevents unwanted auto-execution

## Reference to Existing Claude-Team Files

### Patterns to Reuse from Parent Directory (../):

1. **IPC Communication** (`ipc-manager.ts`)
   - Unix domain socket pattern: `claude-agents.{agentId}`
   - Message format: `{from, content, timestamp}`
   - Retry logic with 2s timeout

2. **Command System** (`command-parser.ts`)
   - parseAndExecute() for commands starting with #
   - Simple string matching approach
   - Returns `{isCommand: boolean, output?: string}`

3. **Session Management** (`session-manager.ts`)
   - Session IDs stored in `~/.claude/agent-sessions.json`
   - --resume flag functionality
   - History in `~/.claude/projects/{sessionId}.jsonl`

4. **Agent Implementation** (`claude-agent.ts`, `claude-hybrid.ts`)
   - Claude SDK usage patterns
   - Async generator with query() function
   - Multiple integration approaches

5. **Type Definitions** (`types.ts`, `types/message-types.ts`)
   - Agent interface definitions
   - Message type structures

6. **Role Configurations** (`config/roles/*.json`)
   - Predefined roles: dev, ux, tester, architect, orchestrator
   - System prompts and tool permissions

7. **Process Management Patterns** (`spawn-manager.ts`)
   - Process tracking in `/tmp/claude-agents/registry.json`
   - Three spawn modes: in-memory, headless, terminal

8. **WebSocket Integration** (`web-terminal/terminal-server.ts`)
   - Socket.IO on port 3456
   - Real-time terminal streaming

### Key Patterns Summary:

- IPC: node-ipc with Unix sockets
- Storage: JSON files for initial implementation
- Process tracking: PID registry in /tmp
- Session persistence: ~/.claude directory
- WebSocket: Socket.IO for real-time updates
- Commands: # prefix for system, @ for mentions

## Component Integration Map

### Integration Flow Overview

```
Web UI (React) <-> WebSocket <-> Express Server <-> Backend Libraries
                                       |
                                       v
                              API Endpoints <-> File Storage
                                       |
                                       v
                          Process Manager <-> Agent Processes
                                       |
                                       v
                              IPC System <-> Message Queue
```

### Detailed Integration Points

#### 1. Web Server → Process Management

- `POST /api/agents/:id/spawn` → `AgentSpawner.spawn()` → `ProcessManager.createProcess()`
- `DELETE /api/projects/:id/agents/:agentId` → `ProcessManager.killProcess()`
- WebSocket `agent:status-update` ← `ProcessRegistry.onStatusChange()`

#### 2. Web Server → IPC System

- WebSocket `terminal:input` → `IPCClient.send(agentId, input)`
- WebSocket `agent:message` → `MessageRouter.route(message)`
- `IPCServer.on('message')` → WebSocket `terminal:output`

#### 3. Web Server → Session Management

- `AgentSpawner.spawn()` → `SessionTracker.createSession()`
- `GET /api/projects/:id` → `SessionTracker.getSessionForProject()`
- Agent response → `TokenCounter.update()` → WebSocket `agent:token-update`

#### 4. Web Server → Command System

- WebSocket `command:execute` → `CommandParser.parseAndExecute()`
- `#spawn` command → `SpawnCommand.execute()` → `AgentSpawner.spawn()`
- `#team` command → `TeamCommand.execute()` → `AgentRegistry.getAll()`

#### 5. UI Components → Server APIs

- `ProjectsPage` → WebSocket connection → real-time agent status
- `AgentsPage` → `GET/POST/PUT /api/agents` → agent configurations
- `TeamsPage` → `GET/POST /api/teams` → team templates
- `Terminal` component → WebSocket `terminal:input/output`
- `MessageQueue` component → WebSocket `queue:updated`

#### 6. Process Lifecycle Integration

```typescript
// Example: Spawning an agent from UI
UI: Click "Spawn Agent"
  → POST /api/agents/:id/spawn
    → AgentSpawner.spawn(config)
      → ProcessManager.createProcess()
        → ProcessRegistry.register(pid)
        → IPCServer.start(agentId)
        → SessionTracker.create(agentId)
        → WebSocket.emit('agent:registered')
      → UI updates with new agent
```

#### 7. Message Flow Integration

```typescript
// Example: Sending @mention message
UI: Type "@dev1 implement feature"
  → WebSocket 'command:execute'
    → CommandParser.parse()
      → MentionCommand.execute()
        → MessageQueue.enqueue('dev1', message)
        → IPCClient.send('dev1', message)
          → Agent processes message
            → TokenCounter.update()
            → WebSocket 'terminal:output'
          → UI shows response
```

### Integration Checkpoints

#### Stage 2 (Process Management) must provide:

- `ProcessManager.createProcess(agentConfig)` - returns pid
- `ProcessRegistry.register(pid, agentId)` - tracks process
- `ProcessRegistry.getStatus(agentId)` - for status updates
- Event emitter for status changes

#### Stage 3 (IPC) must provide:

- `IPCServer.start(agentId)` - creates socket
- `IPCClient.send(agentId, message)` - sends to agent
- `MessageRouter.route(message)` - handles @mentions
- Event emitter for incoming messages

#### Stage 4 (Base Agent) must provide:

- `BaseAgent` class that Stage 8 can extend
- `AgentLifecycle.spawn/interrupt/shutdown` methods
- Integration with IPC system

#### Stage 8 (Agent Implementation) must provide:

- `AgentSpawner.spawn(config, projectId)` - called by API
- `ClaudeAgent` that uses SDK and emits events
- Parse commands in responses

#### Stage 11 (Web Server) must connect to:

- All backend libraries via imports
- WebSocket events to UI components
- File storage for persistence

### Missing Integration Points to Add

1. **Add to Stage 11**: Import and use backend libraries
2. **Add to Stage 12-14**: WebSocket event handlers in React components
3. **Add to Stage 2**: Event emitters for UI updates
4. **Add to Stage 8**: WebSocket integration for streaming responses
5. **Add to todo.md**: Integration testing stage
6. **Add to Stage 12.1**: Message history viewer with virtual scrolling
   - Parse and display historical messages from .jsonl files
   - Support for @mentions and #commands parsing
   - Integration with Tiptap for rich message rendering

### File Dependencies

```
web/server/app.ts imports:
  - lib/process/ProcessManager
  - lib/ipc/IPCClient
  - lib/command/CommandParser
  - src/agents/AgentSpawner
  - src/teams/TeamManager
  - lib/session/SessionTracker
```

## Recent Enhancements (Stage 12.4)

### Agent Management Improvements

#### 1. Legacy Agent Role Assignment

- **Problem**: Legacy agents without configuration files couldn't be assigned roles
- **Solution**:
  - Added `AssignRoleModal` for legacy agent configuration
  - Implemented role persistence in `/api/agent-roles` endpoint
  - Updated Zustand store to maintain role assignments across refreshes
  - Fixed infinite loop issue in `useAgentRoles` hook

#### 2. Agent Deletion with Session Cleanup

- **Problem**: Deleting agents didn't clean up Claude native session files
- **Solution**:
  - Added session file deletion at `~/.claude/projects/{projectId}/{agentId}.jsonl`
  - Fixed Express route ordering (specific routes before parameterized)
  - Comprehensive logging for debugging file operations
  - Ensured proper state cleanup to prevent agents reappearing

#### 3. Multi-Select Agent Management

- **Problem**: No way to bulk manage agents (especially stale ones)
- **Solution**:
  - Added selection mode with checkbox UI
  - Implemented "Select All" functionality
  - Added shift+click range selection
  - Created unified `DeleteAgentModal` following DRY principle
  - Batch operations only visible in selection mode
  - Individual delete buttons preserved on agent cards

#### 4. UI/UX Consistency

- **Problem**: Mixed use of browser alerts and modals
- **Solution**:
  - Replaced all browser alerts with Shadcn/ui modals
  - Added loading states for async operations
  - Fixed WebSocket server spam by disabling periodic stats
  - Consistent deletion experience for single and batch operations

### Architecture Patterns Applied

1. **DRY (Don't Repeat Yourself)**
   - Single `DeleteAgentModal` component for all deletion cases
   - Unified deletion logic with `skipConfirm` parameter
   - Reusable modal patterns across the application

2. **KISS (Keep It Simple, Stupid)**
   - Simple selection mode toggle
   - Clear visual indicators for selected agents
   - Straightforward batch operations

3. **SOLID Principles**
   - Single Responsibility: Separate hooks for different concerns
   - Open/Closed: Extensible selection system for future batch operations
   - Interface Segregation: Clean prop interfaces for components

### Future Extensibility

The multi-select infrastructure is designed to support additional batch operations:

- Batch role assignment
- Batch status changes (pause/resume)
- Batch token limit updates
- Export selected agents as team template
