# Invoke API Implementation Summary

## Overview
Successfully implemented a unified `/api/invoke` endpoint that replaces separate mention and batch endpoints, following DRY principles and eliminating code duplication.

## Key Components Created

### 1. Schema Definition (`/web/server/schemas/invoke.ts`)
- **WorkflowStep**: Defines individual agent tasks with role, task, sessionId, and dependencies
- **InvokeRequest**: Accepts single agent or array of agents for workflow
- **InvokeResponse**: Returns threadId, sessionIds, results, and execution summary
- **OperatorAnalysis**: Simple status detection (success/blocked/failed)

### 2. SimpleOperator Service (`/web/server/services/SimpleOperator.ts`)
- Telephone switchboard style status detection
- Uses cheap/fast model for quick status checks
- Pattern matching for SUCCESS, BLOCKED, or FAILED statuses
- KISS principle - no complex analysis

### 3. WorkflowOrchestrator Service (`/web/server/services/WorkflowOrchestrator.ts`)
- LangGraph-based workflow management
- Handles both single agent and multi-agent workflows
- Dependency resolution for sequential execution
- Template variable replacement with string-template
- Parallel execution for independent steps
- Session management and resumption

### 4. API Endpoints
- **POST /api/invoke**: Main unified endpoint
- **GET /api/invoke/roles/:projectId**: Role discovery endpoint
- Deprecated `/api/messages` and `/api/messages/batch` with warnings

## Features Implemented

### Single Agent Invocation
```json
{
  "workflow": {
    "role": "developer",
    "task": "Implement feature X"
  },
  "projectId": "project-123"
}
```

### Multi-Agent Parallel Workflow
```json
{
  "workflow": [
    {"id": "step1", "role": "developer", "task": "Task 1"},
    {"id": "step2", "role": "architect", "task": "Task 2"},
    {"id": "step3", "role": "tester", "task": "Task 3"}
  ],
  "projectId": "project-123"
}
```

### Sequential Workflow with Dependencies
```json
{
  "workflow": [
    {"id": "analyze", "role": "architect", "task": "Analyze requirements"},
    {"id": "design", "role": "developer", "task": "Design based on analysis", "deps": ["analyze"]},
    {"id": "test", "role": "tester", "task": "Create test plan", "deps": ["design"]}
  ],
  "projectId": "project-123"
}
```

### Template Variables
- `{previousOutput}`: Output from the previous step
- `{stepId.output}`: Output from a specific step

### Session Management
- Automatic session ID tracking
- Resume existing sessions with sessionId
- Force new conversation with startNewConversation flag

## Architecture Benefits

1. **DRY Principle**: Single endpoint handles both single and multi-agent workflows
2. **KISS**: Simple workflow definition with optional fields
3. **SOLID**: Each service has single responsibility
4. **Library-First**: LangGraph for orchestration, string-template for variables
5. **Type Safety**: Full TypeScript types, no 'any'
6. **Configuration**: Everything configurable, no hardcoded values

## Migration Path

1. Old endpoints marked with deprecation headers
2. BatchExecutor service marked as deprecated
3. Clean migration path from mention/batch to invoke
4. All functionality preserved with simpler API

## Testing

Created comprehensive test suite:
- Single agent invocation
- Multi-agent parallel workflows
- Sequential workflows with dependencies
- Template variable replacement
- Session resumption scenarios

All tests pass structurally, validating the API design and workflow orchestration.