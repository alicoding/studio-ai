# Studio AI Architecture

## Tech Stack (Actual Versions)

### Frontend

- **React**: 19.1.0 (latest)
- **TypeScript**: 5.8.3
- **Vite**: 7.0.2 (build tool)
- **TanStack Router**: 1.122.0 (routing)
- **TanStack Query**: 5.83.0 (data fetching)
- **Zustand**: 5.0.6 (state management)
- **ReactFlow**: 12.3.7 (workflow visualization)
- **Tailwind CSS**: 4.1.11 (styling)
- **Socket.io Client**: 4.8.3 (real-time)

### Backend

- **Node.js**: Runtime environment
- **Express**: 5.1.0
- **TypeScript**: 5.8.3
- **Socket.io**: 4.8.3 (WebSocket)
- **better-sqlite3**: 12.0.0 (database)
- **tsx**: For TypeScript execution

### AI Integration

- **@anthropic-ai/sdk**: 0.56.0 (Claude API)
- **@anthropic-ai/claude-code**: 1.0.35
- **@langchain/langgraph**: 0.3.6 (workflow orchestration)
- **@langchain/core**: 0.3.61
- **@langchain/community**: 0.3.47

### Database

- **SQLite**: Primary database (local file: ~/.studio-ai/studio.db)
- **PostgreSQL**: Optional for LangGraph checkpointing (via langgraph-checkpoint-postgres)

## System Architecture

### Server Setup

- **Dual Server Architecture**:
  - **Stable Server** (port 3456): For MCP integration, production-like
  - **Dev Server** (port 3457): Hot reload for development
  - Both can run simultaneously via `npm run env:start`

### Database Schema

```sql
- migrations (track schema changes)
- workflow_approvals (human-in-the-loop approvals)
- approval_decisions (audit trail)
- approval_notifications (notification tracking)
```

### API Structure (29 endpoints)

```
/api/
├── Core Workflow
│   ├── invoke (async workflow execution)
│   ├── invoke-status (check workflow status)
│   └── workflow-graph (visual representation)
├── Project Management
│   ├── studio-projects (main project API)
│   └── claude-projects (legacy support)
├── Agent System
│   ├── agents (agent templates)
│   └── agent-roles (role configurations)
├── Approvals
│   └── approvals (human-in-the-loop)
├── Configuration
│   ├── settings (app settings)
│   ├── mcp-config (MCP configuration)
│   └── tool-permissions (agent permissions)
└── Utilities
    ├── health (system health)
    ├── storage (data management)
    └── messages (agent communication)
```

### MCP Integration

- **Location**: `/web/server/mcp/studio-ai/`
- **Protocol**: Model Context Protocol (MCP)
- **Transport**: StdioServerTransport
- **Features**:
  - Dynamic tool registration
  - Session management
  - Claude Code integration
  - Invoke API access

### Real-time Communication

- **WebSocket**: Socket.io for bi-directional communication
- **Redis Adapter**: For scaling across multiple servers
- **Event System**: Custom EventSystem for cross-server events
- **Sticky Sessions**: Ensures client consistency

### Workflow Engine

- **LangGraph**: Core orchestration engine
- **Node Types**:
  - Task Node (standard execution)
  - Loop Node (iteration support)
  - Parallel Node (concurrent execution)
  - Human Node (approval/input)
- **Executors**:
  - ClaudeStepExecutor (real AI execution)
  - MockStepExecutor (testing without API)
  - WebhookStepExecutor (external integrations)

### Frontend Architecture

- **Routing**: File-based with TanStack Router
- **State Management**:
  - Zustand for global state
  - TanStack Query for server state
  - Local storage persistence
- **UI Components**: Custom components with Radix UI primitives
- **Real-time Updates**: Socket.io integration for live agent communication

## Security & Design Decisions

### No Authentication

- Designed as a local development tool
- No user accounts or login system
- All data stored locally in SQLite
- Sessions are for AI agents, not users

### Local-First Design

- SQLite database in user's home directory
- No cloud dependencies for core features
- API keys stored in local .env file
- Can run entirely offline (with mock mode)

### Development Features

- `USE_MOCK_AI=true` for testing without API costs
- Deterministic mock responses
- Hot reload on dev server
- Comprehensive error handling
