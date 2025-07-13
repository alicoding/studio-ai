# Additional Cleanup Findings

## Console Statements Analysis (49 files)

### High Priority Files with Excessive Logging:
1. **`/src/services/ScreenshotService.ts`** - 12 console statements
   - Mix of debug logs and error handling
   - Should use proper error handling service

2. **`/src/hooks/useRoleOperations.ts`** - Debug logs throughout
   - Role assignment debugging
   - Should be removed or use debug flag

3. **`/src/stores/agents.ts`** - State management logs
   - Debugging state changes
   - Should use Redux DevTools or similar

### Recommendation: Logger Service
```typescript
// Create /src/services/logger.ts
export const logger = {
  debug: (...args) => process.env.NODE_ENV === 'development' && console.log(...args),
  info: (...args) => console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args)
}
```

## TODO/FIXME/HACK Comments (28 locations)

### Critical TODOs:
1. **`/web/server/services/claude-agent.ts`**
   ```typescript
   // TODO: Add retry logic for rate limits
   // FIXME: Handle session cleanup on error
   ```

2. **`/src/services/commands/SpawnCommand.ts`**
   ```typescript
   // HACK: Using ProcessManager but not actually spawning processes
   ```

3. **`/src/components/messages/content-blocks/TodoList.tsx`**
   ```typescript
   // TODO: Implement actual todo functionality
   // Currently just displays mock data
   ```

## Hardcoded Values Analysis

### URLs and Ports (26 files):
```typescript
// Found patterns:
'http://localhost:3001'
'http://127.0.0.1:3000'
'ws://localhost:3001'
'http://localhost:8080'
':5173'  // Vite default
```

### Recommended Constants File:
```typescript
// Create /src/config/constants.ts
export const API_CONFIG = {
  BASE_URL: process.env.VITE_API_URL || 'http://localhost:3001',
  WS_URL: process.env.VITE_WS_URL || 'ws://localhost:3001',
  API_PREFIX: '/api'
} as const

export const DEV_PORTS = {
  VITE: 5173,
  SERVER: 3001,
  PREVIEW: 8080
} as const
```

## Duplicate Type Definitions

### Found in Multiple Locations:
1. **AgentConfig**
   - `/src/types/agent.ts`
   - `/src/stores/agents.ts`
   - `/web/server/types/agent.ts`

2. **ProjectConfig**
   - `/src/types/project.ts`
   - `/src/types/workspace.ts`

3. **TeamConfig**
   - `/src/types/teams.ts`
   - `/src/stores/teams.ts`

### Recommendation:
Create single source of truth in `/src/types/` and import everywhere else.

## Unused Components Analysis

### Potentially Unused:
1. **`/src/components/DevModeIndicator.tsx`**
   - Only imported in DevWrapper
   - DevWrapper might not be used

2. **`/src/components/workspace/GlobalScreenshotHandler.tsx`**
   - Complex screenshot logic
   - Not found in any route imports

3. **`/src/components/modals/ComponentInspectorModal.tsx`**
   - Developer tool modal
   - No references found

## Mock/Test Data Files

### Found:
1. **`/prototype/mockup.js`** - Hardcoded agent data
2. **`/src/lib/tools/roleDefaults.ts`** - Default configurations (actively used)
3. **Development artifacts:**
   - `dev_logs.txt` (removed)
   - `dev_pid.txt` (removed)
   - `test-notification.txt` (removed)

## CSS Files Analysis

### Keep:
- `/src/index.css` - Tailwind directives and critical styles

### Remove:
- `/prototype/styles.css` - 2,780 lines of old styles
- `/prototype/terminal.css` - Old terminal styles

## Library Duplication

### Screenshot Libraries:
- `html2canvas` - Installed but not used
- `dom-to-image-more` - Actually used in ScreenshotService
- **Action**: Remove html2canvas

### Terminal Libraries:
- `@xterm/xterm` - Full terminal emulation (not used)
- Terminal functionality implemented differently
- **Action**: Remove all xterm packages

## Build Artifacts

### Auto-generated Files to Ignore:
- `/src/routeTree.gen.ts` - TanStack Router generated
- `.tanstack/` directory - Build cache
- Already added to .gitignore

## Security Concerns

### Found:
1. **No API key validation** in several endpoints
2. **Direct file system access** without sanitization in some areas
3. **TODO comments about adding auth** in multiple files

## Performance Issues

### Large Components:
1. **`EnhancedHookModal.tsx`** - 729 lines
2. **`MessageHistoryViewer.tsx`** - 593 lines
3. **`HooksSettingsTab.tsx`** - 480 lines

These violate SOLID principles (Single Responsibility) and need splitting.

## Recommended Cleanup Priority

### 🔴 High Priority (Immediate):
1. Remove `/prototype` directory
2. Create logger service to replace console statements
3. Extract hardcoded values to constants
4. Remove unused dependencies (xterm, html2canvas)

### 🟡 Medium Priority (This Week):
1. Consolidate duplicate type definitions
2. Split large components
3. Address critical TODO comments
4. Remove unused components after verification

### 🟢 Low Priority (Future):
1. Add comprehensive error boundaries
2. Implement proper auth where noted
3. Add performance monitoring
4. Complete TypeScript strict mode migration

## Cleanup Script

```bash
#!/bin/bash
# cleanup.sh

# Remove prototype directory
rm -rf prototype/

# Remove unused dependencies
npm uninstall @xterm/xterm @xterm/addon-fit @xterm/addon-web-links
npm uninstall html2canvas @types/html2canvas
npm uninstall @playwright/test

# Remove test files (already done)
rm -f test-notification.txt dev_logs.txt dev_pid.txt
rm -f src/routeTree.gen.ts.backup
rm -f src/test-type-error.ts

# Clean node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

echo "Cleanup complete! Run 'npm run typecheck' to verify"
```