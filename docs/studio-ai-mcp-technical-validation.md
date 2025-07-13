# Studio AI MCP Technical Validation Tests

This document validates that ALL MCP configurations, parameters, and execution patterns work correctly.

## 1. Workflow Format Validation

### 1.1 Single Object Workflow
- [ ] **Test**: Basic single object
```json
{
  "workflow": {
    "role": "dev",
    "task": "TEST - Say: 'Single object works'"
  }
}
```
**Expected**: Works

### 1.2 Array Workflow
- [ ] **Test**: Basic array
```json
{
  "workflow": [
    {"role": "dev", "task": "TEST - Say: 'Array works'"}
  ]
}
```
**Expected**: Works

### 1.3 Mixed Array Sizes
- [ ] **Test**: 1 agent
```json
{"workflow": [{"role": "dev", "task": "TEST - 1 agent"}]}
```

- [ ] **Test**: 5 agents
```json
{
  "workflow": [
    {"role": "dev", "task": "TEST - Agent 1"},
    {"role": "ux", "task": "TEST - Agent 2"},
    {"role": "orchestrator", "task": "TEST - Agent 3"},
    {"role": "dev", "task": "TEST - Agent 4"},
    {"role": "ux", "task": "TEST - Agent 5"}
  ]
}
```

- [ ] **Test**: 10 agents
```json
{
  "workflow": [
    {"role": "dev", "task": "TEST - Agent 1"},
    {"role": "dev", "task": "TEST - Agent 2"},
    {"role": "dev", "task": "TEST - Agent 3"},
    {"role": "ux", "task": "TEST - Agent 4"},
    {"role": "ux", "task": "TEST - Agent 5"},
    {"role": "orchestrator", "task": "TEST - Agent 6"},
    {"role": "orchestrator", "task": "TEST - Agent 7"},
    {"role": "dev", "task": "TEST - Agent 8"},
    {"role": "ux", "task": "TEST - Agent 9"},
    {"role": "dev", "task": "TEST - Agent 10"}
  ]
}
```
**Expected**: All complete

- [ ] **Test**: 20 agents
- [ ] **Test**: 50 agents

## 2. Optional Parameters

### 2.1 With/Without Project ID
- [ ] **Test**: No projectId (uses current directory)
```json
{
  "workflow": {"role": "dev", "task": "TEST - No project ID"}
}
```

- [ ] **Test**: With projectId
```json
{
  "projectId": "test-project-123",
  "workflow": {"role": "dev", "task": "TEST - With project ID"}
}
```

### 2.2 Thread ID
- [ ] **Test**: No threadId (auto-generated)
```json
{
  "workflow": {"role": "dev", "task": "TEST - No thread ID"}
}
```

- [ ] **Test**: With threadId
```json
{
  "threadId": "custom-thread-123",
  "workflow": {"role": "dev", "task": "TEST - Custom thread ID"}
}
```

- [ ] **Test**: Same threadId reuse (session persistence)
```json
// Call 1
{"threadId": "persist-test", "workflow": {"role": "dev", "task": "TEST - Remember code ZEBRA"}}
// Call 2  
{"threadId": "persist-test", "workflow": {"role": "dev", "task": "TEST - What was the code?"}}
```
**Expected**: Remembers ZEBRA

### 2.3 Format Parameter
- [ ] **Test**: Default (JSON)
```json
{
  "workflow": {"role": "dev", "task": "TEST - Default format"}
}
```

- [ ] **Test**: Explicit JSON
```json
{
  "format": "json",
  "workflow": {"role": "dev", "task": "TEST - JSON format"}
}
```

- [ ] **Test**: Text format
```json
{
  "format": "text",
  "workflow": {"role": "dev", "task": "TEST - Text format"}
}
```
**Expected**: Plain text, no JSON wrapper

### 2.4 Start New Conversation
- [ ] **Test**: Default (continues conversation)
```json
// Setup
{"threadId": "conv-test", "workflow": {"role": "dev", "task": "TEST - Remember APPLE"}}
// Test default
{"threadId": "conv-test", "workflow": {"role": "dev", "task": "TEST - What fruit?"}}
```
**Expected**: Remembers APPLE

- [ ] **Test**: Force new conversation
```json
{"threadId": "conv-test", "startNewConversation": true, "workflow": {"role": "dev", "task": "TEST - What fruit?"}}
```
**Expected**: No memory of APPLE

## 3. Workflow Step Parameters

