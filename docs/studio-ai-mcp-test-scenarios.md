# Studio AI MCP Test Scenarios

This document contains comprehensive test scenarios for the Studio AI MCP tools. Each scenario should be tested and checked off when verified.

## Test Environment Setup

- [ ] Claude Studio API running on http://localhost:3456
- [ ] MCP server configured and running
- [ ] Operator configuration set (Settings > Orchestration > Operator)
- [ ] At least 3 agents configured with different roles (dev, ux, orchestrator)

## 1. Single Agent Scenarios

### 1.1 Basic Single Agent Invocation
- [ ] **Test**: Simple task execution
```json
{
  "workflow": {
    "role": "dev",
    "task": "TEST - Say exactly: 'Hello from developer agent'"
  }
}
```
**Expected**: SUCCESS status, response contains exact message

### 1.2 Single Agent with Project Context
- [ ] **Test**: Agent uses project-specific context
```json
{
  "projectId": "my-project",
  "workflow": {
    "role": "dev",
    "task": "TEST - Say: 'Working on project [PROJECT_ID]'"
  }
}
```
**Expected**: Response mentions "my-project"

### 1.3 Single Agent Text Format
- [ ] **Test**: Get response as plain text
```json
{
  "workflow": {
    "role": "ux",
    "task": "TEST - Say: 'UX response in text format'"
  },
  "format": "text"
}
```
**Expected**: Plain text response without JSON wrapper

### 1.4 Single Agent - Status Detection Tests
- [ ] **Test SUCCESS**: Task completion
```json
{
  "workflow": {
    "role": "dev",
    "task": "TEST - Say: 'Feature implemented and all tests are passing'"
  }
}
```
**Expected**: Status = "completed"

- [ ] **Test BLOCKED**: Missing requirements
```json
{
  "workflow": {
    "role": "dev",
    "task": "TEST - Say: 'Cannot proceed because API credentials are missing'"
  }
}
```
**Expected**: Status = "partial" or "failed"

- [ ] **Test FAILED**: Error scenario
```json
{
  "workflow": {
    "role": "dev",
    "task": "TEST - Say: 'Build failed with error: undefined variable'"
  }
}
```
**Expected**: Status = "failed"

## 2. Session Persistence Scenarios

### 2.1 Basic Session Memory
- [ ] **Test Part 1**: Establish context
```json
{
  "threadId": "session-test-001",
  "workflow": {
    "role": "dev",
    "task": "TEST - Remember the secret code 'ALPHA-BRAVO-CHARLIE'. Say: 'Memorizing secret code ALPHA-BRAVO-CHARLIE'"
  }
}
```

- [ ] **Test Part 2**: Verify memory
```json
{
  "threadId": "session-test-001",
  "workflow": {
    "role": "dev",
    "task": "TEST - What was the secret code? Say it back."
  }
}
```
**Expected**: Agent recalls "ALPHA-BRAVO-CHARLIE"

### 2.2 Cross-Role Session Sharing
- [ ] **Test**: Different roles in same thread
```json
{
  "threadId": "cross-role-test",
  "workflow": [
    {
      "id": "dev-msg",
      "role": "dev",
      "task": "TEST - Say: 'Developer shares codeword ZEBRA'"
    },
    {
      "id": "ux-msg",
      "role": "ux",
      "task": "TEST - Say: 'UX designer acknowledges codeword'"
    }
  ]
}
```
**Expected**: Both complete successfully, maintain separate sessions

### 2.3 New Conversation Flag
- [ ] **Test**: Force new conversation
```json
{
  "threadId": "session-test-001",
  "startNewConversation": true,
  "workflow": {
    "role": "dev",
    "task": "TEST - Do you remember any secret code? If yes, say it. If no, say 'No memory of secret code'"
  }
}
```
**Expected**: Agent should not remember previous code

## 3. Multi-Agent Parallel Scenarios

### 3.1 Simple Parallel Execution
- [ ] **Test**: Two agents work simultaneously
```json
{
  "workflow": [
    {
      "id": "backend",
      "role": "dev",
      "task": "TEST - Say: 'Backend API completed in 2 seconds'"
    },
    {
      "id": "frontend",
      "role": "ux",
      "task": "TEST - Say: 'Frontend UI completed in 3 seconds'"
    }
  ]
}
```
**Expected**: Both complete, total time < sum of individual times

