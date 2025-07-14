# Approval Canvas Implementation TODO

## Overview

Implementing comprehensive approval canvas system with project-specific, global, and consolidated views using DRY architecture.

## High Priority Tasks

### 1. Core Data Layer

- [x] Create `useApprovals` hook with scope-aware data fetching (project/global/consolidated)
- [x] Update approval store to handle unified state management
- [x] Add scope-based API endpoint logic

### 2. Main Canvas Component

- [x] Create `ApprovalCanvasContent.tsx` - unified canvas component with scope props
- [x] Implement scope-based rendering logic
- [x] Add proper visual design with high contrast

### 3. Shared UI Components (DRY)

- [x] Create `ApprovalDetailCard.tsx` - rich approval display with workflow context
- [x] Create `ApprovalQueue.tsx` - horizontal pending queue navigation
- [ ] Create `ApprovalActionPanel.tsx` - large action buttons with comment support (integrated into ApprovalDetailCard)
- [ ] Create `WorkflowVisualization.tsx` - visual workflow context display (integrated into ApprovalDetailCard)
- [ ] Create `ImpactPreview.tsx` - "what happens next" preview (integrated into ApprovalDetailCard)

## Medium Priority Tasks

### 4. New Routes & Navigation

- [ ] Create `/src/routes/approvals.tsx` - global approval management page
- [ ] Create `/src/routes/approvals/all.tsx` - consolidated view
- [ ] Create `/src/routes/approvals/$approvalId.tsx` - deep linking to specific approvals
- [ ] Add top-level navigation for approval routes

### 5. Multi-Project Views

- [x] Create `ConsolidatedApprovalView.tsx` - multi-project grouping component
- [x] Create `ApprovalProjectSection.tsx` - project-grouped display (integrated into ConsolidatedApprovalView)
- [x] Implement project grouping logic and filters

### 6. Integration Points

- [x] Update `CanvasContent.tsx` to integrate approval canvas
- [x] Update `useWorkspaceLayout.ts` with approval-specific state (already supported)
- [x] Connect to existing `useApprovalEvents` hook for real-time updates

## Low Priority Tasks

### 7. Navigation & Context Switching

- [x] Create `GlobalApprovalLink.tsx` - context navigation component
- [x] Update sidebar approval display with simplified navigation
- [x] Fix poor contrast and visual design in sidebar approval counts
- [ ] Add seamless navigation between project/global/consolidated views

### 8. Enhanced Features

- [ ] Add bulk approval actions for consolidated view
- [ ] Implement approval filtering and sorting
- [ ] Add approval search functionality
- [ ] Create approval dashboard metrics

## Design System Requirements

### Visual Improvements

- [ ] Fix poor contrast in current approval UI
- [ ] Implement color-coded risk levels (Red/Orange/Yellow/Green)
- [ ] Create proper typography hierarchy for critical decisions
- [ ] Ensure responsive layout for different screen sizes

### Accessibility

- [ ] High contrast ratios for approval status
- [ ] Proper keyboard navigation
- [ ] Screen reader support for approval context
- [ ] Focus states for action buttons

## Architecture Decisions

### DRY Compliance

- ✅ Single `ApprovalCanvasContent` component handles all scopes via props
- ✅ Shared data fetching logic via `useApprovals` hook
- ✅ Reusable UI components work across all contexts
- ✅ Unified state management for all approval types

### URL Structure

- `/workspace/{projectId}` (canvas mode: approval) → Project approvals
- `/approvals` → Global approvals only
- `/approvals/all` → Consolidated view
- `/approvals/{approvalId}` → Deep link to specific approval

### Component Props Pattern

```typescript
<ApprovalCanvasContent
  scope="project" | "global" | "consolidated"
  projectId={projectId}  // only for project scope
  filters={{ priority: 'high', status: 'pending' }}
/>
```

## Testing Requirements

- [ ] Test project-specific approval flow
- [ ] Test global approval management
- [ ] Test consolidated view with multiple projects
- [ ] Test real-time WebSocket updates across all scopes
- [ ] Test navigation between different approval contexts

## Files to Create

```
src/components/approvals/
├── ApprovalCanvasContent.tsx
├── ApprovalDetailCard.tsx
├── ApprovalQueue.tsx
├── ApprovalActionPanel.tsx
├── WorkflowVisualization.tsx
├── ImpactPreview.tsx
├── ConsolidatedApprovalView.tsx
├── ApprovalProjectSection.tsx
└── GlobalApprovalLink.tsx

src/routes/
├── approvals.tsx
├── approvals/
│   ├── all.tsx
│   └── $approvalId.tsx

src/hooks/
└── useApprovals.tsx (enhanced)
```

## Files to Modify

- `src/components/workspace/CanvasContent.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/hooks/useWorkspaceLayout.ts`
- `src/stores/projects.ts`

## Success Criteria

- [ ] Project teams can manage their specific approvals in workspace
- [ ] System admins can manage global approvals from dedicated page
- [ ] Approval managers can view consolidated cross-project approvals
- [ ] All views use same DRY component architecture
- [ ] Professional UX with proper contrast and spacing
- [ ] Real-time updates work across all approval scopes
- [ ] Seamless navigation between different contexts
