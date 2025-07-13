# MCP AI-First Implementation Guide

## Current Status: Complete with System Prompt Support

**✅ Core MCP Functionality is Complete and Operational**

All essential MCP tools for agent and project management are implemented and working:

- Full CRUD operations for agents and projects
- Multi-agent workflow orchestration with dependencies
- Smart role resolution and short ID system
- Real-time UI updates
- Session management and recovery
- **System prompts now working correctly** (migrated to database-based UnifiedAgentConfigService)

**🚀 You can now manage everything through MCP with specialized agent behaviors!**

## Vision

Enable AI agents to configure and control Claude Studio directly through MCP (Model Context Protocol), allowing programmatic management of:

- Agent configurations ✓
- Tool access and permissions (partially complete)
- Workflow orchestration ✓
- System settings (partially complete)
- Resource allocation

This creates a self-configuring system where AI can optimize its own workspace based on task requirements.

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   AI Agents     │────▶│   MCP Server    │────▶│  Claude Studio  │
│                 │     │                 │     │                 │
│ • Orchestrator  │     │ • Config Tools  │     │ • API Layer     │
│ • Developer     │     │ • Query Tools   │     │ • Config Store  │
│ • Reviewer      │     │ • Update Tools  │     │ • UI Updates    │
│ • Tester        │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Key Components

1. **MCP Server** (`web/server/mcp/studio-config/`)
   - Exposes configuration tools to AI agents
   - Handles authentication and permissions
   - Validates configuration changes

2. **API Layer** (`web/server/api/config/`)
   - RESTful endpoints for configuration management
   - WebSocket support for real-time updates
   - Transaction support for atomic changes

3. **Configuration Store**
   - Persistent storage of all configurations
   - Version control for configuration changes
   - Rollback capabilities

## Implementation Plan

### Phase 1: Foundation ✓ COMPLETED

- [x] Create base MCP server structure
- [x] Implement authentication system (ENV-based)
- [x] Create configuration schema
- [x] Build basic API endpoints

### Phase 2: Core Tools ✓ COMPLETED

- [x] Agent configuration tools (list, create, update, delete)
- [x] Project management tools (list, get, add/remove agents)
- [x] Workflow orchestration tools (invoke with multi-agent support)
- [x] Query and update operations

### Phase 3: Integration ✓ COMPLETED

- [x] Connect MCP to Claude Studio backend
- [x] Implement real-time UI updates (WebSocket)
- [x] Add session management
- [x] Create agent short ID system (dev_01 format)

### Phase 4: Testing & Polish ✓ COMPLETED

- [x] Multi-agent workflow testing
- [x] PR review simulation testing
- [x] Template variable resolution testing
- [x] Performance optimization (basic)
- [x] Documentation updated
- [x] Error handling refinement
- [x] System prompt support verified

## Agent Roles and Responsibilities

### Orchestrator

**Never codes. Only delegates atomic tasks.**

- Breaks down complex requirements into atomic tasks
- Assigns tasks to appropriate agents
- Ensures all tasks align with vision
- Monitors overall progress
- Coordinates between agents

### Developer

**Implements atomic tasks following all principles.**

- Writes clean, SOLID code
- Follows DRY, KISS principles
- Uses existing libraries first
- Ensures type safety (no 'any' types)
- Creates unit tests for code

### Reviewer

**Ensures code quality and integration.**

- Validates SOLID principles adherence
- Checks for TypeScript errors
- Ensures proper error handling
- Verifies API contracts
- Reviews test coverage

### Tester

**Verifies functionality works as specified.**

- Executes manual testing scenarios
- Writes integration tests
- Validates edge cases
- Confirms UI behavior
- Tests rollback scenarios

## Task Management Process

### Task Creation

1. Orchestrator analyzes requirements
2. Creates atomic task with clear scope
3. Defines acceptance criteria
4. Assigns to appropriate agent

### Task Execution

1. Assigned agent claims task
2. Implements solution following principles
3. Creates tests for functionality
4. Marks task for review

