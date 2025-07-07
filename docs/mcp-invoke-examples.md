# MCP Studio AI Invoke - Real-World Examples

## Complete Production Examples

### 1. Full Stack Feature Development

```javascript
// Add user authentication to existing app
const response = await invoke({
  workflow: [
    {
      id: "research",
      role: "research", 
      task: "Research modern authentication patterns for React/Node.js apps. Include JWT, OAuth, and session management best practices."
    },
    {
      id: "architect",
      role: "orchestrator",
      task: "Based on {research.output}, design authentication architecture including database schema, API endpoints, and frontend flow.",
      deps: ["research"]
    },
    {
      id: "backend-auth",
      role: "dev",
      task: "Implement backend authentication from {architect.output}: JWT middleware, auth routes, password hashing, session management.",
      deps: ["architect"]  
    },
    {
      id: "frontend-auth", 
      role: "dev",
      task: "Implement frontend authentication from {architect.output}: login/register forms, auth context, protected routes.",
      deps: ["architect"]
    },
    {
      id: "integration",
      role: "dev",
      task: "Integrate {backend-auth.output} and {frontend-auth.output}. Test auth flow end-to-end and fix any issues.",
      deps: ["backend-auth", "frontend-auth"]
    }
  ],
  threadId: "auth-feature-2025-01-07",
  projectId: "my-app"
})
```

### 2. Bug Investigation & Fix

```javascript
// Investigate and fix performance issue
const response = await invoke({
  workflow: [
    {
      id: "analyze",
      role: "debugging",
      task: "Analyze the reported performance issue: 'Dashboard loads slowly with 1000+ items'. Identify potential bottlenecks in React rendering, API calls, and data processing."
    },
    {
      id: "profile",
      role: "dev", 
      task: "Based on {analyze.output}, profile the application to identify specific performance bottlenecks. Use React DevTools and browser performance tools.",
      deps: ["analyze"]
    },
    {
      id: "optimize",
      role: "dev",
      task: "Implement optimizations for issues found in {profile.output}. Consider virtualization, memoization, API pagination, and caching strategies.",
      deps: ["profile"]  
    },
    {
      id: "test",
      role: "dev",
      task: "Test the optimizations from {optimize.output}. Measure performance improvements and ensure no regressions.",
      deps: ["optimize"]
    }
  ],
  threadId: "perf-fix-dashboard-001"
})
```

### 3. Code Review & Refactoring

```javascript
// Review and refactor legacy component
const response = await invoke({
  workflow: [
    {
      id: "review",
      role: "dev",
      task: "Review the UserProfile component for code quality issues. Check for: prop types, error handling, accessibility, performance, test coverage."
    },
    {
      id: "plan",
      role: "orchestrator", 
      task: "Based on {review.output}, create a refactoring plan with priorities: critical fixes, improvements, and nice-to-haves.",
      deps: ["review"]
    },
    {
      id: "refactor",
      role: "dev",
      task: "Implement the refactoring plan from {plan.output}. Maintain backward compatibility and existing functionality.",
      deps: ["plan"]
    },
    {
      id: "validate",
      role: "dev", 
      task: "Validate the refactored component from {refactor.output}. Run tests, check accessibility, and verify performance improvements.",
      deps: ["refactor"]
    }
  ]
})
```

### 4. Multi-Developer Coordination

```javascript
// Coordinate team on new feature
const response = await invoke({
  workflow: [
    {
      id: "architect",
      role: "orchestrator",
      task: "Design architecture for real-time chat feature: WebSocket setup, message storage, user presence, message history."
    },
    {
      id: "backend-websocket",
      role: "dev",
      task: "Implement WebSocket server from {architect.output}: connection handling, message broadcasting, room management.",
      deps: ["architect"]
    },
    {
      id: "backend-api",
      role: "dev", 
      task: "Implement REST API from {architect.output}: message CRUD, user management, chat history endpoints.",
      deps: ["architect"]
    },
    {
      id: "frontend-ui",
      role: "ux",
      task: "Design chat UI components from {architect.output}: message list, input, user list, notification system.",
      deps: ["architect"]
    },
    {
      id: "frontend-logic",
      role: "dev",
      task: "Implement chat logic using {frontend-ui.output} and integrating with {backend-websocket.output}: real-time messaging, state management.",
      deps: ["frontend-ui", "backend-websocket"]
    },
    {
      id: "testing",
      role: "dev",
      task: "Test integration of {backend-api.output} and {frontend-logic.output}. Include unit tests, integration tests, and manual testing.",
      deps: ["backend-api", "frontend-logic"]
    }
  ],
  threadId: "chat-feature-team-coordination"
})
```

## Workflow Patterns in Detail

### Sequential Pattern

**When to use**: Tasks that must happen in order.

```javascript
const sequential = [
  { id: "step1", role: "dev", task: "Create database schema" },
  { id: "step2", role: "dev", task: "Based on {step1.output}, create API layer", deps: ["step1"] },
  { id: "step3", role: "dev", task: "Based on {step2.output}, create frontend", deps: ["step2"] }
]
```

