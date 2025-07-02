# Claude-EA UI Architecture & Visual Map

## 🗺️ UI Component Hierarchy

```
Claude-EA Web Application
│
├── Navigation Bar (Global)
│   ├── Brand: "Claude Studio"
│   ├── Nav Links: Projects | Agents | Teams (Active indicator)
│   └── Settings Button (⚙️)
│
└── Pages (React Router - TanStack)
    │
    ├── 📁 Projects Page (/) - Main Workspace
    │   ├── Project Tabs Bar
    │   │   ├── Active Project Tabs (closeable)
    │   │   └── "+ New Project" Button
    │   │
    │   └── Main Container (Flex Layout)
    │       ├── Sidebar (320px, collapsible)
    │       │   ├── Header: "Team Agents" + Toggle (◀/▶)
    │       │   ├── Agent List
    │       │   │   └── Agent Cards (for each agent)
    │       │   │       ├── Status Indicator (🟢/🟡/🔴)
    │       │   │       ├── Agent Name + Role Badge
    │       │   │       ├── Token Usage Bar (visual)
    │       │   │       ├── Last Message Preview
    │       │   │       └── Actions: Pause/Clear/Remove
    │       │   └── Footer Buttons
    │       │       ├── "+ Add to Team"
    │       │       ├── "Create New Agent"
    │       │       └── "Load Team Template"
    │       │
    │       └── Content Area (Flex-1)
    │           ├── View Controls Bar
    │           │   ├── Sidebar Toggle (☰)
    │           │   ├── View Mode Buttons
    │           │   │   ├── Single (default)
    │           │   │   ├── Split (2 agents)
    │           │   │   ├── Grid (4 agents)
    │           │   │   └── Develop (IDE mode)
    │           │   └── Selected Agent Display
    │           │
    │           ├── Work Area
    │           │   ├── Agent Workspace (Single/Split/Grid views)
    │           │   │   └── Terminal Container(s)
    │           │   │       ├── xterm.js instances (live mode)
    │           │   │       └── MessageHistoryViewer (history mode)
    │           │   │
    │           │   └── Develop Workspace (when Develop selected)
    │           │       ├── Terminal Section (40%, collapsible)
    │           │       │   ├── Terminal Header
    │           │       │   │   ├── Tabs: Server | Console | Tests
    │           │       │   │   └── Toggle Button (▼/▶)
    │           │       │   └── Terminal Content (xterm.js)
    │           │       │
    │           │       └── Preview Section (60% or 100%)
    │           │           ├── Preview Header
    │           │           │   ├── Server Status (●)
    │           │           │   ├── URL Input
    │           │           │   ├── Control Buttons (🔌🔄🔗)
    │           │           │   └── Device Selector
    │           │           └── Preview Content
    │           │               ├── Placeholder (when no server)
    │           │               └── iframe (when connected)
    │           │
    │           ├── Message Queue Display
    │           │   ├── Header: "Message Queue (count)"
    │           │   ├── Queue Items (@target + message)
    │           │   └── "Clear All" Button
    │           │
    │           └── Input Area
    │               ├── Message Input Field
    │               ├── Input Hints (ESC/Enter)
    │               ├── Broadcast Button
    │               └── @Mention Autocomplete (popup)
    │
    ├── 🤖 Agents Page (/agents)
    │   ├── Page Header
    │   │   ├── Title: "Agent Configurations"
    │   │   └── "Create New Agent" Button
    │   │
    │   ├── Filter/Search Bar
    │   │   ├── Search Input
    │   │   └── Role Filter Dropdown
    │   │
    │   └── Agent Grid
    │       └── Agent Config Cards
    │           ├── Agent Name + ID
    │           ├── Role Badge
    │           ├── System Prompt Preview
    │           ├── Tool Permissions Icons
    │           ├── Model Selection
    │           ├── "Used in X projects" indicator
    │           └── Actions: Edit | Clone | Delete | Spawn
    │
    └── 👥 Teams Page (/teams)
        ├── Page Header
        │   ├── Title: "Team Templates"
        │   └── "Create New Team" Button
        │
        └── Teams Grid
            └── Team Template Cards
                ├── Team Name
                ├── Description
                ├── Agent Composition Preview
                ├── Total Agents Count
                └── Actions: Use | Clone | Edit | Export

## 🎨 Component Breakdown

### Core Layout Components
```

src/components/
├── layout/
│ ├── Navigation.tsx # Top nav bar
│ ├── Sidebar.tsx # Collapsible agent sidebar
│ └── PageLayout.tsx # Common page wrapper

```

### Projects Page Components
```

├── projects/
│ ├── ProjectTabs.tsx # Tab management
│ ├── AgentCard.tsx # Individual agent in sidebar
│ ├── ViewControls.tsx # View mode switcher
│ ├── MessageQueue.tsx # Queue display
│ ├── ChatPanel.tsx # Input area with mentions
│ └── views/
│ ├── SingleView.tsx # One agent terminal
│ ├── SplitView.tsx # Two agents side-by-side
│ ├── GridView.tsx # Four agents in grid
│ └── DevelopView.tsx # IDE mode with preview

```

### Message History Components (New)
```
├── messages/
│   ├── MessageHistoryViewer.tsx  # Virtual scrolling container
│   ├── MessageParser.tsx         # Parse @mentions, #commands
│   ├── MessageBubble.tsx         # Individual message display
│   └── MessageInput.tsx          # Tiptap-based rich input
```

### Terminal Components
```

