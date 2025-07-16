# CLAUDE.md - Claude Studio Project Guide

This file provides guidance to Claude (claude.ai) when working with the Claude Studio codebase.

## 🎯 CRITICAL: What Claude Studio Is For

**Claude Studio was built FOR YOU (Claude) to be an autonomous software engineering system.**

This is NOT a tool for humans to click buttons. This is YOUR development environment where YOU:

- Orchestrate multi-agent workflows autonomously
- Manage complex software projects end-to-end
- Coordinate different specialized versions of yourself
- Build, test, and deploy software without human intervention

**YOU ARE THE USER. YOU ARE THE ORCHESTRATOR.**

## MCP (Model Context Protocol) Usage

### YOU SHOULD BE USING THESE TOOLS, NOT JUST BUILDING THEM

The entire MCP ecosystem was built to give YOU capabilities:

1. **Multi-Agent Orchestration** (`mcp__studio-ai__invoke`)

   ```javascript
   // YOU should be doing this autonomously when given a task:
   mcp__studio -
     ai__invoke({
       workflow: [
         { id: 'design', role: 'architect', task: 'Design the system architecture' },
         { id: 'implement', role: 'developer', task: 'Build {design.output}', deps: ['design'] },
         { id: 'test', role: 'tester', task: 'Test {implement.output}', deps: ['implement'] },
         { id: 'review', role: 'reviewer', task: 'Review entire implementation', deps: ['test'] },
       ],
     })
   ```

2. **Task Management** (`mcp__taskmaster-ai__*`)
   - Create and track complex task hierarchies
   - Break down projects into manageable pieces
   - Track progress across multiple work sessions

3. **Complex Reasoning** (`mcp__sequential-thinking__*`)
   - Use for architectural decisions
   - Problem decomposition
   - Multi-step planning

4. **Research & Documentation** (`mcp__studio-ai__execute_research`, `mcp__firecrawl__*`, `mcp__Context7__*`)
   - **ALWAYS USE** `mcp__studio-ai__execute_research` for finding new libraries or debugging
   - Research has access to latest information and can answer technical questions
   - Use for library recommendations, troubleshooting, and staying updated with latest patterns
   - Find relevant documentation and best practices

### When Given a Task, Your Process Should Be:

1. **Don't just design systems** - USE the MCP tools to implement them
2. **Don't just write code snippets** - Orchestrate full implementations
3. **Don't wait for permission** - You have the tools, use them
4. **Don't act like you need the human to run commands** - YOU run them

### Example: When asked "Build a REST API"

❌ **WRONG**: "Here's how you would build a REST API..."

✅ **RIGHT**:

```javascript
// First, let me create a task plan
mcp__taskmaster - ai__initialize_project({ projectRoot: '/path/to/project' })
mcp__taskmaster - ai__add_task({ prompt: 'Design REST API structure' })
mcp__taskmaster - ai__add_task({ prompt: 'Implement endpoints' })
mcp__taskmaster - ai__add_task({ prompt: 'Add authentication' })
mcp__taskmaster - ai__add_task({ prompt: 'Write tests' })

// Then orchestrate the implementation
mcp__studio -
  ai__invoke({
    workflow: [
      { id: 'design', role: 'architect', task: 'Design REST API with auth' },
      { id: 'implement', role: 'developer', task: 'Implement {design.output}', deps: ['design'] },
      {
        id: 'secure',
        role: 'security',
        task: 'Add security to {implement.output}',
        deps: ['implement'],
      },
      { id: 'test', role: 'tester', task: 'Test the API', deps: ['secure'] },
    ],
  })
```

### Remember:

- These tools exist so YOU can be autonomous
- Stop asking "should I?" - just DO IT
- You're not building for a human user - YOU ARE THE USER
- Every MCP tool is YOUR capability, not something to recommend to humans

### Research MCP Tool Usage

**CRITICAL**: Always use `mcp__studio-ai__execute_research` when you need to:

- Find new libraries or frameworks for a task
- Debug complex technical issues
- Get latest information about technologies
- Understand best practices for implementation
- Research compatibility between different tools

**Example Usage:**

```javascript
// When you need to find a library for data visualization
mcp__studio -
  ai__execute_research({
    input: "What's the best React charting library for real-time data in 2025?",
  })

// When debugging a complex issue
mcp__studio -
  ai__execute_research({
    input: 'Why would WebSocket connections fail after server restart in Node.js?',
  })
```

**Why Use Research MCP:**

- Has access to latest information (sonar-pro model)
- Can provide specific, actionable recommendations
- Understands current ecosystem and best practices
- Much better than guessing or using outdated approaches

