# Studio AI MCP Usage Guide

## Overview

The Studio AI MCP server provides tools for interacting with Claude Studio's AI agents and capabilities. This guide documents all available tools and their usage patterns for future Claude sessions.

## Primary Tool: `invoke`

The `invoke` tool is the recommended way to execute AI agents. It supports both single-agent and multi-agent workflows with automatic status detection.

### Key Features
- **Role-based routing**: Use role names like "dev", "ux", "orchestrator" instead of agent IDs
- **Dynamic role discovery**: Roles are fetched from configured agents
- **Status detection**: Operator automatically detects SUCCESS/BLOCKED/FAILED
- **Template variables**: Pass context between agents using `{stepId.output}`

### Examples

#### Simple Single Agent
```json
{
  "workflow": {
    "role": "dev",
    "task": "Explain this error: TypeError"
  }
}
```

#### With Project ID
```json
{
  "projectId": "my-project",
  "workflow": {
    "role": "dev",
    "task": "Review the authentication code"
  }
}
```

#### Text Format Response
```json
{
  "workflow": {
    "role": "ux",
    "task": "Design a login form"
  },
  "format": "text"
}
```

#### Multi-Agent Parallel Workflow
```json
{
  "workflow": [
    {
      "id": "backend",
      "role": "dev",
      "task": "Create REST API endpoints"
    },
    {
      "id": "frontend",
      "role": "ux",
      "task": "Design the UI components"
    }
  ]
}
```

#### Sequential Workflow with Dependencies
```json
{
  "workflow": [
    {
      "id": "analyze",
      "role": "dev",
      "task": "Analyze the current codebase architecture"
    },
    {
      "id": "design",
      "role": "ux",
      "task": "Based on {analyze.output}, design improved UI",
      "deps": ["analyze"]
    }
  ]
}
```

### Status Detection

The operator analyzes agent outputs and returns:
- **completed**: All agents returned SUCCESS
- **partial**: Some agents are BLOCKED
- **failed**: Any agent FAILED

Status keywords:
- SUCCESS: "done", "completed", "implemented", "fixed", "created"
- BLOCKED: "can't", "cannot", "unable", "missing", "need"
- FAILED: "error", "failed", "couldn't", "exception"

## Tool: `get_roles`

Lists all available agent roles in the system.

### Example
```json
{}
```

### Response
```
Available roles:
- dev (Senior Dev)
- ux (UX Designer)
- orchestrator (Orchestrator)
```

## Tool: `list_agents`

Lists all configured agents with their details.

### Example
```json
{}
```

### Response
```
Available agents:

- Senior Dev (dev) - gpt-4
- UX Designer (ux) - claude-3.5-sonnet
- Orchestrator (orchestrator) - gpt-4
```

## Capability Execution Tools

Dynamic tools based on configured AI capabilities:

### `execute_debugging`
- Model: gpt-4
- Purpose: Debug code issues
- Supports conversation persistence

### `execute_reasoning`
- Model: o3-mini
- Purpose: Complex reasoning and analysis
- Supports conversation persistence

### `execute_research`
- Model: sonar-pro
- Purpose: Web search and documentation lookup
- Supports conversation persistence

### `execute_deep-thinking`
- Model: claude-opus-4-20250514-thinking
- Purpose: Extended reasoning and problem-solving
- Supports conversation persistence

### Common Parameters
```json
{
  "input": "Your prompt or question",
  "includeFiles": ["src/main.js", "README.md"],
  "projectPath": "/Users/name/project",
  "startNewConversation": false
}
```

## Operator Configuration

The operator service determines workflow status by analyzing agent outputs.

### Configuration Location
Settings > Orchestration > Operator

### Default Configuration
- **Model**: gpt-3.5-turbo
- **Temperature**: 0
- **Max Tokens**: 10
- **System Prompt**: Analyzes text for SUCCESS/BLOCKED/FAILED keywords

### Custom Configuration
You can:
- Change the model (any from the AI models list)
- Adjust the system prompt for different detection logic
- Set custom API key and base URL
- Test with sample text

## Deprecated Tools

These tools are deprecated in favor of `invoke`:

### ~~`mention`~~ → Use `invoke` with single workflow
```json
// Old way (deprecated):
{ "to": "developer", "message": "Fix the bug" }

// New way:
{ "workflow": { "role": "developer", "task": "Fix the bug" } }
```

### ~~`batch_messages`~~ → Use `invoke` with array workflow
```json
// Old way (deprecated):
{
  "messages": [
    { "id": "1", "to": "developer", "content": "..." },
    { "id": "2", "to": "tester", "content": "...", "dependencies": ["1"] }
  ]
}

// New way:
{
  "workflow": [
    { "id": "1", "role": "developer", "task": "..." },
    { "id": "2", "role": "tester", "task": "...", "deps": ["1"] }
  ]
}
```

## Environment Variables

- `CLAUDE_STUDIO_API`: API base URL (default: http://localhost:3456/api)
- `CLAUDE_STUDIO_TIMEOUT`: Request timeout in ms (default: 60000)

## Best Practices

1. **Always use roles, not agent names**: Roles are global and consistent
2. **Use projectId when needed**: Defaults to current directory name
3. **Leverage dependencies**: For complex workflows requiring sequential execution
4. **Monitor status**: Check the summary for successful/failed/blocked counts
5. **Test operator config**: Use the test endpoint to verify status detection

## Troubleshooting

### "Missing workflow in request"
Ensure you're passing the workflow parameter correctly.

### Agents not responding
Check that:
1. Agents are configured with the roles you're using
2. The API server is running (http://localhost:3456)
3. Project ID exists or use a valid one

### Wrong status detection
Adjust the operator configuration in Settings > Orchestration > Operator.

### Multi-agent workflows stuck
Ensure dependencies are correctly specified and no circular dependencies exist.