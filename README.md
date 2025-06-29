# Claude-EA (Engineering Assistant)

A multi-agent AI team system for software development, featuring a web-based UI for managing AI agents, teams, and projects.

## 🛠️ CI/CD Setup

This project includes a comprehensive CI/CD pipeline:

### Pre-commit Hooks

- **ESLint** - Automatically fixes code style issues
- **Prettier** - Formats code consistently
- **Commitlint** - Ensures conventional commit messages
- **Semantic Index** - Auto-rebuilds on source changes (post-commit)

### GitHub Actions

- **CI Pipeline** - Runs on all PRs (lint, typecheck, test, build)
- **E2E Tests** - Playwright tests with screenshots
- **Deployment** - Automated deployments to staging/production

### Branch Protection

See [.github/BRANCH_PROTECTION.md](.github/BRANCH_PROTECTION.md) for recommended settings.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open in browser
http://localhost:5174
```

## 📋 Features

### Current (UI Complete)

- **Multi-Page Architecture**
  - Projects: Main workspace with agent chat interface
  - Agents: Configure and manage AI agents
  - Teams: Create and manage team templates
- **Projects Page**
  - Multiple view modes (Single, Split, Grid, Develop)
  - Real-time agent status tracking
  - Message queue display
  - @mention autocomplete
  - Terminal integration (xterm.js)
- **Agents Page**
  - Create/Edit/Clone agent configurations
  - Role-based templates (dev, ux, architect, tester)
  - Tool permission management
  - Model selection
- **Teams Page**
  - Drag-and-drop team builder
  - Import/Export team templates
  - Predefined team templates

### Coming Soon (Backend Implementation)

- Agent process management
- IPC communication between agents
- Session persistence
- Command system (#team, #spawn, @mentions)
- Token usage tracking

## 🏗️ Architecture

```
claude-ea/
├── src/
│   ├── routes/          # Page components (TanStack Router)
│   ├── components/      # Reusable UI components
│   ├── hooks/           # Custom React hooks
│   └── styles.css       # Global styles
├── server/              # Express + Socket.IO server
├── lib/                 # (Future) Backend libraries
└── prototype/           # HTML prototypes
```

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, TanStack Router
- **UI Components**: Custom components with CSS
- **Terminal**: xterm.js
- **Real-time**: Socket.IO
- **Build Tool**: Vite
- **Backend** (planned): Node.js, Express

## 📱 Mobile Support

The UI is fully responsive with optimized layouts for:

- Desktop (1024px+)
- Tablet (768px)
- Mobile (480px)

## 🔧 Development

```bash
# Type checking
npm run type-check

# Development server
npm run dev

# Build for production (coming soon)
npm run build
```

## 🎯 Roadmap

See [todo.md](./todo.md) for detailed implementation progress.

### Phase 1: UI Implementation ✅

- All UI components and pages complete
- Mock data for development
- WebSocket hooks ready for backend

### Phase 2: Backend Implementation (Next)

- Process management
- Agent spawning
- IPC communication
- Command system

## 🤝 Contributing

This is a private project in active development. See [plan.md](./plan.md) for architectural decisions.

## 📝 License

Private - All rights reserved
