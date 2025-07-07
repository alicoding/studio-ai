# MCP Studio AI Invoke - Troubleshooting Guide

## Quick Diagnosis

### 🔍 Check List (Run These First)

```bash
# 1. Server Health
curl -s http://localhost:3456/api/health || echo "❌ Server not responding"

# 2. Agent Roles Available  
curl -s http://localhost:3456/api/studio-ai/roles || echo "❌ No agents configured"

# 3. Operator Configuration
curl -s http://localhost:3456/api/operator/config || echo "❌ Operator not configured"

# 4. Test Simple Workflow
curl -X POST http://localhost:3456/api/invoke \
  -H "Content-Type: application/json" \
  -d '{"workflow":{"role":"dev","task":"Say hello world"}}' \
  --max-time 30 || echo "❌ Basic invoke failed"
```

## Common Issues & Solutions

### 1. "No agent found for role: X"

**Symptoms:**
```json
{
  "error": "No agent found for role: backend-dev"
}
```

**Cause:** Agent with specified role not configured in Studio AI.

**Solution:**
```bash
# Check available roles
curl http://localhost:3456/api/studio-ai/roles

# Expected response:
# ["dev", "orchestrator", "ux", "research", ...]

# If role missing, configure in Studio AI UI:
# 1. Go to Settings → Agents
# 2. Add agent with role "backend-dev"
# 3. Set system prompt and model
```

**Quick Fix:**
```javascript
// Use existing role instead
const workflow = [
  { id: "backend", role: "dev", task: "Create backend logic" }, // ✅ Use "dev"
  // { id: "backend", role: "backend-dev", task: "..." }        // ❌ Custom role
]
```

### 2. Workflow Steps Not Executing (Only First Step Completes)

**Symptoms:**
```json
{
  "status": "failed",
  "results": {
    "step1": "I have created the plan..."
  }
  // step2, step3 missing
}
```

**Cause:** Operator marking successful outputs as FAILED.

**Diagnosis:**
```bash
# Test operator on the first step's output
curl -X POST http://localhost:3456/api/operator/test \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I have created the plan...",
    "context": {
      "role": "orchestrator", 
      "task": "Create project plan"
    }
  }'

# Should return: {"status": "success"}
# If returns "failed", operator needs reconfiguration
```

**Solution:**
```bash
# Reset operator to working configuration
curl -X PUT http://localhost:3456/api/operator/config \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "temperature": 0,
    "maxTokens": 10
  }'
```

### 3. Template Variables Not Resolving

**Symptoms:**
```
Task: "Based on {architect.output}, implement the backend"
Actual: "Based on {architect.output}, implement the backend"
```

**Cause:** Variable name mismatch or missing dependency.

**Diagnosis:**
```javascript
// Check workflow step IDs match template variables
const workflow = [
  { id: "architect", role: "orchestrator", task: "Design system" },
  { 
    id: "backend", 
    role: "dev", 
    task: "Implement {architect.output}",  // ✅ ID matches
    deps: ["architect"]                    // ✅ Dependency declared
  }
]

// Common mistakes:
// {step1.output} but id is "architect" 
// {architect.output} but no deps: ["architect"]
```

**Solution:**
```javascript
// Ensure ID and template variable match
const fixed = [
  { id: "step1", role: "orchestrator", task: "..." },
  { 
    id: "step2", 
    role: "dev",
    task: "Based on {step1.output}, implement...",  // ✅ Matches id: "step1"
    deps: ["step1"]                                 // ✅ Must include dependency
  }
]
```

### 4. Workflows Hanging/Timing Out

**Symptoms:**
- Request never completes
- No response after several minutes
- Claude processes stuck

**Causes & Solutions:**

#### A. Short Timeout (Fixed)
```bash
# Check timeout configuration
grep -r "REQUEST_TIMEOUT" web/server/mcp/studio-ai/
# Should show: REQUEST_TIMEOUT = 3600000 (1 hour)

# If still 60000 (1 minute), update:
# File: web/server/mcp/studio-ai/src/invokeTools.ts
# Change: REQUEST_TIMEOUT = 3600000
```

#### B. Operator Model Issues
```bash
# Check operator model
curl http://localhost:3456/api/operator/config

# If using unreliable model, switch:
curl -X PUT http://localhost:3456/api/operator/config \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-3.5-turbo"}'
```

#### C. Network/API Issues
```bash
# Test direct operator call
curl -X POST http://localhost:3456/api/operator/test \
  -H "Content-Type: application/json" \
  -d '{"text": "test"}' \
  --max-time 15

# If this hangs, check API keys:
echo $ELECTRONHUB_API_KEY
echo $VITE_ELECTRONHUB_API_KEY
```

### 5. Session Resume Not Working

**Symptoms:**
- Same threadId restarts workflow from beginning
- Lost previous progress
- "Cannot resume" errors

