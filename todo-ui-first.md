# Claude-EA Implementation TODO List (UI-First Approach)

## Phase 1: Complete UI Implementation

### Stage 1: React App Setup ✅ When All Checked

- [ ] Initialize React + Vite project
  ```bash
  cd claude-ea
  npm create vite@latest web -- --template react-ts
  cd web
  npm install
  ```
- [ ] Install UI dependencies
  ```bash
  npm install xterm xterm-addon-fit xterm-addon-web-links
  npm install react-router-dom
  npm install socket.io-client
  npm install @dnd-kit/sortable @dnd-kit/core
  ```
- [ ] Port prototype styles to CSS modules or styled-components
- [ ] Set up routing structure
- [ ] Create layout components (Navigation, Sidebar)

### Stage 2: Projects Page (Main Workspace) ✅ When All Checked

- [ ] Create pages/Projects/index.tsx
- [ ] Create components/ProjectTabs/index.tsx
  - [ ] Tab switching logic
  - [ ] Add/remove project tabs
  - [ ] Active tab state
- [ ] Create components/AgentSidebar/index.tsx
  - [ ] Agent cards with status
  - [ ] Token usage display
  - [ ] Action buttons (pause/clear/remove)
  - [ ] Collapsible functionality
- [ ] Create components/AgentTerminal/index.tsx
  - [ ] xterm.js integration
  - [ ] Multiple terminal instances
  - [ ] Terminal resize handling
- [ ] Create components/MessageQueue/index.tsx
  - [ ] Queue display
  - [ ] Clear functionality
- [ ] Create components/MessageInput/index.tsx
  - [ ] Input handling
  - [ ] @mention autocomplete
  - [ ] Command detection (#, @)
  - [ ] ESC to interrupt

### Stage 3: Develop View ✅ When All Checked

- [ ] Create components/DevelopView/index.tsx
- [ ] Create components/DevelopTerminal/index.tsx
  - [ ] Terminal tabs (Server, Console, Tests)
  - [ ] Tab switching
  - [ ] Collapsible panel
- [ ] Create components/PreviewPanel/index.tsx
  - [ ] iframe management
  - [ ] Server connection status
  - [ ] URL input
  - [ ] Device viewport switcher
- [ ] Implement terminal toggle for full-screen preview
- [ ] Add mock server commands (npm run dev, etc.)
- [ ] Simulate server logs

### Stage 4: Agents Page ✅ When All Checked

- [ ] Create pages/Agents/index.tsx
- [ ] Create components/AgentConfigList/index.tsx
- [ ] Create components/AgentConfigCard/index.tsx
  - [ ] Display configuration
  - [ ] Edit/Clone/Delete actions
- [ ] Create components/CreateAgentModal/index.tsx
  - [ ] Form inputs
  - [ ] System prompt editor
  - [ ] Tool permissions
- [ ] Create components/PredefinedRoles/index.tsx
  - [ ] Role templates
  - [ ] Quick create

### Stage 5: Teams Page ✅ When All Checked

- [ ] Create pages/Teams/index.tsx
- [ ] Create components/TeamTemplateGrid/index.tsx
- [ ] Create components/TeamBuilder/index.tsx
  - [ ] Drag-and-drop with @dnd-kit
  - [ ] Available agents list
  - [ ] Team composition
- [ ] Create components/TeamExportImport/index.tsx
- [ ] Implement team template management

### Stage 6: State Management ✅ When All Checked

- [ ] Create contexts/ProjectContext.tsx
  - [ ] Active project state
  - [ ] Project switching
- [ ] Create contexts/AgentContext.tsx
  - [ ] Agent configurations
  - [ ] Active agents in project
  - [ ] Agent status updates
- [ ] Create contexts/WebSocketContext.tsx
  - [ ] Socket connection (mock for now)
  - [ ] Event handlers
  - [ ] Reconnection logic
- [ ] Create hooks/useAgents.ts
- [ ] Create hooks/useTerminal.ts
- [ ] Create hooks/useMentions.ts

### Stage 7: Mock Data & Services ✅ When All Checked

- [ ] Create services/mockApi.ts
  - [ ] Mock agent data
  - [ ] Mock team templates
  - [ ] Mock project data
- [ ] Create services/mockWebSocket.ts
  - [ ] Simulate agent responses
  - [ ] Simulate status changes
  - [ ] Message routing simulation
- [ ] Create mock command handlers
  - [ ] #team command
  - [ ] @mention routing
  - [ ] #broadcast command

### Stage 8: Polish & Mobile ✅ When All Checked

- [ ] Add loading states
- [ ] Add error boundaries
- [ ] Implement responsive design
  - [ ] Mobile navigation
  - [ ] Touch-friendly controls
  - [ ] Responsive grid layouts
- [ ] Add transitions/animations
- [ ] Dark theme refinement
- [ ] Accessibility (ARIA labels, keyboard nav)

## Phase 2: Backend Integration

### Stage 9: Basic Express Server ✅ When All Checked

- [ ] Create server/index.ts
- [ ] Set up Express
- [ ] Serve React build
- [ ] Add Socket.IO
- [ ] Basic API routes structure

### Stage 10: Real Process Management ✅ When All Checked

- [ ] Install @anthropic-ai/claude-code SDK
- [ ] Create ProcessManager class
  - [ ] Spawn real Claude processes
  - [ ] Track PIDs
  - [ ] Health checks
- [ ] Create ProcessRegistry
  - [ ] Store in /tmp/claude-agents/
  - [ ] Cleanup zombies
- [ ] Hook up to Socket.IO events

### Stage 11: IPC Implementation ✅ When All Checked

- [ ] Install node-ipc
- [ ] Create IPC server per agent
- [ ] Message routing between agents
- [ ] Connect IPC to WebSocket
- [ ] Real @mention delivery

### Stage 12: Command System ✅ When All Checked

- [ ] Create command parser
- [ ] Implement real commands
  - [ ] #team - show team status
  - [ ] #spawn - create new agent
  - [ ] #clear - clear queues
  - [ ] @mention - route messages
  - [ ] #broadcast - send to all
- [ ] Connect to UI inputs

### Stage 13: Session Management ✅ When All Checked

- [ ] Track session IDs from Claude
- [ ] Save to ~/.claude/agent-sessions.json
- [ ] Token counting from responses
- [ ] Resume sessions functionality

### Stage 14: API Endpoints ✅ When All Checked

- [ ] GET/POST /api/agents
- [ ] GET/POST /api/projects
- [ ] GET/POST /api/teams
- [ ] WebSocket events for real-time updates

### Stage 15: Integration Testing ✅ When All Checked

- [ ] Replace mock services with real ones
- [ ] Test agent spawning
- [ ] Test message routing
- [ ] Test process cleanup
- [ ] Test session resume
- [ ] Verify no zombies

## Benefits of UI-First Approach

1. **Immediate Feedback** - See and test the full experience
2. **Clear Requirements** - UI defines what backend needs to provide
3. **Parallel Development** - Backend can be built to match UI exactly
4. **Better Architecture** - Design APIs based on actual UI needs
5. **User Testing** - Can test with users before backend is complete
6. **Incremental Migration** - Replace mocks with real services one by one

## Migration Strategy

When transitioning from mock to real:

1. Keep mock services as fallback
2. Add feature flags for real vs mock
3. Implement one service at a time
4. Test thoroughly before removing mocks
5. Maintain backward compatibility

## Notes

- Start with Stage 1 immediately
- Get a working UI with mock data ASAP
- User test the UI before building backend
- Backend should match UI's expectations exactly
- Keep mocks even after real implementation for testing