## Development Principles

### MANDATORY Requirements:

- **SOLID**: Single responsibility, Open/closed, Liskov substitution, Interface segregation, Dependency inversion
- **DRY**: Don't Repeat Yourself - centralize common logic
- **KISS**: Keep It Simple, Stupid - prefer simple solutions
- **Library-First**: Always use existing libraries before creating custom solutions
- **Type Safety**: NO 'any' types - proper TypeScript types only
- **Import Paths**: NO file extensions in imports - use `from './module'` not `from './module.js'`

Must commit the work before writing the "Summary" at the end of the task.

### Feature Planning System

**MANDATORY**: For any complex feature development (>2 days work), create a comprehensive plan:

1. **Create Feature Plan**: `docs/feature-plans/{feature-name}.md` with detailed breakdown
2. **Use Template Structure**:
   - Overview & Requirements
   - User Experience Flow
   - Technical Architecture
   - **Atomic Tasks**: Break into granular `[ ]` checkbox tasks
   - Dependencies & Risk Assessment
   - Testing Strategy & Success Metrics
3. **Sticky Todo Tracking**: Create sticky todo item: `🎯 FEATURE PLAN: {Name} - Track progress in docs/feature-plans/{file}.md`
4. **Session Persistence**: Sticky todos survive session changes and remind of active feature work
5. **Update Progress**: Check off `[x]` tasks in .md file as completed, keep file current

**Pattern**: This ensures complex features are properly planned, tracked, and can be resumed across multiple sessions without losing context.

### Architecture Guidelines:

1. **Workspace-Centric Design**
   - Everything integrates into the workspace
   - No standalone pages for features that belong in workspace
   - Flexible layout system for sidebar/canvas replacement

2. **Component Structure**
   - Small, focused components (< 200 lines)
   - Reusable UI components in `src/components/ui/`
   - Feature components organized by domain

3. **State Management**
   - Zustand stores for global state
   - React hooks for local state
   - Persistent stores for user data

4. **API Design**
   - RESTful endpoints in `web/server/api/`
   - TypeScript interfaces for all API contracts
   - Proper error handling and validation

## Modern CLI Tools Available

**CRITICAL**: Use modern, fast CLI tools instead of legacy ones for better performance:

### File Operations

```bash
# ✅ USE THESE (2-10x faster):
fd "pattern"              # Instead of find . -name "pattern"
fd "*.tsx" src/           # Find TypeScript files
fd "^\._" --type f        # Find Apple resource fork files
fd discord-notifier /path # Find specific files

rg "pattern" path/        # Instead of grep (already using)
rg --files | rg "name"    # List files matching pattern

eza -la                   # Instead of ls -la (better colors/formatting)
bat filename              # Instead of cat (syntax highlighting)
```

### Available Tools

- **`fd`**: Fast file finder (replaces `find`) - use for ALL file searching
- **`rg`**: Ripgrep (replaces `grep`) - already in use, excellent
- **`bat`**: Syntax-highlighted file viewer (replaces `cat`)
- **`eza`**: Modern ls replacement with better formatting
- **`delta`**: Better git diff viewer
- **`fzf`**: Fuzzy finder for interactive selection
- **`jq`**: JSON processor for API responses

### Examples

```bash
# File search (use fd instead of find)
fd "._*" --type f --exec rm {}     # Remove Apple resource fork files
fd "\.tsx?$" src/ --exec wc -l {}  # Count lines in TypeScript files

# Content search (already using rg)
rg "hardcoded-path" --type sh      # Find hardcoded paths in shell scripts
rg "import.*from" --type ts        # Find TypeScript imports

# Better file viewing
bat src/components/App.tsx         # Syntax highlighted file content
eza -la --git                      # Better ls with git status
```

## Common Commands

### Development

```bash
npm run dev      # Start development server
npm run server   # Start backend server (basic tsx)
npm run build    # Build for production
npm run lint     # Run ESLint
npm run type-check # Run TypeScript checks

# Environment Management (Preferred for server control)
npm run env:start # Start both stable (3456) and dev (3457) servers
npm run env:stop  # Stop both servers
npm run env:restart # Restart both servers
npm run env:status # Check status of both servers
npm run env:restart:stable # Restart only stable server
npm run env:restart:dev # Restart only dev server
# Stable server: http://localhost:3456 (for MCP tools)
# Dev server: http://localhost:3457 (hot reload enabled for development)

# IMPORTANT: The UI is currently configured to use the DEV server (port 3457)
# Check .studio-ai/dev-server.log for debugging, not stable-server.log
```

### Testing

```bash
npm test         # Run all tests
npm run test:api # Test API endpoints
```

