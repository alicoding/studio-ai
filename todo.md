# Claude-EA Implementation TODO List

## 🚀 **PRIORITY 1: Framework Modernization (Replace Custom Solutions)**

### Stage 0: Modern Framework Integration ⚡ **CRITICAL - DO FIRST**

- [x] **Install Tailwind CSS v4** - Replace 2700+ lines custom CSS ✅ COMPLETED

  ```bash
  npm install -D tailwindcss@next @tailwindcss/postcss postcss autoprefixer
  ```

  - [x] Configure CSS-first approach with @theme directive ✅
  - [x] Replace src/index.css with modern theme system ✅
  - [x] Remove all component-specific CSS files (99% reduction) ✅
  - [x] Convert ALL components to Tailwind classes ✅
  - [x] Implement DRY-compliant theming system ✅
  - [x] Delete massive 2780-line styles.css file ✅

- [x] **Install React Hook Form + Zod** - Replace manual form handling ✅ COMPLETED

  ```bash
  npm install react-hook-form @hookform/resolvers zod
  ```

  - [x] Replace all useState form handling in CreateAgentModal ✅ COMPLETED WITH ZOD VALIDATION
  - [x] Replace all useState form handling in CreateProjectModal ✅ COMPLETED WITH SHADCN
  - [ ] Replace all useState form handling in /projects/new
  - [x] Add form validation with Zod schemas ✅ IMPLEMENTED IN CREATEAGENTMODAL

- [x] **Install Shadcn/ui** - Replace custom components ✅ COMPLETED

  ```bash
  npx shadcn@latest init
  npx shadcn@latest add button card input label textarea badge dialog select checkbox separator tabs
  ```

  - [x] Replace custom Modal component with Dialog ✅ COMPLETED (AgentSelectionModal, CreateAgentModal)
  - [x] Replace button elements with Button component ✅ EXTENSIVELY IMPLEMENTED
  - [x] Replace input/textarea with form components ✅ EXTENSIVELY IMPLEMENTED
  - [x] Replace select dropdowns with Select component ✅ COMPLETED

- [x] **Install Lucide React** - Replace emoji icons ✅ COMPLETED

  ```bash
  npm install lucide-react
  ```

  - [x] Replace ❌ ⚡ 🗑 📄 🌐 with proper icons ✅
  - [x] Replace status indicators with proper icons ✅
  - [x] Add consistent icon sizing and styling ✅

- [x] **Install Framer Motion** - Add smooth animations ✅ INSTALLED

  ```bash
  npm install framer-motion
  ```

  - [ ] Add modal enter/exit animations
  - [ ] Add sidebar collapse/expand animations
  - [ ] Add smooth state transitions

- [x] **Install Testing Framework** - Add test coverage ✅ COMPLETED

  ```bash
  npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
  ```

  - [x] Configure vitest.config.ts ✅ COMPLETED
  - [x] Configure test setup files ✅ COMPLETED
  - [ ] Add tests for Zustand stores
  - [ ] Add tests for critical components

- [x] **Install Code Quality Tools** - Ensure consistent code ✅ COMPLETED

  ```bash
  npm install -D eslint @typescript-eslint/parser prettier eslint-config-prettier
  ```

  - [x] Configure ESLint with TypeScript rules ✅ COMPLETED
  - [x] Configure Prettier for consistent formatting ✅ COMPLETED
  - [x] Add npm scripts for linting and formatting ✅ COMPLETED
  - [x] Convert all config files to TypeScript (.ts) ✅ COMPLETED
  - [x] Set up pre-commit hooks with Husky ✅ COMPLETED

- [x] **Cleanup Custom CSS** - Remove redundant files ✅ COMPLETED
  - [x] Delete src/styles/ directory (2700+ lines removed) ✅
  - [x] Keep only critical custom styles for xterm integration ✅
  - [x] Update imports across all components ✅

**Impact:** This stage will eliminate 80% of custom CSS, improve maintainability, add type-safe forms, consistent UI components, and proper testing infrastructure.

**Benefits:**

- ✅ 2700+ lines of CSS → ~200 lines (COMPLETED)
- ✅ Consistent design system (COMPLETED)
- ✅ Type-safe form validation (IMPLEMENTED)
- ✅ Modern UI components (EXTENSIVELY IMPLEMENTED)
- ✅ Test coverage framework (SETUP COMPLETED)
- ✅ Code quality enforcement (COMPLETED)

