# CLAUDE.md - Claude Studio Project Guide

This file provides guidance to Claude (claude.ai) when working with the Claude Studio codebase.

## Project Overview

Claude Studio is a professional web-based development environment that aims to replace VSCode + Terminal. It provides:

- Workspace-integrated semantic code search
- Project management with agent coordination
- Multi-tab chat interface with AI agents
- Flexible workspace layout system
- Session persistence and recovery

## Code Search Instructions

This project has a built-in semantic search implementation for fast code search.

### When searching for code:

1. **Use the workspace search**: The search feature is integrated into the workspace sidebar
2. **Semantic queries work best**: Instead of searching for exact function names, describe what the code does
3. **Check index status**: Use the "Check Status" button to see how many files are indexed
4. **Re-index when needed**: Click "Re-index Project" to rebuild the search index

### Examples:

- Instead of: "find handleClick function"
- Use search with query: "click event handler"

- Instead of: grep or file searching
- Use search with descriptive queries like "authentication logic" or "database connection setup"

### How it works:

The search uses ElectronHub embeddings to create semantic vectors of your code, enabling natural language queries to find relevant functions and classes.

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

## Current Focus Areas

@IMPLEMENTATION.todo.md

1. **Semantic Search Integration** (Phase 1) ✅
   - ElectronHub embeddings integration
   - Workspace-integrated search UI
   - Project-specific indexing

2. **Code Editor Integration** (Phase 2) 🚧
   - Monaco or CodeMirror selection
   - Syntax highlighting
   - Search result preview

3. **Terminal & Git Integration** (Phase 3) 📋
   - In-Studio terminal
   - Git operations UI
   - File management

4. **AI Development Modes** (Phase 4) 📋
   - Autopilot mode
   - Guided development
   - Code review workflow

## Important Notes

- Always test with `npm run lint` and `npm run typecheck` before considering work complete
- Follow existing patterns in the codebase
- Use the built-in semantic search for all code search operations
- Maintain backwards compatibility with existing features
- Document significant changes in relevant docs/ files

## Testing Approach

1. **Integration Tests**: Test real API endpoints with actual server
2. **Component Tests**: Test UI components in isolation
3. **E2E Tests**: Test complete user workflows
4. **Manual Testing**: Always manually verify UI changes

## Contact

For questions or issues, create a GitHub issue or discuss in the project chat.