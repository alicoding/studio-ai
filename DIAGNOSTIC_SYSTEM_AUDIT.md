# Diagnostic System Deep Audit

## Problem Statement

The diagnostic system shows "0 errors, 0 warnings" when there are actually 65 ESLint warnings in the codebase.

## Root Cause

The diagnostic system was not initializing because it required an active project to be selected. The `useDiagnostics` hook would only start monitoring when `currentProject?.path` was available, but the app starts with no active project selected.

## System Architecture

### 1. Frontend Components

- **DiagnosticPanel** (`src/components/workspace/DiagnosticPanel.tsx`) - UI display
- **StatusBar** (`src/components/workspace/StatusBar.tsx`) - Shows error/warning counts
- **useDiagnostics** hook (`src/hooks/useDiagnostics.ts`) - Client-side orchestration
- **ErrorMonitor** service (`src/services/ErrorMonitor.ts`) - Polls server for diagnostics
- **DiagnosticsStore** (`src/stores/diagnostics.ts`) - Zustand state management

### 2. Backend Components

- **DiagnosticService** (`web/server/services/DiagnosticService.ts`) - Core service
- **Diagnostics API** (`web/server/api/diagnostics.ts`) - REST endpoints

## Investigation Steps

### Step 1: Verify ESLint Works Manually

```bash
# Direct ESLint command
npx eslint src --ext ts,tsx --format json | jq '. | length'
# Result: Returns 126 file results

# Count total warnings
npx eslint src --ext ts,tsx --format json | jq '[.[] | .warningCount] | add'
# Result: Shows 65 warnings
```

### Step 2: Test DiagnosticService Directly

Created test script that replicated DiagnosticService logic:

- ESLint command executed successfully
- JSON parsing worked correctly
- 65 diagnostics were created from the messages

### Step 3: Discovered the Issue

The diagnostic system requires an active project:

```typescript
// In useDiagnostics.ts
if (!currentProject?.path) {
  // Stop monitoring and return
}
```

But the app starts with `activeProjectId: null`, preventing diagnostics from initializing.

## Solution

Modified `useDiagnostics.ts` to use Claude Studio itself as the default project when no project is selected:

```typescript
const projectPath = currentProject?.path || '/Users/ali/claude-swarm/claude-team/claude-studio'
```

This ensures diagnostics always work, even without an active project selected.

## Extension Guide

### Adding New Diagnostic Sources

1. **Create Parser in DiagnosticService**:

```typescript
private async runMyToolCheck(): Promise<Diagnostic[]> {
  // Execute your tool
  const { stdout } = await execAsync('my-tool --json')

  // Parse output into Diagnostic objects
  const diagnostics: Diagnostic[] = []
  // ... parsing logic

  return diagnostics
}
```

2. **Add to Initial Checks**:

```typescript
// In runInitialChecks()
if (await this.fileExists(join(this.projectPath, '.mytoolrc'))) {
  const myToolDiagnostics = await this.runMyToolCheck()
  this.diagnostics.set('mytool', myToolDiagnostics)
}
```

3. **Add File Watcher** (optional):

```typescript
// In discoverMonitors()
monitors.push({
  name: 'mytool',
  patterns: ['.mytool-cache', 'mytool-output.json'],
  parser: this.parseMyToolOutput,
})
```

### Diagnostic Object Format

```typescript
interface Diagnostic {
  id: string // Unique identifier
  type: 'error' | 'warning' | 'info'
  source: string // 'typescript' | 'eslint' | 'test' | etc
  file: string // Relative file path
  line: number // Line number
  column: number // Column number
  message: string // Error message
  code?: string // Error code (e.g., 'TS2307')
  quickFix?: string // Optional fix suggestion
  timestamp: Date // When detected
}
```

### Testing Diagnostics

1. Check server logs for `[DiagnosticService]` entries
2. Monitor API calls to `/api/diagnostics`
3. Verify ErrorMonitor polling in browser console
4. Use browser DevTools Network tab to inspect responses