### ✅ **ALL COMPONENTS SUCCESSFULLY MODERNIZED:**

- [x] **Navigation.tsx** - Tailwind + Lucide Settings icon ✅
- [x] **Modal.tsx** - Tailwind + Lucide X icon ✅
- [x] **ProjectTabs.tsx** - Tailwind + Lucide Plus/X icons ✅
- [x] **AgentCard.tsx** - Complete redesign with Tailwind + status indicators ✅
- [x] **ViewControls.tsx** - Modern button groups with Lucide view icons ✅
- [x] **LoadingSpinner.tsx** - Animated Lucide Loader2 icon ✅
- [x] **ProjectCard.tsx** - Modern card design with Tailwind + action buttons ✅
- [x] **CreateProjectModal.tsx** - Shadcn/ui Button, Input, Label, Textarea, Card ✅
- [x] **AgentSelectionModal.tsx** - Full Shadcn/ui Dialog with Search, Select, Checkbox ✅
- [x] **CreateAgentModal.tsx** - React Hook Form + Zod + Full Shadcn/ui suite ✅
- [x] **AgentConfigCard.tsx** - Modern Card with Lucide icons and Badge components ✅
- [x] **Sidebar.tsx** - Complete layout modernization with Shadcn/ui components ✅
- [x] **Projects Listing Page** - Modern grid layout with Tailwind + Shadcn/ui ✅
- [x] **Terminal.tsx** - XTerm.js with proper dark theme ✅
- [x] **MessageQueue.tsx** - Modern styling with theme colors ✅
- [x] **ChatPanel.tsx** - Enhanced input with mention autocomplete ✅
- [x] **DevelopView.tsx** - Side-by-side terminal/preview layout ✅
- [x] **All Dialogs** - Proper scrolling and Shadcn/ui components ✅

### ⚡ **FRAMEWORK INTEGRATION STATUS:**

- ✅ **Tailwind CSS v4** - CSS-first configuration with @theme directive
- ✅ **Shadcn/ui** - 15+ components installed and used throughout
- ✅ **React Hook Form + Zod** - Advanced form validation implemented
- ✅ **Lucide React** - Modern icons replacing all emoji icons
- ✅ **Vitest + Testing Library** - Complete testing framework setup
- ✅ **ESLint + Prettier** - Code quality tools configured
- ✅ **TypeScript Config Files** - All .js configs converted to .ts
- ✅ **Playwright Testing** - Visual regression tests passing

---

### Stage 0.5: CI/CD Infrastructure ✅ COMPLETED

- [x] **Set up Git Hooks** - Pre-commit quality checks ✅

  ```bash
  npx husky init
  npm install -D husky lint-staged @commitlint/cli @commitlint/config-conventional
  ```

  - [x] Configure pre-commit hooks for ESLint and Prettier ✅
  - [x] Set up commit message linting (conventional commits) ✅
  - [x] Add post-commit hook for semantic indexing ✅

- [x] **Configure GitHub Actions** - Automated CI/CD ✅
  - [x] Create CI workflow for PR checks (lint, typecheck, test, build) ✅
  - [x] Set up Playwright E2E test workflow ✅
  - [x] Configure deployment workflow (staging/production) ✅
  - [x] Add parallel job execution for faster CI ✅

- [x] **GitHub Repository Setup** - Professional structure ✅
  - [x] Create pull request template ✅
  - [x] Add issue templates (bug report, feature request) ✅
  - [x] Set up CODEOWNERS file ✅
  - [x] Document branch protection rules ✅

**Impact:** Professional development workflow with automated quality checks, consistent code style, and streamlined deployment process.

---

## Phase 1: Complete UI Implementation (UI-First Approach)

### Stage 1: Foundation Setup ✅ When All Checked

- [x] Initialize project structure
  ```bash
  mkdir -p claude-ea/{src,web,config,tests}
  cd claude-ea
  npm init -y
  ```
- [x] Install web dependencies first

  ```bash
  npm install -D vite @vitejs/plugin-react
  npm install react react-dom react-router-dom
  npm install xterm xterm-addon-fit xterm-addon-web-links
  npm install socket.io-client
  npm install @types/react @types/react-dom
  ```

  - Note: Installed @tanstack/react-router instead of react-router-dom for better SSE support
  - Updated to new xterm packages (@xterm/xterm, etc.)
  - Added tsx, @types/node for proper ESModule support
  - Added "type": "module" to package.json

