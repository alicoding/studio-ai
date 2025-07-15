# Workflow Persistence Fix: Auto-Save & Conflict Resolution

## 🎯 Problem Statement

The current workflow persistence system has critical issues:

1. **Race Conditions**: Browser cache and backend database compete, causing stale data
2. **Data Loss**: Page refresh loses unsaved changes
3. **Poor UX**: Users must manually save and can lose work
4. **Broken Sync**: `clearPersistedState()` creates timing issues
5. **No Conflict Resolution**: Simultaneous edits cause data loss

### Current Broken Flow

```
User opens workflow → Zustand rehydrates from cache → clearPersistedState() → Load from DB → Race condition!
```

## 🎯 Requirements

### Core Features

- [ ] **Auto-save**: Debounced saves to browser storage (500ms)
- [ ] **Draft vs Saved**: Clear distinction between local drafts and server state
- [ ] **Conflict Detection**: Version-based conflict resolution
- [ ] **Offline Support**: Continue editing when network is unavailable
- [ ] **Data Recovery**: Restore unsaved changes after page refresh
- [ ] **No Data Loss**: Protect against accidental navigation away

### Advanced Features

- [ ] **Background Sync**: Periodic sync with server when online
- [ ] **Optimistic Updates**: Immediate UI feedback for save operations
- [ ] **Conflict Resolution UI**: User-friendly merge interface
- [ ] **Version History**: Track changes for debugging
- [ ] **Performance**: Handle large workflows efficiently

## 🏗️ Technical Architecture

### Library Choice: TanStack Query v5 + Custom Auto-Save Hook

**Why TanStack Query?**

- ✅ Proven offline capabilities in v5
- ✅ Works with existing Zustand stores
- ✅ Battle-tested by thousands of applications
- ✅ Great debugging tools and documentation

### State Architecture

```typescript
interface WorkflowPersistenceState {
  // Server state (managed by TanStack Query)
  savedWorkflow: WorkflowDefinition | null
  isSaving: boolean
  lastSaved: Date | null

  // Local draft state (managed by Zustand + auto-save)
  draftWorkflow: WorkflowDefinition | null
  isDirty: boolean
  isAutoSaving: boolean
  lastAutoSave: Date | null

  // Conflict resolution
  hasConflict: boolean
  conflictData: {
    local: WorkflowDefinition
    remote: WorkflowDefinition
    timestamp: Date
  } | null

  // Network state
  isOnline: boolean
  pendingSync: boolean
}
```

## 📋 Implementation Tasks

### Phase 1: Foundation (MUST BE VERIFIED IN UI)

- [ ] **P1.1**: Install TanStack Query v5 with offline persistence
- [ ] **P1.2**: Create `useAutoSave` hook with debounced local storage
- [ ] **P1.3**: Update `workflowBuilder` store to separate draft/saved states
- [ ] **P1.4**: Implement basic auto-save functionality
- [ ] **P1.5**: Add beforeunload protection for unsaved changes

### Phase 2: Conflict Resolution (MUST BE VERIFIED IN UI)

- [ ] **P2.1**: Implement version-based conflict detection
- [ ] **P2.2**: Create conflict resolution API endpoints
- [ ] **P2.3**: Build conflict resolution UI modal
- [ ] **P2.4**: Add server-side conflict handling
- [ ] **P2.5**: Implement merge strategies (keep local, keep remote, manual merge)

### Phase 3: Advanced Features (MUST BE VERIFIED IN UI)

- [ ] **P3.1**: Background sync when network is restored
- [ ] **P3.2**: Optimistic updates for save operations
- [ ] **P3.3**: Queue management for offline operations
- [ ] **P3.4**: Performance optimization for large workflows
- [ ] **P3.5**: Error handling and retry mechanisms

### Phase 4: Testing & Polish (MUST BE VERIFIED IN UI)

- [ ] **P4.1**: Unit tests for auto-save logic
- [ ] **P4.2**: Integration tests with MSW for network scenarios
- [ ] **P4.3**: E2E tests with Cypress for user flows
- [ ] **P4.4**: Performance benchmarks and memory leak detection
- [ ] **P4.5**: Documentation and troubleshooting guide

## 🧪 Testing Strategy

### Test Categories

1. **Unit Tests** (Jest + React Testing Library)
   - Auto-save debouncing
   - State transitions
   - Conflict resolution logic

2. **Integration Tests** (MSW)
   - Network failure scenarios
   - Save/load cycles
   - Cache invalidation

