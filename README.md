# Studio AI

**AI Agent Orchestration Platform with MCP Integration**

Studio AI enables AI agents to collaborate through the Model Context Protocol (MCP). Currently supports Claude Code with plans for Gemini CLI and other agents.

## What It Does

Studio AI provides:

- Multi-agent workflow orchestration using LangGraph
- Real-time agent monitoring via WebSocket
- Visual workflow builder with React Flow
- Human-in-the-loop approvals system
- MCP server for Claude integration

### Example: AI agents collaborating on code review

```javascript
{
  workflow: [
    { id: 'implement', agent: 'claude_dev', task: 'Add auth to user API' },
    {
      id: 'review',
      agent: 'claude_reviewer',
      task: 'Review {implement.output}',
      deps: ['implement'],
    },
    { id: 'approve', type: 'human', task: 'Approve changes?', deps: ['review'] },
  ]
}
```

## Tech Stack

**React + Node + SQLite + MCP**

- Frontend: React 19.1.0, TypeScript, Vite
- Backend: Node.js, Express, Socket.io
- Database: SQLite (local-first)
- AI Integration: Claude SDK + LangGraph + MCP

## Quick Start

```bash
git clone https://github.com/alicoding/studio-ai.git
cd studio-ai
npm install

# Copy environment file and add your Anthropic API key
cp .env.example .env

# Start development environment
npm run env:start  # Starts both stable (3456) and dev (3457) servers
npm run dev        # Frontend on http://localhost:5173
```

## Current Features

### Working ✅

- Create and manage AI agent projects
- Visual workflow builder with drag-and-drop
- Sequential and parallel task execution
- Human approval nodes (approval/notification/input)
- Real-time agent communication monitoring
- Template variables between workflow steps (`{stepId.output}`)
- Mock mode for testing without API costs (`USE_MOCK_AI=true`)
- MCP server integration for Claude

### In Progress 🚧

- Loop and Parallel node backends (UI exists)
- Conditional node execution
- Workflow persistence improvements

### Not Implemented ❌

- Gemini CLI integration
- Other AI agent integrations
- Multi-user collaboration

## Architecture

- **Local-First**: Designed as a local development tool
- **SQLite Database**: Stores workflows, approvals, and sessions locally
- **Dual Server Setup**: Stable (3456) for MCP, Dev (3457) for hot reload
- **MCP Integration**: Separate MCP server enables Claude to control the platform

## Documentation

- [Current Features Detail](./docs/FEATURES.md)
- [Roadmap](./docs/ROADMAP.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Examples](./examples/)

## License

MIT License - see [LICENSE](./LICENSE)

## Status

**Alpha** - Core functionality works. Building in public.

Built to enable AI agents to work together without human copy-pasting.
