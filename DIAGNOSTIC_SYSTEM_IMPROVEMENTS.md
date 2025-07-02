# Diagnostic System Improvements

## Current Issues

### 1. Polling-based Architecture

The current system uses polling every 2 seconds which causes:

- Flaky updates ("initializing" state when clicking)
- Unnecessary server load
- Potential race conditions

### 2. Component Re-initialization

The diagnostic monitoring restarts when:

- StatusBar is clicked (toggles problems panel)
- Component re-renders
- Project changes

## Recommended Improvements

### 1. Switch to WebSocket/SSE

Replace polling with real-time updates:

```typescript
// Server: Emit diagnostic updates via WebSocket
diagnosticService.on('diagnostics-updated', (data) => {
  io.emit('diagnostics:updated', data)
})

// Client: Listen for WebSocket events
socket.on('diagnostics:updated', (data) => {
  setDiagnostics(data.source, data.diagnostics)
})
```

### 2. Persistent Monitoring State

- Keep monitoring active even when no project selected
- Use Claude Studio project as default
- Prevent re-initialization on component updates

### 3. Debounce Project Changes

Add debouncing when switching projects to prevent rapid start/stop cycles:

```typescript
const debouncedProjectChange = useMemo(
  () =>
    debounce((projectPath: string) => {
      monitor.switchProject(projectPath)
    }, 500),
  []
)
```

### 4. Better Error Recovery

- Don't stop polling on single failed request
- Implement exponential backoff for failures
- Show connection status in UI

## Quick Fix Applied

For now, I've:

1. Made monitoring initialize only once on mount
2. Added better error handling to continue polling on failures
3. Used Claude Studio as default project when none selected

This makes the system more stable, but a WebSocket implementation would be ideal for production use.
