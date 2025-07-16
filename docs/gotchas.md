# Claude Studio Gotchas

## Current Critical Issues (2025-07-16)

### Control Flow Nodes - Non-Functional Backends ⚠️

- **Problem**: Parallel and Loop nodes have functional UI but backend only returns mock strings
- **Impact**: Workflows appear to work but don't execute as expected
- **Files**: `web/server/services/WorkflowNodeFactory.ts` lines 197-202 (parallel), 136-137 (loop)
- **Solution**: Replace simulation with real LangGraph execution patterns
- **Status**: In progress - see `/docs/feature-plans/control-flow-nodes-enhancement.md`

### Human Node Interaction Types - Production Ready ✅

- **Solution**: Full interaction type system implemented with approval/notification/input modes
- **Testing**: All modes tested and working via Playwright MCP
- **API**: `/api/approvals` endpoints handle all interaction types correctly
- **Status**: Complete and operational

## Development Patterns

### MCP Tools vs Claude SDK

- **MCP Tools**: Cannot be passed to Claude agents (SDK limitation)
- **Pattern**: Use programmatic SDK API, not CLI with `--mcp-config`
- **Alternative**: Spawn agents via CLI if MCP tools needed

### Tool Permissions & Agent Management

- **Format**: `ToolPermission[]` with `{name, enabled}` objects, not `string[]`
- **Studio Agents**: Use short IDs (`dev_01`) via `/api/studio-projects` endpoints
- **Legacy Agents**: Use full UUIDs via `/api/agent-roles` endpoints

### Database & Migrations

- **SQLite Location**: `~/.studio-ai/studio.db` (not local `.studio-ai/`)
- **Migration Errors**: Manually add migration records to fix "NOT NULL constraint failed"
- **Pattern**: Check migration table before running new migrations

### WebSocket & Real-time Communication

- **Stable Server**: Use port 3456 for WebSocket connections (MCP compatibility)
- **Dev Server**: Port 3457 for hot reload during development
- **Cross-server Events**: Redis EventSystem enables communication between servers

### TypeScript & Code Quality

- **NO `any` types**: Use proper TypeScript types throughout
- **Import Paths**: No file extensions - use `from './module'` not `from './module.js'`
- **Tools**: Always run `npm run lint` and `npm run type-check` before completion

## Testing Patterns

### API Testing

- **Use `ky`**: Not `fetch` for HTTP requests
- **Base URL**: `API_BASE` includes `/api` already
- **Playwright MCP**: Use for comprehensive browser-based API testing

### Workflow Testing

- **Mock Mode**: Set `USE_MOCK_AI=true` for testing without API costs
- **Real Execution**: Test with actual agents for production validation
- **Edge Cases**: Always test error scenarios and timeout behaviors

## Server Management

### Environment Commands

```bash
npm run env:start     # Start both servers (3456 + 3457)
npm run env:stop      # Stop both servers
npm run env:restart   # Restart both servers
npm run env:restart:stable  # Restart only stable (3456)
npm run env:restart:dev     # Restart only dev (3457)
```

### File System Operations

- **Use Modern Tools**: `fd` instead of `find`, `rg` instead of `grep`, `eza` instead of `ls`
- **Performance**: 2-10x faster than legacy tools
- **Availability**: All modern tools are pre-installed

## Common Fixes

### Node.js Module Issues

```bash
npm rebuild better-sqlite3  # Fix NODE_MODULE_VERSION mismatches
```

### Database Schema Updates

```bash
# Check table structure
sqlite3 ~/.studio-ai/studio.db "PRAGMA table_info(table_name);"

# Manually add missing migration
sqlite3 ~/.studio-ai/studio.db "INSERT INTO migrations (name, filename) VALUES ('migration_name.ts', 'migration_name.ts');"
```

### WebSocket Connection Errors

- **Check CORS**: Ensure server allows multiple origins [5173, 3456, 3457]
- **Check Port**: Frontend should connect to stable server (3456)
- **Check Events**: Verify events are emitted to Socket.io, not just local EventEmitter

---

**Key Principle**: Always verify changes work from both UI and API before marking tasks complete.

**Last Updated**: 2025-07-16  
**Previous Length**: 661 lines → **Current Length**: ~100 lines (85% reduction)
