# React UI Patterns for Real-Time Workflow Visualization

## Overview

This document outlines React patterns for building real-time workflow visualization UI, based on existing Studio AI patterns for WebSocket/SSE communication, state management, and component composition.

## Real-Time Communication Patterns

### WebSocket Hook Pattern

**Base Pattern (useWebSocket.ts):**

```typescript
interface UseWebSocketOptions {
  url?: string
  reconnectAttempts?: number
  reconnectDelay?: number
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const socketRef = useRef<Socket | null>(null)

  const connect = useCallback(() => {
    const socket = io(window.location.origin, {
      reconnection: true,
      reconnectionAttempts: options.reconnectAttempts,
      reconnectionDelay: options.reconnectDelay,
    })

    socket.on('reconnect', () => {
      // Emit custom event for components to re-establish subscriptions
      window.dispatchEvent(new CustomEvent('websocket-reconnected'))
    })

    socketRef.current = socket
  }, [])

  return { isConnected, error, emit, on, off, socket }
}
```

### Server-Sent Events Hook Pattern

**Workflow SSE Hook (useWorkflowSSE):**

```typescript
interface WorkflowEvent {
  type: 'step_start' | 'step_complete' | 'step_failed' | 'workflow_complete' | 'workflow_failed'
  threadId: string
  stepId?: string
  sessionId?: string
  retry?: number
  status?: string
  lastStep?: string
}

interface UseWorkflowSSEOptions {
  threadId: string
  onEvent?: (event: WorkflowEvent) => void
  reconnectDelay?: number
}

export function useWorkflowSSE({
  threadId,
  onEvent,
  reconnectDelay = 1000,
}: UseWorkflowSSEOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [events, setEvents] = useState<WorkflowEvent[]>([])
  const eventSourceRef = useRef<EventSource | null>(null)

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource(`/api/invoke/stream/${threadId}`)

    eventSource.onopen = () => setIsConnected(true)
    eventSource.onerror = () => {
      setIsConnected(false)
      // Auto-reconnect after delay
      setTimeout(connect, reconnectDelay)
    }

    eventSource.onmessage = (event) => {
      try {
        const workflowEvent: WorkflowEvent = JSON.parse(event.data)
        setEvents((prev) => [...prev, workflowEvent])
        onEvent?.(workflowEvent)
      } catch (error) {
        console.error('Failed to parse SSE event:', error)
      }
    }

    eventSourceRef.current = eventSource
  }, [threadId, onEvent, reconnectDelay])

  useEffect(() => {
    connect()
    return () => eventSourceRef.current?.close()
  }, [connect])

  return { isConnected, events, reconnect: connect }
}
```

### Combined Real-Time Hook

**Unified Communication (useWorkflowRealTime):**

```typescript
interface UseWorkflowRealTimeOptions {
  threadId: string
  enableSSE?: boolean
  enableWebSocket?: boolean
}

export function useWorkflowRealTime({
  threadId,
  enableSSE = true,
  enableWebSocket = true,
}: UseWorkflowRealTimeOptions) {
  const {
    isConnected: wsConnected,
    on,
    off,
  } = useWebSocket({
    reconnectAttempts: 5,
    reconnectDelay: 1000,
  })

  const { isConnected: sseConnected, events } = useWorkflowSSE({
    threadId,
    reconnectDelay: 2000,
  })

  // Listen for WebSocket workflow events
  useEffect(() => {
    if (!enableWebSocket || !wsConnected) return

    const handleWorkflowUpdate = (event: WorkflowEvent) => {
      if (event.threadId === threadId) {
        // Handle real-time updates from WebSocket
        console.log('WebSocket workflow event:', event)
      }
    }

    on('workflow:update', handleWorkflowUpdate)
    return () => off('workflow:update', handleWorkflowUpdate)
  }, [threadId, wsConnected, enableWebSocket, on, off])

  return {
    isConnected: (enableSSE ? sseConnected : true) && (enableWebSocket ? wsConnected : true),
    events,
    threadId,
  }
}
```

