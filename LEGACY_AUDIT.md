# Legacy Code Audit - URGENT REMOVAL NEEDED

## Why We Still Have Legacy Code?

NO GOOD REASON! We're keeping legacy Claude Desktop project support but we've already moved to Studio Projects. This is causing:

- Sessions not showing in UI
- Role switching not working
- Confusion between two project systems
- Duplicate code maintenance

## Critical Legacy Services Still In Use:

### 1. `/api/projects` endpoint (CRITICAL)

- **File**: `web/server/api/projects.ts`
- **Issue**: ENTIRE endpoint uses legacy `ProjectService`
- **Impact**: Workspace UI broken, messages not loading
- **Fix**: Replace with Studio Projects API

### 2. Message Loading (CRITICAL)

- **File**: `src/components/messages/MessageHistoryViewer.tsx`
- **Issue**: Calls `/api/projects/${projectId}/sessions/${sessionId}/messages`
- **Impact**: No messages shown in UI
- **Fix**: Need new API for Studio project messages

### 3. Session Management

- **Files**:
  - `web/server/services/ProjectService.ts`
  - `web/server/services/ClaudeProjectScanner.ts`
- **Issue**: Looking for sessions in wrong location
- **Impact**: Can't find Studio project sessions
- **Fix**: Create new session service for Studio projects

### 4. Agent Management in UI

- **Files**:
  - `src/hooks/useProcessManager.ts`
  - `src/stores/agents.ts`
- **Issue**: Still using legacy project agent concepts
- **Fix**: Update to use Studio project agents with short IDs

## Immediate Actions Required:

1. **Create Studio Session Service**
   - Read sessions from `~/.claude/projects/-tmp-xxx/` folders
   - Map Studio project IDs to Claude session folders

2. **Update Message API**
   - Create `/api/studio-projects/:id/sessions/:sessionId/messages`
   - Or update existing endpoint to handle both types

3. **Remove Legacy Endpoints**
   - Delete or redirect `/api/projects` to Studio projects
   - Update all frontend calls

4. **Fix Workspace UI**
   - Update to use `/api/workspace` or Studio APIs
   - Fix role switching
   - Show proper agent short IDs

## Files to Delete/Update:

- `web/server/services/ProjectService.ts` - DELETE
- `web/server/services/ClaudeProjectScanner.ts` - DELETE
- `web/server/api/projects.ts` - REPLACE with Studio redirect
- `src/services/UnifiedProjectService.ts` - UPDATE to Studio only

## Migration Path:

1. Create session reading for Studio projects
2. Update message loading API
3. Fix workspace UI to use Studio APIs
4. Delete all legacy code
5. Test everything works

NO MORE LEGACY! We chose Studio Projects, let's commit to it fully.