### 3.1 Required Fields Only
- [ ] **Test**: Minimal step
```json
{
  "workflow": {
    "role": "dev",
    "task": "TEST - Minimal fields only"
  }
}
```

### 3.2 With Optional ID
- [ ] **Test**: Custom IDs
```json
{
  "workflow": [
    {"id": "custom-1", "role": "dev", "task": "TEST - Custom ID 1"},
    {"id": "custom-2", "role": "ux", "task": "TEST - Custom ID 2"}
  ]
}
```

- [ ] **Test**: Mix of with/without IDs
```json
{
  "workflow": [
    {"role": "dev", "task": "TEST - No ID"},
    {"id": "has-id", "role": "ux", "task": "TEST - Has ID"},
    {"role": "orchestrator", "task": "TEST - No ID again"}
  ]
}
```

### 3.3 SessionId Parameter
- [ ] **Test**: Reference previous sessionId
```json
{
  "workflow": [
    {"id": "first", "role": "dev", "task": "TEST - First session"},
    {"id": "second", "role": "dev", "task": "TEST - Same session", "sessionId": "{first.sessionId}"}
  ]
}
```

## 4. Dependency Patterns

### 4.1 No Dependencies (Parallel)
- [ ] **Test**: All parallel
```json
{
  "workflow": [
    {"id": "a", "role": "dev", "task": "TEST - A starts"},
    {"id": "b", "role": "ux", "task": "TEST - B starts"},
    {"id": "c", "role": "orchestrator", "task": "TEST - C starts"}
  ]
}
```
**Expected**: All start simultaneously

### 4.2 Linear Dependencies
- [ ] **Test**: Sequential chain
```json
{
  "workflow": [
    {"id": "a", "role": "dev", "task": "TEST - A first"},
    {"id": "b", "role": "dev", "task": "TEST - B after A", "deps": ["a"]},
    {"id": "c", "role": "dev", "task": "TEST - C after B", "deps": ["b"]}
  ]
}
```
**Expected**: A→B→C order

### 4.3 Fan-Out Pattern
- [ ] **Test**: One to many
```json
{
  "workflow": [
    {"id": "root", "role": "dev", "task": "TEST - Root task"},
    {"id": "branch1", "role": "dev", "task": "TEST - Branch 1", "deps": ["root"]},
    {"id": "branch2", "role": "ux", "task": "TEST - Branch 2", "deps": ["root"]},
    {"id": "branch3", "role": "orchestrator", "task": "TEST - Branch 3", "deps": ["root"]}
  ]
}
```
**Expected**: Root first, then 3 branches parallel

### 4.4 Fan-In Pattern
- [ ] **Test**: Many to one
```json
{
  "workflow": [
    {"id": "input1", "role": "dev", "task": "TEST - Input 1"},
    {"id": "input2", "role": "ux", "task": "TEST - Input 2"},
    {"id": "input3", "role": "orchestrator", "task": "TEST - Input 3"},
    {"id": "merge", "role": "dev", "task": "TEST - Merge all", "deps": ["input1", "input2", "input3"]}
  ]
}
```
**Expected**: 3 inputs parallel, then merge

### 4.5 Diamond Pattern
- [ ] **Test**: Split and merge
```json
{
  "workflow": [
    {"id": "start", "role": "dev", "task": "TEST - Start"},
    {"id": "path1", "role": "dev", "task": "TEST - Path 1", "deps": ["start"]},
    {"id": "path2", "role": "ux", "task": "TEST - Path 2", "deps": ["start"]},
    {"id": "end", "role": "orchestrator", "task": "TEST - End", "deps": ["path1", "path2"]}
  ]
}
```

### 4.6 Complex Mixed Pattern
- [ ] **Test**: Parallel + Sequential mixed
```json
{
  "workflow": [
    {"id": "p1", "role": "dev", "task": "TEST - Parallel 1"},
    {"id": "p2", "role": "ux", "task": "TEST - Parallel 2"},
    {"id": "s1", "role": "orchestrator", "task": "TEST - Sequential after P1", "deps": ["p1"]},
    {"id": "s2", "role": "dev", "task": "TEST - Sequential after P2", "deps": ["p2"]},
    {"id": "merge", "role": "dev", "task": "TEST - Merge S1 and S2", "deps": ["s1", "s2"]},
    {"id": "p3", "role": "ux", "task": "TEST - Parallel 3"},
    {"id": "final", "role": "orchestrator", "task": "TEST - Final", "deps": ["merge", "p3"]}
  ]
}
```

