# Studio AI Codebase Audit Report

## 1. Tech Stack & Versions

### Frontend

- **React**: ^19.1.0 (latest version)
- **TypeScript**: ^5.8.3
- **Vite**: ^7.0.4 (build tool)
- **TanStack Router**: ^1.122.0 (routing)
- **TanStack Query**: ^5.83.0 (data fetching)
- **Zustand**: ^5.0.6 (state management)
- **ReactFlow**: ^11.11.4 (workflow builder UI)
- **Tailwind CSS**: ^4.0.0 (styling)
- **Socket.io-client**: ^4.8.1 (real-time communication)

### Backend

- **Node.js**: Express ^5.1.0
- **TypeScript**: ^5.8.3
- **Socket.io**: ^4.8.1 (WebSocket server)
- **Better-SQLite3**: ^12.2.0 (primary database)
- **PostgreSQL**: ^8.16.3 (for workflow checkpointing)
- **Redis**: ^5.6.0 (cross-server communication)
- **Drizzle ORM**: ^0.44.2 (database ORM)

### AI/Agent Infrastructure

- **Anthropic Claude SDK**: ^0.56.0
- **Anthropic Claude Code**: ^1.0.35
- **LangChain**: ^0.3.29
- **LangGraph**: ^0.3.6 (workflow orchestration)
- **OpenAI SDK**: ^5.8.2 (additional AI support)

## 2. API Endpoints

The backend exposes the following API endpoints (all under `/api/`):

### Core Agent/AI Endpoints

- `/agents` - Agent management
- `/agent-roles` - Agent role configuration
- `/invoke` - Execute single/multi-agent workflows
- `/invoke-status` - Get workflow execution status
- `/ai` - Direct AI interactions
- `/operator` - Operator mode functionality

### Project Management

- `/studio-projects` - Studio project management
- `/claude-projects` - Claude project integration
- `/teams` - Team management

### Workflow System

- `/workflows/*` - Workflow CRUD operations
- `/workflow-graph` - Workflow visualization
- `/approvals` - Human-in-the-loop approvals

### Storage & State

- `/messages` - Message history
- `/messages-batch` - Batch message operations
- `/session-search` - Search through sessions
- `/storage` - File storage operations

### Configuration

- `/settings` - General settings
- `/settings-mcp` - MCP server settings
- `/mcp-config` - MCP configuration
- `/tool-permissions` - Tool permission management
- `/tools` - Available tools

### System

- `/health` - Health check
- `/system` - System information
- `/screenshot` - Screenshot capture
- `/api-docs` - Swagger documentation
- `/workspace` - Workspace management

## 3. Database

### Primary Database: SQLite

- **Location**: `~/.studio-ai/studio.db`
- **Features**: WAL mode, foreign keys enabled
- **Tables**:
  - `migrations` - Database migration tracking
  - `workflow_approvals` - Human approval requests
  - `approval_decisions` - Audit trail
  - `approval_notifications` - Notification tracking

### Secondary Database: PostgreSQL

- **Purpose**: Workflow checkpointing (LangGraph)
- **Connection**: `postgresql://claude:development_password@127.0.0.1:5432/claude_studio`
- **Schema**: `workflow_checkpoints`
- **Usage**: Optional (controlled by `USE_POSTGRES_SAVER`)

## 4. MCP (Model Context Protocol) Integration

### MCP Server Location

`/web/server/mcp/studio-ai/`

### Available MCP Tools

- **Agent Tools**: Agent configuration and management
- **Capability Tools**: System capability discovery
- **Invoke Tools**: Workflow invocation
- **MCP Config Tools**: MCP server configuration
- **Project Tools**: Project management
- **Tool Permission Tools**: Permission management
- **Workflow Builder Tools**: Visual workflow building

### MCP Server Features

- Runs as separate process
- Can be accessed via stable server (port 3456)
- Provides programmatic access to all Studio AI features

## 5. Frontend Pages

### Main Routes

- `/` - Main workspace/dashboard
- `/agents` - Agent management
- `/projects/*` - Project views
- `/workflows/*` - Workflow builder and execution
- `/approvals/*` - Approval management
- `/teams` - Team management
- `/settings` - Settings page
- `/storage` - File storage browser
- `/session-search` - Search sessions
- `/workspace/{projectId}` - Project-specific workspace

### Workflow Routes

- `/workflows/new` - Create new workflow
- `/workflows/{workflowId}/edit` - Edit workflow
- `/workflows/{threadId}` - View workflow execution

## 6. Workflow System

### Status: FUNCTIONAL

- **LangGraph Integration**: ✅ Fully implemented
- **Multi-agent orchestration**: ✅ Working
- **Parallel execution**: ✅ Supported
- **Dependencies**: ✅ Working
- **Template variables**: ✅ `{stepId.output}` syntax works
- **Visual builder**: ✅ ReactFlow-based UI
- **Persistence**: ✅ PostgreSQL checkpointing

### Control Flow Nodes

- **Conditional**: ⚠️ Backend partially implemented
- **Parallel**: ⚠️ UI exists but backend returns mock
- **Loop**: ⚠️ UI exists but backend returns mock

## 7. Agent System

### Status: FUNCTIONAL

- **Claude SDK Integration**: ✅ Working
- **Agent Types**: Developer, Architect, Reviewer, etc.
- **Short IDs**: `{role}_{number}` format (e.g., `dev_01`)
- **Project-specific agents**: ✅ Each project has own agents
- **Tool permissions**: ✅ Configurable per agent
- **Session management**: ✅ Full session tracking

## 8. WebSocket/Real-time

### Status: FUNCTIONAL

- **Socket.io server**: ✅ Running on same port as HTTP
- **Redis adapter**: ✅ For cross-server communication
- **Event types**:
  - New messages
  - Workflow updates
  - Status changes
  - Approval requests
- **Frontend integration**: ✅ useWebSocket hook

## 9. Authentication

### Status: NOT IMPLEMENTED

- **Schema exists**: `auth-database.sql` with users table
- **bcrypt dependency**: ✅ Installed
- **Implementation**: ❌ No auth middleware or endpoints
- **Current state**: Open access, no authentication required

## 10. Current State vs Placeholder/Mock

### Fully Functional ✅

- Multi-agent workflow execution
- Agent management and configuration
- Project management
- WebSocket real-time updates
- Message history and sessions
- File storage operations
- MCP server integration
- Workflow builder UI
- Human approval system
- Tool permission management

### Partially Functional ⚠️

- Control flow nodes (Conditional, Parallel, Loop) - UI only
- Conditional nodes - backend started but not connected
- Authentication schema exists but not implemented

### Mock/Testing Mode 🧪

- `USE_MOCK_AI=true` in .env enables mock executor
- MockStepExecutor provides deterministic responses
- Useful for testing without API costs

### Environment Status

- **Development servers**: Both stable (3456) and dev (3457) configured
- **Redis**: Required for cross-server WebSocket
- **PostgreSQL**: Required for workflow persistence
- **Frontend**: Points to port 3457 (dev server) by default

## Summary

Studio AI is a **functional multi-agent orchestration system** built for autonomous software development. The core workflow engine, agent management, and real-time features are fully implemented and working. The system uses modern tech stack with proper separation of concerns.

Key strengths:

- Solid workflow orchestration with LangGraph
- Real multi-agent capabilities
- Good developer experience with hot reload
- Comprehensive API surface
- MCP integration for extensibility

Areas needing work:

- Authentication system not implemented
- Some control flow nodes need backend implementation
- Documentation could be more comprehensive

The codebase follows SOLID principles with good separation of concerns and uses established libraries rather than reinventing wheels.