**Diagnosis:**
```bash
# Check if threadId exists in state
curl -X POST http://localhost:3456/api/invoke/status/your-thread-id \
  -H "Content-Type: application/json" \
  -d '{"steps": [/* original workflow steps */]}'

# Expected response:
# {
#   "completedSteps": 3,
#   "canResume": true,
#   "sessionIds": {"step1": "...", "step2": "..."}
# }
```

**Common Issues:**
```javascript
// ❌ Different workflow steps for resume
const original = [{ id: "step1", role: "dev", task: "..." }]
const resume = [{ id: "different", role: "dev", task: "..." }]  // Wrong

// ✅ Exact same workflow for resume
const workflow = [{ id: "step1", role: "dev", task: "..." }]
await invoke({ workflow, threadId: "same-id" })  // Original
await invoke({ workflow, threadId: "same-id" })  // Resume (same workflow)
```

### 6. Memory/Performance Issues

**Symptoms:**
- Server running out of memory
- Slow response times
- Large workflow failures

**Solutions:**

#### A. Reduce Workflow Size
```javascript
// ❌ Too many steps at once
const huge = Array(50).fill().map((_, i) => ({
  id: `step${i}`, role: "dev", task: "Do work"
}))

// ✅ Break into smaller workflows
const batch1 = [/* steps 1-10 */]
const batch2 = [/* steps 11-20 */]
// Run separately and chain results
```

#### B. Clean Up Old Sessions
```bash
# Clear LangGraph memory (if needed)
# This removes old workflow states
# Location: configured in WorkflowOrchestrator memory settings
```

#### C. Monitor Resource Usage
```bash
# Check Node.js memory usage
ps aux | grep tsx | grep -v grep

# Check server logs for memory warnings
tail -f web/server/logs/app.log
```

### 7. API Key/Authentication Issues

**Symptoms:**
```json
{
  "error": "ElectronHub API key not configured for operator"
}
```

**Solution:**
```bash
# Set API key (choose one method)

# Method 1: Environment variable
export ELECTRONHUB_API_KEY="your-key-here"

# Method 2: Operator config
curl -X PUT http://localhost:3456/api/operator/config \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "your-key-here"}'

# Method 3: Check .env file
echo "ELECTRONHUB_API_KEY=your-key-here" >> .env
```

### 8. Context-Aware Operator Issues

**Symptoms:**
- Good outputs marked as FAILED
- Inconsistent status detection
- False negatives

**Diagnosis:**
```bash
# Test with and without context
curl -X POST http://localhost:3456/api/operator/test \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I have implemented the requested feature with comprehensive error handling.",
    "context": {
      "role": "dev",
      "task": "Implement user authentication with error handling",
      "roleSystemPrompt": "You are a senior developer..."
    }
  }'

# Compare with no context:
curl -X POST http://localhost:3456/api/operator/test \
  -H "Content-Type: application/json" \
  -d '{"text": "I have implemented the requested feature with comprehensive error handling."}'
```

**Solution:**
```bash
# Ensure context is being passed (check WorkflowOrchestrator.ts line ~265)
# Should include: role, task, roleSystemPrompt in operator.checkStatus call
```

## Error Codes Reference

### HTTP Status Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 400 | Bad Request | Check request format, required fields |
| 404 | Not Found | Verify API endpoint, server running |
| 500 | Server Error | Check server logs, restart if needed |
| 504 | Timeout | Increase timeout, check network |

### Workflow Status Codes

| Status | Meaning | Next Steps |
|--------|---------|------------|
| `completed` | All steps successful | ✅ Workflow done |
| `failed` | Critical step failed | Check operator, retry |
| `partial` | Some steps completed | Resume or debug failures |
| `aborted` | User/system canceled | Can resume later |

### Operator Status Codes

| Status | Meaning | Cause |
|--------|---------|-------|
| `success` | Output fulfills task | ✅ Step can proceed |
| `blocked` | Missing dependencies | Wait for dependencies |
| `failed` | Error or empty output | Fix step or retry |

## Debug Tools

### 1. Workflow State Inspector