## 5. Template Variables

### 5.1 Output References
- [ ] **Test**: Basic output reference
```json
{
  "workflow": [
    {"id": "gen", "role": "dev", "task": "TEST - Generate code ABC123"},
    {"id": "use", "role": "ux", "task": "TEST - Use code from {gen.output}", "deps": ["gen"]}
  ]
}
```
**Expected**: Second task mentions ABC123

### 5.2 Multiple References
- [ ] **Test**: Reference multiple outputs
```json
{
  "workflow": [
    {"id": "a", "role": "dev", "task": "TEST - Color RED"},
    {"id": "b", "role": "ux", "task": "TEST - Size LARGE"},
    {"id": "c", "role": "orchestrator", "task": "TEST - Combine {a.output} and {b.output}", "deps": ["a", "b"]}
  ]
}
```
**Expected**: Mentions both RED and LARGE

### 5.3 Nested References
- [ ] **Test**: Chain of references
```json
{
  "workflow": [
    {"id": "a", "role": "dev", "task": "TEST - Value 100"},
    {"id": "b", "role": "dev", "task": "TEST - Double {a.output}", "deps": ["a"]},
    {"id": "c", "role": "dev", "task": "TEST - Triple {b.output}", "deps": ["b"]}
  ]
}
```

### 5.4 SessionId References
- [ ] **Test**: Reference sessionId
```json
{
  "workflow": [
    {"id": "main", "role": "dev", "task": "TEST - Main session"},
    {"id": "sub", "role": "dev", "task": "TEST - Using session {main.sessionId}", "sessionId": "{main.sessionId}"}
  ]
}
```

## 6. Role Validation

### 6.1 Valid Roles
- [ ] **Test**: All configured roles work
```json
// Assuming dev, ux, orchestrator are configured
{"workflow": {"role": "dev", "task": "TEST - Dev role"}}
{"workflow": {"role": "ux", "task": "TEST - UX role"}}
{"workflow": {"role": "orchestrator", "task": "TEST - Orchestrator role"}}
```

### 6.2 Invalid Role
- [ ] **Test**: Non-existent role
```json
{"workflow": {"role": "invalid-role", "task": "TEST - Should fail"}}
```
**Expected**: Error message

### 6.3 Same Role Multiple Times
- [ ] **Test**: Reuse same role
```json
{
  "workflow": [
    {"id": "dev1", "role": "dev", "task": "TEST - Dev instance 1"},
    {"id": "dev2", "role": "dev", "task": "TEST - Dev instance 2"},
    {"id": "dev3", "role": "dev", "task": "TEST - Dev instance 3"}
  ]
}
```
**Expected**: All work, separate sessions

## 7. Status Detection

### 7.1 All Success
- [ ] **Test**: All tasks succeed
```json
{
  "workflow": [
    {"role": "dev", "task": "TEST - Task completed successfully"},
    {"role": "ux", "task": "TEST - Design implemented perfectly"},
    {"role": "orchestrator", "task": "TEST - Everything done and deployed"}
  ]
}
```
**Expected**: Status = "completed", summary: 3 successful

### 7.2 Mixed Status
- [ ] **Test**: Success + Blocked + Failed
```json
{
  "workflow": [
    {"role": "dev", "task": "TEST - Feature completed successfully"},
    {"role": "ux", "task": "TEST - Cannot proceed without design specs"},
    {"role": "orchestrator", "task": "TEST - Deployment failed with error"}
  ]
}
```
**Expected**: Status = "failed", summary: 1 successful, 1 blocked, 1 failed

### 7.3 All Blocked
- [ ] **Test**: All tasks blocked
```json
{
  "workflow": [
    {"role": "dev", "task": "TEST - Need API credentials"},
    {"role": "ux", "task": "TEST - Missing design requirements"},
    {"role": "orchestrator", "task": "TEST - Cannot deploy without approval"}
  ]
}
```
**Expected**: Status = "partial", summary: 3 blocked

## 8. Edge Cases

### 8.1 Empty Arrays/Objects
- [ ] **Test**: Empty workflow array
```json
{"workflow": []}
```
**Expected**: Error or empty result

- [ ] **Test**: Empty task
```json
{"workflow": {"role": "dev", "task": ""}}
```

### 8.2 Very Long Content
- [ ] **Test**: 1000+ char task
```json
{
  "workflow": {
    "role": "dev",
    "task": "TEST - [insert 1000+ character string]..."
  }
}
```