### Task Verification

1. Reviewer checks code quality
2. Tester validates functionality
3. Issues reported back to developer
4. Cycle continues until approved

### Task Completion

1. All checks pass
2. Code merged to main branch
3. Documentation updated
4. Task marked complete

## API Endpoints Implemented

### Agent Management ✓

```
GET    /api/agents                     # List all agent configurations ✓
GET    /api/agents/:id                 # Get specific agent config ✓
POST   /api/agents                     # Create new agent ✓
PUT    /api/agents/:id                 # Update agent config ✓
DELETE /api/agents/:id                 # Remove agent ✓
```

### Studio Project Management ✓

```
GET    /api/studio-projects            # List all projects ✓
GET    /api/studio-projects/:id        # Get specific project ✓
POST   /api/studio-projects            # Create new project ✓
PUT    /api/studio-projects/:id        # Update project ✓
DELETE /api/studio-projects/:id        # Remove project ✓
GET    /api/studio-projects/:id/agents # List project agents ✓
POST   /api/studio-projects/:id/agents # Add agent to project ✓
DELETE /api/studio-projects/:id/agents/:agentRole # Remove agent from project ✓
```

### Workflow Orchestration ✓

```
POST   /api/invoke                     # Execute multi-agent workflow ✓
GET    /api/invoke/status/:threadId    # Check workflow status ✓
```

### Capabilities & Roles ✓

```
GET    /api/capabilities               # List AI capabilities ✓
POST   /api/capabilities/:id           # Execute capability ✓
```

### Not Yet Implemented

```
GET    /api/config/tools               # List available tools
PUT    /api/config/tools/:id/permissions # Update tool permissions
POST   /api/config/transactions        # Start transaction
POST   /api/config/transactions/:id/commit   # Commit changes
POST   /api/config/transactions/:id/rollback # Rollback changes
```

## Configuration Requirements

### Agent Configuration

```typescript
interface AgentConfig {
  id: string
  name: string
  role: 'orchestrator' | 'developer' | 'reviewer' | 'tester'
  capabilities: string[]
  toolAccess: string[]
  resourceLimits: {
    maxTokens: number
    maxRequests: number
    priority: number
  }
}
```

### Tool Permissions

```typescript
interface ToolPermission {
  toolId: string
  agentId: string
  permissions: {
    read: boolean
    write: boolean
    execute: boolean
  }
  restrictions?: {
    paths?: string[]
    operations?: string[]
  }
}
```

### Workflow Configuration

```typescript
interface WorkflowConfig {
  id: string
  name: string
  agents: string[]
  steps: WorkflowStep[]
  triggers: WorkflowTrigger[]
}
```

## Testing Scenarios

### Basic Configuration

1. Create new agent via MCP
2. Verify agent appears in UI
3. Update agent capabilities
4. Confirm UI reflects changes

### Complex Workflow

1. Create multi-agent workflow
2. Configure tool permissions
3. Execute workflow via MCP
4. Monitor progress in UI
5. Handle error scenarios

### Transaction Testing

1. Start configuration transaction
2. Make multiple changes
3. Rollback transaction
4. Verify original state restored

### Permission Boundaries

1. Attempt unauthorized access
2. Verify permission denied
3. Grant permission via MCP
4. Confirm access allowed

### Performance Testing

1. Bulk create 100 agents
2. Measure API response times
3. Test concurrent updates
4. Verify data consistency

## Resume Process

### Session Recovery

1. **Identify Last State**

   ```bash
   git log -1 --oneline
   git status
   ```

2. **Check Task Status**
   - Review TODO list in documentation
   - Check completed phases
   - Identify current task

3. **Verify System State**
   - Run tests to ensure stability
   - Check for TypeScript errors
   - Validate API endpoints

4. **Continue Work**
   - Pick up incomplete task
   - Follow role responsibilities
   - Update documentation

### Documentation Updates

- Mark completed tasks with ✓
- Update implementation notes
- Document any deviations
- Add learned insights

### Emergency Recovery

