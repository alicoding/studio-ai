# Legacy JSON References Cleanup

## Problem

The codebase has migrated to SQLite storage but still contains references to the old JSON configuration system, causing confusion and potential bugs.

## Files Still Referencing Legacy JSON

### 1. `/web/server/api/agents.ts`

- **Line 179-204**: PUT endpoint tries to update legacy `configurations.json` FIRST
- **Issue**: New agents created via SQLite won't be found in JSON, causing update failures
- **Fix**: Remove legacy update code, only use ConfigService

### 2. `/web/server/services/AgentConfigService.ts`

- **Line 33**: Sets `legacyConfigPath` to `data/agents/configurations.json`
- **Lines 54-78**: `getAgent()` falls back to legacy storage
- **Lines 98-120**: `getAllAgents()` reads from both SQLite AND legacy JSON
- **Issue**: Maintains dual-source confusion
- **Fix**: Remove all legacy fallback code

### 3. `/migrate-agent-configs.ts`

- **Line 45**: References legacy config path
- **Purpose**: Migration script (probably already run)
- **Fix**: Can be deleted if migration is complete

## The Update Flow Problem

Current broken flow when updating an agent:

1. API receives update request
2. Checks if agent exists (finds it in SQLite ✓)
3. Tries to update legacy JSON first (fails for new agents ✗)
4. Falls back to ConfigService update (works ✓)
5. Returns success but creates confusion

## Why This Matters for MCP Tools

Our new MCP tools create agents directly in SQLite via ConfigService, but:

- The PUT endpoint still prioritizes legacy JSON updates
- The AgentConfigService mixes both sources
- This creates inconsistent behavior between UI and API

## Recommended Fix

1. Remove all legacy JSON code from:
   - `agents.ts` PUT endpoint
   - `AgentConfigService` class
2. Update the PUT endpoint to ONLY use ConfigService:

```typescript
router.put('/:id', async (req, res) => {
  const updates = req.body
  await configService.updateAgent(req.params.id, updates)
  const updated = await configService.getAgent(req.params.id)
  res.json(updated)
})
```

3. Simplify AgentConfigService to only use ConfigService

4. Delete the migration script if no longer needed

## Impact

- Clean, single source of truth (SQLite)
- MCP tools will work consistently with UI
- No more confusion about where agents are stored
