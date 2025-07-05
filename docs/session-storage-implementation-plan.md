# Session Storage Implementation Plan

## Critical Issue
Currently, important application state is not properly persisted across page refreshes, leading to:
- Lost agent selections and configurations
- Reset project states
- Lost diagnostic monitoring status
- Lost UI preferences (collapsible states, etc.)

## Current State Analysis

### Stores That Need Persistence
1. **agents.ts** - Currently uses some localStorage for:
   - `selectedAgentId` 
   - Agent order
   - But not persisting the full agent state

2. **projects.ts** - Currently uses localStorage for:
   - `activeProjectId`
   - `selectedAgentId` per project
   - But not persisting the full project list or message queue

3. **diagnostics.ts** - Currently uses localStorage for:
   - `isMonitoring` state only
   - Not persisting actual diagnostics or status

4. **collapsible.ts** - No persistence at all
   - UI state is lost on refresh

### Direct localStorage Usage (Anti-pattern)
Multiple files directly access localStorage without abstraction:
- Inconsistent key naming
- No type safety
- No error handling
- No migration strategy

## Implementation Plan

### Phase 1: Create Storage Service Abstraction

```typescript
// src/services/storage/StorageService.ts
export class StorageService {
  private prefix = 'claude-studio:'
  
  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = localStorage.getItem(this.prefix + key)
      return item ? JSON.parse(item) : defaultValue ?? null
    } catch (error) {
      console.error(`Storage get error for ${key}:`, error)
      return defaultValue ?? null
    }
  }
  
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value))
    } catch (error) {
      console.error(`Storage set error for ${key}:`, error)
    }
  }
  
  remove(key: string): void {
    localStorage.removeItem(this.prefix + key)
  }
  
  clear(): void {
    // Clear only our prefixed keys
    Object.keys(localStorage)
      .filter(key => key.startsWith(this.prefix))
      .forEach(key => localStorage.removeItem(key))
  }
}

export const storage = new StorageService()
```

### Phase 2: Implement Zustand Persist Middleware

```typescript
// src/stores/agents.ts
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export const useAgentStore = create<AgentState>()(
  devtools(
    persist(
      (set, get) => ({
        // ... existing implementation
      }),
      {
        name: 'claude-studio-agents',
        partialize: (state) => ({
          // Only persist what's necessary
          agents: state.agents,
          selectedAgentId: state.selectedAgentId,
          configs: state.configs,
          // Don't persist temporary states
          // clearingAgentId: excluded
        }),
        version: 1,
        migrate: (persistedState: any, version: number) => {
          // Handle migrations between versions
          return persistedState
        }
      }
    ),
    { name: 'agent-store' }
  )
)
```

### Phase 3: Stores to Update with Persistence

#### 1. Agent Store
- Persist: agents, selectedAgentId, configs
- Exclude: clearingAgentId (temporary state)

#### 2. Project Store  
- Persist: projects, activeProjectId, selectedAgentIds
- Exclude: messageQueue (can be reconstructed)

#### 3. Diagnostics Store
- Persist: isMonitoring, lastUpdate
- Exclude: diagnostics (will be fetched fresh)

#### 4. Collapsible Store
- Persist: entire state (UI preferences)

### Phase 4: Migration Strategy

1. **Backward Compatibility**
   - Read existing localStorage keys during migration
   - Convert to new format
   - Clean up old keys after successful migration

2. **Version Management**
   - Each store gets a version number
   - Migration functions handle version upgrades
   - Clear storage on major version changes

### Phase 5: Testing Requirements

1. **Persistence Tests**
   - State survives page refresh
   - State survives browser restart
   - Correct data is excluded from persistence

2. **Migration Tests**
   - Old localStorage data is migrated
   - Corrupted data doesn't crash the app
   - Version upgrades work correctly

## Implementation Priority

1. **High Priority** (Day 1)
   - Create StorageService
   - Update agent store (most critical)
   - Update project store

2. **Medium Priority** (Day 2)
   - Update diagnostics store
   - Update collapsible store
   - Add migration logic

3. **Low Priority** (Day 3)
   - Clean up direct localStorage usage
   - Add comprehensive tests
   - Document storage schema

## Expected Benefits

1. **User Experience**
   - No lost state on refresh
   - Consistent behavior across sessions
   - Faster startup (cached data)

2. **Developer Experience**
   - Type-safe storage access
   - Centralized storage logic
   - Easy debugging with devtools

3. **Maintenance**
   - Clear storage schema
   - Version migration support
   - Error handling

## Storage Schema Documentation

```typescript
interface StorageSchema {
  'claude-studio-agents': {
    state: {
      agents: Agent[]
      selectedAgentId: string | null
      configs: AgentConfig[]
    }
    version: number
  }
  'claude-studio-projects': {
    state: {
      projects: Project[]
      activeProjectId: string | null
      selectedAgentIds: Record<string, string>
    }
    version: number
  }
  'claude-studio-diagnostics': {
    state: {
      isMonitoring: boolean
      lastUpdate: Date | null
    }
    version: number
  }
  'claude-studio-collapsible': {
    state: Record<string, boolean>
    version: number
  }
}
```

## Next Steps

1. Create the StorageService class
2. Add persist middleware to agent store (highest impact)
3. Test thoroughly with page refreshes
4. Roll out to other stores incrementally
5. Remove all direct localStorage usage
6. Add storage management UI (clear cache, export/import)