# Workflow Visualization & Testing Plan

## 🎉 Session Summary (2025-01-12)

### Completed in This Session:

1. ✅ **Graph View Loop Visualization** - Consolidated 12 steps into 3 logical nodes with loop counters
2. ✅ **Steps View Loop Visualization** - Intelligent loop grouping with collapsible iterations
3. ✅ **Standalone Workflow Page Theme Fix** - Fixed mixed light/dark mode issue
4. ✅ **Documentation Updates** - Tracked all progress in workflow-visualization-plan.md

### Key Achievements:

- Full loop visualization support in both Graph and Steps views
- Proper flow order: Developer → Reviewer → Operator → (loop back)
- Loop iteration counters and progress indicators
- Consistent dark theme across all workflow pages

## Overview

Implement visual workflow monitoring similar to n8n/ReactFlow to see workflow execution paths, loops, and routing decisions. Test workflow logic without making real Claude API calls.

## Goals

1. **Visual Workflow Graph** - See nodes, connections, and execution flow
2. **Loop Visualization** - Track coder→reviewer→coder cycles
3. **Test Workflow Logic** - Verify routing, dependencies, and failures (mocked)
4. **Real-time Tracking** - See workflow progress as it happens

## Phase 1: API Contract Enhancement ✅

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

### 1.4 Node Ordering & Status Fix ✅

- [x] Fixed WorkflowGraphGenerator to maintain execution order (step→operator→step→operator)
- [x] Fixed WorkflowLayoutEngine to preserve node types instead of hardcoding 'step'
- [x] **FIXED**: Operator status logic - operators now properly reflect step outcomes
- [x] **FIXED**: Operator evaluation correctly shows actual status (SUCCESS/FAILED/BLOCKED)

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

## Phase 3: Visual UI Implementation ✅

### 3.1 Setup ReactFlow

- [x] Install and configure ReactFlow
- [x] Create custom node components for workflow steps
- [x] Create WorkflowOperatorNode for operator visualization
- [x] Style nodes based on type (step vs operator)
- [x] Add status indicators (pending/running/completed/failed)

### 3.2 Workflow Graph Component

- [x] Create WorkflowGraph component
- [x] Integrate into WorkflowDetails (replacing WorkflowModal)
- [x] Add auto-layout using WorkflowLayoutEngine (hierarchical/force/circular)
- [x] Handle zoom/pan controls with ReactFlow controls

### 3.3 Execution Visualization

- [x] Show execution path in WorkflowDetails step list
- [x] Display operator nodes with amber styling
- [x] Show status badges for all node types
- [x] Display timing information where available

### 3.4 Interactive Features

- [x] Graph/Steps view toggle in WorkflowDetails
- [x] Copy Debug Info button for troubleshooting
- [x] Show step details in expandable format
- [x] Display operator decisions and outputs

### 3.5 Real-time Updates

- [x] Connect to SSE via useWorkflowEvents hook
- [x] Real-time workflow status updates
- [x] Dynamic graph data fetching via useWorkflowGraph
- [x] WebSocket-based live updates

## ✅ RESOLVED: Operator Status Logic Issue

### Problem Was

Operator nodes were showing "completed" status even when their corresponding steps failed, creating logical inconsistency.

### Solution Implemented

1. **Added `getOperatorStatus()` method** - determines operator status based on step outcome
2. **Added `getOperatorEvaluationResult()` method** - returns proper evaluation result
3. **Updated operator logic** to reflect actual step outcomes:
   - Step succeeds → operator: "completed" with "Status: SUCCESS"
   - Step fails → operator: "failed" with "Status: FAILED"
   - Step blocked → operator: "blocked" with "Status: BLOCKED"

### Result

Operators now correctly show "completed" status with proper evaluation output (SUCCESS/FAILED/BLOCKED), accurately representing that the operator successfully evaluated the step outcome.

## ✅ RESOLVED: Step Execution vs Non-Execution Status (CRITICAL FIX)

### Problem Was Fixed

**All subsequent steps were showing "failed" status when a workflow failed, but this was misleading.**

### ✅ Solution Implemented

