# CLAUDE.md - Claude Studio Project Guide

This file provides guidance to Claude (claude.ai) when working with the Claude Studio codebase.

## Development Principles

### MANDATORY Requirements:
- **SOLID**: Single responsibility, Open/closed, Liskov substitution, Interface segregation, Dependency inversion
- **DRY**: Don't Repeat Yourself - centralize common logic
- **KISS**: Keep It Simple, Stupid - prefer simple solutions
- **Library-First**: Always use existing libraries before creating custom solutions
- **Type Safety**: NO 'any' types - proper TypeScript types only

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
npm run server   # Start backend server
npm run build    # Build for production
npm run lint     # Run ESLint
npm run typecheck # Run TypeScript checks
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


## MCP Studio AI Invoke Tool

**PRODUCTION-READY**: Multi-agent workflows with coordination, dependencies, and resume functionality.

### Quick Usage
```javascript
// Single agent task
const response = await invoke({
  workflow: { role: "dev", task: "Create a hello world function" }
})

// Multi-agent workflow with dependencies
const response = await invoke({
  workflow: [
    { id: "architect", role: "orchestrator", task: "Design system architecture" },
    { id: "implement", role: "dev", task: "Implement {architect.output}", deps: ["architect"] }
  ],
  threadId: "my-workflow-123"  // For resume functionality
})
```

### Key Features
- **Context-Aware Operator**: Evaluates outputs based on role/task context (no hardcoded keywords)
- **Dependency Resolution**: Template variables like `{stepId.output}` work correctly
- **Session Management**: Automatic resume with same `threadId`
- **Abort Handling**: Graceful shutdown with session preservation
- **1-Hour Timeout**: Supports long-running Claude Code operations

### API Endpoints
- `POST /api/invoke` - Execute workflows
- `POST /api/invoke/status/:threadId` - Query workflow state for resume
- `GET /api/operator/config` - Check operator configuration
- `POST /api/operator/test` - Test operator evaluation

### Documentation
- **Production Guide**: `docs/mcp-invoke-production-guide.md` - Complete usage guide
- **Examples**: `docs/mcp-invoke-examples.md` - Real-world workflow patterns
- **Troubleshooting**: `docs/mcp-invoke-troubleshooting.md` - Debug common issues

### Tested Scenarios (100% Success Rate)
- Sequential code development workflows
- Parallel feature development with coordination
- Code review and refactoring workflows
- Complex multi-developer coordination (up to 12 steps)
- Session resume and abort handling
- Long-running operations (tested up to 1 hour)

**Ready for dogfooding in production environments.**

## Important Notes

- Always test with `npm run lint` and `npm run typecheck` before considering work complete
- Follow existing patterns in the codebase
- Use the built-in semantic search for all code search operations
- **Use MCP invoke tool for multi-agent workflows and complex coordinated tasks**
- Maintain backwards compatibility with existing features
- Document significant changes in relevant docs/ files

## Testing Approach

1. **Integration Tests**: Test real API endpoints with actual server
2. **Component Tests**: Test UI components in isolation
3. **E2E Tests**: Test complete user workflows
4. **Manual Testing**: Always manually verify UI changes

## Contact

For questions or issues, create a GitHub issue or discuss in the project chat.