### 3.2 Large Parallel Execution
- [ ] **Test**: Many agents in parallel
```json
{
  "workflow": [
    {"id": "task1", "role": "dev", "task": "TEST - Say: 'Task 1 done'"},
    {"id": "task2", "role": "ux", "task": "TEST - Say: 'Task 2 done'"},
    {"id": "task3", "role": "orchestrator", "task": "TEST - Say: 'Task 3 done'"},
    {"id": "task4", "role": "dev", "task": "TEST - Say: 'Task 4 done'"},
    {"id": "task5", "role": "ux", "task": "TEST - Say: 'Task 5 done'"}
  ]
}
```
**Expected**: All 5 complete successfully

### 3.3 Mixed Status Parallel
- [ ] **Test**: Different statuses in parallel
```json
{
  "workflow": [
    {"id": "success", "role": "dev", "task": "TEST - Say: 'Module completed successfully'"},
    {"id": "blocked", "role": "ux", "task": "TEST - Say: 'Cannot create UI without design specs'"},
    {"id": "failed", "role": "orchestrator", "task": "TEST - Say: 'Deployment failed with error'"}
  ]
}
```
**Expected**: Summary shows 1 successful, 1 blocked, 1 failed

## 4. Dependency Chain Scenarios

### 4.1 Simple Linear Dependency
- [ ] **Test**: A → B → C chain
```json
{
  "workflow": [
    {
      "id": "analyze",
      "role": "dev",
      "task": "TEST - Say: 'Analysis complete: found 3 issues'"
    },
    {
      "id": "fix",
      "role": "dev",
      "task": "TEST - Based on {analyze.output}, say: 'Fixed all 3 issues'",
      "deps": ["analyze"]
    },
    {
      "id": "verify",
      "role": "orchestrator",
      "task": "TEST - Based on {fix.output}, say: 'Verified fixes are working'",
      "deps": ["fix"]
    }
  ]
}
```
**Expected**: Executes in order, each step references previous

### 4.2 Diamond Dependency
- [ ] **Test**: A → (B,C) → D pattern
```json
{
  "workflow": [
    {
      "id": "design",
      "role": "ux",
      "task": "TEST - Say: 'Design specs ready with BLUE theme'"
    },
    {
      "id": "frontend",
      "role": "dev",
      "task": "TEST - Using {design.output}, say: 'Frontend built with BLUE theme'",
      "deps": ["design"]
    },
    {
      "id": "backend",
      "role": "dev",
      "task": "TEST - Using {design.output}, say: 'Backend configured for BLUE theme'",
      "deps": ["design"]
    },
    {
      "id": "integrate",
      "role": "orchestrator",
      "task": "TEST - Merge {frontend.output} and {backend.output}. Say: 'BLUE theme integrated'",
      "deps": ["frontend", "backend"]
    }
  ]
}
```
**Expected**: Design runs first, frontend/backend parallel, integrate last

### 4.3 Complex Dependency Web
- [ ] **Test**: Multiple interconnected dependencies
```json
{
  "workflow": [
    {"id": "req", "role": "ux", "task": "TEST - Say: 'Requirements: Feature X with attribute Y'"},
    {"id": "arch", "role": "orchestrator", "task": "TEST - Design for {req.output}", "deps": ["req"]},
    {"id": "db", "role": "dev", "task": "TEST - Database for {arch.output}", "deps": ["arch"]},
    {"id": "api", "role": "dev", "task": "TEST - API using {db.output}", "deps": ["db", "arch"]},
    {"id": "ui", "role": "ux", "task": "TEST - UI for {api.output} and {req.output}", "deps": ["api", "req"]},
    {"id": "test", "role": "dev", "task": "TEST - Test {ui.output} and {api.output}", "deps": ["ui", "api"]},
    {"id": "deploy", "role": "orchestrator", "task": "TEST - Deploy after {test.output}", "deps": ["test"]}
  ]
}
```
**Expected**: Correct execution order maintained

## 5. Template Variable Scenarios

### 5.1 Simple Output Reference
- [ ] **Test**: Pass data between agents
```json
{
  "workflow": [
    {
      "id": "generate",
      "role": "dev",
      "task": "TEST - Generate random ID. Say: 'Generated ID: XYZ-123'"
    },
    {
      "id": "use",
      "role": "ux",
      "task": "TEST - Use the ID from {generate.output}",
      "deps": ["generate"]
    }
  ]
}
```
**Expected**: Second agent mentions "XYZ-123"

### 5.2 Multiple Variable References
- [ ] **Test**: Reference multiple outputs
```json
{
  "workflow": [
    {"id": "color", "role": "ux", "task": "TEST - Say: 'Primary color is RED'"},
    {"id": "font", "role": "ux", "task": "TEST - Say: 'Font family is Arial'"},
    {"id": "size", "role": "ux", "task": "TEST - Say: 'Base size is 16px'"},
    {
      "id": "combine",
      "role": "dev",
      "task": "TEST - Create CSS with {color.output}, {font.output}, and {size.output}",
      "deps": ["color", "font", "size"]
    }
  ]
}
```
**Expected**: Final output mentions RED, Arial, and 16px

