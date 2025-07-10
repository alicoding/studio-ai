# Workflow Visualization UI Implementation Plan

## Overview

Implement n8n-style workflow visualization UI for Claude Studio with real-time progress tracking, node-based workflow design, and seamless integration with existing backend infrastructure.

## Current State Assessment

### ✅ Backend Foundation (100% Complete)

**Robust Infrastructure:**

- PostgreSQL persistence with LangGraph checkpointing
- SSE real-time streaming at `/api/invoke/stream/:threadId`
- Async execution via WorkflowExecutor singleton
- Comprehensive event system (step_start, step_complete, workflow_complete, etc.)
- Template variable resolution (`{stepId.output}`)
- Auto-resume and retry capabilities
- Dependency management with parallel execution

**API Completeness:**

- `/api/invoke` - Synchronous execution
- `/api/invoke/async` - Background execution
- `/api/invoke/status/:threadId` - Status polling
- `/api/invoke/stream/:threadId` - Real-time events

### ❌ Frontend Gaps (0% Complete)

**Missing Components:**

- No workflow visualization UI
- No real-time progress display
- No manual retry/resume controls
- No SSE client integration
- No workflow management interface

## Implementation Phases

## Phase 1: Foundation Components (3-4 days)

### 1.1 Real-Time Communication Infrastructure

**Priority: CRITICAL**

**Create SSE Hook (`src/hooks/useWorkflowSSE.ts`):**

```typescript
interface UseWorkflowSSEOptions {
  threadId: string
  onEvent?: (event: WorkflowEvent) => void
  reconnectDelay?: number
}

export function useWorkflowSSE(options: UseWorkflowSSEOptions): {
  isConnected: boolean
  events: WorkflowEvent[]
  reconnect: () => void
}
```

**Features:**

- Auto-reconnection with exponential backoff
- Event parsing and validation
- Error handling and connection state tracking
- Custom event callbacks for component integration

**Create Combined Real-Time Hook (`src/hooks/useWorkflowRealTime.ts`):**

```typescript
export function useWorkflowRealTime({ threadId, enableSSE = true, enableWebSocket = true }): {
  isConnected: boolean
  events: WorkflowEvent[]
  threadId: string
}
```

**Integration Points:**

- Extends existing `useWebSocket.ts` patterns
- Follows reconnection patterns from `useWebSocket`
- Compatible with existing event system architecture

### 1.2 Workflow State Management

**Create Workflow Store (`src/stores/workflows.ts`):**

```typescript
interface WorkflowState {
  // Active workflows
  workflows: Record<
    string,
    {
      threadId: string
      steps: WorkflowStep[]
      status: 'running' | 'completed' | 'failed' | 'aborted'
      currentStep?: string
      progress: number // 0-100
      startTime: number
      endTime?: number
    }
  >

  // Real-time events
  events: Record<string, WorkflowEvent[]>

  // UI state
  selectedWorkflowId: string | null
  expandedSteps: Record<string, boolean>
  showCompleted: boolean
  autoScroll: boolean

  // Actions
  addWorkflow: (threadId: string, steps: WorkflowStep[]) => void
  updateStepStatus: (threadId: string, stepId: string, status: WorkflowStep['status']) => void
  addEvent: (event: WorkflowEvent) => void
  calculateProgress: (threadId: string) => number
}
```

**Persistence Strategy:**

- Use existing `createPersistentStore` pattern from `src/stores/createPersistentStore.ts`
- Store UI preferences (expandedSteps, showCompleted)
- Exclude real-time data (events, workflows) from persistence
- Follow agent store patterns for data normalization

### 1.3 Basic Workflow Components

**WorkflowMonitor Component (`src/components/workflow/WorkflowMonitor.tsx`):**

```typescript
interface WorkflowMonitorProps {
  className?: string
  showHeader?: boolean
  maxHeight?: string
}

export function WorkflowMonitor(props: WorkflowMonitorProps): JSX.Element
```

**Features:**

- List active workflows with status badges
- Progress bars and execution time tracking
- Expandable workflow details
- Real-time status updates via SSE
- Clear completed workflows action

**WorkflowCard Component (`src/components/workflow/WorkflowCard.tsx`):**

```typescript
interface WorkflowCardProps {
  workflow: Workflow
  isSelected: boolean
  onSelect: () => void
  onRetry?: () => void
  onAbort?: () => void
}
```

**Features:**

- Workflow status visualization (running/completed/failed)
- Progress indicator with step counts
- Action buttons (retry, abort, view details)
- Real-time status updates
- Optimistic UI updates

## Phase 2: Node-Based Visualization (4-5 days)

### 2.1 ReactFlow Integration

**Install Dependencies:**

```bash
npm install reactflow @reactflow/core @reactflow/controls @reactflow/background @reactflow/minimap
npm install --save-dev @types/reactflow
```