## State Management Patterns

### Workflow Store Pattern

**Based on Zustand Architecture:**

```typescript
interface WorkflowStep {
  id: string
  agentId?: string
  role?: string
  task: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'blocked'
  deps?: string[]
  startTime?: number
  endTime?: number
  sessionId?: string
  response?: string
  error?: string
}

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
  events: Record<string, WorkflowEvent[]> // threadId -> events[]

  // UI state
  selectedWorkflowId: string | null
  expandedSteps: Record<string, boolean> // stepId -> expanded
  showCompleted: boolean
  autoScroll: boolean

  // Actions
  addWorkflow: (threadId: string, steps: WorkflowStep[]) => void
  updateStepStatus: (threadId: string, stepId: string, status: WorkflowStep['status']) => void
  addEvent: (event: WorkflowEvent) => void
  setSelectedWorkflow: (threadId: string | null) => void
  toggleStepExpanded: (stepId: string) => void
  clearCompleted: () => void
  calculateProgress: (threadId: string) => number
}

export const useWorkflowStore = createPersistentStore<WorkflowState>('workflows', (set, get) => ({
  workflows: {},
  events: {},
  selectedWorkflowId: null,
  expandedSteps: {},
  showCompleted: true,
  autoScroll: true,

  addWorkflow: (threadId, steps) =>
    set((state) => ({
      workflows: {
        ...state.workflows,
        [threadId]: {
          threadId,
          steps: steps.map((step) => ({ ...step, status: 'pending' })),
          status: 'running',
          progress: 0,
          startTime: Date.now(),
        },
      },
    })),

  updateStepStatus: (threadId, stepId, status) =>
    set((state) => {
      const workflow = state.workflows[threadId]
      if (!workflow) return state

      const updatedSteps = workflow.steps.map((step) =>
        step.id === stepId
          ? {
              ...step,
              status,
              startTime: step.startTime || (status === 'running' ? Date.now() : undefined),
              endTime: ['completed', 'failed', 'blocked'].includes(status) ? Date.now() : undefined,
            }
          : step
      )

      return {
        workflows: {
          ...state.workflows,
          [threadId]: {
            ...workflow,
            steps: updatedSteps,
            progress: get().calculateProgress(threadId),
            currentStep: status === 'running' ? stepId : workflow.currentStep,
          },
        },
      }
    }),

  calculateProgress: (threadId) => {
    const workflow = get().workflows[threadId]
    if (!workflow) return 0

    const completedSteps = workflow.steps.filter((s) => s.status === 'completed').length
    return (completedSteps / workflow.steps.length) * 100
  },

  addEvent: (event) =>
    set((state) => ({
      events: {
        ...state.events,
        [event.threadId]: [...(state.events[event.threadId] || []), event],
      },
    })),
}))
```

## Component Composition Patterns

### Workflow Monitor Component

**Container Component Pattern:**

```typescript
interface WorkflowMonitorProps {
  className?: string
  showHeader?: boolean
  maxHeight?: string
}

export function WorkflowMonitor({
  className,
  showHeader = true,
  maxHeight = '600px'
}: WorkflowMonitorProps) {
  const { workflows, selectedWorkflowId, setSelectedWorkflow } = useWorkflowStore()
  const activeWorkflows = Object.values(workflows).filter(w => w.status === 'running')

  return (
    <div className={cn('workflow-monitor', className)} style={{ maxHeight }}>
      {showHeader && (
        <WorkflowHeader
          count={activeWorkflows.length}
          onClearCompleted={() => {/* TODO */}}
        />
      )}

      <div className="workflow-list">
        {activeWorkflows.map(workflow => (
          <WorkflowCard
            key={workflow.threadId}
            workflow={workflow}
            isSelected={selectedWorkflowId === workflow.threadId}
            onSelect={() => setSelectedWorkflow(workflow.threadId)}
          />
        ))}
      </div>

      {selectedWorkflowId && (
        <WorkflowDetails threadId={selectedWorkflowId} />
      )}
    </div>
  )
}
```