### Parallel Pattern  

**When to use**: Independent tasks that can run simultaneously.

```javascript
const parallel = [
  { id: "frontend", role: "dev", task: "Build React components" },
  { id: "backend", role: "dev", task: "Build API endpoints" },
  { id: "tests", role: "dev", task: "Write unit tests" },
  { id: "docs", role: "dev", task: "Write documentation" }
]
```

### Fan-out/Fan-in Pattern

**When to use**: One task feeds multiple parallel tasks, then converges.

```javascript
const fanOutIn = [
  { id: "requirements", role: "orchestrator", task: "Define requirements" },
  { id: "ui", role: "ux", task: "Design UI based on {requirements.output}", deps: ["requirements"] },
  { id: "api", role: "dev", task: "Build API based on {requirements.output}", deps: ["requirements"] },
  { id: "tests", role: "dev", task: "Write tests based on {requirements.output}", deps: ["requirements"] },
  { id: "integration", role: "dev", task: "Integrate {ui.output}, {api.output}, and {tests.output}", deps: ["ui", "api", "tests"] }
]
```

## Resume Examples

### Basic Resume

```javascript
// Original workflow (got interrupted)
const response1 = await invoke({
  workflow: longWorkflow,
  threadId: "my-long-task-123"
})
// Status: only 3/8 steps completed

// Resume later (same threadId)
const response2 = await invoke({
  workflow: longWorkflow,  // Same workflow definition
  threadId: "my-long-task-123"  // Same threadId = resume
})
// Continues from step 4
```

### Resume with Status Check

```javascript
// Check what completed
const status = await fetch('/api/invoke/status/my-long-task-123', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ steps: originalWorkflow })
})

const statusData = await status.json()
console.log(`Completed: ${statusData.completedSteps}/${originalWorkflow.length}`)
console.log(`Can resume: ${statusData.canResume}`)

// Resume if needed
if (statusData.canResume && statusData.completedSteps < originalWorkflow.length) {
  const resumeResponse = await invoke({
    workflow: originalWorkflow,
    threadId: "my-long-task-123"
  })
}
```

## Error Handling Examples

### Graceful Degradation

```javascript
try {
  const response = await invoke({
    workflow: complexWorkflow,
    threadId: "error-handling-example"
  })
  
  if (response.status === 'completed') {
    console.log('✅ All steps completed successfully')
  } else if (response.status === 'partial') {
    console.log('⚠️ Some steps failed, checking what completed...')
    
    // Check which steps completed
    Object.keys(response.results).forEach(stepId => {
      console.log(`✅ ${stepId}: completed`)
    })
    
    // Attempt to resume or handle failures
    const missingSteps = complexWorkflow.filter(step => 
      !response.results[step.id || `step-${complexWorkflow.indexOf(step)}`]
    )
    
    if (missingSteps.length > 0) {
      console.log('🔄 Retrying failed steps...')
      // Could retry just the failed steps or the whole workflow
    }
  }
  
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('🛑 Workflow was aborted, can resume later')
    // Session IDs are preserved for resume
  } else {
    console.error('❌ Workflow failed:', error.message)
  }
}
```

### Retry Logic

```javascript
async function robustInvoke(workflow, maxRetries = 3) {
  let lastError
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await invoke({
        workflow,
        threadId: `robust-${Date.now()}-attempt-${attempt}`
      })
      
      if (response.status === 'completed') {
        return response
      } else {
        console.log(`Attempt ${attempt} partially completed: ${Object.keys(response.results).length}/${workflow.length} steps`)
        lastError = new Error(`Partial completion: ${response.status}`)
      }
      
    } catch (error) {
      console.log(`Attempt ${attempt} failed:`, error.message)
      lastError = error
      
      if (attempt < maxRetries) {
        console.log(`Retrying in ${attempt * 2} seconds...`)
        await new Promise(resolve => setTimeout(resolve, attempt * 2000))
      }
    }
  }
  
  throw lastError
}
```

## Operator Testing Examples

### Test Custom Outputs

```javascript
// Test if your specific output format works with operator
const testOutput = `
## Implementation Complete

I have successfully implemented the user authentication system with the following components:

1. **JWT Middleware** - Token validation and user extraction
2. **Auth Routes** - Login, register, logout endpoints  
3. **Password Security** - Bcrypt hashing with salt rounds
4. **Session Management** - Redis-based session store

All tests are passing and the feature is ready for deployment.
`

const operatorResult = await fetch('/api/operator/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: testOutput,
    context: {
      role: "dev",
      task: "Implement backend authentication system with JWT and session management",
      roleSystemPrompt: "You are a senior backend developer specializing in secure authentication systems..."
    }
  })
})

const result = await operatorResult.json()
console.log(`Operator evaluation: ${result.status}`) // Should be 'success'
```