- [ ] **Test**: 100+ step workflow
```json
{
  "workflow": [
    // Generate 100 steps programmatically
  ]
}
```

### 8.3 Special Characters
- [ ] **Test**: JSON in task
```json
{
  "workflow": {
    "role": "dev",
    "task": "TEST - Parse this: {\"key\": \"value\", \"array\": [1,2,3]}"
  }
}
```

- [ ] **Test**: Template syntax in task
```json
{
  "workflow": {
    "role": "dev",
    "task": "TEST - This {looks.like} a template but isn't"
  }
}
```

### 8.4 Circular Dependencies
- [ ] **Test**: Self-reference
```json
{
  "workflow": [
    {"id": "self", "role": "dev", "task": "TEST - Self ref", "deps": ["self"]}
  ]
}
```
**Expected**: Error

- [ ] **Test**: Mutual dependency
```json
{
  "workflow": [
    {"id": "a", "role": "dev", "task": "TEST - A", "deps": ["b"]},
    {"id": "b", "role": "dev", "task": "TEST - B", "deps": ["a"]}
  ]
}
```
**Expected**: Error

### 8.5 Non-existent Dependencies
- [ ] **Test**: Reference missing ID
```json
{
  "workflow": [
    {"id": "exists", "role": "dev", "task": "TEST - Exists"},
    {"id": "broken", "role": "dev", "task": "TEST - Broken", "deps": ["does-not-exist"]}
  ]
}
```
**Expected**: Error

## 9. Performance Boundaries

### 9.1 Parallel Scaling
- [ ] 1 parallel agent
- [ ] 5 parallel agents
- [ ] 10 parallel agents
- [ ] 20 parallel agents
- [ ] 50 parallel agents
- [ ] 100 parallel agents
**Measure**: Completion time scales sub-linearly

### 9.2 Sequential Depth
- [ ] 2 levels deep
- [ ] 5 levels deep
- [ ] 10 levels deep
- [ ] 20 levels deep
- [ ] 50 levels deep
**Measure**: No stack overflow, completes

### 9.3 Workflow Size
- [ ] 10 total steps
- [ ] 50 total steps
- [ ] 100 total steps
- [ ] 500 total steps
**Measure**: Memory usage, completion time

## 10. All Parameter Combinations

### 10.1 Single Agent + All Params
- [ ] **Test**: Every parameter
```json
{
  "projectId": "test-proj",
  "threadId": "test-thread",
  "format": "text",
  "startNewConversation": false,
  "workflow": {
    "id": "test-id",
    "role": "dev",
    "task": "TEST - All params",
    "sessionId": "test-session"
  }
}
```

### 10.2 Multi-Agent + All Patterns
- [ ] **Test**: Kitchen sink
```json
{
  "projectId": "complex-test",
  "threadId": "complex-thread",
  "format": "json",
  "workflow": [
    // Parallel start
    {"id": "p1", "role": "dev", "task": "TEST - Parallel 1"},
    {"id": "p2", "role": "ux", "task": "TEST - Parallel 2"},
    
    // Sequential chain
    {"id": "s1", "role": "orchestrator", "task": "TEST - After {p1.output}", "deps": ["p1"]},
    {"id": "s2", "role": "dev", "task": "TEST - After {s1.output}", "deps": ["s1"]},
    
    // Fan out
    {"id": "f1", "role": "dev", "task": "TEST - Branch 1 from {p2.output}", "deps": ["p2"]},
    {"id": "f2", "role": "ux", "task": "TEST - Branch 2 from {p2.output}", "deps": ["p2"]},
    
    // Fan in
    {"id": "merge", "role": "orchestrator", "task": "TEST - Merge all", "deps": ["s2", "f1", "f2"]},
    
    // Use session reference
    {"id": "cont", "role": "dev", "task": "TEST - Continue {p1.sessionId}", "sessionId": "{p1.sessionId}", "deps": ["merge"]}
  ]
}
```

## Validation Summary

Configuration Tests:
- [ ] All workflow formats work (object/array)
- [ ] All optional parameters work
- [ ] All step parameters work
- [ ] All dependency patterns work
- [ ] All template variables work
- [ ] All roles validate correctly
- [ ] All status detections work
- [ ] All edge cases handled
- [ ] Performance scales appropriately
- [ ] All combinations work

This ensures EVERY configuration option and execution pattern works correctly before production.