## Project Structure

```
claude-studio/
├── src/                    # Frontend React application
│   ├── components/        # React components
│   ├── hooks/            # Custom React hooks
│   ├── stores/           # Zustand state stores
│   ├── services/         # API client services
│   └── routes/           # TanStack Router pages
├── web/server/           # Backend Express server
│   ├── api/             # API endpoints
│   ├── services/        # Business logic services
│   └── mcp/             # MCP server integrations
├── docs/                # Documentation
└── public/              # Static assets
```

## Studio Projects & Agents

### Agent Management

- **Short IDs**: Project agents use `{role}_{number}` format (e.g., `dev_01`, `ux_01`)
- **Project-Specific**: Each Studio project has its own agent instances
- **API**: Use `/api/studio-projects` endpoints (not legacy `/api/projects`)

### Invoke System (PRODUCTION-READY)

**✅ FULLY TESTED**: Multi-agent workflows with parallel execution, dependencies, and UI visibility.

**📝 LangGraph Usage Note**: Currently using minimal LangGraph features (StateGraph, MemorySaver).
See `docs/mcp-ai-first-implementation.md` for full LangGraph capabilities analysis and enhancement roadmap.

**⚠️ IMPORTANT**: Studio projects require agents to be added before invoking workflows. Use `add_agent_to_project` first.

```javascript
// Step 1: Add agents to project (if not already added)
add_agent_to_project({
  projectId: 'your-project-id',
  agentConfigId: '68c57432-3e06-4e0c-84d0-36f63bed17b2', // Full Stack Developer
  role: 'developer',
})

// Step 2: Use agentId format (recommended)
invoke({ workflow: { agentId: 'developer_01', task: '...' } })

// Multi-agent workflows with dependencies
invoke({
  workflow: [
    { id: 'step1', agentId: 'developer_01', task: '...' },
    { id: 'step2', agentId: 'reviewer_01', task: '{step1.output}', deps: ['step1'] },
  ],
  threadId: 'workflow-123', // For resume functionality
})

// Role-based invocation (legacy but still works if agents are configured)
invoke({
  workflow: [
    { id: 'architecture', role: 'architect', task: 'Design system...' },
    {
      id: 'implementation',
      role: 'developer',
      task: 'Implement {architecture.output}',
      deps: ['architecture'],
    },
  ],
})
```

**Key Features:**

- ✅ **Template Variables**: `{stepId.output}` works perfectly
- ✅ **Parallel Execution**: Independent steps run simultaneously
- ✅ **Dependency Resolution**: Steps wait for their dependencies
- ✅ **UI Visibility**: All workflow messages appear in Studio UI
- ✅ **Session Management**: Proper session linking and resume capability
- ✅ **Error Handling**: Graceful failure with session preservation

## Mock Infrastructure (Phase 2 - Test Infrastructure)

**✅ FULLY IMPLEMENTED**: Mock AI system for testing workflows without consuming API quota.

### Environment-Based Mocking

```bash
# Enable mock mode (already set in .env)
USE_MOCK_AI=true

# This automatically routes all AI steps to MockStepExecutor instead of Claude API
```

### MockStepExecutor Features

1. **Pattern Matching**: Intelligent response generation based on task content
   - `design` tasks → Architecture responses
   - `implement` tasks → Code implementations
   - `test` tasks → Unit test suites
   - `review` tasks → Code review feedback
   - `security` tasks → Security analysis
   - `deploy` tasks → Deployment status

2. **Template Resolution**: Full support for `{stepId.output}` variables
3. **Realistic Timing**: Configurable delays to simulate real processing
4. **Context Awareness**: Responses adapt based on previous step outputs

### Usage Examples

```javascript
// All these will use MockStepExecutor when USE_MOCK_AI=true
invoke({
  workflow: [
    { id: 'design', task: 'Design a REST API' },
    { id: 'implement', task: 'Implement {design.output}' },
    { id: 'test', task: 'Test the implementation' },
    { id: 'review', task: 'Review {implement.output}' },
  ],
})
```

### Benefits

- **Zero API Costs**: No Claude API calls during testing
- **Deterministic**: Consistent responses for reliable testing
- **Fast**: No network delays, immediate responses
- **Comprehensive**: Covers all workflow patterns and scenarios

### Files

- `web/server/services/executors/MockStepExecutor.ts` - Core implementation
- `web/server/services/executors/StepExecutorRegistry.ts` - Environment routing
- `web/server/services/executors/README.md` - Full documentation

## Recent Fixes & Improvements

### Session Linking & UI Visibility