**WorkflowVisualization Component (`src/components/workflow/WorkflowVisualization.tsx`):**

```typescript
interface WorkflowVisualizationProps {
  threadId: string
  readonly?: boolean
  onNodeClick?: (nodeId: string) => void
  onEdgeClick?: (edgeId: string) => void
}

export function WorkflowVisualization(props: WorkflowVisualizationProps): JSX.Element
```

**Features:**

- Convert WorkflowStep[] to ReactFlow nodes and edges
- Real-time node status updates (pending/running/completed/failed)
- Dependency visualization with proper edge routing
- Zoom, pan, and minimap controls
- Auto-layout for optimal node positioning

### 2.2 Custom Node Components

**AgentNode Component (`src/components/workflow/nodes/AgentNode.tsx`):**

```typescript
interface AgentNodeData {
  label: string
  agentId?: string
  status: WorkflowStep['status']
  task?: string
  response?: string
  startTime?: number
  duration?: number
}

export function AgentNode({ data }: NodeProps<AgentNodeData>): JSX.Element
```

**Visual Features:**

- Status-based color coding and animations
- Agent avatar/icon integration
- Task preview with truncation
- Duration and timing display
- Expandable response preview
- Loading spinner for running steps

**StartNode & EndNode Components:**

```typescript
export function StartNode({ data }: NodeProps<StartNodeData>): JSX.Element
export function EndNode({ data }: NodeProps<EndNodeData>): JSX.Element
```

**Features:**

- Consistent styling with workflow theme
- Clear entry and exit points
- Status indicators for workflow completion

### 2.3 Edge Components

**DependencyEdge Component (`src/components/workflow/edges/DependencyEdge.tsx`):**

```typescript
interface DependencyEdgeData {
  sourceStatus: WorkflowStep['status']
  targetStatus: WorkflowStep['status']
  isActive: boolean
}
```

**Features:**

- Animated data flow for active dependencies
- Color coding based on source/target status
- Failed dependency indicators
- Smooth transitions for status changes

## Phase 3: Workspace Integration (2-3 days)

### 3.1 Sidebar Panel Integration

**WorkflowPanel Component (`src/components/workflow/WorkflowPanel.tsx`):**

```typescript
export function WorkflowPanel(): JSX.Element
```

**Integration Strategy:**

- Follow existing sidebar patterns from agent panels
- Use `useCollapsibleStore` for panel state
- Badge with active workflow count
- Compact workflow list with expand-to-details

**Update Main Workspace (`src/routes/index.tsx`):**

```typescript
// Add WorkflowPanel to sidebar
<Sidebar>
  <AgentPanel />
  <WorkflowPanel />
  <DiagnosticsPanel />
</Sidebar>
```

### 3.2 Modal Integration

**WorkflowDetailsModal Component (`src/components/workflow/WorkflowDetailsModal.tsx`):**

```typescript
interface WorkflowDetailsModalProps {
  threadId: string | null
  isOpen: boolean
  onClose: () => void
}
```

**Features:**

- Full-screen workflow visualization
- Detailed step information panel
- Event log with timestamps
- Manual retry/resume controls
- Export workflow configuration

**Modal Triggers:**

- Click workflow card → Open details modal
- Double-click workflow node → Open details modal
- Keyboard shortcut (Cmd/Ctrl + W) for selected workflow

### 3.3 Context Menu Integration

**WorkflowContextMenu Component:**

```typescript
interface WorkflowContextMenuProps {
  workflow: Workflow
  position: { x: number; y: number }
  onClose: () => void
}
```

**Actions:**

- Retry failed workflow
- Abort running workflow
- Duplicate workflow configuration
- Export workflow results
- View in full screen

## Phase 4: Advanced Features (3-4 days)

### 4.1 Workflow Builder Interface

**WorkflowBuilder Component (`src/components/workflow/builder/WorkflowBuilder.tsx`):**

```typescript
interface WorkflowBuilderProps {
  initialSteps?: WorkflowStep[]
  onSave: (steps: WorkflowStep[]) => void
  onTest: (steps: WorkflowStep[]) => void
}
```

**Features:**

- Drag-and-drop node creation
- Agent selector dropdown
- Task editor with template variable autocomplete
- Dependency connection interface
- Real-time validation
- Test execution preview

**AgentPalette Component:**

```typescript
export function AgentPalette({
  agents: Agent[],
  onDragStart: (agent: Agent) => void
}): JSX.Element
```

**Features:**

- Available agents grouped by role
- Drag-and-drop to workflow canvas
- Agent status indicators
- Search and filter functionality

### 4.2 Template Variable System

**TemplateEditor Component (`src/components/workflow/TemplateEditor.tsx`):**

```typescript
interface TemplateEditorProps {
  value: string
  onChange: (value: string) => void
  availableVariables: string[]
}
```

