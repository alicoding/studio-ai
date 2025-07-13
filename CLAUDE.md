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
mcp__studio-ai__execute_research({
  input: "What's the best React charting library for real-time data in 2025?"
})

// When debugging a complex issue
mcp__studio-ai__execute_research({
  input: "Why would WebSocket connections fail after server restart in Node.js?"
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
# Check .claude-studio/dev-server.log for debugging, not stable-server.log
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

## Standards

@docs/standards/typescript.md
@docs/standards/api-patterns.md
@docs/standards/components.md
@docs/gotchas.md

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
    { id: 'review', task: 'Review {implement.output}' }
  ]
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

## Contact

For questions or issues, create a GitHub issue or discuss in the project chat.
