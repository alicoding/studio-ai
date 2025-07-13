# AI Orchestration Architecture for Claude Studio

## Current Problem
We built a direct API service that makes isolated calls to AI models. This misses the key value proposition of Zen MCP - **conversation orchestration** where models work together with shared context.

## What Zen MCP Actually Does
1. **Orchestration**: Claude acts as team lead, delegating to models based on strengths
2. **Conversation Threading**: All models share context in a single conversation
3. **Model Routing**: Automatically selects best model for each task
4. **Context Persistence**: Maintains conversation even after context resets

## What We Should Build

### Architecture Principles (KISS, DRY, SOLID, Library-First)

1. **Conversation Manager** (Single Responsibility)
   - Maintains conversation state across all AI interactions
   - Handles context passing between models
   - Manages conversation memory

2. **Model Router** (Open/Closed)
   - Routes requests to appropriate models based on task type
   - Extensible for new models without modifying core logic
   ```typescript
   interface ModelCapability {
     type: 'research' | 'reasoning' | 'coding' | 'analysis'
     models: string[]
     selector: (task: Task) => string
   }
   ```

3. **Agent Interface** (Interface Segregation)
   - Agents interact through simple commands/mentions
   - Don't need to know about model selection
   ```typescript
   // Agent can request capability
   await ai.request('research', {
     query: 'latest React patterns',
     context: currentCode
   })
   
   // Or use mentions
   "@ai research: latest React patterns"
   ```

4. **Context Pipeline** (Dependency Inversion)
   - Abstract context gathering from specific implementations
   - Agents provide context through standard interface
   ```typescript
   interface ContextProvider {
     getRelevantContext(task: Task): Context
   }
   ```

## Model Mapping

| Capability | Best Models | Use Case |
|------------|-------------|----------|
| Research | Perplexity/Sonar models | Web search, documentation |
| Deep Thinking | O3, Gemini Pro | Architecture, complex problems |
| Code Review | GPT-4, Claude | Code quality, security |
| Test Generation | GPT-4, specialized models | Unit tests, integration tests |
| Quick Tasks | Flash models | Simple queries, formatting |

## Interaction Patterns

### 1. Command-Based
```typescript
// Agent uses commands
agent.execute('/ai research "React Server Components"')
agent.execute('/ai think "How to scale this architecture"')
agent.execute('/ai review current-file')
```

### 2. Mention-Based
```typescript
// Natural language with mentions
"@ai Can you research the latest Next.js patterns?"
"@ai-think How should we approach this migration?"
```

### 3. Context-Aware Auto-Routing
```typescript
// System automatically detects intent and routes
agent.ask("Find information about React hooks") // -> Routes to research model
agent.ask("Analyze this architecture") // -> Routes to reasoning model
```

## Implementation Steps

1. **Refactor Current Service**
   - Keep ChatManager as low-level provider
   - Build ConversationOrchestrator on top
   - Add ModelRouter for capability-based routing

2. **Add Context Management**
   - Implement conversation memory
   - Add context providers for code, files, project state
   - Enable context sharing between models

3. **Create Agent Interface**
   - Simple API for agents to request capabilities
   - Support both commands and natural language
   - Return structured responses with model attribution

4. **Enable Model Collaboration**
   - Allow models to request follow-ups from each other
   - Maintain conversation thread across model switches
   - Preserve context even after resets

## Example Flow

```typescript
// Agent requests deep analysis
const result = await orchestrator.request({
  capability: 'analyze',
  prompt: 'Review this codebase architecture',
  context: {
    files: projectFiles,
    currentTask: 'migration planning'
  }
})

// Orchestrator internally:
// 1. Routes to O3 for initial analysis
// 2. O3 identifies areas needing research
// 3. Automatically delegates to Perplexity for documentation lookup
// 4. Returns combined insights to agent
// 5. Maintains full conversation for follow-ups
```

## Benefits
- Agents get best model for each task automatically
- Conversation context maintained across models
- Complex multi-step workflows possible
- No need for agents to manage model selection
- Follows all architectural principles