**Features:**

- Syntax highlighting for template variables
- Autocomplete for available step outputs
- Real-time validation and preview
- Error highlighting for invalid references

**Variable Autocomplete:**

- `{stepId.output}` suggestions based on previous steps
- Context-aware variable recommendations
- Error detection for circular dependencies

### 4.3 Workflow Templates

**WorkflowTemplateLibrary Component:**

```typescript
interface WorkflowTemplate {
  id: string
  name: string
  description: string
  steps: WorkflowStep[]
  tags: string[]
  category: string
}
```

**Built-in Templates:**

- Code Review Workflow (architect → developer → reviewer)
- Documentation Generation (analyzer → writer → reviewer)
- Bug Fix Workflow (investigator → fixer → tester)
- Feature Development (planner → developer → tester → reviewer)

## Phase 5: Performance & Polish (2-3 days)

### 5.1 Performance Optimization

**Virtualization for Large Workflows:**

```typescript
// Use react-window for workflow lists with 100+ items
import { FixedSizeList as List } from 'react-window'

export function VirtualizedWorkflowList(): JSX.Element
```

**Memoization Strategy:**

```typescript
// Selective re-rendering for workflow components
const WorkflowCard = memo(
  ({ workflow }) => {
    // ... component logic
  },
  (prevProps, nextProps) => {
    return areWorkflowsEqual(prevProps.workflow, nextProps.workflow)
  }
)
```

**Debounced Updates:**

- SSE event batching for rapid status changes
- Throttled ReactFlow node position updates
- Optimized re-renders for real-time progress

### 5.2 Accessibility & UX

**Keyboard Navigation:**

- Tab through workflow nodes
- Arrow keys for node selection
- Space/Enter for node interaction
- Escape to close modals/menus

**Screen Reader Support:**

- ARIA labels for workflow status
- Live regions for status announcements
- Descriptive alt text for node graphics

**Loading States:**

- Skeleton loading for workflow cards
- Progressive loading for large workflows
- Graceful degradation for slow connections

### 5.3 Error Boundaries & Recovery

**WorkflowErrorBoundary Component:**

```typescript
export class WorkflowErrorBoundary extends Component<
  { children: React.ReactNode; threadId: string },
  WorkflowErrorBoundaryState
>
```

**Error Recovery:**

- Local state recovery from localStorage
- Retry failed component renders
- Fallback UI for corrupted workflows
- Error reporting integration

## Phase 6: Testing & Documentation (2-3 days)

### 6.1 Component Testing

**Test Files to Create:**

- `src/components/workflow/__tests__/WorkflowMonitor.test.tsx`
- `src/components/workflow/__tests__/WorkflowVisualization.test.tsx`
- `src/hooks/__tests__/useWorkflowSSE.test.tsx`
- `src/stores/__tests__/workflows.test.ts`

**Testing Patterns:**

```typescript
describe('useWorkflowSSE', () => {
  beforeEach(() => {
    global.EventSource = jest.fn(() => ({
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      close: jest.fn(),
    }))
  })

  it('should connect to SSE endpoint', () => {
    const { result } = renderHook(() => useWorkflowSSE({ threadId: 'test-123' }))

    expect(global.EventSource).toHaveBeenCalledWith('/api/invoke/stream/test-123')
  })
})
```

### 6.2 Integration Testing

**End-to-End Scenarios:**

- Create workflow → Execute → Monitor progress → Complete
- Start workflow → Interrupt → Resume → Complete
- Multi-step dependency execution with real-time updates
- Error handling and retry scenarios

**Performance Testing:**

- 10+ concurrent workflows rendering
- 100+ workflow history management
- Large workflow graphs (20+ nodes)
- Rapid SSE event processing

### 6.3 Documentation Updates

**Update Knowledge Base:**

- Add workflow UI patterns to `ui-patterns.md`
- Document component APIs in `apis.md`
- Update architecture diagrams

**Component Documentation:**

```typescript
/**
 * WorkflowVisualization - Interactive workflow graph with real-time updates
 *
 * @example
 * <WorkflowVisualization
 *   threadId="workflow-123"
 *   readonly={false}
 *   onNodeClick={(nodeId) => console.log('Node clicked:', nodeId)}
 * />
 */
```

## Technical Requirements

### Dependencies

**Core Libraries:**

```json
{
  "reactflow": "^11.x.x",
  "@reactflow/core": "^11.x.x",
  "@reactflow/controls": "^11.x.x",
  "@reactflow/background": "^11.x.x",
  "@reactflow/minimap": "^11.x.x",
  "react-window": "^1.8.x",
  "react-window-infinite-loader": "^1.0.x"
}
```

**Development Dependencies:**

