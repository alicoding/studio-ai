# /lib Directory Deletion Safety Analysis

## Summary
The root `/lib` directory can be **safely deleted** with minimal code changes required.

## Key Findings

### 1. Two Different `/lib` Directories
- **Root `/lib`**: Abandoned process management code (target for deletion)
- **`src/lib`**: Active utilities used by shadcn/ui components (keep this)

### 2. Actual Root `/lib` Dependencies Found

#### A. `web/server/app.ts` (Lines 25-26)
```typescript
import { ProcessManager } from '../../lib/process/ProcessManager.js'
import { ProcessCleaner } from '../../lib/process/ProcessCleaner.js'
```
**Status**: Imported but NOT used (commented out in code)
**Action**: Remove import statements

#### B. `src/hooks/useAgentManager.ts` (Line 3)
```typescript
import { AgentManager, AgentState, AgentConfig } from '../../lib/agents'
```
**Status**: Actively used but referring to mock/incomplete implementation
**Action**: Replace with working implementation using Claude SDK patterns

### 3. False Positives (src/lib imports - NOT root /lib)
All UI components import `@/lib/utils` or `../../lib/utils` which refers to `src/lib/utils.ts`
- 28+ UI components use this pattern
- This is standard shadcn/ui practice
- **Do NOT delete `src/lib` directory**

### 4. Root `/lib` Directory Contents

#### `/lib/process/`
- `ProcessManager.ts` - Tries to spawn 'npm run claude' (doesn't exist)
- `ProcessCleaner.ts` - Process cleanup utilities
- `ProcessRegistry.ts` - Process state management
- `types.ts` - Type definitions

#### `/lib/agents/`  
- `AgentManager.ts` - Mock agent management (incomplete)
- `ConfigResolver.ts` - Agent configuration resolution
- `index.ts` - Exports

#### `/lib/ipc/`
- `IPCClient.ts` - Inter-process communication
- `IPCTypes.ts` - IPC type definitions
- `index.ts` - Exports

## Required Actions Before Deletion

### 1. Fix `web/server/app.ts`
Remove unused imports:
```typescript
// Remove these lines:
// import { ProcessManager } from '../../lib/process/ProcessManager.js'
// import { ProcessCleaner } from '../../lib/process/ProcessCleaner.js'
```

### 2. Fix `src/hooks/useAgentManager.ts`
Replace with working implementation using existing patterns:
- Use `useProjectAgents` hook instead
- Use API endpoints for agent management
- Follow SOLID/DRY/KISS principles

### 3. Verify No Other Dependencies
- Check TypeScript compilation after changes
- Run tests to ensure no broken imports
- Search for any dynamic imports or string references

## Architecture Impact

### What We're Removing
- Abandoned distributed process architecture
- IPC communication system (never worked)
- Process spawning/management (npm run claude doesn't exist)
- Mock agent management

### What Replaces It
- Claude SDK instances (already working)
- WebSocket communication (already implemented)  
- Agent configurations via API (already working)
- UI state management (already working)

## Safety Validation

✅ **No production functionality depends on `/lib`**
✅ **ProcessManager calls are commented out in API**
✅ **Claude SDK provides all needed functionality**
✅ **useAgentManager is easily replaceable**
✅ **All UI components use `src/lib` not root `/lib`**

## Deletion Plan

1. **Update Code**: Fix the 2 files with root `/lib` imports
2. **Test**: Verify application still works
3. **Delete**: Remove entire `/lib` directory
4. **Verify**: Check no broken imports remain

## SOLID/DRY/KISS/Library-First Compliance

- **SOLID**: Removing abandoned code improves single responsibility
- **DRY**: Eliminates duplicate/competing agent management approaches  
- **KISS**: Simplifies architecture by removing unused complexity
- **Library-First**: Relies on Claude SDK instead of custom process management