## 6. Error Handling Scenarios

### 6.1 Invalid Role
- [ ] **Test**: Non-existent role
```json
{
  "workflow": {
    "role": "nonexistent",
    "task": "TEST - This should fail"
  }
}
```
**Expected**: Error message about invalid role

### 6.2 Circular Dependencies
- [ ] **Test**: A depends on B, B depends on A
```json
{
  "workflow": [
    {
      "id": "taskA",
      "role": "dev",
      "task": "TEST - Needs {taskB.output}",
      "deps": ["taskB"]
    },
    {
      "id": "taskB",
      "role": "dev",
      "task": "TEST - Needs {taskA.output}",
      "deps": ["taskA"]
    }
  ]
}
```
**Expected**: Error about circular dependency

### 6.3 Missing Required Fields
- [ ] **Test**: No workflow provided
```json
{
  "projectId": "test"
}
```
**Expected**: Error "Missing workflow in request"

### 6.4 Invalid Workflow Format
- [ ] **Test**: Wrong workflow structure
```json
{
  "workflow": "invalid string instead of object/array"
}
```
**Expected**: Error about invalid workflow format

## 7. Complex Real-World Scenarios

### 7.1 Code Review Loop
- [ ] **Test**: Developer → Reviewer → Fix → Approve
```json
// Step 1: Initial PR
{
  "threadId": "pr-review-loop-test",
  "workflow": {
    "role": "dev",
    "task": "TEST - Creating PR #1234 with feature RAINBOW. Say: 'PR #1234: RAINBOW feature ready for review'"
  }
}

// Step 2: Review with feedback
{
  "threadId": "pr-review-loop-test",
  "workflow": {
    "role": "orchestrator",
    "task": "TEST - Review PR #1234. What feature name do you see? Request: 'Add unit tests for RAINBOW feature'"
  }
}

// Step 3: Implement fixes
{
  "threadId": "pr-review-loop-test",
  "workflow": {
    "role": "dev",
    "task": "TEST - What feature am I working on? Say: 'Added unit tests for [FEATURE] in PR #1234'"
  }
}

// Step 4: Final approval
{
  "threadId": "pr-review-loop-test",
  "workflow": {
    "role": "orchestrator",
    "task": "TEST - Final review. If tests were added, say: 'PR #1234 approved for merge'"
  }
}
```
**Expected**: RAINBOW persists throughout, proper review flow

### 7.2 Full Sprint Simulation
- [ ] **Test**: Multiple PRs, developers, and reviewers
```json
{
  "threadId": "sprint-simulation",
  "workflow": [
    // Sprint planning
    {"id": "plan", "role": "orchestrator", "task": "TEST - Sprint plan: Feature A (dev1), Feature B (dev2), Feature C (dev1+dev2)"},
    
    // Development work
    {"id": "featA", "role": "dev", "task": "TEST - Implement Feature A with keyword ALPHA", "deps": ["plan"]},
    {"id": "featB", "role": "dev", "task": "TEST - Implement Feature B with keyword BETA", "deps": ["plan"]},
    
    // Cross-team feature
    {"id": "featC-backend", "role": "dev", "task": "TEST - Feature C backend with {featA.output} integration", "deps": ["featA", "plan"]},
    {"id": "featC-frontend", "role": "ux", "task": "TEST - Feature C UI using {featB.output} patterns", "deps": ["featB", "plan"]},
    
    // Reviews
    {"id": "reviewA", "role": "orchestrator", "task": "TEST - Review {featA.output}. Check for ALPHA", "deps": ["featA"]},
    {"id": "reviewB", "role": "ux", "task": "TEST - Review {featB.output}. Check for BETA", "deps": ["featB"]},
    {"id": "reviewC", "role": "orchestrator", "task": "TEST - Review integrated Feature C", "deps": ["featC-backend", "featC-frontend"]},
    
    // Sprint summary
    {"id": "summary", "role": "orchestrator", "task": "TEST - Sprint complete. Summarize all features and keywords found", "deps": ["reviewA", "reviewB", "reviewC"]}
  ]
}
```
**Expected**: Complex workflow completes, keywords preserved