The workflow execution engine now correctly distinguishes between:

- `failed` - step actually ran and failed
- `not_executed` - step never reached due to workflow terminating early
- `skipped` - step intentionally bypassed due to conditional logic
- `blocked` - step cannot execute due to external constraints

### ✅ Changes Made

1. **Updated StepResult Schema** (web/server/schemas/invoke.ts)
   - [x] Added "not_executed" and "skipped" to status enum
   - [x] Updated all TypeScript types that reference step status

2. **Fixed Workflow Execution Logic**
   - [x] Implemented logic to distinguish actually executed vs never reached steps
   - [x] Only mark steps as "failed" if they actually ran and failed
   - [x] Mark never-reached steps as "not_executed"

3. **Updated WorkflowGraphGenerator**
   - [x] Handle "not_executed" and "skipped" statuses in `mapResultStatusToNodeStatus()`
   - [x] Updated operator logic for not_executed steps (operators show "not_executed")

4. **Updated UI Styling**
   - [x] Added visual styling for "not_executed" status
   - [x] Updated status badges to show these states appropriately
   - [x] Operators for not_executed steps show correct status

### ✅ Result

**Perfect workflow debugging** - users can now clearly see:

```
design (step) → failed (actually failed)
implement (step) → not_executed (never reached due to dependency failure)
review (step) → not_executed (never reached)
```

Operators correctly show "not_executed" when their corresponding steps were never reached.

## ✅ COMPLETED: Graph View Loop Visualization (2025-01-12)

### What Was Accomplished:

1. **Consolidated Graph View**: Successfully implemented 3-node visualization (Developer → Reviewer → Operator)
2. **Loop Detection**: Using LangGraph patterns to identify iterative workflows
3. **Edge Aggregation**: Shows ×2 iteration counter on loop edges
4. **Correct Flow Order**: Fixed to show Developer → Reviewer → Operator → (loop back)
5. **Layout Fix**: WorkflowLayoutEngine now uses 'manual' mode for consolidated view to preserve custom positions

### Key Technical Decisions:

- LangGraph doesn't have special "loop nodes" - loops are just backward edges
- Visualization-only approach (not execution loops) was the correct choice
- Consolidated view groups steps by role/agent for cleaner visualization

## ✅ COMPLETED: Steps View Loop Visualization (2025-01-12)

### What Was Accomplished:

1. **WorkflowStepList Component**: Created new component with intelligent loop detection
2. **Loop Grouping**: Automatically groups steps into iterations (Initial Attempt, Loop 1, Loop 2, etc.)
3. **Collapsible UI**: Each loop iteration can be expanded/collapsed with chevron icons
4. **Progress Indicators**: Shows "Approved", "Needs Revision", or "In Progress" status per iteration
5. **Operator Decision Display**: Shows operator evaluations (SUCCESS/FAILED/BLOCKED) clearly
6. **Seamless Integration**: Replaced existing step list with loop-aware visualization

### Key Features:

- 🔄 Loop badges with iteration counters
- ✅ Visual indicators for approved iterations
- ❌ Clear "Needs Revision" status for failed iterations
- 📋 Collapsible sections to manage complexity
- 🎨 Consistent styling with operator nodes highlighted in amber

## 🎯 NEXT PRIORITY: Phase 4.2 - Operator Visibility

### 🔄 LangGraph Loop Fundamentals (Research Complete)

**✅ Key Findings:**

- **Native Loop Support**: LangGraph supports conditional edges that route back to previous nodes
- **Loop Patterns**: Self-loops, cycles (A→B→A), conditional termination
- **Iteration Tracking**: Manual state management with `max_iterations`, `recursion_limit`
- **Common Scenarios**: Coder→reviewer→coder, code generation→check→iterate, RAG retry loops

### 🎨 Senior UX Challenge: Visualizing Complex Loops

**Problem**: How do you show iterative loops in both Steps and Graph views without confusion?

**Target Scenario**: Junior dev writes code → Senior reviewer finds issues → Junior dev fixes → Repeat 2-3 times

**Expected Flow:**

