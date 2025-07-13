# Claude Studio Storage Analysis Report

## Executive Summary

The codebase uses a centralized localStorage-based storage pattern through `createPersistentStore.ts`. While well-architected, all data is currently stored client-side in the browser's localStorage, which needs to be migrated to server-side storage for better persistence, security, and multi-device access.

## Current Storage Architecture

### 1. Core Storage Infrastructure

#### `createPersistentStore.ts`
- **Location**: `/src/stores/createPersistentStore.ts`
- **Purpose**: Factory function for creating persistent Zustand stores
- **Storage Method**: Browser localStorage with `claude-studio-` prefix
- **Features**:
  - Error handling for hydration failures
  - Version migration support
  - Export/import utilities
  - Batch clear functionality

### 2. Direct localStorage Usage

#### Files Using localStorage Directly:
1. **`ConfigService.ts`** (`/src/services/api/ConfigService.ts`)
   - Stores API provider configurations
   - Stores API keys (unencrypted - security concern)
   - Keys: `claude-studio-api-config`, `claude-studio-api-keys`

2. **`StorageManagement.tsx`** (`/src/components/settings/StorageManagement.tsx`)
   - UI component for managing localStorage
   - Provides export/import/clear functionality
   - Shows storage size calculations

3. **`DevModeIndicator.tsx`** (`/src/components/DevModeIndicator.tsx`)
   - Uses sessionStorage (not localStorage)
   - Tracks HMR reload count (development only)

### 3. Stores Using createPersistentStore

#### Active Persistent Stores:

1. **`agents.ts`**
   - **Key**: `claude-studio-agents`
   - **Data**: Agent runtime state, configurations, selected agent, agent order
   - **Critical**: Yes - core functionality

2. **`projects.ts`**
   - **Key**: `claude-studio-projects`
   - **Data**: Projects list, open projects, active project, view modes, UI states
   - **Critical**: Yes - workspace management

3. **`aiSessions.ts`**
   - **Key**: `claude-studio-ai-sessions`
   - **Data**: AI conversation history, session metadata
   - **Critical**: Yes - AI interaction history

4. **`shortcuts.ts`**
   - **Key**: `claude-studio-shortcuts`
   - **Data**: Custom keyboard shortcuts
   - **Critical**: No - user preferences

5. **`collapsible.ts`**
   - **Key**: `claude-studio-collapsible`
   - **Data**: UI collapsible states
   - **Critical**: No - UI preferences

6. **`diagnostics.ts`**
   - **Key**: `claude-studio-diagnostics`
   - **Data**: Error monitoring state, coverage info, test results
   - **Critical**: Partially - monitoring data

## Data Categories and Migration Priority

### High Priority (Server-side required)
1. **Agent Configurations** - Should be versioned and backed up
2. **Project Metadata** - Needs to sync across devices
3. **AI Session History** - Valuable data that shouldn't be lost
4. **API Keys** - Must be encrypted and stored securely

### Medium Priority (Hybrid approach)
1. **Diagnostics Data** - Recent data locally, history on server
2. **Active UI States** - Quick access locally, backup on server

### Low Priority (Can remain local)
1. **UI Preferences** (collapsible states, view modes)
2. **Keyboard Shortcuts**
3. **Development indicators** (HMR count)

## Current Storage Keys Summary

```
localStorage keys:
- claude-studio-agents
- claude-studio-projects
- claude-studio-ai-sessions
- claude-studio-shortcuts
- claude-studio-collapsible
- claude-studio-diagnostics
- claude-studio-api-config
- claude-studio-api-keys

sessionStorage keys:
- hmr_reload_count (dev only)
```

## Security Concerns

1. **API Keys in Plain Text**: `ConfigService.ts` stores API keys unencrypted
2. **No Authentication**: No user-based data isolation
3. **Data Loss Risk**: Browser clear or device change loses all data

## Recommendations for Migration

### 1. Immediate Actions
- Encrypt API keys before storing
- Implement server-side storage API endpoints
- Add authentication layer

### 2. Migration Strategy
- Phase 1: Move API keys and sensitive configs to server
- Phase 2: Sync agent configs and project metadata
- Phase 3: Backup AI sessions and important data
- Phase 4: Implement real-time sync for collaborative features

### 3. Architecture Changes Needed
- Create server-side storage service
- Implement data sync mechanism
- Add offline capability with local cache
- Create migration utilities for existing users

### 4. Keep Local (Performance)
- Recent/active data for quick access
- UI state for instant responsiveness
- Temporary session data

## Implementation Considerations

1. **Backward Compatibility**: Support existing localStorage data during migration
2. **Sync Strategy**: Implement conflict resolution for multi-device access
3. **Performance**: Use local cache with server sync
4. **Privacy**: Ensure user data isolation and encryption
5. **Offline Support**: Maintain functionality when server is unreachable

## Next Steps

1. Design server storage schema
2. Implement storage service API
3. Create migration utilities
4. Update stores to use hybrid storage
5. Add encryption for sensitive data
6. Implement data sync mechanism
7. Test migration path thoroughly