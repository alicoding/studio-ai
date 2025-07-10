# Claude Studio Gotchas & Known Issues

## Claude Session File Location Issue

### Problem

StudioSessionService fails to find session messages, showing "Session not found in Claude projects" errors in logs. Messages don't appear in the UI even though Claude is writing them.

### Root Cause

The `getClaudeProjectFolder` method was preferring empty `-private` directories over the actual active directories where Claude writes JSONL files:

```typescript
// PROBLEMATIC CODE (lines 114-128 in StudioSessionService.ts)
const candidates = [
  path.join(baseDir, `${projectName}-private`), // Checked first but often empty!
  path.join(baseDir, projectName),
  // ... other candidates
]

// It would find the -private directory and return it even if empty
for (const dir of candidates) {
  if (await this.fileExists(dir)) {
    return dir // Returns first match, even if wrong!
  }
}
```

### Solution

Check which directory has the most recent/active JSONL files instead of just existence:

```typescript
// FIXED CODE
private async getClaudeProjectFolder(projectPath: string): Promise<string | null> {
  // ... normalize project name ...

  const candidates = [
    path.join(baseDir, `${projectName}-private`),
    path.join(baseDir, projectName),
    // ... other candidates
  ]

  // Find the directory with the most recent JSONL files
  let bestCandidate: { dir: string; mtime: number } | null = null

  for (const dir of candidates) {
    if (await this.fileExists(dir)) {
      const files = await fs.readdir(dir)
      const jsonlFiles = files.filter(f => f.endsWith('.jsonl'))

      if (jsonlFiles.length > 0) {
        // Get the most recent file's modification time
        const stats = await fs.stat(path.join(dir, jsonlFiles[0]))
        const mtime = stats.mtime.getTime()

        if (!bestCandidate || mtime > bestCandidate.mtime) {
          bestCandidate = { dir, mtime }
        }
      }
    }
  }

  return bestCandidate?.dir || null
}
```

### Impact

- Messages appear as "not found" even though Claude is actively writing them
- UI shows no message history for active sessions
- Logs fill with "Session XXX not found in Claude projects" errors

### Debugging Steps

1. Check `~/.claude/projects/` for your project directories
2. Look for both `projectname` and `projectname-private` directories
3. Use `ls -la` to see which has recent JSONL files
4. The active directory should have files modified within seconds/minutes

### Related Issues

- Claude may create multiple project directories for the same project
- Session IDs change frequently as Claude creates new sessions
- JSONL files are written incrementally, so timing matters
- Frontend must use the correct session ID from the agent

### Prevention

- Always check file timestamps, not just directory existence
- Log which directory is being used for debugging
- Consider caching the active directory per project
- Monitor for directory switches during Claude usage

See also:

- [Services Documentation](./services.md#studiosessionservice)
- [API Documentation](./apis.md#studio-session-messages-api)