If system is broken:

1. Rollback to last stable commit
2. Review error logs
3. Identify breaking change
4. Fix and retest
5. Document issue and resolution

## Success Criteria

- [x] AI can create and configure agents via MCP ✓
- [x] Configuration changes reflect in UI immediately ✓
- [ ] All operations are transactional (partial)
- [x] Comprehensive error handling ✓
- [x] Multi-agent workflow coordination ✓
- [x] Template variable resolution ({stepId.output}) ✓
- [x] Performance meets basic requirements ✓
- [x] Core documentation is complete ✓
- [x] System supports project-based agent management ✓
- [x] Agents receive and use their configured system prompts ✓

## Completed MCP Tools

### Agent Management

- `list_agents` - List all agent configurations ✓
- `create_agent` - Create new agent configuration ✓
- `update_agent` - Update existing agent ✓
- `delete_agent` - Remove agent configuration ✓
- `get_agent_config` - Get specific agent details ✓

### Project Management

- `list_projects` - List all Studio projects ✓
- `create_project` - Create new project ✓
- `update_project` - Update project settings ✓
- `delete_project` - Remove project ✓
- `get_project` - Get project details ✓

### Agent-Project Integration

- `list_project_agents` - List agents in a project with short IDs ✓
- `add_agent_to_project` - Add single agent to project ✓
- `add_team_to_project` - Batch add agents from template ✓
- `remove_agent_from_project` - Remove agent from project ✓

### Workflow Orchestration

- `invoke` - Execute multi-agent workflows with dependencies ✓
- `get_roles` - Get available agent roles ✓

### AI Capabilities

- `list_capabilities` - List AI capabilities ✓
- `execute_*` - Execute specific capabilities (debugging, reasoning, research, deep-thinking) ✓

### MCP Configuration Management (NEW)

- `list_mcp_servers` - List all configured MCP servers ✓
- `add_mcp_server` - Add new MCP server configuration ✓
- `update_mcp_server` - Update existing MCP server ✓
- `delete_mcp_server` - Remove MCP server ✓
- `get_mcp_config` - Get configuration in Claude Code format ✓

## Key Achievements

1. **Multi-Agent Coordination**: Successfully implemented parallel and sequential workflow execution
2. **Template Variables**: Working {stepId.output} syntax for passing data between agents
3. **Session Management**: Proper session tracking and resume functionality
4. **Short ID System**: Implemented dev_01 format for better agent identification
5. **Real-time Updates**: WebSocket integration for live UI updates
6. **Double Escape Fix**: Resolved JSON serialization issues in MCP protocol
7. **MCP Configuration Management**: Full CRUD operations for MCP servers via MCP itself
8. **Template Variables**: Support for {PROJECT_ID}, {PROJECT_NAME}, {PROJECT_PATH}, {CLAUDE_STUDIO_API} in ENV
9. **System Prompt Support**: Migrated from file-based to database-based UnifiedAgentConfigService
10. **Agent Specialization**: Each agent now responds according to their configured role and system prompt

## LangGraph Integration Analysis

### Current vs Potential LangGraph Usage

Our current `WorkflowOrchestrator` implementation uses only a minimal subset of LangGraph's capabilities. Based on comprehensive research, here's what we're missing:

#### Currently Using (Minimal):

- ✅ `StateGraph` for basic workflow construction
- ✅ `MemorySaver` for in-memory checkpointing
- ✅ `Annotation.Root` for state type safety
- ✅ Basic node execution and edge connections

#### Available but Not Used (Full LangGraph Power):

1. **Advanced State Management**
   - `getState()`, `getStateHistory()` for state inspection
   - `updateState()` for manual state modification
   - Time travel with checkpoint navigation
   - Fork execution from past states

2. **Robust Error Handling**
   - Built-in `RetryPolicy` with exponential backoff
   - Node-level retry configuration
   - Error routing patterns
   - Graceful failure recovery

