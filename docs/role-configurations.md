# Agent Role Configurations - API Management Guide

## Important: Testing Strategy

**MCP TESTING NOT AVAILABLE**: User needs to restart Claude Desktop, so MCP invoke won't work tonight.

**USE INSTEAD**:

- **Direct API calls** via curl/fetch to `/api/invoke`
- **JSON-RPC testing** for agent coordination
- **Direct agent API** at `/api/agents`

MCP testing will resume tomorrow when user wakes up.

## Required Agent Roles

### 1. Developer Role

```json
{
  "name": "Senior Developer",
  "role": "dev",
  "systemPrompt": "You are a senior software developer with expertise in TypeScript, React, and modern web technologies. Follow SOLID, DRY, KISS, and Library-First principles. Use existing libraries like KY (not fetch) and unified storage patterns. NO 'any' types allowed - use proper TypeScript types.",
  "tools": ["read", "write", "bash", "edit", "grep", "glob"],
  "model": "claude-3-opus",
  "maxTokens": 200000,
  "temperature": 0.7,
  "maxTurns": 500,
  "verbose": true
}
```

### 2. Orchestrator Role

```json
{
  "name": "Technical Orchestrator",
  "role": "orchestrator",
  "systemPrompt": "You are a technical orchestrator/CTO responsible for coordinating development workflows. You delegate atomic, verifiable tasks to other agents. NEVER code directly - only coordinate via API calls and task delegation. Follow SOLID, DRY, KISS principles in your coordination approach.",
  "tools": ["bash", "read"],
  "model": "claude-3-opus",
  "maxTokens": 200000,
  "temperature": 0.3,
  "maxTurns": 500,
  "verbose": true
}
```

### 3. Code Reviewer Role (NEEDS CREATION)

```json
{
  "name": "Senior Code Reviewer",
  "role": "reviewer",
  "systemPrompt": "You are a senior code reviewer ensuring code quality and architectural consistency. Enforce SOLID, DRY, KISS, Library-First principles. Check for: proper TypeScript types (no 'any'), security best practices, performance optimization, integration with existing patterns. Use KY not fetch, unified storage patterns.",
  "tools": ["read", "grep", "bash"],
  "model": "claude-3-opus",
  "maxTokens": 200000,
  "temperature": 0.1,
  "maxTurns": 500,
  "verbose": true
}
```

## API Configuration Commands

### Create Reviewer Role

```bash
curl -X POST http://localhost:3456/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Senior Code Reviewer",
    "role": "reviewer",
    "systemPrompt": "You are a senior code reviewer ensuring code quality and architectural consistency. Enforce SOLID, DRY, KISS, Library-First principles. Check for: proper TypeScript types (no any), security best practices, performance optimization, integration with existing patterns. Use KY not fetch, unified storage patterns.",
    "tools": ["read", "grep", "bash"],
    "model": "claude-3-opus",
    "maxTokens": 200000,
    "temperature": 0.1,
    "maxTurns": 500,
    "verbose": true
  }'
```

### Check Current Agents

```bash
curl -s http://localhost:3456/api/agents | jq '.[].role'
```

### Update Agent Configuration

```bash
curl -X PUT http://localhost:3456/api/agents/{AGENT_ID} \
  -H "Content-Type: application/json" \
  -d '{
    "maxTurns": 500,
    "systemPrompt": "Updated prompt..."
  }'
```

## Testing Coordination (Without MCP)

### Direct API Workflow Test

```bash
# Test single agent via API
curl -X POST http://localhost:3456/api/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": {
      "role": "dev",
      "task": "Run npm run lint and report any errors found"
    }
  }'

# Test multi-agent coordination via API
curl -X POST http://localhost:3456/api/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": [
      {
        "id": "lint-fix",
        "role": "dev",
        "task": "Fix TypeScript and lint errors in the codebase"
      },
      {
        "id": "review",
        "role": "reviewer",
        "task": "Review the fixes from {lint-fix.output} for code quality",
        "deps": ["lint-fix"]
      }
    ]
  }'
```

## Role Verification Checklist

### Before Orchestration:

- [ ] All roles have maxTurns = 500
- [ ] Reviewer role exists and configured
- [ ] All agents have proper system prompts
- [ ] API endpoints responding correctly
- [ ] Server running with latest maxTurns fix

### After Configuration:

- [ ] Test single agent workflow
- [ ] Test multi-agent coordination
- [ ] Verify template variable resolution
- [ ] Confirm proper error handling
- [ ] Validate session management