```javascript
async function inspectWorkflow(threadId, originalSteps) {
  const response = await fetch(`/api/invoke/status/${threadId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ steps: originalSteps })
  })
  
  const status = await response.json()
  
  console.log('📊 Workflow Inspection:')
  console.log(`   Completed: ${status.completedSteps}/${originalSteps.length}`)
  console.log(`   Can Resume: ${status.canResume}`)
  console.log(`   Session IDs: ${Object.keys(status.sessionIds || {}).length}`)
  
  if (status.stepDetails) {
    status.stepDetails.forEach(step => {
      const icon = step.status === 'success' ? '✅' : step.status === 'failed' ? '❌' : '⏸️'
      console.log(`   ${icon} ${step.id}: ${step.status}`)
    })
  }
  
  return status
}
```

### 2. Operator Accuracy Tester

```javascript
async function testOperatorAccuracy() {
  const testCases = [
    {
      text: "I have successfully implemented the requested feature. The code is working correctly.",
      expected: "success",
      context: { role: "dev", task: "Implement feature" }
    },
    {
      text: "I cannot proceed without the database schema from the architect.",
      expected: "blocked", 
      context: { role: "dev", task: "Implement backend" }
    },
    {
      text: "Error: Failed to connect to database. Connection refused.",
      expected: "failed",
      context: { role: "dev", task: "Setup database" }
    }
  ]
  
  let correct = 0
  
  for (const test of testCases) {
    const response = await fetch('/api/operator/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: test.text, context: test.context })
    })
    
    const result = await response.json()
    const isCorrect = result.status === test.expected
    
    console.log(`${isCorrect ? '✅' : '❌'} Expected: ${test.expected}, Got: ${result.status}`)
    
    if (isCorrect) correct++
  }
  
  const accuracy = (correct / testCases.length) * 100
  console.log(`\n🎯 Operator Accuracy: ${accuracy}%`)
  
  if (accuracy < 100) {
    console.log('⚠️ Consider reconfiguring operator system prompt or model')
  }
  
  return accuracy
}
```

### 3. Performance Monitor

```javascript
async function monitorPerformance(workflow, threadId) {
  const startTime = Date.now()
  let stepTimes = []
  
  // Monitor workflow execution
  const response = await invoke({ workflow, threadId })
  
  const totalTime = Date.now() - startTime
  const stepCount = Array.isArray(workflow) ? workflow.length : 1
  const avgTimePerStep = totalTime / stepCount
  
  console.log('⚡ Performance Metrics:')
  console.log(`   Total Time: ${totalTime}ms`)
  console.log(`   Steps: ${stepCount}`)
  console.log(`   Avg/Step: ${avgTimePerStep}ms`) 
  console.log(`   Completed: ${Object.keys(response.results || {}).length}/${stepCount}`)
  
  // Flag slow performance
  if (avgTimePerStep > 60000) {  // > 1 minute per step
    console.log('🐌 WARNING: Slow performance detected')
    console.log('   Consider: simpler tasks, parallel execution, operator tuning')
  }
  
  return { totalTime, avgTimePerStep, stepCount }
}
```

## Emergency Procedures

### 1. Complete System Reset

```bash
# Stop all processes
pkill -f "claude-code"
pkill -f "tsx.*app.ts"

# Reset operator configuration
curl -X POST http://localhost:3456/api/operator/reset

# Restart server
npm run server

# Test basic functionality
curl -X POST http://localhost:3456/api/invoke \
  -H "Content-Type: application/json" \
  -d '{"workflow":{"role":"dev","task":"Say hello"}}' \
  --max-time 30
```

### 2. Clear Workflow State

```bash
# Clear all LangGraph memory (if corrupted)
# Location depends on MemorySaver configuration
# Check WorkflowOrchestrator.ts for memory storage location

# Alternative: Use unique threadIds to avoid state conflicts
const freshThreadId = `emergency-${Date.now()}`
```

### 3. Minimal Working Example

```javascript
// Test with absolute minimum workflow
const minimal = {
  workflow: {
    role: "dev",
    task: "Respond with 'Hello World'"
  },
  threadId: `test-${Date.now()}`
}

const response = await invoke(minimal)
console.log('Minimal test result:', response.status)
```

## Getting Help

### 1. Collect Debug Information

```bash
# System info
echo "Node version: $(node --version)"
echo "Server status: $(curl -s http://localhost:3456/api/health | jq -r '.status')"
echo "Operator model: $(curl -s http://localhost:3456/api/operator/config | jq -r '.model')"

# Recent logs
tail -n 50 web/server/logs/app.log

# Environment
env | grep -E "(ELECTRONHUB|CLAUDE|VITE)" | sort
```

### 2. Create Minimal Reproduction

```javascript
// Always provide a minimal example that reproduces the issue
const reproCase = {
  workflow: [
    { id: "step1", role: "dev", task: "Create simple function" },
    { id: "step2", role: "dev", task: "Test {step1.output}", deps: ["step1"] }
  ],
  threadId: "repro-case-001"
}

// Include exact error message and expected vs actual behavior
```

### 3. Documentation References

- **Production Guide**: `/docs/mcp-invoke-production-guide.md`
- **Examples**: `/docs/mcp-invoke-examples.md`  
- **This Troubleshooting**: `/docs/mcp-invoke-troubleshooting.md`
- **MCP Server**: `/web/server/mcp/studio-ai/`
- **Test Results**: Previous test files show working configurations

The MCP invoke system is battle-tested and production-ready. Most issues are configuration-related and can be resolved using this guide.