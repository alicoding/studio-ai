# Claude-EA Project Context Guide

## Project Overview

Claude-EA is a clean rebuild of an AI agent team system that fixes critical issues (zombie processes, memory leaks, poor organization) while preserving proven patterns from the existing claude-team codebase.

## Current Status (as of Stage 11 completion)

- ✅ Stage 1: Foundation Setup - Complete (React + TypeScript + TanStack Router)
- ✅ Stage 11: Web Server - Complete (Express + Socket.IO + APIs)
- 🔄 Stage 12-14: UI Implementation - Next
- ⏳ Stage 2-9: Backend implementation - Pending

## Key Documents to Read First

1. `plan.md` - Complete architecture and implementation plan
2. `todo.md` - Detailed checklist of all tasks
3. This file - Quick context and current state

## Architecture Summary

```
Web UI (React + TanStack Router)
    ↕️ WebSocket (Socket.IO)
Express Server (Port 3456)
    ↕️ REST APIs + WebSocket Events
Backend Libraries (TypeScript)
    ↕️ IPC (Unix Sockets)
Agent Processes (Claude SDK)
```

## Critical Integration Points

### From Web UI to Backend

1. **Projects Page** → WebSocket → Agent status/terminal output
2. **Agents Page** → REST API → Agent configurations
3. **Teams Page** → REST API → Team templates
4. **Terminal Component** → WebSocket → IPC → Agent Process

### From Backend to UI

1. **ProcessRegistry** → WebSocket → Status updates
2. **MessageQueue** → WebSocket → Queue display
3. **TokenCounter** → WebSocket → Token usage bar
4. **IPCServer** → WebSocket → Terminal output

## File Structure

```
claude-ea/
├── src/                    # React app
│   ├── routes/            # TanStack Router pages
│   ├── components/        # React components (TO BUILD)
│   └── hooks/            # Custom hooks (TO BUILD)
├── web/
│   └── server/           # Express server
│       ├── app.ts        # Main server
│       ├── websocket.ts  # Socket.IO handler
│       └── api/          # REST endpoints
├── lib/                  # Backend libraries (TO BUILD)
│   ├── process/         # Process management
│   ├── ipc/            # Inter-process communication
│   ├── agent/          # Base agent system
│   ├── queue/          # Message queue
│   ├── session/        # Session tracking
│   └── command/        # Command parsing
└── data/               # JSON storage (created at runtime)
```

## Existing Patterns to Reuse

From the parent claude-team directory:

- IPC socket pattern: `claude-agents.{agentId}`
- Message format: `{from, content, timestamp}`
- Process registry: `/tmp/claude-agents/registry.json`
- Session storage: `~/.claude/agent-sessions.json`
- Command prefix: `#` for system, `@` for mentions

## Current Working Features

1. **Web Server**: Running on port 3456
   - REST APIs for agents, projects, teams
   - WebSocket for real-time updates
   - JSON file storage

2. **Basic UI Structure**:
   - TanStack Router setup
   - Three pages: Projects, Agents, Teams
   - Navigation working

## Next Steps (for the next developer)

1. **Continue with Stage 12**: Build the Projects Page UI components
   - Follow the prototype design
   - Connect to WebSocket for real-time updates
   - Implement Terminal component with xterm.js

2. **Key Components Needed**:
   - `ProjectsPage.tsx` - Main workspace
   - `AgentCard.tsx` - Shows agent status/tokens
   - `Terminal.tsx` - xterm.js integration
   - `MessageQueue.tsx` - Visual queue
   - `ChatPanel.tsx` - Input with @mentions

3. **Integration Notes**:
   - All WebSocket events are defined in `websocket.ts`
   - API endpoints have TODO comments showing where backend will connect
   - Use the integration map in `plan.md` section "Component Integration Map"

## Testing the Current Setup

```bash
# Terminal 1: Start the server
npm run server:dev

# Terminal 2: Start the React dev server
npm run dev

# Server runs on: http://localhost:3456
# React app runs on: http://localhost:5173
```

## Important Design Decisions

1. **UI-First Approach**: Building UI before backend to ensure good UX
2. **TanStack Router**: Chosen over React Router for better SSE support
3. **JSON Storage**: Starting simple, structured for SQLite migration
4. **Agent States**: ready → online → busy → offline
5. **Message Queue**: Visual display with ESC interrupt capability

## Common Pitfalls to Avoid

1. Don't copy files directly from prototype - use as reference only
2. Remember agent 'ready' state prevents auto-execution
3. WebSocket must handle reconnection gracefully
4. All file paths in APIs must use absolute paths
5. Process cleanup is critical - focus on this in Stage 2

## Questions Answered

- Q: Where are the actual agent implementations?
  A: Stages 2-9 implement the backend. Stage 11 only provides the API layer.

- Q: How do components integrate?
  A: See "Component Integration Map" in plan.md for detailed flow.

- Q: What files from claude-team should I reference?
  A: See "Reference to Existing Claude-Team Files" section in plan.md.

## Environment Setup

1. Copy `.env.example` to `.env`
2. Set `ANTHROPIC_API_KEY` when implementing agents
3. Default ports: 3456 (server), 5173 (React dev)

This context should give the next developer everything they need to continue. The most important files to read are plan.md and todo.md for the complete picture.
