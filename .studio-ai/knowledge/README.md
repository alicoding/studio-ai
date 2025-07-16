# Claude Studio Knowledge Base

This is a living documentation maintained by the Knowledge Facilitator agent. It provides instant, accurate answers about the Claude Studio codebase.

## Quick Links

### 📐 [Architecture](./architecture.md)

- Cross-server communication (Redis, EventSystem)
- Component overview
- Data flow and session management

### 🔧 [Services](./services.md)

- StudioSessionService - Session file management
- ClaudeService - Agent interactions
- EventSystem - Cross-server events
- WorkflowOrchestrator - Multi-agent workflows

### 🌐 [APIs](./apis.md)

- Session messages endpoints
- Studio projects endpoints
- WebSocket events
- Agent management

### 🎯 [Patterns](./patterns.md)

- WebSocket message routing
- Session ID management
- Tool permission handling
- Error recovery strategies

### ⚠️ [Gotchas](./gotchas.md)

- Claude session file location issues
- WebSocket connection problems
- Cross-server communication setup

## Recent Issues & Solutions

### Messages Not Appearing in UI (2025-01-10)

**Problem:** Activity tracked but no messages visible
**Root Cause:** StudioSessionService looking in wrong directory
**Solution:** Updated directory selection logic in `services.md`
**Details:** See [gotchas.md#claude-session-file-location-issue](./gotchas.md#claude-session-file-location-issue)

## How to Use This Knowledge Base

1. **Looking for specific info?** Check the relevant section above
2. **Debugging an issue?** Start with [gotchas.md](./gotchas.md)
3. **Understanding data flow?** See [architecture.md](./architecture.md)
4. **API reference needed?** Check [apis.md](./apis.md)

## Maintenance

This knowledge base is maintained by the Knowledge Facilitator agent. When you discover new information:

1. Ask KF to update the relevant file
2. KF will add the information with proper cross-references
3. KF will update this index if new sections are added

## Key Concepts Summary

### Session ID Architecture

- **Agent ID**: Stable identifier (e.g., `knowledge-facilitator_01`)
- **Claude Session ID**: Changes with each message
- **JSONL Files**: Stored in `~/.claude/projects/`
- **Routing**: Always use Agent ID, never Claude's session ID

### Cross-Server Communication

- **Stable Server**: Port 3456 (MCP tools)
- **Dev Server**: Port 3457 (hot reload)
- **Redis**: Enables event broadcasting between servers
- **EventSystem**: Abstraction layer for events

### Tool Permissions

- **Case Sensitive**: "Write" not "write"
- **Discovery**: Get from ToolDiscoveryService
- **Preservation**: Never modify tool names

## Need Something?

If you can't find what you need:

1. Search this knowledge base first
2. Ask the Knowledge Facilitator to research and document it
3. The answer will be added for future reference

Last Updated: 2025-01-10
