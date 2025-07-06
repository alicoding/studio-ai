# Studio AI MCP Refactor Plan

## Goal

Transform the generic `mcp__studio-ai__studio-ai` tool into explicit, discoverable tools that are automatically generated from configuration.

## Design Principles

1. **Explicit over Dynamic** - Each tool has a clear, single purpose
2. **Configurable through UI** - AI capabilities added in settings become MCP tools
3. **Zero code changes** - Add capability → restart → tool appears
4. **Clear naming** - `mcp__studio-ai__execute_debugging` not generic `studio-ai`

## Implementation Plan

### Phase 1: Refactor MCP Server to Generate Multiple Tools

```typescript
// src/index.ts - Instead of one tool, generate many
import { createStudioAITool } from './tool.js'
import { createAgentTools } from './agentTools.js'
import { createCapabilityTools } from './capabilityTools.js'
import { createOrchestrationTools } from './orchestrationTools.js'

// Register fixed tools (always available)
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = []

  // Fixed tools for agent operations
  tools.push({
    name: 'list_agents',
    description: 'List all available agents in the system',
    inputSchema: { type: 'object', properties: {} },
  })

  tools.push({
    name: 'mention',
    description: 'Send a message to a specific agent',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Agent name' },
        message: { type: 'string', description: 'Message content' },
        wait: { type: 'boolean', description: 'Wait for response' },
      },
      required: ['to', 'message'],
    },
  })

  tools.push({
    name: 'batch_messages',
    description: 'Send messages to multiple agents',
    inputSchema: {
      /* ... */
    },
  })

  // Dynamic tools from AI capabilities
  const capabilities = await fetchCapabilities()
  for (const [id, capability] of Object.entries(capabilities)) {
    tools.push({
      name: `execute_${id}`,
      description: `${capability.description} (${capability.models.primary})`,
      inputSchema: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Input for the capability' },
          context: { type: 'object', description: 'Additional context' },
        },
        required: ['input'],
      },
    })
  }

  return { tools }
})
```

### Phase 2: Update Tool Handlers

```typescript
// Handle each tool explicitly
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  switch (name) {
    case 'list_agents':
      return await handleListAgents()

    case 'mention':
      return await handleMention(args)

    case 'batch_messages':
      return await handleBatchMessages(args)

    default:
      // Check if it's a capability execution
      if (name.startsWith('execute_')) {
        const capabilityId = name.replace('execute_', '')
        return await handleExecuteCapability(capabilityId, args)
      }
      throw new Error(`Unknown tool: ${name}`)
  }
})
```

### Phase 3: Tool Implementations

```typescript
// agentTools.ts
export async function handleListAgents() {
  const response = await fetch(`${API_BASE}/agents`)
  const agents = await response.json()

  return {
    type: 'text',
    text: agents.map((a) => `- ${a.name} (${a.role})`).join('\n'),
  }
}

export async function handleMention(args: { to: string; message: string; wait?: boolean }) {
  // Clear, explicit parameters
  const response = await fetch(`${API_BASE}/messages/mention`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: args.to,
      message: args.message,
      wait: args.wait || false,
    }),
  })
  // ...
}

// capabilityTools.ts
export async function handleExecuteCapability(capabilityId: string, args: any) {
  const response = await fetch(`${API_BASE}/langchain/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      capability: capabilityId,
      ...args,
    }),
  })
  // ...
}
```

## UI Configuration Flow

### For AI Capabilities (Already Works)

1. Go to Settings → AI
2. Add new capability (e.g., "code-review")
3. Save
4. Restart MCP server
5. Tool appears: `mcp__studio-ai__execute_code_review`

### For Future Features

When adding new feature types (e.g., semantic search):

1. Code change: Add handler in MCP server
2. Register tool in the fixed tools list
3. Deploy
4. Tool appears: `mcp__studio-ai__semantic_search`

## Benefits

1. **Discoverable** - You see all available tools in the MCP list
2. **Self-documenting** - Tool names tell you what they do
3. **Type-safe** - Each tool has its own input schema
4. **Configurable** - AI capabilities from UI become tools
5. **Extensible** - Easy to add new tool types

## Example Usage

Before (confusing):

```javascript
mcp__studio -
  ai__studio -
  ai({
    type: 'command',
    capability: 'debugging', // How do I know this exists?
    input: 'Fix this bug',
  })
```

After (clear):

```javascript
mcp__studio -
  ai__execute_debugging({
    input: 'Fix this bug',
    context: { files: ['bug.ts'] },
  })
```

## Migration Path

1. Keep the old `studio-ai` tool for backward compatibility
2. Add new explicit tools alongside
3. Update documentation
4. Deprecate old tool after transition period
5. Remove old tool in next major version
