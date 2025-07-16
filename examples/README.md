# Claude Studio Examples

This directory contains working examples of Claude Studio workflows demonstrating various patterns and use cases.

## 🚀 Getting Started

Each example includes:

- **README.md** - Explanation and setup instructions
- **workflow.json** - Complete workflow configuration
- **screenshots/** - Visual examples of the workflow in action

## 📁 Examples

### [Basic Workflow](./basic-workflow/)

**Single-agent task execution**

- Simple task delegation to a developer agent
- Perfect for learning the basics
- **Time**: 2 minutes

### [Multi-Agent Development](./multi-agent-dev/)

**Software development with specialized roles**

- Architect designs, Developer implements, Tester validates
- Shows dependency management and output passing
- **Time**: 5-10 minutes

### [Approval Workflows](./approval-workflows/)

**Human-in-the-loop patterns**

- Critical tasks requiring human approval
- Timeout behaviors and risk assessment
- **Time**: Varies (includes human interaction)

### [Data Processing](./data-processing/)

**Loop-based data transformation**

- Process multiple files with variable substitution
- Error handling and parallel execution
- **Time**: 3-5 minutes

### [Testing Automation](./testing-automation/)

**Quality assurance workflows**

- Automated testing with conditional execution
- Test result analysis and reporting
- **Time**: 5-15 minutes

## 🎯 Usage Patterns

### Import via UI

1. Open Claude Studio at http://localhost:5173
2. Go to Workflow Builder
3. Click "Import Workflow"
4. Select the `workflow.json` file from any example

### Import via MCP API

```bash
# Using the studio-ai MCP tool
mcp__studio-ai__load_workflow({
  workflowId: "example-basic-workflow"
})
```

### Execute Programmatically

```javascript
// Using the invoke API directly
const result = await invoke({
  workflow: [
    { id: 'step1', role: 'developer', task: 'Create a hello world function' },
    { id: 'step2', role: 'tester', task: 'Test the function from step1', deps: ['step1'] },
  ],
  projectId: 'my-project',
})
```

## 🔧 Customization

### Modify Agent Roles

Each workflow uses standard roles:

- `architect` - System design and planning
- `developer` - Implementation and coding
- `tester` - Quality assurance and validation
- `reviewer` - Code review and feedback
- `orchestrator` - Coordination and decision making

### Adjust Execution

- **Mock Mode**: Set `USE_MOCK_AI=true` for testing without API costs
- **Real Agents**: Configure with actual Anthropic API keys for production
- **Custom Agents**: Create your own agent configurations

### Environment Variables

```bash
# Enable mock mode for testing
USE_MOCK_AI=true

# Use real Claude API
ANTHROPIC_API_KEY=your_key_here
USE_MOCK_AI=false
```

## 📖 Learning Path

1. **Start with Basic Workflow** - Learn single-agent execution
2. **Try Multi-Agent Development** - Understand dependencies and coordination
3. **Explore Approval Workflows** - See human-in-the-loop patterns
4. **Experiment with Data Processing** - Master loops and variables
5. **Build Testing Automation** - Implement quality gates

## 🤝 Contributing Examples

Have a useful workflow pattern? Contribute it!

1. Create a new directory under `examples/`
2. Include `README.md`, `workflow.json`, and optional screenshots
3. Test with both mock and real modes
4. Submit a pull request

### Example Structure

```
examples/your-example/
├── README.md              # Description and instructions
├── workflow.json          # Complete workflow definition
├── screenshots/           # Visual examples
│   ├── workflow-view.png
│   └── execution-log.png
└── variations/            # Optional variants
    ├── simple.json
    └── advanced.json
```

## 🔍 Troubleshooting

### Common Issues

**Workflow fails to import**

- Check JSON syntax with a validator
- Ensure all required fields are present
- Verify agent roles exist in your project

**Execution gets stuck**

- Check agent configurations and API keys
- Verify network connectivity
- Review logs in browser console

**Dependencies not working**

- Ensure `deps` array references valid step IDs
- Check for circular dependencies
- Verify execution order makes logical sense

### Getting Help

- Check the main [documentation](../docs/)
- Review [troubleshooting guide](../docs/troubleshooting.md)
- Ask in [GitHub Discussions](https://github.com/anthropics/studio-ai/discussions)

## 🚀 Next Steps

After exploring examples:

- Build your own custom workflows
- Create agent teams for your specific use cases
- Integrate Claude Studio into your development process
- Share your patterns with the community

Happy orchestrating! 🎼
