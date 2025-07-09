# CLAUDE.md - Claude Studio Project Guide

This file provides guidance to Claude (claude.ai) when working with the Claude Studio codebase.

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

```javascript
// By role (legacy - still works)
invoke({ workflow: { role: 'dev', task: '...' } })

// By agentId (NEW - use short IDs)
invoke({ workflow: { agentId: 'dev_01', task: '...' } })

// Multi-agent workflows with dependencies
invoke({
  workflow: [
    { id: 'step1', agentId: 'dev_01', task: '...' },
    { id: 'step2', agentId: 'ux_01', task: '{step1.output}', deps: ['step1'] },
  ],
  projectId: 'your-project-id',
  threadId: 'workflow-123', // For resume functionality
})

// Complex parallel workflows (TESTED)
invoke({
  workflow: [
    { id: 'architecture', role: 'architect', task: 'Design system...' },
    { id: 'infrastructure', role: 'devops', task: 'Create deployment...' },
    {
      id: 'implementation',
      role: 'developer',
      task: 'Implement based on {architecture.output}',
      deps: ['architecture'],
    },
    {
      id: 'review',
      role: 'reviewer',
      task: 'Review {implementation.output} and {infrastructure.output}',
      deps: ['implementation', 'infrastructure'],
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
