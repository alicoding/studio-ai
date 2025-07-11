# Workflow Visualization & Testing Plan

## Overview

Implement visual workflow monitoring similar to n8n/ReactFlow to see workflow execution paths, loops, and routing decisions. Test workflow logic without making real Claude API calls.

## Goals

1. **Visual Workflow Graph** - See nodes, connections, and execution flow
2. **Loop Visualization** - Track coder→reviewer→coder cycles
3. **Test Workflow Logic** - Verify routing, dependencies, and failures (mocked)
4. **Real-time Tracking** - See workflow progress as it happens

## Phase 1: API Contract Enhancement ⏳

### 1.1 Extend Workflow Response Structure

- [x] Add `graph` field to InvokeResponse with nodes and edges
- [x] Include execution order and timestamps
- [x] Add loop detection metadata
- [x] Include operator routing decisions

### 1.2 Create Graph Visualization Endpoint

- [x] Add `GET /api/workflow-graph/:threadId` endpoint
- [x] Return node positions (auto-layout or saved)
- [x] Include execution path highlighting data
- [x] Add resume point indicators

### 1.3 Enhance Workflow Events

- [x] Add graph update events to SSE stream
- [x] Include node state changes (pending→running→completed)
- [x] Emit routing decisions and loop iterations
- [x] Send timing data for animations

## Phase 2: Test Infrastructure (Mocked) ⏳

### 2.1 Create Mock Infrastructure

- [ ] Mock Claude SDK responses (don't call real API)
- [ ] Create test fixtures for various agent responses
- [ ] Mock timing and delays for realistic testing
- [ ] Setup test workflow scenarios

### 2.2 Test Workflow Routing

- [ ] Test linear workflow execution
- [ ] Test parallel execution (fork/join)
- [ ] Test conditional routing based on outputs
- [ ] Test dependency resolution

### 2.3 Test Complex Scenarios

- [ ] Test coder→reviewer loops (2-3 iterations)
- [ ] Test failure cascades and error handling
- [ ] Test workflow resume from interruption
- [ ] Test timeout and cancellation

### 2.4 Test Graph Generation

- [ ] Verify correct nodes and edges
- [ ] Test loop detection algorithm
- [ ] Verify execution path tracking
- [ ] Test auto-layout calculations

## Phase 3: Visual UI Implementation ⏳

### 3.1 Setup ReactFlow

- [ ] Install and configure ReactFlow
- [ ] Create custom node components for workflow steps
- [ ] Style nodes based on agent type (coder/reviewer/etc)
- [ ] Add status indicators (pending/running/completed/failed)

### 3.2 Workflow Graph Component

- [ ] Create WorkflowGraph component
- [ ] Integrate into WorkflowModal
- [ ] Add auto-layout using dagre or elk
- [ ] Handle zoom/pan controls

### 3.3 Execution Visualization

- [ ] Highlight active nodes during execution
- [ ] Animate edge traversal
- [ ] Show loop iterations with counters
- [ ] Display timing information

### 3.4 Interactive Features

- [ ] Click nodes to see step details
- [ ] Hover to see execution time
- [ ] Show operator decisions on edges
- [ ] Highlight resume points

### 3.5 Real-time Updates

- [ ] Connect to SSE for live updates
- [ ] Animate node state changes
- [ ] Update execution path dynamically
- [ ] Show progress indicators

## Phase 4: Advanced Features ⏳

### 4.1 Loop Visualization

- [ ] Detect and highlight circular paths
- [ ] Show iteration count badges
- [ ] Animate loop execution
- [ ] Color-code based on iteration

### 4.2 Operator Visibility

- [ ] Show LangGraph operator decisions
- [ ] Display routing logic on edges
- [ ] Highlight decision points
- [ ] Show condition evaluations

### 4.3 Resume Indicators

- [ ] Mark resumable nodes
- [ ] Show saved state indicators
- [ ] Display checkpoint information
- [ ] Enable resume from graph

## Implementation Order

1. **Start with API** - Get the data structure right first
2. **Add basic graph** - Simple node/edge visualization
3. **Add execution tracking** - Show what ran
4. **Add animations** - Make it live
5. **Add advanced features** - Loops, operators, resume

## Success Criteria

- [ ] Can see workflow as visual graph
- [ ] Can track execution flow in real-time
- [ ] Can identify loops and how many iterations
- [ ] Can see where workflow failed or was interrupted
- [ ] Can run tests without consuming Claude API quota
- [ ] Can verify complex routing logic works correctly

## Technical Decisions

### Libraries

- **ReactFlow** - For graph visualization (or alternative: Cytoscape.js, vis.js)
- **dagre** - For auto-layout of nodes
- **vitest** - For mocked workflow tests

### API Design

```typescript
interface WorkflowGraph {
  nodes: Array<{
    id: string
    type: 'step' | 'operator' | 'decision'
    data: {
      agentId?: string
      role?: string
      task: string
      status: 'pending' | 'running' | 'completed' | 'failed'
      startTime?: number
      endTime?: number
      output?: string
    }
    position: { x: number; y: number }
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    type: 'dependency' | 'loop' | 'conditional'
    data?: {
      condition?: string
      iterations?: number
    }
  }>
  execution: {
    path: string[] // Node IDs in execution order
    loops: Array<{
      nodes: string[]
      iterations: number
    }>
    currentNode?: string
    resumePoints: string[]
  }
}
```

## Notes

- Mock all Claude API calls in tests to prevent quota usage
- Focus on testing workflow logic, not agent responses
- Ensure graph updates don't impact performance
- Consider saving graph layouts for complex workflows
