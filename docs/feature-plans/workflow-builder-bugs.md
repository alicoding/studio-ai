# Workflow Builder Bug Tracking

## High Priority Bugs

### 1. Node Re-addition Bug

**Status**: 🔴 Critical  
**Reporter**: User  
**Date**: 2025-07-15

**Problem**: When adding a node, removing it, then re-adding a node, the previously deleted nodes are also restored to the canvas.

**Impact**:

- Confusing user experience
- Loss of intentional node deletions
- Potential data corruption in workflow state

**Root Cause**: Likely state management issue where deleted nodes aren't properly removed from the workflow store or undo/redo stack.

**Files to Investigate**:

- `src/stores/workflowBuilder.ts` - Node state management
- `src/components/workflow-builder/VisualWorkflowBuilder.tsx` - Node addition/removal logic
- Any undo/redo implementation

### 2. CMD+A Select All Missing

**Status**: 🔴 Critical  
**Reporter**: User  
**Date**: 2025-07-15

**Problem**: Workflow builder doesn't support CMD+A to select all nodes for bulk deletion.

**Requirements**:

- CMD+A should select all nodes when canvas is active
- Should NOT select text if mouse is active in workflow canvas area
- Should work with existing delete functionality

**Implementation Notes**:

- Need to detect canvas focus vs text input focus
- Implement keyboard event handlers for CMD+A
- Integrate with existing node selection system

**Files to Modify**:

- `src/components/workflow-builder/VisualWorkflowBuilder.tsx` - Add keyboard handlers
- Canvas interaction logic for focus detection

## Backend Workflow Issues (from Knowledge Directory)

### 3. Agent Allocation Conflicts

**Status**: 🟡 Medium  
**Source**: `gotchas.md:76-129`

**Problem**: Agent conflicts in parallel tasks causing workflow failures.

**Symptoms**:

- Workflow fails at execution time rather than validation
- Same agent assigned to multiple parallel tasks
- "Agent busy" errors during workflow execution

**Root Cause**: Using specific agentId for parallel tasks causes conflicts.

**Files Affected**:

- Workflow execution logic
- Agent assignment validation

### 4. Missing UI Visualization Components

**Status**: 🟡 Medium  
**Source**: `workflows.md:435-441`

**Problem**: Backend workflow system complete but UI visualization missing.

**Missing Components**:

- Frontend Components - WorkflowMonitor, real-time UI
- SSE Client Hooks - useWorkflowSSE for EventSource
- Visual Progress - n8n-style workflow visualization
- Manual Controls - Retry/resume buttons
- Workspace Integration - Sidebar workflow panel

### 5. WebSocket Connection Issues

**Status**: 🟡 Medium  
**Source**: `gotchas.md:45-57`

**Problem**: WebSocket events not reaching UI properly.

**Issues**:

- Frontend must connect to same server as API
- UI on different port than API server breaks WebSocket events
- Session ID vs Agent ID routing problems

### 6. Session File Location Issues

**Status**: 🟡 Medium  
**Source**: `gotchas.md:9-44`

**Problem**: Messages not appearing in workspace UI despite activity being tracked.

**Root Cause**: StudioSessionService preferring wrong directory types.

**Impact**: Affects workflow message display and tracking.

### 7. Cross-Server Communication Problems

**Status**: 🟡 Medium  
**Source**: `gotchas.md:60-74`

**Problem**: Events not broadcasting properly across multiple servers.

**Requirements**: Redis needed for multi-server setup.

**Impact**: Workflow events may not reach all connected clients.

### 8. Auto-Resume Limitations

**Status**: 🟢 Low  
**Source**: `workflows.md:249-261`

**Problem**: Current auto-resume has limitations.

**Issues**:

- Long-running steps (>2 min) falsely detected as stale
- No heartbeats during Claude SDK execution
- Event-based monitoring not true heartbeat monitoring

### 9. UI Pattern Issues

**Status**: 🟢 Low  
**Source**: `ui-patterns.md`

**Problem**: Various UI-related workflow visualization challenges.

**Issues**:

- Error handling in SSE event parsing
- Workflow state management complexity
- Component optimization for large workflows

## Bug Triage Process

### Priority Levels

- 🔴 **Critical**: Breaks core functionality, blocks user workflows
- 🟡 **Medium**: Affects user experience but has workarounds
- 🟢 **Low**: Minor issues or performance optimizations

### Investigation Steps

1. **Reproduce the bug** in development environment
2. **Identify root cause** through code analysis and debugging
3. **Create test cases** to prevent regression
4. **Implement fix** with proper error handling
5. **Test fix** with both unit and integration tests
6. **Update documentation** if behavior changes

### Testing Checklist

- [ ] Unit tests for affected components
- [ ] Integration tests for workflow execution
- [ ] Manual testing of user workflows
- [ ] Performance testing with large workflows
- [ ] Cross-browser compatibility testing

## Development Notes

### Workflow Builder Architecture

- **Store**: `src/stores/workflowBuilder.ts` - Central state management
- **Canvas**: `src/components/workflow-builder/VisualWorkflowBuilder.tsx` - Main UI component
- **Nodes**: `src/components/workflow-builder/nodes/` - Individual node components
- **Palette**: `src/components/workflow-builder/DraggableNodePalette.tsx` - Node selection

### Key Dependencies

- React Flow for canvas rendering
- Zustand for state management
- React DnD for drag and drop
- TanStack Router for navigation

### Debugging Tips

- Use browser dev tools to inspect React Flow state
- Check Zustand store state with dev tools extension
- Monitor console for WebSocket connection issues
- Test with `USE_MOCK_AI=true` for faster iteration

## Next Steps

1. **Priority 1**: Fix node re-addition bug - investigate workflow store state management
2. **Priority 2**: Implement CMD+A select all functionality with proper canvas focus detection
3. **Priority 3**: Address backend workflow issues that affect UI functionality
4. **Priority 4**: Implement missing UI visualization components

## Related Documentation

- `docs/gotchas.md` - Known issues and workarounds
- `.claude-studio/knowledge/workflows.md` - Workflow system architecture
- `.claude-studio/knowledge/ui-patterns.md` - UI development patterns