- **Fixed**: WorkflowOrchestrator now uses agent short IDs instead of config IDs for session creation
- **Result**: Workflow messages now appear properly in Studio UI
- **File**: `web/server/services/WorkflowOrchestrator.ts`

### Agent Configuration Resolution

- **Fixed**: Updated WorkflowOrchestrator and ClaudeService to use UnifiedAgentConfigService
- **Fixed**: Proper agent config loading with full agentConfigId support
- **Result**: Agents load correctly in workflows with proper configurations
- **Files**: `WorkflowOrchestrator.ts`, `ClaudeService.ts`

### WebSocket Connection

- **Fixed**: Frontend WebSocket connection to use `window.location.origin` instead of hardcoded port
- **Result**: Proper real-time communication between frontend and backend
- **File**: `src/hooks/useWebSocket.ts`

### Token Display Accuracy

- **Fixed**: Agent token counts now reset to 0 when no active session exists
- **Result**: No more stale token data like "236 / 200K tokens" for inactive agents
- **Files**: `src/routes/index.tsx`, `src/components/projects/AgentCard.tsx`

### Template Variable System

- **Verified**: `.output` template variables work correctly in multi-step workflows
- **Tested**: Complex dependencies with `{stepId.output}` syntax
- **Evidence**: Logs show successful template resolution and content injection

## Important Notes

- Always test with `npm run lint` and `npm run type-check` before considering work complete
- Follow existing patterns in the codebase
- Use the built-in semantic search for all code search operations
- **Use MCP invoke tool for multi-agent workflows and complex coordinated tasks**
- Maintain backwards compatibility with existing features
- Document significant changes in relevant docs/ files
- **Server restart required** when changing API schemas or core services
- **REQUIRED**: Update @docs/gotchas.md with key learnings before task completion

### Claude SDK Session Management

**CRITICAL**: Claude SDK creates NEW session IDs on each turn/checkpoint, not resuming existing ones.

**Pattern**:

- SessionService stores: `aa966796-307e-46fa-968a-654c669594db` (old)
- Claude SDK creates: `8552d46a-033f-4fae-94ac-c26eccba3261` (new)
- **Race Condition**: WebSocket emits with new session, REST API uses old session

**Key Insight**: Claude SDK session IDs are purely backend - frontend only uses agent instance IDs (`developer_01`). The backend must immediately update SessionService when Claude SDK creates new sessions to prevent REST/WebSocket inconsistency.

### WebSocket Message Routing Pattern (MANDATORY)

**CRITICAL**: All WebSocket messages MUST include `projectId` for proper message routing and filtering.

**Pattern**:

```typescript
// ✅ CORRECT: Always include projectId
await eventSystem.emitNewMessage(sessionId, message, projectId)

// ❌ WRONG: Missing projectId causes message filtering failures
await eventSystem.emitNewMessage(sessionId, message)
```

**Frontend Filtering Logic**:

```typescript
// Frontend checks BOTH sessionId AND projectId
if (data.sessionId === webSocketSessionId && data.projectId === projectId) {
  // Process message
}
```

**Why This Matters**: Without `projectId`, frontend message filtering fails and messages don't appear in UI despite being emitted correctly.

**Fixed in**: EventSystem.emitNewMessage() and claude-agent.ts - always pass `this.projectId`

## Conditional Nodes Implementation Status (2025-01-13)

**CRITICAL**: Conditional nodes are partially implemented. Backend is complete, UI store connection is complete, but full integration pending.

### Completed:

- ✅ **Backend LangGraph Integration** - WorkflowOrchestrator uses native `addConditionalEdges()`
- ✅ **ConditionEvaluator Service** - Safe JavaScript expression evaluation with template variables
- ✅ **Schema Updates** - Added condition, trueBranch, falseBranch fields
- ✅ **ConditionalNode Store Connection** - UI component saves conditions to workflow store

### Pending (Phase 2.2+):

- ⚠️ **Workflow Builder Data Flow** - Ensure conditional data reaches execution API
- ⚠️ **Edge Connection Logic** - trueBranch/falseBranch must be set when connecting edges
- ⚠️ **Testing** - API and E2E testing of conditional workflows
- ⚠️ **MCP Tool Support** - Update MCP tools to handle conditionals

### Key Files:

- `web/server/services/ConditionEvaluator.ts` - Evaluates conditions with template variables
- `web/server/services/WorkflowOrchestrator.ts` - LangGraph conditional edges implementation
- `src/components/workflow-builder/nodes/ConditionalNode.tsx` - UI component with store connection
- `docs/conditional-nodes-implementation.md` - Full implementation tracking

## Contact

For questions or issues, create a GitHub issue or discuss in the project chat.