### 7.3 Incident Response Scenario
- [ ] **Test**: Alert → Diagnose → Fix → Verify
```json
{
  "workflow": [
    {"id": "alert", "role": "orchestrator", "task": "TEST - ALERT: Database connection timeout at 2:30 AM"},
    {"id": "diagnose", "role": "dev", "task": "TEST - Investigating {alert.output}. Found: connection pool exhausted", "deps": ["alert"]},
    {"id": "fix", "role": "dev", "task": "TEST - Based on {diagnose.output}, increased pool size from 10 to 50", "deps": ["diagnose"]},
    {"id": "verify", "role": "orchestrator", "task": "TEST - Verify {fix.output}. Monitoring for 30 minutes", "deps": ["fix"]},
    {"id": "report", "role": "dev", "task": "TEST - Incident report: {alert.output} resolved by {fix.output}", "deps": ["verify"]}
  ]
}
```
**Expected**: Proper incident flow, context preserved

## 8. Performance and Stress Tests

### 8.1 Rapid Sequential Calls
- [ ] **Test**: 10 rapid invocations
```javascript
// Execute 10 times rapidly
for (let i = 0; i < 10; i++) {
  invoke({
    workflow: {
      role: "dev",
      task: `TEST - Rapid call ${i}`
    }
  })
}
```
**Expected**: All complete without errors

### 8.2 Large Workflow
- [ ] **Test**: 20+ steps in single workflow
```json
{
  "workflow": [
    // Generate 20 tasks programmatically
    {"id": "task1", "role": "dev", "task": "TEST - Step 1 of 20"},
    {"id": "task2", "role": "ux", "task": "TEST - Step 2 of 20", "deps": ["task1"]},
    // ... continue to task20
  ]
}
```
**Expected**: Completes within timeout, correct execution order

### 8.3 Deep Dependency Chain
- [ ] **Test**: 10 levels deep
```json
{
  "workflow": [
    {"id": "level1", "role": "dev", "task": "TEST - Level 1 passes value: START"},
    {"id": "level2", "role": "dev", "task": "TEST - Level 2 got {level1.output}", "deps": ["level1"]},
    {"id": "level3", "role": "dev", "task": "TEST - Level 3 got {level2.output}", "deps": ["level2"]},
    // ... continue to level10
  ]
}
```
**Expected**: "START" propagates through all levels

## 9. Edge Cases

### 9.1 Empty Task
- [ ] **Test**: Empty task string
```json
{
  "workflow": {
    "role": "dev",
    "task": ""
  }
}
```
**Expected**: Handles gracefully

### 9.2 Very Long Task
- [ ] **Test**: 1000+ character task
```json
{
  "workflow": {
    "role": "dev",
    "task": "TEST - [Insert 1000+ character string here]"
  }
}
```
**Expected**: Processes without truncation

### 9.3 Special Characters in Output
- [ ] **Test**: Preserve special characters
```json
{
  "workflow": [
    {"id": "special", "role": "dev", "task": "TEST - Say: 'Code: {\"key\": \"value\", \"special\": \"@#$%^&*()\"}'"},
    {"id": "use", "role": "ux", "task": "TEST - Echo {special.output}", "deps": ["special"]}
  ]
}
```
**Expected**: Special characters preserved

### 9.4 Unicode and Emojis
- [ ] **Test**: International characters
```json
{
  "workflow": {
    "role": "dev",
    "task": "TEST - Say: '你好世界 🌍 مرحبا بالعالم'"
  }
}
```
**Expected**: Unicode preserved correctly

## 10. Integration Tests

### 10.1 With get_roles
- [ ] **Test**: Verify roles before invoking
```javascript
// First: get_roles()
// Then: invoke with one of the returned roles
```
**Expected**: Returned roles work in invoke

### 10.2 With list_agents
- [ ] **Test**: List agents and use their roles
```javascript
// First: list_agents()
// Then: invoke using roles from the list
```
**Expected**: All listed agent roles work

### 10.3 With AI Capabilities
- [ ] **Test**: Execute capability then invoke
```javascript
// First: execute_debugging({ input: "test" })
// Then: invoke({ workflow: { role: "dev", task: "continue debugging" } })
```
**Expected**: Both work independently

## Test Summary

Total Tests: 50+
- [ ] All single agent tests passing
- [ ] All session persistence tests passing
- [ ] All multi-agent tests passing
- [ ] All dependency tests passing
- [ ] All template variable tests passing
- [ ] All error handling tests passing
- [ ] All complex scenario tests passing
- [ ] All performance tests passing
- [ ] All edge case tests passing
- [ ] All integration tests passing

## Notes

1. Tests marked "TEST" should be executed with explicit test indicators to prevent agents from performing real work
2. Session tests should verify actual memory, not hallucination
3. Performance tests should measure actual execution time
4. Error tests should verify specific error messages
5. Complex scenarios should be run in sequence as shown

## Automation Script

```bash
#!/bin/bash
# Run all tests and generate report
# TODO: Create automated test runner
```