### Workflow Visualization Component

**n8n-Style Node Graph:**

```typescript
interface WorkflowNode {
  id: string
  type: 'agent' | 'start' | 'end'
  position: { x: number; y: number }
  data: {
    label: string
    agentId?: string
    status: WorkflowStep['status']
    task?: string
    response?: string
  }
}

interface WorkflowEdge {
  id: string
  source: string
  target: string
  type: 'default' | 'dependency'
}

export function WorkflowVisualization({ threadId }: { threadId: string }) {
  const workflow = useWorkflowStore(state => state.workflows[threadId])
  const [nodes, setNodes] = useState<WorkflowNode[]>([])
  const [edges, setEdges] = useState<WorkflowEdge[]>([])

  // Convert workflow steps to nodes and edges
  useEffect(() => {
    if (!workflow) return

    const workflowNodes: WorkflowNode[] = [
      {
        id: 'start',
        type: 'start',
        position: { x: 0, y: 100 },
        data: { label: 'Start', status: 'completed' }
      },
      ...workflow.steps.map((step, index) => ({
        id: step.id,
        type: 'agent' as const,
        position: { x: (index + 1) * 200, y: 100 },
        data: {
          label: step.agentId || step.role || 'Agent',
          agentId: step.agentId,
          status: step.status,
          task: step.task,
          response: step.response
        }
      })),
      {
        id: 'end',
        type: 'end',
        position: { x: (workflow.steps.length + 1) * 200, y: 100 },
        data: { label: 'End', status: 'pending' }
      }
    ]

    const workflowEdges: WorkflowEdge[] = [
      { id: 'start-edge', source: 'start', target: workflow.steps[0]?.id || 'end', type: 'default' },
      ...workflow.steps.flatMap((step, index) => {
        const stepEdges: WorkflowEdge[] = []

        // Dependencies
        if (step.deps) {
          stepEdges.push(...step.deps.map(depId => ({
            id: `${depId}-${step.id}`,
            source: depId,
            target: step.id,
            type: 'dependency' as const
          })))
        }

        // Sequential flow (if no dependencies)
        if (!step.deps && index < workflow.steps.length - 1) {
          stepEdges.push({
            id: `${step.id}-${workflow.steps[index + 1].id}`,
            source: step.id,
            target: workflow.steps[index + 1].id,
            type: 'default'
          })
        }

        // Final step to end
        if (index === workflow.steps.length - 1) {
          stepEdges.push({
            id: `${step.id}-end`,
            source: step.id,
            target: 'end',
            type: 'default'
          })
        }

        return stepEdges
      })
    ]

    setNodes(workflowNodes)
    setEdges(workflowEdges)
  }, [workflow])

  return (
    <div className="workflow-visualization">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={{
          agent: AgentNode,
          start: StartNode,
          end: EndNode
        }}
        edgeTypes={{
          default: DefaultEdge,
          dependency: DependencyEdge
        }}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  )
}
```

### Agent Node Component

**Custom ReactFlow Node:**

```typescript
interface AgentNodeData {
  label: string
  agentId?: string
  status: WorkflowStep['status']
  task?: string
  response?: string
}

export function AgentNode({ data }: NodeProps<AgentNodeData>) {
  const [expanded, setExpanded] = useState(false)

  const statusColors = {
    pending: 'bg-gray-200 border-gray-300',
    running: 'bg-blue-100 border-blue-500 animate-pulse',
    completed: 'bg-green-100 border-green-500',
    failed: 'bg-red-100 border-red-500',
    blocked: 'bg-yellow-100 border-yellow-500'
  }

  const statusIcons = {
    pending: Clock,
    running: Loader2,
    completed: CheckCircle,
    failed: XCircle,
    blocked: AlertCircle
  }

  const StatusIcon = statusIcons[data.status]

  return (
    <div className={cn(
      'agent-node border-2 rounded-lg p-3 min-w-[180px] bg-white shadow-sm',
      statusColors[data.status]
    )}>
      <Handle type="target" position={Position.Left} />

      <div className="flex items-center gap-2 mb-2">
        <StatusIcon className="w-4 h-4" />
        <span className="font-medium text-sm">{data.label}</span>
      </div>

      {data.agentId && (
        <div className="text-xs text-gray-600 mb-2">
          ID: {data.agentId}
        </div>
      )}

      <div className="text-xs text-gray-700 mb-2 line-clamp-2">
        {data.task}
      </div>

      {data.response && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {expanded ? 'Hide' : 'Show'} Response
        </button>
      )}

      {expanded && data.response && (
        <div className="mt-2 p-2 bg-gray-50 rounded text-xs max-h-32 overflow-y-auto">
          {data.response}
        </div>
      )}

      <Handle type="source" position={Position.Right} />
    </div>
  )
}
```

