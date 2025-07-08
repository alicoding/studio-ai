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
npm run type-check # Run TypeScript checks
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

- **@docs/standards/typescript.md** - NO 'any' policy, proper types
- **@docs/standards/api-patterns.md** - ky usage, error handling, path expansion
- **@docs/standards/components.md** - Modal patterns, form reset, memoization

## Studio Projects & Agents

### Agent Management

- **Short IDs**: Project agents use `{role}_{number}` format (e.g., `dev_01`, `ux_01`)
- **Project-Specific**: Each Studio project has its own agent instances
- **API**: Use `/api/studio-projects` endpoints (not legacy `/api/projects`)

### Invoke System

```javascript
// By role (legacy - still works)
invoke({ workflow: { role: 'dev', task: '...' } })

// By agentId (NEW - use short IDs)
invoke({ workflow: { agentId: 'dev_01', task: '...' } })

// Multi-agent workflows
invoke({
  workflow: [
    { id: 'step1', agentId: 'dev_01', task: '...' },
    { id: 'step2', agentId: 'ux_01', task: '{step1.output}', deps: ['step1'] },
  ],
})
```

## Important Notes

- Always test with `npm run lint` and `npm run type-check` before considering work complete
- Follow existing patterns in the codebase
- Use the built-in semantic search for all code search operations
- **Use MCP invoke tool for multi-agent workflows and complex coordinated tasks**
- Maintain backwards compatibility with existing features
- Document significant changes in relevant docs/ files
- **Server restart required** when changing API schemas or core services

## Contact

For questions or issues, create a GitHub issue or discuss in the project chat.
