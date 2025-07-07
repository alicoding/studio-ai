# Studio AI MCP - Usage Examples

## Overview

The Studio AI MCP provides a simple, intuitive interface for AI capabilities with automatic conversation management and file context support.

## Key Features

1. **Automatic Conversation Continuity** - No need to manage sessionIds
2. **Simple File Context** - Just pass file paths
3. **Clear Parameter Names** - Easy to understand
4. **Inline Examples** - Right in the tool descriptions

## Basic Usage

### Simple Query (No Context)

```typescript
execute_debugging({
  input: "What's wrong with my calculateAverage function?"
})
```

### Include File Context

```typescript
execute_debugging({
  input: "Find the bug in calculateAverage",
  includeFiles: ["src/utils.js", "src/math.js"]
})
```

### With Project Path (for Relative Files)

```typescript
execute_debugging({
  input: "Analyze the code structure",
  includeFiles: ["src/index.js", "lib/helpers.js"],
  projectPath: "/Users/alice/my-project"
})
```

### Starting a New Conversation

```typescript
execute_debugging({
  input: "Now let's look at a different issue",
  startNewConversation: true  // Explicitly start fresh
})
```

## How Conversations Work

By default, conversations continue automatically:

```typescript
// First call - starts a conversation
execute_debugging({
  input: "What's the bug in calculateAverage?"
})
// Response: "The bug is that reduce() needs an initial value..."

// Second call - continues the same conversation
execute_debugging({
  input: "Can you fix it?"  // The AI remembers what bug we're talking about
})
// Response: "Sure! Here's the corrected code..."

// Third call - start a new topic
execute_debugging({
  input: "Now analyze my login function",
  startNewConversation: true  // Start fresh, forget about calculateAverage
})
```

## File Context Examples

### Relative Paths
```typescript
execute_research({
  input: "How does the authentication system work?",
  includeFiles: ["auth/login.js", "auth/jwt.js"],  // Relative to projectPath
  projectPath: "/Users/bob/webapp"
})
// Files included: /Users/bob/webapp/auth/login.js, /Users/bob/webapp/auth/jwt.js
```

### Absolute Paths
```typescript
execute_research({
  input: "Compare these two implementations",
  includeFiles: [
    "/Users/bob/project1/sort.js",
    "/Users/bob/project2/sort.js"
  ]
  // No projectPath needed for absolute paths
})
```

### Mixed Paths
```typescript
execute_research({
  input: "Analyze the integration",
  includeFiles: [
    "src/api.js",  // Relative
    "/tmp/test-output.log"  // Absolute
  ],
  projectPath: "/Users/charlie/app"
})
```

## Behind the Scenes

The MCP server automatically:

1. **Manages Sessions** - Creates and tracks sessionId internally
2. **Resolves File Paths** - Handles relative/absolute paths correctly
3. **Reads File Contents** - Automatically includes file content in context
4. **Maintains Conversation State** - Through LangGraph orchestration

## Benefits

- **No Session Management** - Just use the tools naturally
- **Clear Parameters** - `input`, `includeFiles`, `projectPath`, `startNewConversation`
- **Natural Conversations** - Continue by default, reset when needed
- **Flexible File Handling** - Works with any file path style

## Common Patterns

### Debugging with Context
```typescript
execute_debugging({
  input: "Why is this function returning undefined?",
  includeFiles: ["src/calculate.js", "test/calculate.test.js"]
})
```

### Research Across Files
```typescript
execute_research({
  input: "How is error handling implemented across the codebase?",
  includeFiles: ["src/api/*.js", "src/utils/errors.js"],
  projectPath: "/home/dev/project"
})
```

### Deep Analysis
```typescript
execute_deep-thinking({
  input: "What's the best architecture for this feature?",
  includeFiles: ["docs/requirements.md", "src/index.js"],
  projectPath: "/workspace/app"
})
```

## Migration from Old Interface

### Before (Complex)
```typescript
execute_debugging({
  input: "Debug this",
  context: {
    sessionId: "abc-123",  // Had to manage this
    projectId: "/path",    // Confusing name
    files: ["file.js"],    // Nested in context
    metadata: {}           // Often empty
  }
})
```

### After (Simple)
```typescript
execute_debugging({
  input: "Debug this",
  includeFiles: ["file.js"],
  projectPath: "/path"
  // Session managed automatically!
})
```

## Summary

The new interface follows the KISS principle:
- **Simple parameters** - No nested context object
- **Clear names** - `includeFiles` not `context.files`
- **Automatic sessions** - No manual sessionId management
- **Natural flow** - Conversations just work

This makes the Studio AI MCP as easy to use as calling a function, while maintaining all the power of multi-turn conversations and file context analysis.