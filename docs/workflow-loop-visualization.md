# Workflow Loop Visualization

## Overview

This document describes the implementation of visual indicators for workflow loops and operator decision points in Claude Studio's workflow graph visualization.

## Features Implemented

### 1. Loop Detection Algorithm

The `WorkflowOrchestrator` now includes sophisticated loop detection that identifies:
- **Role-based loops**: When the same role appears multiple times in a workflow chain (e.g., developer → reviewer → developer)
- **Direct circular dependencies**: When steps reference each other creating circular patterns
- **Loop iterations**: Counts how many times a role appears within a detected loop
- **Operator-driven loops**: Decision points where SimpleOperator routes back to previous steps

### 2. Visual Indicators

#### Edge Styling
- **Loop edges** are displayed with:
  - Orange color (`#f59e0b`)
  - Thicker stroke width (3px vs 2px)
  - Dashed pattern (`5 5`)
  - Higher curvature for better visibility
  - Labels showing iteration count (e.g., "Loop ×2")
- **Conditional edges** from operators show:
  - Blue color for conditional routing
  - Labels indicating decision criteria

#### Node Indicators
- **Step nodes** that are part of loops show:
  - RotateCw icon in amber color
  - Iteration count if > 1
  - Tooltip explaining the loop
- **Operator nodes** appear as:
  - Diamond-shaped decision points
  - Purple color scheme
  - CPU and GitBranch icons
  - Multiple output handles for different paths

### 3. Operator Decision Points

The visualization now includes operator nodes that show:
- Where the SimpleOperator makes routing decisions
- Decision criteria (e.g., "Issues found" vs "Approved")
- Multiple output paths for different outcomes
- Visual distinction from regular workflow steps

### 3. Data Flow

1. **Backend Detection**: `WorkflowOrchestrator.detectLoops()` analyzes the workflow structure
2. **Graph Data**: Loop information is included in the workflow graph data
3. **Edge Marking**: Edges that are part of loops are marked with `type: 'loop'`
4. **Node Enhancement**: Nodes receive `isInLoop` and `loopIterations` properties

## Example Usage

```javascript
// Test workflow with loop pattern
const workflow = [
  {
    id: 'implement_v1',
    role: 'developer',
    task: 'Implement feature',
  },
  {
    id: 'review_v1',
    role: 'reviewer',
    task: 'Review implementation',
    deps: ['implement_v1'],
  },
  {
    id: 'implement_v2',
    role: 'developer',
    task: 'Fix review comments',
    deps: ['review_v1'],
  },
  {
    id: 'review_v2',
    role: 'reviewer',
    task: 'Final review',
    deps: ['implement_v2'],
  },
];
```

This creates a developer → reviewer → developer → reviewer loop pattern that will be visually highlighted.

## Implementation Details

### Files Modified

1. **`WorkflowOrchestrator.ts`**:
   - Enhanced `detectLoops()` method with role-based detection
   - Added helper methods: `isAncestor()`, `getLoopPath()`, `countLoopIterations()`
   - Modified edge generation to mark loop edges

2. **`WorkflowEdge.tsx`**:
   - Added `edgeType` to data interface
   - Conditional styling based on edge type
   - Special label styling for loop edges

3. **`WorkflowStepNode.tsx`**:
   - Added `isInLoop` and `loopIterations` to node data
   - Display RotateCw icon for nodes in loops
   - Show iteration count when > 1

4. **`WorkflowGraph.tsx`**:
   - Pass edge type through data property
   - Calculate loop information for each node
   - Apply loop-specific styling to edges

## Testing

Run the test workflow to see loop visualization:
```bash
node test-workflow-loop.js
```

This creates a workflow with a code review loop pattern and displays it in the UI with all visual indicators.