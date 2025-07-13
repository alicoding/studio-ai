# Step Executor System

A complete, AI-agnostic workflow orchestration system using the Strategy pattern.

## Overview

The Step Executor System transforms the WorkflowOrchestrator from a Claude-specific orchestrator into a flexible, multi-executor workflow engine. This follows the refactoring plan to support multiple step execution strategies while maintaining full backward compatibility.

## Architecture

### Core Components

1. **StepExecutor Interface** - Defines the contract for all step executors
2. **StepExecutorRegistry** - Manages and routes steps to appropriate executors
3. **MockStepExecutor** - Provides deterministic responses for testing
4. **ClaudeStepExecutor** - Wraps existing Claude AI execution logic
5. **WorkflowOrchestrator** - Refactored to use the executor pattern

### Design Principles

- **SOLID**: Each executor has single responsibility, open for extension
- **DRY**: Shared interfaces and common template resolution logic
- **KISS**: Simple two-method interface for executors
- **Library-First**: Built on proven LangGraph and string-template libraries

## Usage

### Basic Step Execution

```typescript
// Explicit executor type
const step: ExecutorWorkflowStep = {
  id: 'design-step',
  task: 'Design a REST API',
  type: 'mock',
}

// Backward compatible (defaults to 'claude' or 'mock' based on environment)
const legacyStep: WorkflowStep = {
  id: 'legacy-step',
  task: 'Legacy task',
  role: 'developer',
}
```

### Template Variable Resolution

All executors support template variables:

```typescript
const workflow = [
  {
    id: 'design',
    task: 'Design system architecture',
    type: 'mock',
  },
  {
    id: 'implement',
    task: 'Implement {design.output}',
    type: 'mock',
    deps: ['design'],
  },
  {
    id: 'review',
    task: 'Review {implement.output} based on {design.output}',
    type: 'mock',
    deps: ['implement'],
  },
]
```

### Custom Mock Responses

```typescript
const customStep: ExecutorWorkflowStep = {
  id: 'custom',
  task: 'Generate report',
  type: 'mock',
  config: {
    mockResponse: 'Report generated at {timestamp} for project {projectId}',
    mockDelay: 500,
  },
}
```

### Environment-Based Execution

```bash
# Use mock executor for all untyped steps
export USE_MOCK_AI=true

# Normal Claude execution
unset USE_MOCK_AI
```

## MockStepExecutor Features

### Pattern Matching

The MockStepExecutor automatically detects task types and provides appropriate responses:

- **Design/Architecture**: Returns system architecture with components
- **Implementation/Code**: Returns TypeScript function implementations
- **Testing**: Returns Jest test suites
- **Review/Analysis**: Returns code review reports
- **Security**: Returns security analysis reports
- **Deployment**: Returns deployment status reports
- **Documentation**: Returns API documentation

### Template Variables

Supports multiple template variable formats:

- `{stepId.output}` - References step output explicitly
- `{stepId}` - Shorthand for step output
- `{timestamp}` - Current ISO timestamp
- `{threadId}` - Workflow thread identifier
- `{projectId}` - Project identifier (if available)

### Debugging

Enable detailed logging to see pattern matching and template resolution:

```javascript
console.log('[MockStepExecutor] Analyzing task: "Design a system"')
console.log('[MockStepExecutor] Matched pattern: design/architect')
console.log('[MockStepExecutor] Resolving template: "..."')
console.log('[MockStepExecutor] Final resolved template: "..."')
```

## Backward Compatibility

The system maintains 100% backward compatibility:

1. **Type Detection**: Untyped steps default to 'claude' executor
2. **Role-based Steps**: Steps with `role` or `agentId` use Claude executor
3. **Environment Override**: `USE_MOCK_AI=true` forces mock execution
4. **No Breaking Changes**: Existing workflows continue to work unchanged

## Testing

### Running Tests

```bash
# Test MockStepExecutor
npm test -- web/server/services/executors/__tests__/MockStepExecutor.test.ts

# Test StepExecutorRegistry
npm test -- web/server/services/executors/__tests__/StepExecutorRegistry.test.ts

# Run all executor tests
npm test -- web/server/services/executors/__tests__/
```

### Test Coverage

- ✅ Pattern matching for all supported task types
- ✅ Template variable resolution (`{stepId.output}`, `{stepId}`, special vars)
- ✅ Custom mock responses and delays
- ✅ Executor registration and routing
- ✅ Backward compatibility scenarios
- ✅ Error handling and edge cases

## Extension Points

### Adding New Executors

1. Implement the `StepExecutor` interface:

```typescript
class CustomExecutor implements StepExecutor {
  canHandle(step: ExecutorWorkflowStep): boolean {
    return step.type === 'custom'
  }

  async execute(step: ExecutorWorkflowStep, context: WorkflowContext): Promise<StepResult> {
    // Custom execution logic
    return {
      id: step.id!,
      status: 'success',
      response: 'Custom result',
      sessionId: 'custom-session',
      duration: 100,
    }
  }
}
```

2. Register in WorkflowOrchestrator:

```typescript
// In initializeExecutors()
this.executorRegistry.register(new CustomExecutor())
```

### Future Executor Types

The system is designed to support:

- **OperatorStepExecutor**: Data transformations without AI
- **JavaScriptStepExecutor**: Sandboxed code execution
- **WebhookStepExecutor**: HTTP API calls
- **PythonStepExecutor**: Python script execution
- **DatabaseStepExecutor**: Direct database operations

## Benefits

1. **Testability**: Mock workflows without AI costs
2. **Flexibility**: Easy to add new execution strategies
3. **Maintainability**: Isolated, focused executor classes
4. **Performance**: Optimizable executors for different use cases
5. **Debugging**: Clear separation of concerns for troubleshooting
6. **Cost Efficiency**: Mock execution for development and testing

## Implementation Status

- ✅ **StepExecutor Interface**: Complete and tested
- ✅ **MockStepExecutor**: Complete with pattern matching and templates
- ✅ **StepExecutorRegistry**: Complete with routing and type detection
- ✅ **ClaudeStepExecutor**: Complete wrapper for existing Claude logic
- ✅ **WorkflowOrchestrator Integration**: Complete refactoring to use executors
- ✅ **Backward Compatibility**: All existing workflows supported
- ✅ **Template Resolution**: Full variable substitution support
- ✅ **Test Coverage**: Comprehensive unit tests for all components

The system is production-ready and provides a solid foundation for building complex, multi-executor workflows.