### Test Edge Cases

```javascript
// Test various output scenarios
const testCases = [
  {
    name: "Empty Output",
    text: "",
    expected: "failed"
  },
  {
    name: "Error Message", 
    text: "Error: Failed to connect to database",
    expected: "failed"
  },
  {
    name: "Blocked by Dependencies",
    text: "I cannot proceed without the database schema from the architect.",
    expected: "blocked"
  },
  {
    name: "Successful Implementation",
    text: "I have implemented the requested feature. Here's the code...",
    expected: "success"
  }
]

for (const testCase of testCases) {
  const response = await fetch('/api/operator/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: testCase.text })
  })
  
  const result = await response.json()
  const passed = result.status === testCase.expected
  console.log(`${passed ? '✅' : '❌'} ${testCase.name}: ${result.status} (expected: ${testCase.expected})`)
}
```

## Advanced Usage

### Dynamic Workflow Generation

```javascript
function generateTestingWorkflow(components) {
  const workflow = []
  
  // Add unit test step for each component
  components.forEach((component, index) => {
    workflow.push({
      id: `unit-test-${component}`,
      role: "dev",
      task: `Write comprehensive unit tests for ${component} component including edge cases, error handling, and mocking.`
    })
  })
  
  // Add integration test step that depends on all unit tests
  workflow.push({
    id: "integration-tests",
    role: "dev", 
    task: `Create integration tests that verify ${components.join(', ')} work together correctly. Use outputs: ${components.map(c => `{unit-test-${c}.output}`).join(', ')}`,
    deps: components.map(c => `unit-test-${c}`)
  })
  
  // Add end-to-end test step
  workflow.push({
    id: "e2e-tests",
    role: "dev",
    task: "Create end-to-end tests using {integration-tests.output} to verify complete user workflows.",
    deps: ["integration-tests"]
  })
  
  return workflow
}

// Use the generated workflow
const testWorkflow = generateTestingWorkflow(['UserProfile', 'UserSettings', 'UserPreferences'])
const response = await invoke({ workflow: testWorkflow })
```

### Conditional Logic Simulation

```javascript
// Simulate conditional logic with multiple paths
const codeAnalysisWorkflow = [
  {
    id: "analyze",
    role: "dev",
    task: "Analyze the codebase for technical debt. Categorize issues as: critical, important, or minor."
  },
  {
    id: "critical-fixes",
    role: "dev", 
    task: "If {analyze.output} contains critical issues, implement fixes immediately. Otherwise, create a plan for future fixes.",
    deps: ["analyze"]
  },
  {
    id: "refactor-plan",
    role: "orchestrator",
    task: "Based on {analyze.output} and {critical-fixes.output}, create a comprehensive refactoring roadmap with priorities and timelines.",
    deps: ["analyze", "critical-fixes"]
  }
]
```

## Production Monitoring

### Workflow Success Tracking

```javascript
// Track workflow success rates
class WorkflowMonitor {
  constructor() {
    this.stats = new Map()
  }
  
  async monitoredInvoke(workflow, threadId) {
    const startTime = Date.now()
    const workflowName = threadId || 'unnamed'
    
    try {
      const response = await invoke({ workflow, threadId })
      
      const duration = Date.now() - startTime
      const stepCount = Array.isArray(workflow) ? workflow.length : 1
      const completedSteps = Object.keys(response.results || {}).length
      
      this.recordSuccess(workflowName, {
        duration,
        stepCount,
        completedSteps,
        successRate: completedSteps / stepCount,
        status: response.status
      })
      
      return response
      
    } catch (error) {
      this.recordFailure(workflowName, error)
      throw error
    }
  }
  
  recordSuccess(name, metrics) {
    if (!this.stats.has(name)) {
      this.stats.set(name, { successes: 0, failures: 0, metrics: [] })
    }
    
    const stat = this.stats.get(name)
    stat.successes++
    stat.metrics.push(metrics)
  }
  
  recordFailure(name, error) {
    if (!this.stats.has(name)) {
      this.stats.set(name, { successes: 0, failures: 0, metrics: [] })
    }
    
    const stat = this.stats.get(name)
    stat.failures++
  }
  
  getStats() {
    const report = {}
    
    for (const [name, stats] of this.stats) {
      const total = stats.successes + stats.failures
      report[name] = {
        successRate: stats.successes / total,
        totalRuns: total,
        avgDuration: stats.metrics.reduce((sum, m) => sum + m.duration, 0) / stats.metrics.length,
        avgStepCompletion: stats.metrics.reduce((sum, m) => sum + m.successRate, 0) / stats.metrics.length
      }
    }
    
    return report
  }
}

// Usage
const monitor = new WorkflowMonitor()

const response = await monitor.monitoredInvoke(myWorkflow, 'feature-development')
console.log('Performance stats:', monitor.getStats())
```

This comprehensive example library covers all production scenarios you'll encounter during dogfooding. Each example is battle-tested and ready for real-world usage.