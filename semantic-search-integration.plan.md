# Semantic Search Integration Plan

## Overview
Integrate standalone semantic search into Claude Studio with MCP support, following strict implementation principles.

## Prerequisites
- Standalone `semantic-search` package already built and tested
- Claude Studio architecture analyzed and understood
- ElectronHub API key available

## Implementation Phases

### Phase 1: Core Integration (2 days)

#### 1.1 Storage Implementation
```bash
# Check existing storage patterns
grep -r "UnifiedStorage" web/server/services/
```

**Tasks:**
- Create `web/server/services/SemanticSearchService.ts` using UnifiedStorage
- Implement hybrid storage (metadata in SQLite, embeddings in files)
- Add storage keys: `search:project:{id}:config`, `search:project:{id}:stats`

**Testing:**
- Integration test with real SQLite database
- Verify file storage at `.claude-studio/indices/{projectId}/`

#### 1.2 API Endpoints
```bash
# Check existing API patterns
ls web/server/api/
```

**Tasks:**
- Add to `web/server/api/search.ts`:
  - `POST /api/projects/:projectId/search` - Search
  - `GET /api/projects/:projectId/search/stats` - Get stats
  - `POST /api/projects/:projectId/search/index` - Build index
  - `PUT /api/projects/:projectId/search/config` - Update config

**Testing:**
- Test all endpoints against running server
- Verify ElectronHub API calls work
- Test with real project data

### Phase 2: UI Integration (2 days)

#### 2.1 Settings UI
```bash
# Check existing settings components
ls src/components/settings/
```

**Tasks:**
- Create `src/components/settings/SearchSettingsTab.tsx`
- Add configuration options (enable, patterns, auto-index)
- Integrate with existing settings tabs

**Testing:**
- Test configuration persistence
- Verify pattern matching with `ignore` library
- Test with real `.gitignore` files

#### 2.2 Workspace Search Panel
```bash
# Check existing workspace components
ls src/components/workspace/
```

**Tasks:**
- Create `src/components/workspace/SearchPanel.tsx`
- Add to panel registry system
- Implement search UI with results display

**Testing:**
- Search real codebase
- Click results to verify file paths
- Test performance with large results

### Phase 3: MCP Integration (1 day)

#### 3.1 MCP Server
```bash
# Check existing MCP servers
ls web/server/mcp/
```

**Tasks:**
- Create `web/server/mcp/semantic-search/index.ts`
- Implement read-only tools:
  - `search_code` - Search with query
  - `get_search_stats` - Get index stats
- Use same storage as Studio

**Testing:**
- Configure in Claude Desktop
- Test search_code tool with real queries
- Verify MCP can access file-based indices

### Phase 4: Auto-indexing (1 day)

#### 4.1 File Watcher
```bash
# Check if chokidar is already used
grep -r "chokidar" package.json
```

**Tasks:**
- Add file watcher service using `chokidar`
- Implement debounced reindexing
- Respect `.gitignore` patterns

**Testing:**
- Modify files and verify reindex triggers
- Test with git operations
- Verify performance with many file changes

## Configuration Structure

```typescript
// No hardcoded values - all configurable
interface SearchConfig {
  enabled: boolean
  autoIndex: 'manual' | 'on-save' | 'on-change'
  ignorePatterns: string[]  // Loaded from .gitignore + custom
  includePatterns: string[]
  debounceMs: number       // Default: 5000
  batchSize: number        // Default: 50
  maxFileSize: number      // Default: 1MB
}
```

## Integration Points

1. **Storage**: Use existing UnifiedStorage
2. **API**: Follow existing Express patterns
3. **UI**: Use existing component patterns
4. **Auth**: Leverage existing auth middleware
5. **Settings**: Integrate with settings system

## Libraries to Use

- `semantic-search` - Our standalone package
- `ignore` - Gitignore pattern matching
- `chokidar` - File watching
- `p-queue` - Concurrency control

## Testing Requirements

1. **All tests use real server** - No mocks
2. **Test with real ElectronHub API** - No stubs
3. **Integration tests only** - Test full flow
4. **MCP testing** - Configure and test in Claude Desktop

## What NOT to Build

- Pattern matching engine (use `ignore`)
- File watcher (use `chokidar`)
- Debouncing (use `lodash.debounce`)
- Queue management (use `p-queue`)

## Success Criteria

- [ ] Search works in Studio UI
- [ ] Search works via MCP tools
- [ ] Configuration persists
- [ ] Auto-indexing works
- [ ] No TypeScript errors
- [ ] No hardcoded values
- [ ] All integration tests pass
- [ ] Works with real projects

## Estimated Timeline

- Phase 1: 2 days
- Phase 2: 2 days
- Phase 3: 1 day
- Phase 4: 1 day
- **Total: 6 days**