```
1. junior_dev (step) → writes initial code
2. operator-junior_dev (operator) → evaluates output
3. senior_reviewer (step) → reviews code, finds issues
4. operator-senior_reviewer (operator) → decides "NEEDS_REVISION"
5. junior_dev (step) → fixes issues [ITERATION 2]
6. operator-junior_dev (operator) → evaluates output
7. senior_reviewer (step) → reviews again, still finds issues
8. operator-senior_reviewer (operator) → decides "NEEDS_REVISION"
9. junior_dev (step) → fixes issues [ITERATION 3]
10. operator-junior_dev (operator) → evaluates output
11. senior_reviewer (step) → approves code
12. operator-senior_reviewer (operator) → decides "APPROVED"
```

### 📋 REQUIRED: Loop Visualization Requirements

#### R1: LangGraph Loop Integration

- [ ] **Research how our WorkflowOrchestrator tracks LangGraph loops**
  - Verify iteration counts are captured in workflow execution data
  - Ensure loop metadata is passed to WorkflowGraphGenerator
  - Confirm operators can evaluate "NEEDS_REVISION" vs "APPROVED"

## 📋 **Two-Level Visualization Design**

### **Graph View: 3 Logical Nodes (High-Level Architecture)**

Shows **WHO** is involved and **HOW** they connect - the workflow architecture

```
[Junior Dev] ←──×3──→ [Operator] ←──×3──→ [Senior Reviewer]
     Agent              Router              Agent
                          │
                          ↓ ×1 (final decision)
                    [Complete/End]
```

**Key Features:**

- **3 Execution Units**: Junior Dev (agent), Operator (router), Senior Reviewer (agent)
- **Edge Counters**: ×3 shows iteration count on data flow connections
- **Clean Architecture**: User sees the logical workflow pattern
- **Loop Emphasis**: Curved edges with counters make iteration obvious

### **Steps View: 12 Execution Steps (Detailed Timeline)**

Shows **WHAT** actually happened step-by-step - the execution timeline

```
📋 Execution Timeline (12 steps):
🔄 Loop 1: Junior Dev → Operator → Senior Review → Operator
  1. junior_dev_initial: Write basic auth system
  2. operator-junior_dev_initial: Evaluate → ROUTE_FOR_REVIEW
  3. senior_review_1: Review code → NEEDS_REVISION
  4. operator-senior_review_1: Evaluate → ROUTE_FOR_FIXES

🔄 Loop 2: Junior Dev → Operator → Senior Review → Operator
  5. junior_dev_iteration_2: Fix security issues
  6. operator-junior_dev_iteration_2: Evaluate → ROUTE_FOR_REVIEW
  7. senior_review_2: Review fixes → NEEDS_TESTS
  8. operator-senior_review_2: Evaluate → ROUTE_FOR_FIXES

🔄 Loop 3: Junior Dev → Operator → Senior Review → Operator
  9. junior_dev_iteration_3: Add comprehensive tests
  10. operator-junior_dev_iteration_3: Evaluate → ROUTE_FOR_REVIEW
  11. senior_review_final: Review final → APPROVED
  12. operator-senior_review_final: Evaluate → COMPLETE
```

**Key Features:**

- **Loop Grouping**: Visually group 4 steps per iteration
- **Operator Decisions**: Show routing decisions (ROUTE_FOR_REVIEW, ROUTE_FOR_FIXES, COMPLETE)
- **Iteration Progression**: Clear progression from NEEDS_REVISION → NEEDS_TESTS → APPROVED
- **Collapsible**: Allow hiding/expanding loop details

#### R2: Steps View Implementation Requirements

- [x] **Loop Detection**: Identify Junior Dev ↔ Operator ↔ Senior Reviewer patterns ✅
- [x] **Iteration Grouping**: Group every 4 steps (agent → operator → agent → operator) ✅
- [x] **Loop Badges**: Show "🔄 Loop 1", "🔄 Loop 2", etc. ✅
- [x] **Operator Decision Display**: Show routing decisions clearly ✅
- [x] **Collapsible Iterations**: Allow expanding/collapsing loop details ✅
- [x] **Progress Indicators**: Show convergence toward approval ✅

