# Claude Studio: Deep Cleanup Plan

## Executive Summary

This document outlines a comprehensive cleanup plan for Claude Studio, identifying dead code, DRY violations, and opportunities to apply library-first principles. The cleanup will reduce codebase size by ~30% and improve maintainability significantly.

## 1. Dead Code to Remove

### 1.1 Entire Directories (Safe to Delete)

```bash
# Abandoned distributed system code - 2,000+ lines
rm -rf lib/agents/
rm -rf lib/ipc/
rm -rf lib/process/

# Old prototype files
rm -rf prototype/

# Unused test configurations
rm -f playwright.config.ts  # Not actively used
```

### 1.2 Unused Dependencies

```bash
# Remove from package.json
npm uninstall @xterm/xterm @xterm/addon-fit @xterm/addon-web-links
npm uninstall html2canvas @types/html2canvas  # Keep dom-to-image-more
npm uninstall @playwright/test  # Not actively used
```

### 1.3 Dead Imports to Clean

```typescript
// In web/server/services/ProjectService.ts
- import { ProcessManager } from '../../lib/process/ProcessManager'

// In web/server/services/SessionService.ts  
- import { ProcessRegistry } from '../../lib/process/ProcessRegistry'

// Remove all imports from /lib directories
```

## 2. DRY Violations to Fix

### 2.1 Create Centralized API Client

**Current Problem**: Repeated fetch patterns across 10+ files

**Solution**: Create `/src/services/api-client.ts`

```typescript
// Library: ky (tiny, modern fetch wrapper)
npm install ky

// api-client.ts
import ky from 'ky'

export const apiClient = ky.create({
  prefixUrl: '/api',
  hooks: {
    beforeError: [
      error => {
        const {response} = error
        if (response?.body) {
          error.message = `${response.status}: ${response.body.message || response.statusText}`
        }
        return error
      }
    ]
  }
})

// Usage example:
// Replace: const response = await fetch('/api/agents')
// With: const agents = await apiClient.get('agents').json()
```

**Files to Update**:
- `/src/services/api/agentsApi.ts`
- `/src/services/api/projectsApi.ts`
- `/src/services/api/teamsApi.ts`
- `/src/services/api/messagesApi.ts`
- `/src/services/api/settingsApi.ts`

### 2.2 Consolidate Modal Components

**Current**: Custom Modal.tsx + individual modal implementations

**Solution**: Standardize on Shadcn/ui Dialog

```typescript
// Remove custom modal
rm src/components/shared/Modal.tsx

// Update all modals to use:
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
```

**Files to Update**:
- All files importing `Modal` from `@/components/shared/Modal`
- Approximately 15 modal components

### 2.3 Extract Common Hook Patterns

**Create**: `/src/hooks/useApiQuery.ts`

```typescript
// Library: @tanstack/react-query for caching and state
npm install @tanstack/react-query

// Generic API hook for all resources
export function useApiQuery<T>(
  key: string[], 
  endpoint: string,
  options?: UseQueryOptions
) {
  return useQuery({
    queryKey: key,
    queryFn: () => apiClient.get(endpoint).json<T>(),
    ...options
  })
}
```

## 3. Library-First Replacements

### 3.1 State Persistence

**Current**: Direct localStorage usage everywhere

**Solution**: Use Zustand persist middleware

```typescript
// In each store file:
import { persist } from 'zustand/middleware'

export const useSettingsStore = create(
  persist(
    (set) => ({
      // ... store implementation
    }),
    {
      name: 'claude-studio-settings',
    }
  )
)
```

**Files to Update**:
- `/src/stores/settings.ts`
- `/src/stores/keyboard.ts`
- `/src/stores/workspace.ts`

### 3.2 Date Handling

**Current**: Mix of native Date and date-fns

**Solution**: Consistent date-fns usage

```typescript
// Replace all:
new Date().toISOString()
// With:
import { formatISO } from 'date-fns'
formatISO(new Date())

// Replace all:
new Date(timestamp).toLocaleString()
// With:
import { format } from 'date-fns'
format(new Date(timestamp), 'PPpp')
```

