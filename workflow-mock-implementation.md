# Workflow Mock Implementation Plan

## Session Context (Started: 2025-01-10 23:22 PST)

**Context Usage**: ~11% before compaction
**Critical State**: Must preserve memory for orchestration

## Project Goal

Transform WorkflowOrchestrator to support multiple step executors (like n8n) where each step can be:

- Claude AI agent
- Mock AI agent (for testing)
- Pure operator (no AI)
- JavaScript execution
- Webhook calls
- Other AI providers (future)

## Current State (Updated: 2025-01-11 08:20 PST)

1. ✅ Completed Phase 1 of workflow visualization
   - API endpoint: `/api/workflow-graph/:threadId`
   - SSE events: `graph_update` events implemented
   - Tests passing

2. ✅ **ALREADY IMPLEMENTED BY USER**: StepExecutor pattern integrated!
   - StepExecutor interface created
   - MockStepExecutor implemented with template resolution
   - ClaudeStepExecutor implemented (wraps existing logic)
   - StepExecutorRegistry pattern in use
   - WorkflowOrchestrator refactored to use executors
   - Mock executor supports custom responses and delays

## What User Already Added

### Core Implementation

```typescript
// In WorkflowOrchestrator constructor:
private executorRegistry = new StepExecutorRegistry()
private initializeExecutors(): void {
  const claudeExecutor = new ClaudeStepExecutor(...)
  const mockExecutor = new MockStepExecutor()
  this.executorRegistry.register(claudeExecutor)
  this.executorRegistry.register(mockExecutor)
}

// In createStepNode - uses executor pattern:
const executor = this.executorRegistry.getExecutor(step)
const stepResult = await executor.execute(step, context)
```

### MockStepExecutor Features

- Keyword-based mock responses (design, implement, test, review, etc.)
- Template variable resolution ({stepId.output})
- Custom response support via step.config.mockResponse
- Configurable delays via step.config.mockDelay
- Contextual responses based on dependencies
- Detailed logging for debugging

### Architecture Design

### Core Interfaces (Already Implemented)

```typescript
interface StepExecutor {
  canHandle(step: WorkflowStep): boolean
  execute(step: WorkflowStep, context: WorkflowContext): Promise<StepResult>
}

interface ExecutorWorkflowStep extends WorkflowStep {
  type?: 'claude' | 'mock' | 'operator' | 'javascript' | 'webhook'
  config?: {
    // AI-specific
    model?: string
    temperature?: number

    // Mock-specific
    mockResponse?: string
    mockDelay?: number

    // Operator-specific
    operator?: 'summary' | 'extraction' | 'validation' | 'routing'

    // JavaScript-specific
    code?: string

    // Webhook-specific
    url?: string
    method?: string
    headers?: Record<string, string>
  }
}
```

### Implementation Steps

1. [x] Create StepExecutor interface ✅ USER COMPLETED
2. [x] Create MockStepExecutor for testing ✅ USER COMPLETED
3. [x] Create ClaudeStepExecutor (wrap existing) ✅ USER COMPLETED
4. [ ] Create OperatorStepExecutor
5. [x] Create StepExecutorRegistry ✅ USER COMPLETED
6. [x] Refactor WorkflowOrchestrator to use registry ✅ USER COMPLETED
7. [x] Create test workflow demonstrating mock executor ✅ COMPLETED
   - Created comprehensive unit tests in `workflow-mock-executor.test.ts`
   - Tests cover pattern matching, template resolution, custom responses
   - Tests pass without making any real API calls
8. [ ] Test mixed workflows (AI + non-AI steps)

## Key Decisions Made

- Use Strategy pattern for step executors
- Registry pattern for executor management
- Keep backward compatibility with existing workflows
- Mock responses should be deterministic for testing

## Context for Next Session

If session expires, start here:

1. Read this file for context
2. Check `/docs/workflow-visualization-plan.md` for overall progress
3. Current working directory: `/Users/ali/claude-swarm/claude-team/claude-studio`
4. The goal: Make workflow engine AI-agnostic for testing and flexibility

## Memory Optimization Notes

- Using .md files to track state across sessions
- Commit frequently to preserve work
- Document decisions immediately
- Keep implementation focused on current phase