## Real-Time Update Strategies

### Event-Driven Updates

**Component Pattern:**

```typescript
export function WorkflowStepCard({ threadId, step }: { threadId: string; step: WorkflowStep }) {
  const updateStepStatus = useWorkflowStore(state => state.updateStepStatus)

  // Listen for real-time events
  useWorkflowRealTime({
    threadId,
    onEvent: (event) => {
      if (event.stepId === step.id) {
        switch (event.type) {
          case 'step_start':
            updateStepStatus(threadId, step.id, 'running')
            break
          case 'step_complete':
            updateStepStatus(threadId, step.id, 'completed')
            break
          case 'step_failed':
            updateStepStatus(threadId, step.id, 'failed')
            break
        }
      }
    }
  })

  return (
    <div className={cn('step-card', getStatusStyles(step.status))}>
      <StepHeader step={step} />
      <StepContent step={step} />
      <StepActions step={step} />
    </div>
  )
}
```

### Optimistic Updates

**Immediate UI Feedback:**

```typescript
export function useWorkflowActions() {
  const updateStepStatus = useWorkflowStore((state) => state.updateStepStatus)

  const retryStep = useCallback(
    async (threadId: string, stepId: string) => {
      // Optimistic update
      updateStepStatus(threadId, stepId, 'running')

      try {
        const response = await ky.post(`/api/invoke/retry`, {
          json: { threadId, stepId },
        })

        // Server will emit real-time events for actual status
      } catch (error) {
        // Revert optimistic update
        updateStepStatus(threadId, stepId, 'failed')
        throw error
      }
    },
    [updateStepStatus]
  )

  const abortWorkflow = useCallback(async (threadId: string) => {
    try {
      await ky.post(`/api/invoke/abort`, {
        json: { threadId },
      })
    } catch (error) {
      console.error('Failed to abort workflow:', error)
      throw error
    }
  }, [])

  return { retryStep, abortWorkflow }
}
```

## Performance Optimization Patterns

### Virtualization for Large Workflows

**React Window Integration:**

```typescript
interface VirtualizedWorkflowListProps {
  workflows: Workflow[]
  itemHeight: number
  maxHeight: number
}

export function VirtualizedWorkflowList({
  workflows,
  itemHeight,
  maxHeight
}: VirtualizedWorkflowListProps) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <WorkflowCard workflow={workflows[index]} />
    </div>
  )

  return (
    <FixedSizeList
      height={maxHeight}
      itemCount={workflows.length}
      itemSize={itemHeight}
      overscanCount={5}
    >
      {Row}
    </FixedSizeList>
  )
}
```

### Memoization Patterns

**Selective Re-rendering:**

```typescript
const WorkflowCard = memo(({ workflow }: { workflow: Workflow }) => {
  const progress = useMemo(() =>
    calculateProgress(workflow.steps),
    [workflow.steps]
  )

  const statusCounts = useMemo(() =>
    countStepStatuses(workflow.steps),
    [workflow.steps]
  )

  return (
    <div className="workflow-card">
      <WorkflowProgress value={progress} />
      <WorkflowStats counts={statusCounts} />
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison for deep step status changes
  return areStepStatusesEqual(prevProps.workflow.steps, nextProps.workflow.steps)
})
```

## Error Boundary Patterns

