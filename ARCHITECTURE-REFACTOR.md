# Architecture Refactoring Required

## Issues Found

### 1. Singleton Services Don't Scale
**Current**: PanelRegistry, CommandRegistry use singleton pattern
**Problem**: Can't have multiple workspace instances
**Solution**: Use dependency injection with React Context

### 2. Frontend Storage Misuse
**Current**: Trying to use UnifiedStorage (SQLite) from browser
**Problem**: SQLite doesn't work in browser
**Solution**: 
- Frontend: Zustand + localStorage
- Backend: UnifiedStorage (SQLite)

### 3. No Event System
**Current**: Each component has custom callbacks
**Problem**: No way to sync state across panels
**Solution**: Add event bus using 'mitt' (3kb library)

## Refactoring Plan

### Step 1: Create Service Container (1 day)
```typescript
// src/contexts/ServiceContext.tsx
interface Services {
  panelRegistry: PanelRegistry
  eventBus: EventBus
  // ... other services
}

const ServiceContext = React.createContext<Services>()

// Each workspace gets its own services
<ServiceContext.Provider value={workspaceServices}>
  <Workspace />
</ServiceContext.Provider>
```

### Step 2: Add Event Bus (0.5 day)
```typescript
// src/services/EventBus.ts
import mitt from 'mitt'

type WorkspaceEvents = {
  'panel:opened': { panelId: string }
  'panel:closed': { panelId: string }
  'layout:changed': { layout: WorkspaceLayout }
}

export const createEventBus = () => mitt<WorkspaceEvents>()
```

### Step 3: Fix Frontend Storage (0.5 day)
```typescript
// src/stores/workspaceLayout.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useWorkspaceLayoutStore = create(
  persist(
    (set) => ({
      layouts: {},
      setLayout: (projectId, layout) => set(...)
    }),
    {
      name: 'workspace-layouts',
      // Use localStorage, not UnifiedStorage
    }
  )
)
```

### Step 4: Refactor PanelRegistry (Already done, just remove singleton)

## Benefits

1. **Multiple Workspaces**: Each can have different panel configurations
2. **Testability**: Easy to mock services
3. **Event-Driven**: Panels can react to state changes
4. **Proper Storage**: Frontend uses appropriate storage
5. **No Technical Debt**: Clean foundation for future work

## Timeline Impact

- Add 2 days for refactoring
- Save 5+ days of debugging later
- Total project: 26 days instead of 24

## Decision Required

Should we:
A) ✅ Refactor first (recommended)
B) ❌ Build on shaky foundation (technical debt)