```json
{
  "@types/react-window": "^1.8.x",
  "@testing-library/react-hooks": "^8.0.x"
}
```

### TypeScript Compliance

**Strict Type Safety:**

- No `any` types allowed
- Proper event type definitions
- Generic type parameters for reusable components
- Discriminated unions for workflow states

**Example Type Definitions:**

```typescript
interface WorkflowNode {
  id: string
  type: 'agent' | 'start' | 'end'
  position: { x: number; y: number }
  data: AgentNodeData | StartNodeData | EndNodeData
}

interface WorkflowEdge {
  id: string
  source: string
  target: string
  type: 'default' | 'dependency'
  data?: DependencyEdgeData
}
```

### SOLID Principles Implementation

**Single Responsibility:**

- `useWorkflowSSE` - Only SSE connection management
- `WorkflowMonitor` - Only workflow list display
- `WorkflowVisualization` - Only node graph rendering

**Open/Closed:**

- Extensible node types via ReactFlow nodeTypes
- Pluggable workflow templates
- Configurable event handlers

**Liskov Substitution:**

- All workflow components implement consistent interfaces
- Node components interchangeable via type system

**Interface Segregation:**

- Minimal, focused prop interfaces
- Optional properties for advanced features
- Separate interfaces for different use cases

**Dependency Inversion:**

- Components depend on store abstractions
- Hooks abstract SSE implementation details
- Services injectable for testing

## Success Criteria

### Functional Requirements

1. **Real-Time Updates** - Workflow status changes visible within 100ms
2. **Scalability** - Handle 20+ concurrent workflows without performance degradation
3. **Reliability** - Graceful handling of network interruptions and reconnections
4. **Usability** - Intuitive workflow creation and monitoring interface

### Performance Benchmarks

1. **Rendering** - Initial workflow load < 200ms
2. **Updates** - SSE event processing < 50ms
3. **Interactions** - Node selection/hover response < 16ms (60fps)
4. **Memory** - No memory leaks during extended usage

### Quality Gates

1. **Type Safety** - 100% TypeScript coverage, no `any` types
2. **Testing** - 90%+ code coverage for workflow components
3. **Accessibility** - WCAG 2.1 Level AA compliance
4. **Code Quality** - ESLint passing, consistent formatting

## Risk Mitigation

### Technical Risks

1. **SSE Connection Stability**
   - **Risk:** Network interruptions breaking real-time updates
   - **Mitigation:** Robust reconnection logic with exponential backoff
   - **Fallback:** Status polling every 5 seconds when SSE fails

2. **Large Workflow Performance**
   - **Risk:** UI freezing with 50+ node workflows
   - **Mitigation:** React.memo optimization and virtualization
   - **Fallback:** Simplified list view for large workflows

3. **State Synchronization**
   - **Risk:** Frontend/backend state drift
   - **Mitigation:** Server-side state as source of truth
   - **Fallback:** Periodic state reconciliation

### Integration Risks

1. **Existing Component Conflicts**
   - **Risk:** New workflow components breaking existing UI
   - **Mitigation:** Isolated component development and testing
   - **Fallback:** Feature flag for workflow UI

2. **WebSocket/SSE Event Conflicts**
   - **Risk:** Event handling interference between systems
   - **Mitigation:** Namespaced event types and careful listener management
   - **Fallback:** SSE-only mode with WebSocket disabled

## Implementation Timeline

### Week 1: Foundation (Phase 1)

- Day 1-2: SSE hooks and workflow store
- Day 3-4: Basic workflow components
- Day 5: Integration testing and bug fixes

### Week 2: Visualization (Phase 2)

- Day 1-2: ReactFlow integration and node components
- Day 3-4: Edge components and layout algorithms
- Day 5: Visual polish and animations

### Week 3: Integration (Phase 3)

- Day 1-2: Workspace sidebar integration
- Day 3-4: Modal and context menu systems
- Day 5: End-to-end workflow testing

### Week 4: Advanced Features (Phase 4)

- Day 1-2: Workflow builder interface
- Day 3-4: Template system and variable editor
- Day 5: Template library and presets

### Week 5: Polish & Testing (Phases 5-6)

- Day 1-2: Performance optimization and accessibility
- Day 3-4: Comprehensive testing suite
- Day 5: Documentation and deployment

## Post-Implementation Roadmap

### Short-term Enhancements (1-2 months)

- Workflow scheduling and automation
- Advanced filtering and search
- Workflow analytics and metrics
- Team collaboration features

### Long-term Vision (3-6 months)

- AI-powered workflow suggestions
- Version control for workflow templates
- Integration with external tools (GitHub, Slack, etc.)
- Workflow marketplace and sharing

This implementation plan provides a comprehensive roadmap for building production-ready workflow visualization UI that integrates seamlessly with Claude Studio's existing architecture while following SOLID, DRY, and KISS principles.
