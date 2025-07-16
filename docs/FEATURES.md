# Studio AI Features

## Working Features ✅

### Core Platform

- **MCP Integration**: Custom MCP server for Claude Code integration
- **LangGraph Orchestration**: Multi-step workflow execution with dependencies
- **Real-time Communication**: WebSocket via Socket.io for live agent updates
- **SQLite Database**: Local storage for workflows, approvals, and sessions
- **Mock Mode**: Test workflows without API costs (`USE_MOCK_AI=true`)

### API Endpoints (29 total)

- **Workflow Execution**: `/api/invoke` with async execution
- **Project Management**: `/api/studio-projects` for project CRUD
- **Agent Management**: `/api/agents` and `/api/agent-roles`
- **Approval System**: `/api/approvals` for human-in-the-loop
- **Configuration**: `/api/settings`, `/api/mcp-config`, `/api/tool-permissions`
- **Messaging**: `/api/messages` for agent communication
- **Health Check**: `/api/health` for system status

### Frontend Pages (Working)

#### `/` - Dashboard

- Project overview and quick access
- Recent activity display
- Navigation to workspaces and workflows

#### `/workspace/$projectId` - Agent Workspace

- Real-time agent communication monitoring
- Split-view for multiple agents
- Direct chat interface with agents
- Project-specific workflow management

#### `/projects` - Project Management

- Create new projects with folder structure
- CLAUDE.md configuration for projects
- Git repository initialization
- Project import/export capabilities
- Agent assignment to projects

#### `/agents` - Agent Templates

- Create specialized agent roles (Architect, Developer, Tester, etc.)
- Configure system prompts and personalities
- Set tool permissions per agent
- Save and reuse agent configurations

#### `/teams` - Team Management

- Combine agents into reusable teams
- Team template creation and sharing
- Pre-configured agent groups

#### `/workflows` - Workflow Builder

- Visual workflow creation with React Flow
- Drag-and-drop node interface
- Workflow saving and loading
- Template management

#### `/approvals` - Approval Management

- Human-in-the-loop approval interface
- Approval history and audit trail
- Multi-project approval consolidation
- Risk assessment display

#### `/settings` - Configuration

- **AI Tab**: Configure AI providers and models
- **MCP Tab**: Manage MCP servers and tools
- **Hooks Tab**: Pre/post tool execution hooks
- **System Tab**: General application settings

### Workflow Nodes (Implemented)

#### Task Node

- Standard step execution
- Success/failure handling
- Event emission for real-time updates
- Template variable support (`{stepId.output}`)

#### Human Node (Fully Functional)

- **Approval Mode**: Requires human approval to proceed
- **Notification Mode**: Notifies human but continues automatically
- **Input Mode**: Requests human input before proceeding
- **Timeout Handling**: Configurable timeout behaviors
- **Risk Assessment**: Low/Medium/High/Critical risk levels
- **Database Tracking**: Full audit trail in SQLite

#### Loop Node (Functional)

- Executes steps for each item in a list
- Variable substitution with `{loopVar}`
- Iteration result tracking
- Configurable max iterations

#### Parallel Node (Functional)

- Concurrent execution of multiple steps
- `Promise.allSettled` for parallel processing
- Result aggregation from all parallel steps
- Fail-fast behavior option

### Development Features

- **Dual Server Setup**: Stable (3456) and Dev (3457) servers
- **Hot Reload**: Development server with live updates
- **TypeScript**: Full type safety throughout
- **ESLint/Prettier**: Code quality and formatting
- **Environment Management**: Scripts for server lifecycle

## In Progress 🚧

### Conditional Nodes

- Backend partially implemented with LangGraph
- UI components exist but not fully connected
- Condition evaluation service ready

### Workflow Persistence

- UI state management improvements needed
- Node positioning synchronization issues
- Global vs project workflow separation

## Known Issues ⚠️

### Workflow Builder

- Node positioning can be laggy during editing
- Edge dragging between nodes occasionally buggy
- UI state doesn't always sync with backend immediately

### General

- Chat interface needs better formatting support
- Some settings pages have unused legacy components
- Global workflows incorrectly require projectId (DRY violation)

## Not Implemented ❌

### Authentication

- No user accounts or login system
- Designed for local single-user development
- No password protection or access controls

### Multi-Agent Support

- Only Claude Code currently supported
- Gemini CLI integration planned
- No support for other AI agents yet

### Cloud Features

- No cloud deployment options
- No multi-user collaboration
- No remote workflow execution

### Advanced Workflow Features

- No scheduled/cron workflows
- No workflow marketplace
- No community node sharing
- No advanced monitoring/analytics
