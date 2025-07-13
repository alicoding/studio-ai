# Studio AI MCP Deployment Guide

## Overview

The Studio AI MCP server has been refactored to provide explicit, discoverable tools instead of a single generic tool. This makes it easier for Claude to discover and use the available capabilities.

## Available Tools

### Fixed Tools (Always Available)

1. **list_agents** - List all available agents in the system
2. **mention** - Send a message to a specific agent
3. **batch_messages** - Send messages to multiple agents with orchestration
4. **list_capabilities** - List all configured AI capabilities

### Dynamic Tools (From UI Configuration)

When you add AI capabilities in Settings → AI, they automatically become available as tools:

- **execute_debugging** - Debug code issues (if configured)
- **execute_reasoning** - Complex reasoning and analysis (if configured)
- **execute_research** - Web search and documentation lookup (if configured)
- **execute\_[capability_id]** - Any custom capability you add

## Configuration

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "studio-ai": {
      "command": "node",
      "args": ["/path/to/claude-studio/web/server/mcp/studio-ai/dist/index.js"],
      "env": {
        "CLAUDE_STUDIO_API": "http://localhost:3456/api"
      }
    }
  }
}
```

## Building the MCP Server

```bash
cd web/server/mcp/studio-ai
npm install
npm run build
```

## Testing

Run the test script to verify all tools are working:

```bash
cd web/server/mcp/studio-ai
npx tsx test-new-tools.ts
```

## How It Works

1. **Tool Discovery**: When Claude lists tools, the MCP server:
   - Returns fixed tools for agent operations
   - Fetches AI capabilities from the API
   - Dynamically generates `execute_[capability]` tools

2. **Configuration-Driven**:
   - Add a capability in Settings → AI
   - Save the configuration
   - The tool appears immediately in Claude's tool list
   - No code changes required

3. **Type-Safe**: Each tool has its own input schema with proper validation

## Example Usage

```javascript
// List available agents
mcp__studio - ai__list_agents()

// Send a message to an agent
mcp__studio -
  ai__mention({
    to: 'researcher',
    message: 'What are the latest TypeScript features?',
    wait: true,
  })

// Execute an AI capability
mcp__studio -
  ai__execute_debugging({
    input: 'Fix this TypeScript error',
    context: {
      files: ['src/app.ts'],
    },
  })
```

## Benefits

1. **Discoverable** - Claude can see all available tools
2. **Self-Documenting** - Tool names clearly indicate their purpose
3. **Type-Safe** - Each tool has proper input validation
4. **Configurable** - AI capabilities from UI become tools automatically
5. **No Code Changes** - Add capabilities through UI, not code
