# Basic Workflow Example

**Single-agent task execution demonstrating the fundamentals of Studio AI**

This example shows the simplest possible workflow: asking a single developer agent to create a "Hello World" function. Perfect for understanding the basics before moving to multi-agent workflows.

## 🎯 What You'll Learn

- How to structure a basic workflow
- Single-agent task delegation
- Workflow execution and monitoring
- Reading agent responses

## 📋 Workflow Overview

```mermaid
graph LR
    A[Start] --> B[Developer Agent]
    B --> C[Hello World Function]
    C --> D[Complete]
```

**Steps:**

1. **Developer Task** - Create a simple "Hello World" function in JavaScript

**Expected Duration:** 1-2 minutes

## 🚀 Quick Start

### Option 1: Import via UI

1. Open Studio AI at http://localhost:5173
2. Navigate to Workflow Builder
3. Click "Import Workflow"
4. Select `workflow.json` from this directory
5. Click "Execute Workflow"

### Option 2: Run via MCP API

```bash
# Ensure Studio AI is running
npm run dev

# Execute the workflow
mcp__studio-ai__invoke({
  workflow: {
    role: "developer",
    task: "Create a simple 'Hello World' function in JavaScript with proper documentation"
  },
  projectId: "basic-example"
})
```

### Option 3: Direct API Call

```javascript
const response = await fetch('http://localhost:3456/api/invoke', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    workflow: {
      role: 'developer',
      task: "Create a simple 'Hello World' function in JavaScript with proper documentation",
    },
    projectId: 'basic-example',
  }),
})
```

## 🔧 Configuration

### Mock Mode (Testing)

```bash
# In your .env file
USE_MOCK_AI=true
```

**Benefit:** No API costs, instant responses for testing

### Production Mode

```bash
# In your .env file
USE_MOCK_AI=false
ANTHROPIC_API_KEY=your_anthropic_key_here
```

**Benefit:** Real Claude AI responses with actual code generation

## 📊 Expected Output

The developer agent will create something like:

```javascript
/**
 * Simple Hello World function
 * @returns {string} Greeting message
 */
function helloWorld() {
  return 'Hello, World!'
}

// Example usage
console.log(helloWorld()) // Output: Hello, World!

// Export for module use
module.exports = helloWorld
```

## 🔍 Monitoring

### Real-time Updates

Watch the workflow execution in real-time:

- **WebSocket connection** shows live progress
- **Agent status** updates as the task executes
- **Completion notifications** when finished

### Execution Logs

Check the browser console for detailed logs:

```
[Workflow] Starting execution for basic-example
[Agent] Developer agent processing task
[Response] Task completed successfully
```

## 🎓 Learning Extensions

### 1. Modify the Task

Try different programming languages:

```json
{
  "role": "developer",
  "task": "Create a simple 'Hello World' function in Python with type hints"
}
```

### 2. Add Complexity

Request additional features:

```json
{
  "role": "developer",
  "task": "Create a 'Hello World' function that accepts a name parameter and includes unit tests"
}
```

### 3. Different Agent Roles

Try other agent types:

```json
{
  "role": "architect",
  "task": "Design the architecture for a simple greeting system"
}
```

## 🚦 Troubleshooting

### Common Issues

**"No agent found for role 'developer'"**

- Ensure you have a developer agent configured in your project
- Check agent configurations in Settings > Agents

**"Workflow execution failed"**

- Verify your API key is set correctly
- Check network connectivity
- Review browser console for error details

**"Task takes too long"**

- In mock mode: Should complete instantly
- In production mode: May take 10-30 seconds for Claude API

### Debug Mode

Enable detailed logging:

```bash
# In browser console
localStorage.setItem('debug', 'workflow:*')
```

## 🔗 Next Steps

After mastering this basic workflow:

1. **[Multi-Agent Development](../multi-agent-dev/)** - Learn agent coordination
2. **[Data Processing](../data-processing/)** - Explore loops and variables
3. **[Approval Workflows](../approval-workflows/)** - Add human oversight
4. **Create Your Own** - Build custom workflows for your needs

## 📝 Workflow File

The complete workflow configuration is available in [`workflow.json`](./workflow.json) in this directory.