- [x] Create vite.config.ts
- [x] Set up React + TypeScript
  - Created tsconfig.json and tsconfig.node.json
  - Set up TanStack Router with file-based routing
  - Created basic routes structure (src/routes/)
  - Added navigation and basic pages
- [x] Copy prototype files as starting point
  - Prototype files exist and will be used as reference for UI implementation
  - Using React components instead of direct HTML copy

## Stage 2: Process Management (Critical - Fix Zombies) ✅ When All Checked

- [ ] Create lib/process/types.ts - Define interfaces
- [ ] Create lib/process/ProcessRegistry.ts
  - [ ] Track PIDs in /tmp/claude-agents/registry.json
  - [ ] Implement health checks
  - [ ] Auto-cleanup dead processes
- [ ] Create lib/process/ProcessManager.ts
  - [ ] Spawn process with SDK
  - [ ] Register with ProcessRegistry
  - [ ] Handle graceful shutdown
- [ ] Create lib/process/ProcessCleaner.ts
  - [ ] Detect zombie processes
  - [ ] Force kill if needed
  - [ ] Clean registry entries
- [ ] Test: Spawn 3 processes, kill parent, verify cleanup
- [ ] Test: No zombies after Ctrl+C

## Stage 3: IPC Communication ✅ When All Checked

- [ ] Create lib/ipc/types.ts - Message interfaces
- [ ] Create lib/ipc/IPCServer.ts
  - [ ] Use existing socket pattern: `claude-agents.{agentId}`
  - [ ] Handle incoming messages
  - [ ] Error boundaries
- [ ] Create lib/ipc/IPCClient.ts
  - [ ] Connect to agent sockets
  - [ ] Send messages with retry
  - [ ] 2s timeout handling
- [ ] Create lib/ipc/MessageRouter.ts
  - [ ] Parse @mentions
  - [ ] Route to correct agent
  - [ ] Handle broadcast
- [ ] Create lib/ipc/RetryHandler.ts
  - [ ] Reuse retry logic from existing code
  - [ ] Exponential backoff
- [ ] Test: Send message between 2 agents
- [ ] Test: @mention routing works

## Stage 4: Base Agent System ✅ When All Checked

- [ ] Create lib/agent/types.ts
  - [ ] Agent interface with states
  - [ ] Role definitions
- [ ] Create lib/agent/BaseAgent.ts
  - [ ] SDK integration
  - [ ] IPC server setup
  - [ ] State management (ready/online/busy/offline)
- [ ] Create lib/agent/AgentFactory.ts
  - [ ] Create agents by role
  - [ ] Load system prompts
  - [ ] Configure tool access
- [ ] Create lib/agent/AgentLifecycle.ts
  - [ ] Spawn with 'ready' state
  - [ ] Interrupt handling (ESC)
  - [ ] Graceful shutdown
- [ ] Test: Create agent, stays in 'ready' until interaction
- [ ] Test: ESC interrupts processing

## Stage 5: Message Queue System ✅ When All Checked

- [ ] Create lib/queue/types.ts
- [ ] Create lib/queue/MessageQueue.ts
  - [ ] Queue per agent
  - [ ] FIFO processing
  - [ ] Event emitter for UI updates
- [ ] Create lib/queue/InterruptHandler.ts
  - [ ] ESC key detection
  - [ ] Clear queue
  - [ ] Reset agent state
- [ ] Create lib/queue/QueueDisplay.ts
  - [ ] Format queue for display
  - [ ] Show pending count
- [ ] Test: Queue 3 messages, process in order
- [ ] Test: ESC clears queue

## Stage 6: Session Management ✅ When All Checked

- [ ] Create lib/session/types.ts
- [ ] Create lib/session/SessionTracker.ts
  - [ ] Save session IDs to ~/.claude/agent-sessions.json
  - [ ] Track by agent ID
- [ ] Create lib/session/TokenCounter.ts
  - [ ] Parse token usage from SDK responses
  - [ ] Track cumulative usage
  - [ ] Warn at 80% of 200K
- [ ] Create lib/session/HistoryManager.ts
  - [ ] Parse JSONL files
  - [ ] Load session history