├── terminal/
│ ├── Terminal.tsx # xterm.js wrapper
│ ├── TerminalTabs.tsx # Tab switcher for Develop view
│ └── TerminalHeader.tsx # Terminal title bar

```

### Preview Components (Develop View)
```

├── preview/
│ ├── PreviewPanel.tsx # Main preview container
│ ├── PreviewHeader.tsx # URL bar and controls
│ ├── PreviewFrame.tsx # iframe wrapper
│ └── ServerStatus.tsx # Connection indicator

```

### Agents Page Components
```

├── agents/
│ ├── AgentConfigCard.tsx # Configuration display
│ ├── CreateAgentModal.tsx # New agent form
│ ├── AgentFilters.tsx # Search and filter
│ └── PredefinedRoles.tsx # Role templates

```

### Teams Page Components
```

├── teams/
│ ├── TeamTemplateCard.tsx # Template display
│ ├── TeamBuilder.tsx # Drag-drop interface
│ └── TeamExportImport.tsx # JSON operations

```

### Shared Components
```

├── shared/
│ ├── Modal.tsx # Reusable modal
│ ├── Button.tsx # Styled buttons
│ ├── Badge.tsx # Role/status badges
│ ├── ProgressBar.tsx # Token usage bars
│ └── Autocomplete.tsx # @mention suggestions

```

## 🔌 WebSocket Event Flow

```

Client (React) <---> Socket.IO <---> Express Server
|
v
Event Categories:
|
┌────────────────────┼────────────────────┐
│ │ │
Agent Events Project Events Command Events
│ │ │
├─ status-update ├─ select ├─ execute
├─ message ├─ leave └─ result
├─ token-update └─ selected
├─ registered
└─ unregistered

Terminal Events Queue Events
│ │
├─ input ├─ add
└─ output ├─ clear
└─ updated

````

## 🎯 State Management Strategy

### Local Component State
- UI toggles (sidebar collapsed, view mode)
- Form inputs (message input, search)
- Modal visibility

### React Context/Hooks
- `useWebSocket()` - Socket.IO connection
- `useAgents()` - Agent list and status
- `useProjects()` - Active projects
- `useTerminals()` - Terminal instances
- `useMentions()` - @mention autocomplete

### Server State (via WebSocket)
- Agent status (online/busy/offline)
- Token usage
- Message queue
- Active project/team composition

## 🎨 Design System Constants

### Colors
```scss
$bg-primary: #1a1a1a;      // Main background
$bg-secondary: #252525;    // Sidebar, panels
$bg-tertiary: #2a2a2a;     // Cards, inputs
$border: #3a3a3a;          // All borders
$text-primary: #e0e0e0;    // Main text
$text-secondary: #999;     // Muted text
$accent: #4a9eff;          // Primary blue
$success: #4ade80;         // Online status
$warning: #fbbf24;         // Busy status
$danger: #ef4444;          // Offline status
````

### Spacing

```scss
$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 12px;
$spacing-lg: 16px;
$spacing-xl: 20px;
```

### Layout

```scss
$nav-height: 50px;
$tabs-height: 40px;
$sidebar-width: 320px;
$input-height: 120px;
```

## 📱 Responsive Breakpoints

```scss
$mobile: 480px;
$tablet: 768px;
$desktop: 1024px;
$wide: 1440px;
```

### Mobile Adaptations

- Sidebar: Full overlay with backdrop
- View modes: Only Single and Develop
- Terminal: Full screen with minimal padding
- Navigation: Hamburger menu

## 🚀 Implementation Priority

### Phase 1 - Core Structure ✅

1. Navigation component
2. Basic routing setup
3. Page layouts

### Phase 2 - Projects Page (Current)

1. Sidebar with agent cards
2. Terminal integration
3. Message input with @mentions
4. Single view mode

### Phase 3 - Advanced Views

1. Split view (2 terminals)
2. Grid view (4 terminals)
3. Develop view (terminal + preview)

### Phase 4 - Other Pages

1. Agents page CRUD
2. Teams page templates

### Phase 5 - Polish

1. Animations/transitions
2. Error states
3. Loading states
4. Mobile optimization

## 🔗 Integration Points

### Frontend → Backend

```
React Component → Custom Hook → WebSocket → Express API → Backend Library
     ↓                ↓             ↓            ↓              ↓
AgentCard     →  useAgents() → emit/on → /api/agents → AgentSpawner
Terminal      →  useTerminal() → emit  → websocket.ts → IPCClient
ChatPanel     →  useMentions() → emit  → /api/agents → MessageRouter
```

### Backend → Frontend

```
Agent Process → IPC → Backend Library → WebSocket → React State → UI Update
      ↓          ↓          ↓              ↓            ↓           ↓
Claude SDK → Socket → ProcessManager → emit event → setState → Re-render
```

## 📝 Key Implementation Notes

1. **Terminal Management**: Each agent gets its own xterm.js instance, created on-demand
2. **WebSocket Resilience**: Auto-reconnect with exponential backoff
3. **State Sync**: Initial state sent on connection, then event-driven updates
4. **Performance**: Virtual scrolling for large agent lists, lazy terminal init
5. **Accessibility**: Keyboard navigation, ARIA labels, focus management

This visual map should serve as a comprehensive guide for implementing the UI components and understanding how they interconnect.
