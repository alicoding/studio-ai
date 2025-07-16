# Studio AI

**The Universal AI Agent Orchestration Platform**

Studio AI enables asynchronous communication and collaboration between AI coding agents through the Model Context Protocol (MCP). Orchestrate Claude Code, Gemini CLI, and future AI agents to work together on complex software projects.

## 🎯 Core Innovation

Studio AI is the **first platform** that allows different AI coding agents to:

- **Communicate asynchronously** through MCP-based message passing
- **Share context and outputs** between different AI systems (Claude → Gemini → Custom)
- **Build workflows programmatically** - AI agents can create workflows for other agents
- **Work autonomously** on scheduled tasks and complex multi-step projects

Think of it as **n8n for AI consciousness** - but instead of connecting APIs, you're connecting AI minds.

## 🚀 Quick Start

```bash
# Clone and start
git clone https://github.com/alicoding/studio-ai.git
cd studio-ai
npm install

# Configure your AI agents
cp .env.example .env
# Add your API keys (Anthropic, Google, etc.)

# Start the platform
npm run dev
```

Access at http://localhost:5173

## 💡 What Can You Build?

### Example: Multi-Agent Code Review

```javascript
// Claude architect designs, Gemini implements, Claude reviews
{
  workflow: [
    {
      id: 'design',
      agent: 'claude_architect',
      task: 'Design the authentication system',
    },
    {
      id: 'implement',
      agent: 'gemini_developer',
      task: 'Implement based on: {design.output}',
      deps: ['design'],
    },
    {
      id: 'review',
      agent: 'claude_reviewer',
      task: 'Review implementation: {implement.output}',
      deps: ['implement'],
    },
  ]
}
```

## 🏗️ Current Features (Working Now)

### ✅ Core Platform

- **MCP Integration**: Native control of Claude Code through MCP
- **Agent Orchestration**: Sequential and parallel task execution
- **Workflow Builder**: Visual interface for creating agent workflows
- **Real-time Monitoring**: Split-view workspace for agent collaboration
- **Project Management**: Create, manage, and organize AI projects
- **Tool Permissions**: Granular control over agent capabilities

### ✅ Pages & Functionality

#### `/` - Dashboard

- Quick resume for projects and workflows
- Recent activity tracking

#### `/workspace` - Command Center

- Real-time agent communication monitoring
- Split/Grid view for multiple agents
- Direct chat with AI agents
- Project-specific workflow creation

#### `/projects` - Project Hub

- Create new projects with CLAUDE.md
- Git initialization
- Add agents to projects
- Basic project management (clone, delete, edit)

#### `/agents` - Agent Templates

- Create specialized agent roles (Architect, Developer, Tester)
- Configure system prompts and tool permissions
- Save reusable agent configurations

#### `/teams` - Team Templates

- Combine agents into reusable teams
- Pre-configured agent groups for common scenarios

#### `/workflows` - Workflow Builder (Beta)

- Visual workflow creation
- Basic control flow nodes (Conditional, Loop, Parallel)
- Human approval nodes
- Save and load workflow templates

#### `/settings` - Configuration

- AI provider configuration
- MCP server management
- Hook system for pre/post tool events

## 🔮 Roadmap (Coming Soon)

### Phase 1: Multi-Agent Support (Q1 2025)

- [ ] **Gemini CLI Integration** - Google's coding agent
- [ ] **Cursor Support** - Popular AI code editor
- [ ] **Windsurf Integration** - Codeium's agent
- [ ] **Universal Agent Protocol** - Support any MCP-compatible agent

### Phase 2: Enhanced Platform (Q2 2025)

- [ ] **VSCode Web Integration** - Browse and edit code in workspace
- [ ] **Advanced Chat UI** - Rich formatting, code highlighting
- [ ] **Project Templates** - Bootstrap common project types
- [ ] **Import Existing Projects** - One-click project import
- [ ] **Workflow Marketplace** - Community nodes and templates
- [ ] **Agent Marketplace** - Share specialized agent configurations

### Phase 3: Enterprise & Scale (Q3 2025)

- [ ] **Multi-user Collaboration** - Team workspaces
- [ ] **Approval Delegation** - Complex approval workflows
- [ ] **Scheduled Workflows** - Cron-like agent automation
- [ ] **Cloud Deployment** - Managed Studio AI instances
- [ ] **Advanced Monitoring** - Agent performance analytics

### Phase 4: AI-Native Features (Q4 2025)

- [ ] **Self-Improving Workflows** - AI optimizes its own processes
- [ ] **Cross-Agent Learning** - Agents learn from each other
- [ ] **Natural Language Workflows** - Describe workflows in plain English
- [ ] **Autonomous Project Management** - AI manages entire projects

## 🛠️ Architecture

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express
- **Database**: SQLite (dev) / PostgreSQL (production)
- **Real-time**: WebSocket + Server-Sent Events
- **AI Integration**: MCP (Model Context Protocol)
- **Workflow Engine**: LangGraph-based orchestration

## 🤝 Contributing

We welcome contributions! Areas where we need help:

- **Bug Fixes**: Workflow builder UI, edge dragging, node positioning
- **New Nodes**: Webhook, HTTP, Slack, Email, Database nodes
- **AI Integrations**: Add support for new AI agents
- **Documentation**: Tutorials, examples, best practices
- **Community**: Share agents, workflows, and hooks

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📦 Examples

Check out the [examples](./examples/) directory for:

- Multi-agent development workflows
- Testing automation with AI teams
- Documentation generation pipelines
- Code review and approval flows

## 🔒 Security

- **Local First**: Your code and data stay on your infrastructure
- **API Key Management**: Secure storage of provider credentials
- **Tool Permissions**: Fine-grained control over agent capabilities
- **Audit Logs**: Complete tracking of agent actions

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🌟 Community

- **GitHub**: [alicoding/studio-ai](https://github.com/alicoding/studio-ai)
- **Discord**: Coming soon
- **Documentation**: In progress

---

**Built by developers, for AI agents** 🤖

Studio AI is currently in **alpha**. We're building this in public and would love your feedback and contributions.

_Frustrated with copy-pasting between AI tools? So were we. That's why we built Studio AI._