- [ ] Test: Session ID persists across restart
- [ ] Test: Token counting accurate

## Stage 7: Command System ✅ When All Checked

- [ ] Create lib/command/types.ts
- [ ] Create lib/command/CommandParser.ts
  - [ ] Detect # and @ prefixes
  - [ ] Parse arguments
  - [ ] Return command objects
- [ ] Create lib/command/CommandRegistry.ts
  - [ ] Register handlers
  - [ ] Execute commands
  - [ ] Extensible design
- [ ] Create lib/command/handlers/TeamCommand.ts (#team)
- [ ] Create lib/command/handlers/SpawnCommand.ts (#spawn)
- [ ] Create lib/command/handlers/ClearCommand.ts (#clear)
- [ ] Create lib/command/handlers/MentionCommand.ts (@mention)
- [ ] Create lib/command/handlers/BroadcastCommand.ts (#broadcast)
- [ ] Test: All commands work correctly

## Stage 8: Main Agent Implementation ✅ When All Checked

- [ ] Create src/agents/ClaudeAgent.ts
  - [ ] Extend BaseAgent
  - [ ] Integrate SDK query()
  - [ ] Handle streaming responses
  - [ ] Parse commands in responses
- [ ] Create src/agents/AgentSpawner.ts
  - [ ] Spawn headless agents
  - [ ] Spawn terminal agents
  - [ ] In-memory agents
- [ ] Create src/agents/AgentConfig.ts
  - [ ] Load role configs
  - [ ] Tool permissions
  - [ ] System prompts
- [ ] Test: Agent responds to messages
- [ ] Test: Agent can @mention others

## Stage 9: Team Management ✅ When All Checked

- [ ] Create src/teams/TeamManager.ts
  - [ ] Track active agents
  - [ ] Status management
  - [ ] Team operations
- [ ] Create src/teams/TeamTemplate.ts
  - [ ] Load templates
  - [ ] Spawn from template
  - [ ] Save custom teams
- [ ] Create config/roles.json
- [ ] Create config/tools.json
- [ ] Create config/system-prompts.json
- [ ] Create team templates (prototype, backend, etc.)
- [ ] Test: Spawn team from template
- [ ] Test: All agents start correctly

## Stage 10: UI Prototype - Multi-Page Architecture ✅ When All Checked

- [x] Update prototype/index.html with navigation
  - [x] Add top navigation bar
  - [x] Projects, Agents, Teams links
  - [x] Active page indicator
- [x] Create prototype/agents.html
  - [x] List all agent configurations
  - [x] Predefined role cards (dev, ux, tester, etc.)
  - [x] Create/Edit/Clone agent buttons
  - [x] System prompt editor
  - [x] Tool permissions checkboxes
- [x] Create prototype/teams.html
  - [x] Team template cards
  - [x] Drag-and-drop agent assignment
  - [x] Clone team template
  - [x] Export/Import team JSON
- [x] Update prototype/mockup.js
  - [x] Page navigation logic
  - [x] Mock data for agents/teams
  - [x] Drag-and-drop functionality
- [x] Add Develop View to prototype/index.html
  - [x] Add "Develop" button to view modes
  - [x] Create side-by-side terminal + preview layout
  - [x] Implement collapsible terminal panel
  - [x] Add terminal tabs (Server, Console, Tests)
  - [x] Server connection functionality
  - [x] URL input and status indicator
  - [x] Device viewport switching
  - [x] Auto-connect on server start
  - [x] Simulated server logs
- [x] Test: Navigation between pages works
- [x] Test: Drag-and-drop agents into teams
- [x] Test: Develop view terminal and preview integration
- [x] **Review: "Is this the right multi-page flow?"**

## Stage 11: Web Server ✅ When All Checked

- [x] Create web/server/app.ts
  - [x] Express setup
  - [x] Static file serving
  - [x] Multi-page routing
- [x] Create web/server/websocket.ts
  - [x] Socket.IO setup
  - [x] Event handlers
  - [x] Auto-reconnect logic
- [x] Create web/server/api/agents.ts
  - [x] GET /api/agents (all configurations)
  - [x] POST /api/agents (create configuration)
  - [x] PUT /api/agents/:id (update configuration)
  - [x] DELETE /api/agents/:id
  - [x] POST /api/agents/:id/spawn (spawn to project)
- [x] Create web/server/api/projects.ts
  - [x] GET /api/projects
  - [x] POST /api/projects
  - [x] GET /api/projects/:id/agents (active agents)
- [x] Create web/server/api/teams.ts
  - [x] GET /api/teams (templates)
  - [x] POST /api/teams (save template)
  - [x] POST /api/teams/:id/spawn (spawn team)
- [x] Test: Server starts on port 3456
- [x] Test: API endpoints work correctly

## Stage 12: Web UI - Projects Page (Main Workspace) ✅ When All Checked

- [x] Create web/client/src/pages/ProjectsPage.tsx
  - [x] Project tabs component
  - [x] Agent sidebar (active team)
  - [x] Terminal/chat interface
  - [x] Message queue display
- [x] Create web/client/src/components/AgentCard.tsx
  - [x] Status indicator
  - [x] Token usage bar (UI complete, needs real data from SessionTracker)
  - [x] Last message preview
  - [x] Action buttons (pause/clear/remove)
- [x] Create web/client/src/components/Terminal.tsx
  - [x] xterm.js integration
  - [x] Theme setup
  - [x] Handle input/output
- [x] Create web/client/src/components/MessageQueue.tsx
  - [x] Show pending messages
  - [x] Clear button
  - [ ] Real queue functionality (currently mock, needs MessageQueue lib)
- [x] Create web/client/src/components/ChatPanel.tsx
  - [x] Message display
  - [x] Input box
  - [x] @mention autocomplete (UI complete with mock data)
  - [x] ESC/Enter handling (UI handlers ready)
- [x] Test: Project workspace functional
- [ ] Test: Can interact with agents (requires backend implementation)

## Stage 13: Web UI - Agents Page ✅ When All Checked

- [x] Create web/client/src/pages/AgentsPage.tsx
  - [x] Agent configuration list
  - [x] Filter by role
  - [x] Search agents
- [x] Create web/client/src/components/AgentConfigCard.tsx
  - [x] Display agent configuration
  - [x] Edit/Clone/Delete actions
  - [x] Show which projects using agent (UI shows count with mock data)
- [x] Create web/client/src/components/CreateAgentModal.tsx
  - [x] Agent name input
  - [x] Role selection
  - [x] System prompt editor
  - [x] Tool permissions (UI complete with placeholder tools)
  - [x] Model selection (UI complete with Claude models)
- [x] Create web/client/src/components/PredefinedRoles.tsx
  - [x] Show role templates
  - [x] Quick create from template
- [ ] Test: Can create new agent configs (requires backend)
- [ ] Test: Can edit existing configs (requires backend)

## Stage 14: Web UI - Teams Page ✅ When All Checked

- [x] Create web/client/src/pages/TeamsPage.tsx
  - [x] Team template grid
  - [x] Create new team button
- [x] Create web/client/src/components/TeamTemplateCard.tsx
  - [x] Template preview
  - [x] Agent list
  - [x] Clone/Use template
- [x] Create web/client/src/components/TeamBuilder.tsx
  - [x] Drag-and-drop interface
  - [x] Available agents list
  - [x] Team composition area
  - [x] Save as template
- [x] Create web/client/src/components/TeamExportImport.tsx
  - [x] Export team as JSON
  - [x] Import team from JSON
- [ ] Test: Can build custom teams (requires backend)
- [ ] Test: Can use team templates (requires backend)

## Stage 15: Web UI - Navigation & Polish ✅ When All Checked

- [x] Create web/client/src/components/Navigation.tsx
  - [x] Top navigation bar
  - [x] Active page highlighting
  - [x] Settings button
- [x] Create web/client/src/hooks/useWebSocket.ts
  - [x] Connect to server
  - [x] Handle reconnection
  - [x] Event subscriptions
- [x] Create web/client/src/hooks/useAgents.ts
  - [x] Agent state management
  - [ ] Configuration CRUD (requires backend)
- [x] Create web/client/src/hooks/useTeams.ts
  - [x] Team template management
- [x] Create web/client/src/hooks/useMentions.ts
  - [x] Autocomplete logic
  - [x] Online agent filtering
- [x] Add CSS for mobile responsiveness
- [x] Add loading states
- [x] Add error boundaries
- [x] Create shared Modal component with ESC handling
- [x] Implement Agent Edit/Clone/Delete functionality
- [x] Refactor all modals to use shared Modal component
- [ ] Test: Navigation works smoothly
- [ ] Test: Mobile responsive

## Stage 15.5: Projects Page - Core Workspace ✅ When All Checked

### ALREADY IMPLEMENTED ✅

- [x] Create src/routes/index.tsx (Projects Page)
  - [x] Project tabs bar with closeable tabs
  - [x] "+ New Project" functionality (placeholder)
  - [x] Main container with flex layout
- [x] Create src/components/projects/ProjectTabs.tsx
  - [x] Active project tabs (closeable)
  - [x] Add new project button
  - [x] Tab switching logic
- [x] Create src/components/layout/Sidebar.tsx
  - [x] Collapsible sidebar (320px width)
  - [x] Team agents header with toggle
  - [x] Agent list container
- [x] Create src/components/projects/AgentCard.tsx (Different from AgentConfigCard)
  - [x] Status indicator (🟢/🟡/🔴)
  - [x] Agent name + role badge
  - [x] Token usage bar (visual progress)
  - [x] Last message preview
  - [x] Actions: Pause/Clear/Remove
- [x] Create src/components/projects/ViewControls.tsx
  - [x] Sidebar toggle button
  - [x] View mode buttons (Single/Split/Grid/Develop)
  - [x] Selected agent display
- [x] Create src/components/projects/MessageQueue.tsx
  - [x] Header with message count
  - [x] Queue items (@target + message)
  - [x] Clear all button
- [x] Create src/components/projects/ChatPanel.tsx
  - [x] Message input field
  - [x] Input hints (ESC/Enter)
  - [x] Broadcast button
  - [x] @Mention autocomplete popup
- [x] Create src/components/terminal/Terminal.tsx
  - [x] xterm.js integration wrapper
  - [x] Theme setup
  - [x] Input/output handling
- [x] Create src/components/projects/views/SingleView.tsx
  - [x] Single agent terminal view
- [x] Create src/components/projects/views/SplitView.tsx
  - [x] Two agents side-by-side
- [x] Create src/components/projects/views/GridView.tsx
  - [x] Four agents in grid layout
- [x] Create src/components/projects/views/DevelopView.tsx
  - [x] Terminal section (40%, collapsible)
  - [x] Terminal tabs: Server | Console | Tests
  - [x] Preview section (60% or 100%)
  - [x] Server status and URL input
  - [x] Control buttons (connect/refresh/open)
  - [x] Device selector
  - [x] iframe for preview

### ACTUALLY MISSING COMPONENTS ✅ When All Checked

### Missing Shared Components

- [ ] Create src/components/shared/Badge.tsx
  - [ ] Role badges (dev, ux, tester, etc.)
  - [ ] Status badges (online, busy, offline)
- [ ] Create src/components/shared/ProgressBar.tsx
  - [ ] Token usage visualization
  - [ ] Generic progress component
- [ ] Create src/components/shared/Autocomplete.tsx
  - [ ] @mention suggestions dropdown
  - [ ] Keyboard navigation support

### Missing Terminal Components (if needed for advanced features)

- [ ] Create src/components/terminal/TerminalTabs.tsx
  - [ ] Tab switcher for Develop view
  - [ ] Server/Console/Tests tabs
- [ ] Create src/components/terminal/TerminalHeader.tsx
  - [ ] Terminal title bar
  - [ ] Minimize/maximize controls

### Missing Preview Components (if needed for Develop View enhancements)

- [ ] Create src/components/preview/PreviewPanel.tsx
  - [ ] Main preview container
  - [ ] Responsive iframe handling
- [ ] Create src/components/preview/PreviewHeader.tsx
  - [ ] URL input bar
  - [ ] Connection controls
  - [ ] Device viewport selector
- [ ] Create src/components/preview/ServerStatus.tsx
  - [ ] Connection indicator (green/red dot)
  - [ ] Status text

### Missing Hooks (if needed for advanced state management)

- [ ] Create src/hooks/useProjects.ts
  - [ ] Project creation/selection
  - [ ] Active project state
  - [ ] Tab management
- [ ] Create src/hooks/useTerminals.ts
  - [ ] Terminal instance management
  - [ ] Multiple terminal handling
- [ ] Create src/hooks/useMessageQueue.ts
  - [ ] Queue state management
  - [ ] Add/clear queue operations

### ✅ CRITICAL PIECES NOW IMPLEMENTED!

#### ✅ Core Project Management - COMPLETED

- [x] Create src/routes/projects/index.tsx - Projects listing page ✅
  - [x] List all user projects ✅
  - [x] Project cards with name, description, last modified ✅
  - [x] Actions: Open, Edit, Delete, Clone ✅
  - [x] "+ Create New Project" button ✅
- [x] Create src/routes/projects/new.tsx - Create project page ✅
  - [x] Project name input ✅
  - [x] Project description ✅
  - [x] Template selection (6 templates) ✅
  - [x] Directory/workspace setup ✅
  - [x] Fixed scrolling issues ✅
- [ ] Create src/routes/projects/$projectId.tsx - Individual project page
  - [ ] Project settings
  - [ ] Agent management for project
  - [ ] Project metadata editing
- [x] Create src/components/projects/ProjectCard.tsx ✅
  - [x] Project thumbnail/preview ✅
  - [x] Project name and description ✅
  - [x] Last modified date ✅
  - [x] Actions (Edit/Delete/Clone) ✅
- [x] Create src/components/projects/CreateProjectModal.tsx ✅
  - [x] Project creation form ✅
  - [x] Template selection ✅
  - [x] Validation ✅

#### Missing Agent Integration (User is correct!)

- [ ] Agent Cards are NOT in main page sidebar (empty agents array)
  - [ ] Need to connect real agent data to sidebar
  - [ ] Sidebar currently shows empty because no agents spawned
- [ ] Missing Agent Selection Modal for "Add to Team"
  - [ ] Modal to select from available agents
  - [ ] Filter by role, search functionality
  - [ ] Add selected agents to current project
- [ ] Missing Team Template Integration
  - [ ] Modal to select team template
  - [ ] Apply template to current project
  - [ ] Spawn all agents from template

#### Missing Project Tab Functionality (User is correct!)

- [ ] Project creation from main page is just alert()
- [ ] Project close is just console.log()
- [ ] No actual project state management
- [ ] No persistence of projects

#### ✅ Major UI Features Completed:

1. **Project management pages** ✅ - List, Create, Edit projects implemented
2. **Navigation System** ✅ - Projects/Workspace/Agents/Teams with proper routing
3. **Modal integrations** ✅ - All modals using Shadcn/ui components
4. **Develop View** ✅ - Side-by-side terminal/preview already exists
5. **Theme System** ✅ - DRY-compliant CSS-first Tailwind v4 configuration

#### 🚧 Still Needed (Backend Integration):

1. **Real agent data integration** - Connect existing AgentCard to real data
2. **Project persistence** - Save/load project state
3. **WebSocket integration** - Real-time agent communication
4. **Message queue functionality** - Actual queue processing

## Stage 16: Integration Testing ✅ When All Checked

- [ ] Full flow: Start server → Spawn team → Send messages
- [ ] Test #team command shows all agents
- [ ] Test @mention delivers messages
- [ ] Test #broadcast sends to all
- [ ] Test ESC interrupts processing
- [ ] Test process cleanup on exit
- [ ] Test session resume with --resume
- [ ] Test no zombie processes after 10 spawns/kills
- [ ] Test WebSocket reconnection
- [ ] Test mobile UI functionality
- [ ] Test multi-page navigation
- [ ] Test agent configuration management
- [ ] Test team template functionality

## Stage 17: Final Polish ✅ When All Checked

- [ ] Add README.md with setup instructions
- [ ] Create .env.example
- [ ] Add npm scripts (start, dev, build)
- [ ] Console logging for debugging
- [ ] Error handling improvements
- [ ] Performance check with 10 agents
- [ ] Create example team templates
- [ ] Document all commands
- [ ] Quick start guide
- [ ] Document multi-page architecture

## Completion Checklist

- [ ] Zero zombie processes ✓
- [ ] IPC communication reliable ✓
- [ ] Web UI functional on desktop/mobile ✓
- [ ] Session resume works ✓
- [ ] All commands implemented ✓
- [ ] No memory leaks ✓
- [ ] Clean shutdown ✓

## Notes

- Test each stage thoroughly before moving to next
- Focus on process management first (Stage 2) - it's critical
- Keep libraries focused and testable
- Don't add features not in plan.md
- Console.log is fine for local debugging
- If something gets complex, split the file