3. **E2E Tests** (Cypress)
   - Page refresh with unsaved changes
   - Offline/online transitions
   - Concurrent editing simulation

### Critical Test Scenarios

- [ ] **Auto-save Flow**: User types → debounced save → periodic sync
- [ ] **Conflict Resolution**: Local + server changes → conflict UI → merge
- [ ] **Data Recovery**: Page refresh → restore from localStorage
- [ ] **Network Failures**: Save fails → retry with backoff
- [ ] **Race Conditions**: Multiple saves → dedupe and merge
- [ ] **Performance**: Large workflows → chunked saves

## 📊 Success Metrics

### User Experience

- [ ] **Zero Data Loss**: No reports of lost work
- [ ] **Seamless Auto-save**: Users don't need to manually save
- [ ] **Fast Recovery**: Page refresh recovers unsaved changes < 1s
- [ ] **Clear Feedback**: Users understand save status at all times

### Technical Performance

- [ ] **Auto-save Latency**: < 100ms for local saves
- [ ] **Sync Performance**: < 2s for server sync
- [ ] **Memory Usage**: No memory leaks during long sessions
- [ ] **Storage Efficiency**: < 10MB local storage per workflow

## 🔧 Implementation Files

### New Files to Create

```
src/hooks/useAutoSave.ts                    # Core auto-save hook
src/hooks/useConflictResolver.ts            # Conflict resolution logic
src/components/ConflictResolutionModal.tsx  # Conflict UI
src/lib/workflow-sync/                      # Sync utilities
  ├── types.ts                              # TypeScript types
  ├── syncManager.ts                        # Sync orchestration
  ├── conflictDetector.ts                   # Conflict detection
  └── storageManager.ts                     # Local storage handling
```

### Files to Modify

```
src/stores/workflowBuilder.ts               # Add draft/saved state separation
src/routes/workflows/$workflowId.edit.tsx   # Remove clearPersistedState calls
package.json                                # Add TanStack Query v5
```

### Test Files

```
src/hooks/__tests__/useAutoSave.test.ts
src/hooks/__tests__/useConflictResolver.test.ts
src/components/__tests__/ConflictResolutionModal.test.ts
cypress/e2e/workflow-persistence.cy.ts
```

## 🚨 Risk Mitigation

### Technical Risks

1. **Complexity**: Start simple, add features incrementally
2. **Performance**: Implement proper debouncing and cleanup
3. **Storage Limits**: Add garbage collection for old drafts
4. **Browser Compatibility**: Test across modern browsers

### Business Risks

1. **User Adoption**: Clear UI indicators for save status
2. **Data Migration**: Smooth transition from old system
3. **Rollback Plan**: Feature flags for easy rollback
4. **Support Load**: Comprehensive documentation

## 📚 Dependencies

### New Dependencies

- `@tanstack/react-query` v5.x - Data fetching and caching
- `@tanstack/query-devtools` - Development tools
- `localforage` - Better browser storage
- `idb` - IndexedDB wrapper (if needed)

### Development Dependencies

- `msw` - API mocking for tests
- `cypress` - E2E testing
- `@testing-library/react` - Unit testing

## 🔄 Rollback Plan

### Rollback Strategy

1. **Feature Flags**: Control rollout and instant rollback
2. **Data Backup**: Backup current workflow data before migration
3. **Gradual Rollout**: Deploy to staging, then percentage of users
4. **Monitoring**: Track error rates and user feedback

### Rollback Triggers

- Error rate > 1%
- User complaints about data loss
- Performance degradation
- Critical bugs in conflict resolution

## 📝 Notes

### Design Decisions

1. **TanStack Query over RxDB**: Less complexity, better React integration
2. **Zustand + TanStack Query**: Leverage existing patterns
3. **Version-based Conflicts**: Simpler than CRDT for this use case
4. **Debounced Auto-save**: Balance between UX and performance

### Future Enhancements

- Real-time collaborative editing (with CRDTs)
- Workflow templates and versioning
- Advanced merge algorithms
- Mobile app support

---

## ✅ Task Completion Rules

**IMPORTANT**: No task should be marked as complete until:

1. ✅ Code is implemented and tested
2. ✅ Feature is verified working in UI by human reviewer
3. ✅ All edge cases are handled
4. ✅ Documentation is updated
5. ✅ Human approver confirms completion

**Task Status Legend**:

- ⏳ **Pending**: Not started
- 🔄 **In Progress**: Currently being worked on
- ✅ **Complete**: Verified working in UI by human
- ❌ **Blocked**: Waiting on dependency or decision