### Workflow-Specific Error Handling

**Resilient UI Components:**

```typescript
interface WorkflowErrorBoundaryState {
  hasError: boolean
  error?: Error
  threadId?: string
}

export class WorkflowErrorBoundary extends Component<
  { children: React.ReactNode; threadId: string },
  WorkflowErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; threadId: string }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): WorkflowErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Workflow UI error:', error, errorInfo)
    // Report to monitoring service
  }

  render() {
    if (this.state.hasError) {
      return (
        <WorkflowErrorFallback
          error={this.state.error}
          threadId={this.props.threadId}
          onRetry={() => this.setState({ hasError: false })}
        />
      )
    }

    return this.props.children
  }
}
```

## Integration Patterns

### Workspace Sidebar Integration

**Panel Component Pattern:**

```typescript
export function WorkflowPanel() {
  const { isCollapsed, toggle } = useCollapsibleStore()
  const activeWorkflows = useWorkflowStore(state =>
    Object.values(state.workflows).filter(w => w.status === 'running')
  )

  return (
    <CollapsiblePanel
      title="Workflows"
      isCollapsed={isCollapsed}
      onToggle={toggle}
      badge={activeWorkflows.length}
    >
      <WorkflowMonitor maxHeight="400px" showHeader={false} />
    </CollapsiblePanel>
  )
}
```

### Modal Integration

**Workflow Details Modal:**

```typescript
export function WorkflowDetailsModal({
  threadId,
  isOpen,
  onClose
}: {
  threadId: string | null
  isOpen: boolean
  onClose: () => void
}) {
  if (!threadId) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalHeader>
        <h2>Workflow Details</h2>
      </ModalHeader>

      <ModalBody>
        <WorkflowVisualization threadId={threadId} />
        <WorkflowEventLog threadId={threadId} />
      </ModalBody>

      <ModalFooter>
        <WorkflowActions threadId={threadId} />
      </ModalFooter>
    </Modal>
  )
}
```

## Testing Patterns

### Component Testing

**Real-Time Hook Testing:**

```typescript
describe('useWorkflowSSE', () => {
  beforeEach(() => {
    // Mock EventSource
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

  it('should handle events correctly', () => {
    const onEvent = jest.fn()
    renderHook(() => useWorkflowSSE({ threadId: 'test-123', onEvent }))

    // Simulate SSE event
    const mockEvent = { data: JSON.stringify({ type: 'step_start', threadId: 'test-123' }) }
    // Trigger event handler

    expect(onEvent).toHaveBeenCalledWith({ type: 'step_start', threadId: 'test-123' })
  })
})
```

### Integration Testing

**Workflow Component Testing:**

```typescript
describe('WorkflowMonitor', () => {
  it('should display active workflows', () => {
    const mockWorkflows = [
      { threadId: 'wf-1', status: 'running', steps: [] },
      { threadId: 'wf-2', status: 'completed', steps: [] }
    ]

    render(<WorkflowMonitor />, {
      wrapper: ({ children }) => (
        <WorkflowStoreProvider initialState={{ workflows: mockWorkflows }}>
          {children}
        </WorkflowStoreProvider>
      )
    })

    expect(screen.getByText('1 active workflow')).toBeInTheDocument()
  })
})
```

## Key Implementation Principles

### SOLID Compliance

1. **Single Responsibility** - Each component has one clear purpose
2. **Open/Closed** - Components extensible via props and composition
3. **Liskov Substitution** - All workflow components implement consistent interfaces
4. **Interface Segregation** - Minimal, focused prop interfaces
5. **Dependency Inversion** - Components depend on abstractions (hooks, stores)

### DRY Implementation

- Shared hooks for common real-time patterns
- Reusable visualization components
- Common status styling utilities
- Centralized event handling logic

### KISS Approach

- Simple component hierarchies
- Clear data flow patterns
- Minimal state management
- Straightforward event handling

This architecture provides a solid foundation for implementing n8n-style workflow visualization with real-time updates, following Studio AI's established patterns and principles.