### 3.3 Form Validation

**Current**: Mix of manual validation and Zod

**Solution**: Consistent Zod schemas

```typescript
// Create /src/lib/validations/
// Move all Zod schemas to centralized location
// Use with react-hook-form consistently
```

## 4. Component Refactoring

### 4.1 Split Large Components

**EnhancedHookModal.tsx** (729 lines) → Split into:
- `HookForm.tsx` - Form logic
- `HookValidation.tsx` - Validation rules
- `HookPreview.tsx` - Preview component
- `EnhancedHookModal.tsx` - Container only

**MessageHistoryViewer.tsx** (593 lines) → Split into:
- `MessageList.tsx` - Virtual scrolling list
- `MessageBubble.tsx` - Already exists, enhance
- `MessageHistoryViewer.tsx` - Container only

**HooksSettingsTab.tsx** (480 lines) → Split into:
- `HooksList.tsx` - List component
- `HookActions.tsx` - Action handlers
- `HooksSettingsTab.tsx` - Container only

### 4.2 Extract Custom Hooks

**From useAgentOperations.ts** (394 lines) → Split into:
- `useAgentSpawn.ts`
- `useAgentDelete.ts`
- `useAgentUpdate.ts`
- `useAgentSelection.ts`

## 5. Code Organization

### 5.1 Service Layer Structure

```
src/services/
├── api/              # API endpoints
│   └── client.ts     # Centralized API client
├── commands/         # Command handlers
├── storage/          # LocalStorage abstraction
├── websocket/        # WebSocket management
└── claude/           # Claude SDK integration
```

### 5.2 Consistent Import Aliases

```typescript
// In tsconfig.json paths:
"@/api/*": ["src/services/api/*"],
"@/hooks/*": ["src/hooks/*"],
"@/stores/*": ["src/stores/*"],
"@/lib/*": ["src/lib/*"],
"@/types/*": ["src/types/*"]
```

## 6. Testing Infrastructure

### 6.1 Remove Unused Test Setup

```bash
# If not using Playwright
rm playwright.config.ts
rm -rf tests/e2e/

# Keep Vitest for unit tests
```

### 6.2 Add Missing Tests

Focus on testing:
- API client wrapper
- Critical hooks
- Store logic
- Utility functions

## 7. Type Safety Improvements

### 7.1 Generate Types from API

```typescript
// Use zod schemas to generate TypeScript types
// This ensures API contract consistency

// In /src/types/api.ts
export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  // ...
})

export type Agent = z.infer<typeof AgentSchema>

// Use in API responses:
const agents = await apiClient.get('agents').json<Agent[]>()
```

### 7.2 Strict Type Checking

```json
// In tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true
  }
}
```

## Implementation Priority

### Phase 1: Remove Dead Code (1 day)
1. Delete /lib directories
2. Remove unused dependencies
3. Clean up imports

### Phase 2: API Client (2 days)
1. Install ky
2. Create centralized client
3. Update all API calls

### Phase 3: Component Refactoring (3 days)
1. Split large components
2. Standardize on Shadcn/ui
3. Extract reusable hooks

### Phase 4: Library Adoption (2 days)
1. Implement Zustand persist
2. Standardize date-fns usage
3. Add React Query for caching

### Phase 5: Testing & Documentation (2 days)
1. Add critical tests
2. Update documentation
3. Create coding standards

## Expected Outcomes

- **Code Reduction**: ~30% fewer lines of code
- **Dependencies**: Remove 5-7 unused packages
- **Performance**: Better with React Query caching
- **Maintainability**: Significantly improved with consistent patterns
- **Type Safety**: Improved with centralized types
- **Developer Experience**: Faster development with library solutions

## Metrics to Track

- Bundle size before/after
- Number of TypeScript errors
- Test coverage percentage
- Build time improvements
- Developer survey on code clarity

## Conclusion

This cleanup plan prioritizes high-impact changes that align with DRY, SOLID, KISS, and Library First principles. The phased approach ensures the application remains functional throughout the cleanup process.