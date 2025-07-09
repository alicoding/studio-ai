# Auto Flow Documentation Ideas

## Problem

Every time we need to understand flow (like "does step_complete go to operator?"), we have to trace through code. This wastes time and context tokens.

## KISS Solutions

### 1. Runtime Flow Logger

```typescript
// In WorkflowOrchestrator
class FlowLogger {
  private static flows: Map<string, string[]> = new Map()

  static log(flowName: string, step: string) {
    if (!this.flows.has(flowName)) {
      this.flows.set(flowName, [])
    }
    this.flows.get(flowName)!.push(step)
  }

  static print(flowName: string) {
    console.log(`\n📊 Flow: ${flowName}`)
    this.flows.get(flowName)?.forEach((step, i) => {
      console.log(`   ${i + 1}. ${step}`)
    })
  }
}

// Usage in code
FlowLogger.log('step-execution', 'WorkflowOrchestrator.createStepNode')
FlowLogger.log('step-execution', 'ClaudeService.sendMessage')
FlowLogger.log('step-execution', 'SimpleOperator.checkStatus')
FlowLogger.log('step-execution', 'emit step_complete')
```

### 2. Decorator Pattern

```typescript
@flow('workflow-execution')
async execute(request: InvokeRequest) {
  // Method implementation
}
```

### 3. Mermaid Auto-Generation

```typescript
// Generate mermaid diagrams from actual execution
class MermaidFlowGenerator {
  static generate(flows: Map<string, string[]>): string {
    let mermaid = 'graph TD\n'
    flows.forEach((steps, flowName) => {
      steps.forEach((step, i) => {
        if (i > 0) {
          mermaid += `  ${steps[i - 1]} --> ${step}\n`
        }
      })
    })
    return mermaid
  }
}
```

### 4. Event-Based Discovery

```typescript
// Listen to all events and auto-document flows
EventEmitter.on('*', (eventName, data) => {
  FlowLogger.log('event-flow', `${eventName} from ${data.source}`)
})
```

### 5. Simple JSON Flow Files

```json
// auto-generated-flows.json
{
  "step-execution": [
    "User Request",
    "WorkflowOrchestrator.execute",
    "WorkflowOrchestrator.createStepNode",
    "emit: step_start",
    "WorkflowMonitor.updateHeartbeat",
    "ClaudeService.sendMessage",
    "SimpleOperator.checkStatus",
    "emit: step_complete",
    "WorkflowMonitor.updateHeartbeat"
  ],
  "monitoring-flow": [
    "WorkflowMonitor.checkStaleWorkflows",
    "Detect stale workflow",
    "WorkflowMonitor.attemptRecovery",
    "WorkflowOrchestrator.execute (with same threadId)",
    "LangGraph resumes from checkpoint"
  ]
}
```

## Recommendation

Start with #1 (Runtime Flow Logger) - it's the simplest and most immediate. Add it to key methods and generate flow documentation on demand.
