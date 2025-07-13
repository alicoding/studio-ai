# Agent Mention System Implementation Plan

This document tracks the implementation of the agent mention/message system that allows natural team communication through MCP invoke.

## Core Principles

- **KISS**: Simple agent IDs like `dev_01` instead of UUIDs
- **DRY**: Reuse existing project agent infrastructure
- **SOLID**: Each component has single responsibility
- **Library-First**: Use existing libraries, no custom implementations

## Key Architecture Decisions (Updated)

### 1. Studio Projects vs Anthropic Conversations

- **Studio Projects**: Explicitly created projects in Claude Studio
- **Anthropic Conversations**: Folders in ~/.claude/projects (just conversation history)
- These are completely separate concepts - no auto-import or domain mixing

### 2. MCP Context via Environment Variables

Studio passes context when launching MCP:

- `CLAUDE_STUDIO_PROJECT_ID`: Current Studio project
- `CLAUDE_STUDIO_WORKSPACE`: Project workspace path
- `CLAUDE_STUDIO_AGENT_ID`: The agent making the call
- `CLAUDE_STUDIO_SESSION_ID`: Current session
- `CLAUDE_STUDIO_API`: API endpoint

This eliminates the need for:

- Long project ID parameters
- Path-to-ID conversions
- Guessing the caller's context

### 3. MCP is Studio-Specific

- The studio-ai MCP is specifically for Studio operations
- General-purpose features should be separate MCPs
- Assumes Studio infrastructure exists

## Implementation Checklist

### Phase 1: MCP Tools for Project Agent Management

#### 1.1 List Project Agents ✅ COMPLETED

- [x] Test existing `/api/projects/:id/agents` endpoint
- [x] Create MCP tool: `list_project_agents`
- [x] Return format includes short IDs (e.g., `dev_01`)
- [x] Test with API first
- [x] Update to use ENV context (no path conversion)
- [x] Test with MCP after restart - WORKING ✅

#### 1.2 Add Agent to Project ✅ COMPLETED

- [x] Test existing `/api/studio-projects/:id/agents` endpoint
- [x] Create MCP tool: `add_agent_to_project`
- [x] Support custom naming
- [x] Auto-generate short IDs
- [x] Test with API first
- [x] Test with MCP after restart - WORKING ✅

#### 1.3 Add Team to Project ✅ COMPLETED

- [x] Test existing `/api/teams` endpoint
- [x] Test batch add through projects API
- [x] Create MCP tool: `add_team_to_project`
- [x] Batch add all agents from team
- [x] Auto-generate short IDs for each
- [x] Test with API first
- [x] Test with MCP JSON-RPC after restart - WORKING ✅

#### 1.4 Remove Agent from Project ✅ COMPLETED

- [x] Test existing remove endpoint
- [x] Create MCP tool: `remove_agent_from_project`
- [x] Remove by role (agent instance)
- [x] Test with API first
- [x] Test with MCP JSON-RPC after restart - WORKING ✅

### Phase 2: Short Agent ID System

#### 2.1 ID Generation

- [ ] Design ID format: `{role}_{number}`
- [ ] Implement ID generation in ProjectService
- [ ] Ensure uniqueness per project
- [ ] Store mapping: short ID → instance ID
- [ ] Test ID generation

#### 2.2 ID Resolution

- [ ] Add method to resolve short ID to instance ID
- [ ] Update ClaudeService to accept short IDs
- [ ] Maintain backward compatibility
- [ ] Test resolution logic

### Phase 3: Update Invoke System

#### 3.1 Accept Agent ID in Invoke

- [ ] Update invoke schema to accept `agentId`
- [ ] Update WorkflowOrchestrator to use `agentId`
- [ ] Maintain backward compatibility with `role`
- [ ] Test with API
- [ ] Test with MCP

#### 3.2 Smart Role Resolution

- [ ] If role provided and only one agent matches, use it
- [ ] If multiple agents match, return helpful error
- [ ] List available agent IDs in error message
- [ ] Test resolution logic

### Phase 4: UI Updates

#### 4.1 Display Short IDs

- [ ] Update workspace to show short IDs
- [ ] Format: "Agent Name (dev_01)"
- [ ] Update agent cards
- [ ] Test UI display

### Phase 5: End-to-End Testing

#### 5.1 Complete Workflow Test

- [ ] Create new project
- [ ] List agents (should be empty)
- [ ] Add team to project
- [ ] List agents (should show team with short IDs)
- [ ] Invoke by short ID
- [ ] Verify UI shows real-time updates
- [ ] Test resume with same short ID
- [ ] Test error cases

## Testing Strategy

### API Testing First

Always test the API endpoint directly before implementing MCP tools:

```bash
# Example API test
curl -X GET http://localhost:3456/api/projects/claude-studio/agents
```

### MCP Testing Second

After API works, implement MCP tool and test:

1. Implement MCP tool
2. Ask user to restart MCP
3. Test MCP tool functionality
4. Verify response format

## Current Status

- **Started**: 2025-01-07
- **Current Phase**: Phase 1.1 - List Project Agents
- **Next Step**: Update list_project_agents to use ENV context instead of path conversion

## Implementation Notes

### Phase 0: Prerequisites (HIGH PRIORITY)

#### 0.1 Dynamic Environment Variable System

- [x] Create API endpoint to launch Claude with custom ENV vars
- [x] Support template variables in ENV configuration
- [x] Pass context when launching Claude:
  - `CLAUDE_STUDIO_PROJECT_ID`
  - `CLAUDE_STUDIO_WORKSPACE`
  - `CLAUDE_STUDIO_AGENT_ID`
  - `CLAUDE_STUDIO_SESSION_ID`
  - `CLAUDE_STUDIO_API`
- [x] Test API endpoint (working on dev server)
- [x] Update existing MCP tools to use ENV context
  - Updated `list_project_agents` to use `CLAUDE_STUDIO_PROJECT_ID`
  - Updated `invoke` to use `CLAUDE_STUDIO_PROJECT_ID`
- [ ] Test ENV propagation to MCP servers after restart

#### 0.2 Studio Project Management

- [ ] Design Studio Project creation flow
- [ ] Implement Studio Project API endpoints
- [ ] Separate from Anthropic conversation folders

#### 0.3 CLAUDE.md Management System

- [x] Create API endpoints to manage CLAUDE.md files:
  - GET /api/settings/claude-instructions?scope={all|global|project|local}
  - PUT /api/settings/claude-instructions {scope, content, projectPath}
- [x] Automatic gitignore for CLAUDE.local.md
- [x] No MCP tools needed - Claude can already read/write files directly (KISS!)
- [ ] Follow the same precedence as settings.json:
  1. Local project instructions (highest priority)
  2. Shared project instructions
  3. User global instructions
- [ ] Add UI in Studio to edit these files

### Updated Approach for list_project_agents

```typescript
// Before: Path conversion (incorrect approach)
const cwd = process.cwd()
projectId = cwd.startsWith('/') ? cwd.replace(/\//g, '-') : '-' + cwd.replace(/\//g, '-')

// After: Use ENV context
const projectId = args.projectId || process.env.CLAUDE_STUDIO_PROJECT_ID
const callerId = process.env.CLAUDE_STUDIO_AGENT_ID // Know who's calling!
```

### UI Template Variables for MCP Settings

Support variables in ENV configuration:

- `{projectId}` - Current Studio project ID
- `{workspace}` - Project workspace path
- `{agentId}` - ID of the agent using this MCP
- `{sessionId}` - Current session ID
- `{apiUrl}` - Studio API endpoint