3. **Streaming & Progress**
   - Multiple streaming modes (values, updates, messages, custom, debug)
   - `StreamWriter` for custom progress updates
   - Real-time token streaming from LLMs
   - Structured streaming data

4. **Human-in-the-Loop**
   - `interrupt()` for approval workflows
   - Breakpoints for debugging
   - State modification during pause
   - Interactive decision points

5. **Advanced Routing**
   - `add_conditional_edges()` for dynamic branching
   - Multi-condition routing
   - Parallel execution paths
   - Complex decision trees

6. **Modular Workflows**
   - Subgraphs for reusable components
   - Nested workflow execution
   - Shared/independent state schemas
   - State transformation between graphs

7. **Production Persistence**
   - `SqliteSaver` for file-based storage
   - `PostgresSaver` for database persistence
   - Custom backend implementations
   - Distributed state management

### Recommendation: Incremental Enhancement

Rather than a complete rewrite, we should incrementally enhance our WorkflowOrchestrator:

1. **Phase 1: Immediate Improvements**
   - Add retry policies to reduce failures
   - Implement proper state inspection for debugging
   - Add streaming for better progress visibility

2. **Phase 2: Advanced Features**
   - Conditional routing for smarter workflows
   - Subgraphs for modular agent teams
   - PostgreSQL persistence for production

3. **Phase 3: Full Integration**
   - Human-in-the-loop for critical decisions
   - Time travel for workflow debugging
   - Custom streaming for rich UI updates

## Next Steps

The core MCP functionality is now complete and operational. Here are the immediate next steps:

### 1. ENV Template Variables (Critical for MCP Context) ✓ COMPLETED

- [x] Design ENV template variable syntax (using `{PROJECT_ID}` format) ✓
- [x] Update MCP settings UI to support template variables ✓
- [x] Implement variable resolution when launching MCP servers ✓
- [x] Test with dynamic project switching ✓

### 2. Tool Permission Management ✓ COMPLETED

- [x] Design permission model for fine-grained tool access ✓
- [x] Create tool permission system with ToolPermission interface ✓
- [x] Implement permission UI in Studio with ToolPermissionEditor ✓
- [x] Add permission presets for different roles ✓
- [x] Update all UI components to use new permission system ✓
- [x] Ensure DRY principles with centralized AgentConfig interface ✓

### 3. Enhanced LangGraph Integration

- [ ] Add RetryPolicy to WorkflowOrchestrator for automatic retries
- [ ] Implement streaming modes for real-time progress updates
- [ ] Add conditional edges for dynamic workflow routing
- [ ] Upgrade to PostgresSaver for production persistence
- [ ] Add state inspection tools for debugging workflows

### 4. Transaction Support

- [ ] Implement transaction API for atomic configuration changes
- [ ] Add rollback capability for failed operations
- [ ] Create transaction UI indicators
- [ ] Test with complex multi-step configurations

## Remaining Work

### Completed ✓

- [x] Implement `create_project` MCP tool ✓
- [x] Add smart role resolution (use role if only one agent matches) ✓
- [x] Update UI to show agent short IDs in workspace ✓
- [x] Add ENV template variable support to MCP settings UI ✓
- [x] Update Studio to pass dynamic ENV when launching MCP ✓
- [x] Create MCP tools for managing MCP server configurations ✓
- [x] Migrate to database-based UnifiedAgentConfigService ✓
- [x] Fix agent system prompt support ✓

### Medium Priority

- [x] Implement tool permission management API ✓
- [ ] Add transaction support for configuration changes
- [ ] Create rollback mechanism for failed operations
- [ ] Performance optimization for bulk operations
- [ ] Complete API documentation for all endpoints

### Nice to Have

- [ ] Resource allocation and limits per agent
- [ ] Agent capability discovery
- [ ] Workflow templates and presets
- [ ] Advanced monitoring and metrics
- [ ] Auto-scaling based on workload

## Notes

- Always follow SOLID, DRY, KISS principles
- No 'any' types in TypeScript
- Library-first approach
- Test everything
- Document changes
- Keep it simple but comprehensive
