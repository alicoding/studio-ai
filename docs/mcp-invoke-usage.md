# Studio AI MCP - Invoke Tool Usage

## Overview
The Studio AI MCP server now includes unified `invoke` and `get_roles` tools that replace the deprecated `mention` and `batch_messages` tools.

## Configuration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

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

## Available Tools

### 1. invoke
Execute single agent or multi-agent workflows with dependencies and template variables.

#### Single Agent Example:
```
Use the invoke tool to ask the developer to implement a new feature:
{
  "workflow": {
    "role": "developer",
    "task": "Implement a user authentication system"
  },
  "projectId": "my-project"
}
```

#### Multi-Agent Parallel Example:
```
Use the invoke tool to get multiple perspectives:
{
  "workflow": [
    {
      "id": "dev",
      "role": "developer",
      "task": "What are the technical requirements?"
    },
    {
      "id": "ux",
      "role": "designer",
      "task": "What are the UX considerations?"
    }
  ],
  "projectId": "my-project"
}
```

#### Sequential Workflow with Dependencies:
```
Use the invoke tool for a complete workflow:
{
  "workflow": [
    {
      "id": "analyze",
      "role": "architect",
      "task": "Analyze the requirements for a chat application"
    },
    {
      "id": "design",
      "role": "developer",
      "task": "Based on the analysis: {analyze.output}, create the technical design",
      "deps": ["analyze"]
    },
    {
      "id": "implement",
      "role": "developer",
      "task": "Implement the design from {design.output}",
      "deps": ["design"]
    }
  ],
  "projectId": "my-project"
}
```

#### Session Resumption:
```
Use the invoke tool to resume a previous conversation:
{
  "workflow": {
    "role": "developer",
    "task": "What did we discuss earlier?",
    "sessionId": "previous-session-id-here"
  },
  "projectId": "my-project"
}
```

### 2. get_roles
Get available agent roles for a project.

```
Use the get_roles tool to see what agents are available:
{
  "projectId": "my-project"
}
```

## Template Variables

The invoke tool supports template variables for passing context between steps:

- `{previousOutput}` - Output from the immediately previous step
- `{stepId.output}` - Output from a specific step by its ID

## Migration from Deprecated Tools

### From mention:
```
// Old:
mention({ to: "developer", message: "Build feature X" })

// New:
invoke({ 
  workflow: { role: "developer", task: "Build feature X" },
  projectId: "my-project"
})
```

### From batch_messages:
```
// Old:
batch_messages({
  messages: [
    { id: "1", to: "dev", content: "Task 1" },
    { id: "2", to: "test", content: "Task 2", dependencies: ["1"] }
  ]
})

// New:
invoke({
  workflow: [
    { id: "1", role: "dev", task: "Task 1" },
    { id: "2", role: "test", task: "Task 2", deps: ["1"] }
  ],
  projectId: "my-project"
})
```

## Benefits

1. **Unified API**: Single tool for both single and multi-agent workflows
2. **Role-based**: Use roles instead of agent names for better abstraction
3. **Dependencies**: Built-in support for sequential workflows
4. **Templates**: Pass context between agents automatically
5. **Session Management**: Resume conversations easily

## Notes

- The deprecated `mention` and `batch_messages` tools still work but show deprecation warnings
- Always specify a `projectId` for proper context isolation
- Use `format: "text"` for simpler text-only responses in MCP
- Template variables are resolved automatically during execution