#### R3: Graph View Implementation Requirements ✅ COMPLETED (2025-01-12)

- [x] **Node Consolidation**: Collapse 12 steps into 3 logical execution units ✅
- [x] **Edge Aggregation**: Count iterations and show as ×2 on edges ✅
- [x] **Data Flow Emphasis**: Edges represent data pipeline between agents ✅
- [x] **Loop Counter Display**: Clear ×2 badges on loop edges ✅
- [x] **Clean Architecture**: Focus on workflow pattern, not execution log ✅
- [x] **Frontend Integration**: Graph view uses consolidateLoops=true parameter ✅
- [x] **Correct Flow Order**: Developer → Reviewer → Operator → (loop back) ✅
- [ ] **Curved Loop Edges**: Visually distinct curved edges for loops (nice-to-have)
- [ ] **Hover Details**: Click ×2 edge to see iteration breakdown (nice-to-have)

#### R4: Operator Loop Decision Logic

- [ ] **Enhanced Operator Output**: Show decision reasoning

  ```
  operator-senior_reviewer:
  Status: NEEDS_REVISION
  Reason: "Code needs input validation and better error handling"
  Next: junior_dev (iteration 2)
  ```

- [ ] **Loop Termination Logic**: Show why loops ended
  ```
  operator-senior_reviewer:
  Status: APPROVED
  Reason: "All requirements met, code is production ready"
  Next: END (loop complete after 3 iterations)
  ```

#### R5: Mock Workflow for Testing

- [ ] **Create Junior Dev → Senior Reviewer Test Workflow**:

  ```typescript
  const mockLoopWorkflow = [
    { id: 'junior_dev', role: 'junior_developer', task: 'Write authentication system' },
    {
      id: 'senior_reviewer',
      role: 'senior_developer',
      task: 'Review {junior_dev.output} for production readiness',
    },
    // LangGraph conditional edge: if review fails → back to junior_dev
  ]
  ```

- [ ] **Mock AI Responses**: Simulate realistic review feedback
- [ ] **Test Different Loop Counts**: 1, 2, 3, 5+ iterations
- [ ] **Test Loop Termination**: Success, max iterations, errors

### ⚠️ CRITICAL UX Considerations

1. **Avoid Visual Chaos**: Don't show every iteration as separate nodes
2. **Clear Loop Boundaries**: User must understand what constitutes one "loop cycle"
3. **Progressive Disclosure**: Show high-level loop summary, drill down for details
4. **Real-time Updates**: Loops should update live as they execute
5. **Loop Context**: Show WHY the loop is happening (feedback, errors, improvements)

### 🎯 Success Criteria

- [ ] Can visualize junior dev → senior reviewer loop clearly in both views
- [ ] Shows iteration count, reasons for iteration, and termination condition
- [ ] Works with real LangGraph conditional edges and loop detection
- [ ] Handles 1-5+ iterations without UI becoming chaotic
- [ ] Real-time updates as mock workflow executes loops
- [ ] Clear visual distinction between loops and linear execution

**THIS IS THE FOUNDATION** - Get loop visualization right, then all other workflow patterns become easier.

## ✅ COMPLETED: Standalone Workflow Page Theme Fix (2025-01-12)

### What Was Fixed:

- Replaced hardcoded light mode colors (bg-gray-50, text-gray-900, etc.) with theme-aware classes
- Now uses proper Tailwind CSS utility classes: bg-background, text-foreground, etc.
- Consistent with the dark theme used throughout the application
- Fixed loading, error, and main workflow views

## Phase 4: Advanced Features ⏳

### 4.1 Loop Visualization ✅ COMPLETED

- [x] Detect and highlight circular paths
- [x] Show iteration count badges
- [x] Animate loop execution (animated edges for active loops)
- [x] Color-code based on iteration

### 4.2 Operator Visibility (IN PROGRESS)

- [x] Show LangGraph operator decisions ✅
- [x] Display routing logic on edges ✅
- [ ] Highlight decision points with enhanced UI
- [ ] Show detailed condition evaluations

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
