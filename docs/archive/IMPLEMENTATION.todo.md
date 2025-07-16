# Claude Studio Complete Implementation Plan

## Core Principles (MUST follow for every stage)

1. No completion theater - Real implementation only
2. No lint/type errors, no 'any' types
3. Integration testing against real server only
4. API and MCP must be tested
5. KISS principle
6. DRY principle
7. SOLID principles
8. Library-first approach
9. Configuration architecture - no hardcoded values
10. No mocks
11. All real implementation
12. Everything fully integrated
13. Scan for existing code before building
14. **CRITICAL**: Stop immediately if architecture limits scalability - analyze and refactor first

## Critical Setup Requirements

### Environment Configuration

```bash
# .env file setup (check .env.example first)
VITE_ELECTRONHUB_API_KEY=your-key
ELECTRONHUB_API_KEY=your-key
ELECTRONHUB_API_URL=https://api.electronhub.ai/v1
NODE_ENV=development
```

### Test Infrastructure

```bash
# Test project structure
test-project/
├── src/
│   ├── index.ts
│   ├── utils.ts
│   └── components/
├── .gitignore
├── package.json
└── README.md
```

### Error Handling Strategy

- All async operations wrapped in try-catch
- User-friendly error messages
- Fallback UI states for failures
- Retry mechanisms with exponential backoff
- Error boundaries for React components

## Stage Gates

**CRITICAL**: Do NOT proceed to next stage until current stage is:

- Fully implemented
- Integration tested
- No TypeScript errors
- Working with real data
- Reviewed and verified

---

## Completed: Studio AI MCP Refactor ✅

**Completed:** 2025-07-06
**Goal:** Transform generic `mcp__studio-ai__studio-ai` tool into explicit, discoverable tools

### What Was Done:

1. **Created explicit tool handlers:**
   - `agentTools.ts`: list_agents, mention, batch_messages
   - `capabilityTools.ts`: list*capabilities, execute*[capability]
2. **Refactored MCP server:**
   - Removed single generic tool approach
   - Implemented multiple explicit tools with proper schemas
   - Dynamic tool generation from UI-configured capabilities
3. **Type Safety:**
   - Exported all required interfaces
   - Removed all `any` types
   - Proper argument validation

4. **Testing:**
   - Created comprehensive test suite
   - Verified against real API
   - All tools discoverable and functional

### Benefits Achieved:

- **Discoverable**: Claude can see all available tools
- **Self-documenting**: Tool names clearly indicate purpose
- **Configurable**: AI capabilities from UI become tools automatically
- **Type-safe**: Each tool has proper input validation
- **KISS/DRY/SOLID**: Clean separation of concerns

### Files Created/Modified:

- `/web/server/mcp/studio-ai/src/agentTools.ts` (created)
- `/web/server/mcp/studio-ai/src/capabilityTools.ts` (created)
- `/web/server/mcp/studio-ai/src/index.ts` (refactored)
- `/docs/studio-ai-mcp-refactor-plan.md` (created)
- `/docs/studio-ai-mcp-deployment.md` (created)

---

## Stage 0: Architecture Refactoring (2 days)

CRITICAL: Fix architectural issues that will limit scalability

### 0.1 Service Container with Dependency Injection

**Problem Found**: Singleton services don't scale to multiple workspaces
**Implementation:**

- Create `src/contexts/ServiceContext.tsx`
- Replace singleton pattern with React Context
- Each workspace gets own service instances

### 0.2 Event Bus System

**Problem Found**: No event system for panel state sync
**Implementation:**

- Install `mitt` library (3kb, battle-tested)
- Create `src/services/EventBus.ts`
- Define workspace event types

### 0.3 Frontend Storage Fix

**Problem Found**: Frontend trying to use SQLite (impossible in browser)
**Implementation:**

- Frontend: Use Zustand + localStorage only
- Backend: Keep UnifiedStorage for server
- Create proper storage abstraction

### 0.4 Refactor PanelRegistry

**Implementation:**

- Remove singleton pattern
- Use dependency injection
- Update existing implementation

**Stage 0 Gate:**

- [ ] Services injected via context
- [ ] Event bus working
- [ ] Frontend storage using localStorage
- [ ] No singletons remain
- [ ] All tests passing

## Stage 1: Workspace Layout Foundation (5 days)

Foundation for all future features - MUST be solid.

### 1.1 Panel Registry System ✅ → NEEDS REFACTOR

```bash
# Check existing patterns
grep -r "Registry" src/
ls src/components/workspace/
```

**Implementation:**

- ✅ Created `src/services/PanelRegistry.ts` following existing CommandRegistry pattern
- ✅ Defined `PanelDefinition` interface with proper types (no 'any')
- ✅ Implemented singleton registration pattern
- ✅ Created base `PanelProps` interface

**Testing:**

- ✅ Created comprehensive test suite
- ✅ Verified singleton pattern works
- ✅ Tested panel retrieval by position
- ✅ All tests passing (5/5)

### 1.2 Layout Storage & State Management

```bash
# Check UnifiedStorage usage
grep -r "UnifiedStorage" src/services/
```

**Implementation:**

- Create `src/services/WorkspaceLayoutService.ts`
- Store layouts in UnifiedStorage: `layout:project:{id}`
- Define `WorkspaceLayout` interface (no 'any' types!)
- Implement save/load/reset methods
- Add panel state persistence: `panelState:project:{id}:{panelId}`
- Create event bus for state synchronization

**Event System:**

```typescript
// Global event bus for state sync
interface LayoutEvents {
  'panel:opened': { panelId: string }
  'panel:closed': { panelId: string }
  'layout:changed': { layout: WorkspaceLayout }
  'file:modified': { path: string }
}
```

**Testing:**

- Save layout to real SQLite
- Load layout for different projects
- Verify persistence across sessions
- Test concurrent access handling
- Verify event propagation

### 1.3 Flexible Sidebar

```bash
# Check existing sidebar
ls src/components/layout/
```

**Implementation:**

- Update `src/components/layout/Sidebar.tsx` to use panels
- Implement tab switching
- Add panel content area
- Use `allotment` for resizing

**Library:** `npm install allotment`

**Testing:**

- Add multiple panels to sidebar
- Switch between panels
- Resize sidebar width
- Verify state persistence

### 1.4 Main Canvas Layout Engine

**Implementation:**

- Create `src/components/workspace/MainCanvas.tsx`
- Support single/split/grid layouts
- Use `allotment` for splits
- Implement `PanelRenderer` component

**Testing:**

- Test single panel view
- Test horizontal/vertical splits
- Test grid layout (2x2)
- Verify layout persistence

### 1.5 Layout Configuration UI

**Implementation:**

- Create `src/components/settings/LayoutSettingsTab.tsx`
- Drag-and-drop panel ordering
- Layout type selector
- Reset to defaults button

**Library:** `npm install @dnd-kit/sortable`

**Testing:**

- Reorder sidebar panels
- Change layout types
- Reset and verify defaults
- Test with real project

**Stage 1 Gate:**

- [ ] All panels render correctly
- [ ] Layouts persist per project
- [ ] No TypeScript errors
- [ ] Integration tests pass
- [ ] Can add new panel types easily

---

## Stage 2: Semantic Search Integration (4 days)

Only proceed after Stage 1 is COMPLETE and TESTED.

### 2.0 Storage Architecture Setup

**Implementation:**

- Define hybrid storage interface
- Implement file-based embedding storage
- Add file locking for concurrent access
- Create migration strategy for existing projects

```typescript
interface SearchStorage {
  getEmbeddings(projectId: string): Promise<Float32Array[]>
  saveEmbeddings(projectId: string, embeddings: Float32Array[]): Promise<void>
  lock(projectId: string): Promise<() => void> // Returns unlock function
}
```

### 2.1 Search Panel Registration

```bash
# Verify panel registry exists
ls src/services/PanelRegistry.ts
```

**Implementation:**

- Create `src/components/search/SearchPanel.tsx`
- Register with PanelRegistry
- Add search icon and UI

**Testing:**

- Panel appears in sidebar
- Can switch to search panel
- UI renders correctly

### 2.2 Backend Search Service

```bash
# Check existing services
ls web/server/services/
```

**Implementation:**

- Create `web/server/services/SemanticSearchService.ts`
- Use hybrid storage (SQLite + files)
- Integrate `semantic-search` package
- Follow singleton pattern

**Testing:**

- Index a real project
- Verify embeddings saved to files
- Check metadata in SQLite

### 2.3 Search API Endpoints

**Implementation:**

- Update `web/server/api/search.ts`
- Add all endpoints (search, index, stats, config)
- Use real ElectronHub API

**Testing:**

- Test each endpoint with curl
- Verify ElectronHub integration
- Test with large codebases

### 2.4 Search UI Integration

**Implementation:**

- Add search input and results
- Click to view file (prepare for editor)
- Show indexing progress
- Add reindex button

**Testing:**

- Search real codebase
- Click results (log file paths)
- Reindex and verify updates

### 2.5 Search Configuration

**Implementation:**

- Create `src/components/settings/SearchSettingsTab.tsx`
- Enable/disable search
- Configure ignore patterns
- Use `ignore` library for .gitignore

**Library:** `npm install ignore`

**Testing:**

- Toggle search on/off
- Add custom ignore patterns
- Verify .gitignore is respected

### 2.6 MCP Search Tools

```bash
# Check MCP structure
ls web/server/mcp/
```

**Implementation:**

- Create `web/server/mcp/semantic-search/`
- Add `search_code` tool
- Add `get_search_stats` tool
- Read-only access to indices
- Build process: `npm run build:mcp`
- Output to `web/server/mcp/semantic-search/dist/`

**MCP Configuration:**

```json
// Claude Desktop config location: ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "studio-ai-search": {
      "command": "node",
      "args": ["/path/to/studio-ai/web/server/mcp/semantic-search/dist/index.js"],
      "env": {
        "ELECTRONHUB_API_KEY": "${ELECTRONHUB_API_KEY}",
        "CLAUDE_STUDIO_INDICES": "${HOME}/.studio-ai/indices"
      }
    }
  }
}
```

**Testing:**

- Build MCP server
- Configure in Claude Desktop
- Test search_code with queries
- Verify stats are accurate
- Test with multiple projects

**Stage 2 Gate:**

- [ ] Search works in UI
- [ ] MCP tools work in Claude
- [ ] Configuration persists
- [ ] No TypeScript errors
- [ ] All integration tests pass

---

## Stage 3: Code Editor Integration (4 days)

Only proceed after Stage 2 is COMPLETE and TESTED.

### 3.1 Editor Panel

**Implementation:**

- Create `src/components/editor/EditorPanel.tsx`
- Integrate Monaco Editor
- Register with PanelRegistry
- Add to main canvas
- Configure TypeScript language service
- Setup autocomplete providers
- Add file change detection

**Monaco Configuration:**

```typescript
// TypeScript support
monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
  target: monaco.languages.typescript.ScriptTarget.Latest,
  allowNonTsExtensions: true,
  moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
  module: monaco.languages.typescript.ModuleKind.CommonJS,
  noEmit: true,
  esModuleInterop: true,
  jsx: monaco.languages.typescript.JsxEmit.React,
  reactNamespace: 'React',
  allowJs: true,
  typeRoots: ['node_modules/@types'],
})
```

**Library:** `npm install @monaco-editor/react monaco-editor`

**Testing:**

- Editor renders in main canvas
- Syntax highlighting works
- Autocomplete functions
- TypeScript errors show
- Can edit files
- File permissions handled

### 3.2 File Explorer Panel

**Implementation:**

- Create `src/components/files/FileExplorerPanel.tsx`
- Tree view of project files
- Click to open in editor
- Show file icons

**Library:** `npm install react-arborist`

**Testing:**

- Display project file tree
- Click files to open
- Folder expand/collapse

### 3.3 Search-to-Editor Integration

**Implementation:**

- Update search results to open files
- Jump to specific line numbers
- Highlight search matches
- Add file preview on hover

**Testing:**

- Search and click result
- Verify correct file opens
- Verify cursor at right line
- Preview shows correct snippet

### 3.4 Multi-File Editing

**Implementation:**

- Add tabs to editor panel
- Support multiple open files
- Implement file modified indicators
- Add close/save functionality
- Implement undo/redo per file
- Add global undo/redo coordination

**State Management:**

```typescript
interface EditorState {
  openFiles: Map<
    string,
    {
      content: string
      isDirty: boolean
      undoStack: UndoItem[]
      cursorPosition: Position
    }
  >
  activeFile: string | null
}
```

**Testing:**

- Open multiple files
- Switch between tabs
- Verify unsaved indicators
- Close tabs
- Test undo/redo per file
- Verify memory cleanup

**Stage 3 Gate:**

- [ ] Editor fully functional
- [ ] File explorer works
- [ ] Search integrates with editor
- [ ] Can edit multiple files
- [ ] No TypeScript errors

---

## Stage 4: Terminal Integration (3 days)

Only proceed after Stage 3 is COMPLETE and TESTED.

### 4.1 Terminal Panel

**Implementation:**

- Create `src/components/terminal/TerminalPanel.tsx`
- Integrate xterm.js
- Register with PanelRegistry
- Add to bottom panel area

**Library:** `npm install xterm xterm-addon-fit`

**Testing:**

- Terminal renders
- Can type commands
- Output displays correctly

### 4.2 Shell Integration

**Implementation:**

- Add `node-pty` to backend
- Create terminal sessions API
- Handle resize events
- Support multiple terminals
- Add WebSocket support for real-time
- Handle cross-platform shell detection

**WebSocket Setup:**

```typescript
// Terminal WebSocket protocol
interface TerminalMessage {
  type: 'input' | 'resize' | 'create' | 'close'
  id: string
  data?: string
  cols?: number
  rows?: number
}
```

**Cross-Platform:**

```typescript
// Shell detection
const shell = process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/bash'
```

**Library:** `npm install node-pty ws @types/ws`

**Testing:**

- Run real shell commands
- cd to different directories
- Long running processes
- Multiple terminal tabs
- Test on Windows/Mac/Linux
- WebSocket reconnection

### 4.3 Terminal-Editor Integration

**Implementation:**

- "Open in terminal" from file explorer
- Run file from editor
- Click file paths in terminal to open
- Sync working directory

**Testing:**

- Right-click file → open terminal
- Run current file
- Click error paths
- Verify cwd sync

**Stage 4 Gate:**

- [ ] Terminal fully functional
- [ ] Can run real commands
- [ ] Integrates with editor
- [ ] Multiple terminals work
- [ ] No TypeScript errors

---

## Stage 5: Git Integration (3 days)

Only proceed after Stage 4 is COMPLETE and TESTED.

### 5.1 Git Panel

**Implementation:**

- Create `src/components/git/GitPanel.tsx`
- Show changed files
- Display diff view
- Register with PanelRegistry

**Library:** `npm install isomorphic-git`

**Testing:**

- Show git status
- Display file changes
- Diff visualization

### 5.2 Git Operations

**Implementation:**

- Stage/unstage files
- Commit with message
- Push/pull buttons
- Branch switching
- Handle Git authentication

**Git Authentication:**

```typescript
// Support multiple auth methods
interface GitAuth {
  type: 'ssh' | 'https' | 'token'
  credentials?: {
    username?: string
    password?: string
    token?: string
    sshKey?: string
  }
}

// Use system SSH agent for SSH
// Use Git credential helper for HTTPS
```

**Diff Visualization:**

- Library: `npm install diff2html`
- Syntax highlighted diffs
- Side-by-side and unified views

**Testing:**

- Make real commits
- Push to remote (test auth)
- Switch branches
- Pull changes
- Test SSH and HTTPS
- Verify diff display

### 5.3 Git-Search Integration

**Implementation:**

- Auto-reindex on git operations
- Respect .gitignore in search
- Show git status in file explorer
- Search in specific branches

**Testing:**

- Commit triggers reindex
- .gitignore respected
- File status indicators
- Branch search works

**Stage 5 Gate:**

- [ ] Git operations work
- [ ] Real commits/push/pull
- [ ] Integrates with search
- [ ] No TypeScript errors
- [ ] All tests pass

---

## Stage 6: Auto-Indexing & File Watching (2 days)

Only proceed after Stage 5 is COMPLETE and TESTED.

### 6.1 File Watcher Service

**Implementation:**

- Create file watcher with chokidar
- Debounced reindexing
- Respect ignore patterns
- Efficient change detection
- Handle large files gracefully
- Exclude binary files

**Watcher Configuration:**

```typescript
const watcher = chokidar.watch('**/*', {
  ignored: [
    '**/node_modules/**',
    '**/.git/**',
    '**/*.{jpg,png,gif,ico,pdf,zip}', // Binary files
    (file: string) => {
      // Skip files over 1MB
      try {
        const stats = fs.statSync(file)
        return stats.size > 1024 * 1024
      } catch {
        return false
      }
    },
  ],
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 2000,
    pollInterval: 100,
  },
})
```

**Library:** `npm install chokidar`

**Testing:**

- Modify files
- Verify reindex triggers
- Test debouncing
- Large file changes
- Binary file ignored
- Memory usage stable

### 6.2 Git Hook Integration

**Implementation:**

- Index after git operations
- Handle branch switches
- Update on pull
- Clean deleted files

**Testing:**

- Git operations trigger index
- Branch switch updates
- Stale entries removed

**Stage 6 Gate:**

- [ ] Auto-indexing works
- [ ] Git integration works
- [ ] Performance acceptable
- [ ] No TypeScript errors

---

## Stage 7: Advanced Features (5 days)

Only proceed after ALL previous stages COMPLETE.

### 7.1 Browser Preview Panel

**Implementation:**

- Create browser preview panel
- Integrate webview
- Auto-reload on file change
- DevTools integration
- Auto-detect dev server URL

**URL Detection:**

```typescript
// Check package.json scripts
const scripts = packageJson.scripts
const devCommand = scripts.dev || scripts.start || scripts.serve

// Parse common patterns
// - PORT=3000
// - --port 3000
// - localhost:3000

// Fallback: scan ports 3000-3010
const detectDevServer = async () => {
  for (let port = 3000; port <= 3010; port++) {
    try {
      await fetch(`http://localhost:${port}`)
      return `http://localhost:${port}`
    } catch {}
  }
}
```

**Testing:**

- Preview local server
- Auto-detect URL
- Auto-reload works
- DevTools accessible
- Multiple frameworks

### 7.2 AI Chat Integration

**Implementation:**

- Update chat to use search context
- Code-aware responses
- Inline code editing
- Multi-file context
- Token limit management

**Context Management:**

```typescript
interface ChatContext {
  maxTokens: 100000 // Claude's limit
  includeFiles: string[]
  searchResults: SearchResult[]
  activeFile?: string
  recentEdits: Edit[]
}

// Token counting
import { encode } from '@anthropic/tokenizer'
const countTokens = (text: string) => encode(text).length

// Truncate context to fit
const buildContext = (files: FileContent[]): string => {
  let tokens = 0
  const included: string[] = []

  for (const file of files) {
    const fileTokens = countTokens(file.content)
    if (tokens + fileTokens > 90000) break // Leave room
    included.push(file.content)
    tokens += fileTokens
  }

  return included.join('\n')
}
```

**Testing:**

- Chat uses search results
- Can edit from chat
- Context is accurate
- Token limits respected
- Large file handling

### 7.3 Collaborative Features

**Implementation:**

- Shared workspace layouts
- Team configurations
- Synchronized settings
- Activity indicators

**Testing:**

- Share layouts
- Sync settings
- See team activity

### 7.4 Performance Optimization

**Implementation:**

- Lazy loading panels
- Virtual scrolling
- Incremental indexing
- Memory optimization
- Search result caching
- Index versioning

**Performance Monitoring:**

```typescript
// Memory usage tracking
const memoryMonitor = setInterval(() => {
  const usage = process.memoryUsage()
  if (usage.heapUsed > 1024 * 1024 * 1024) {
    // 1GB
    console.warn('High memory usage:', usage)
    // Trigger cleanup
  }
}, 30000)

// Search cache with TTL
class SearchCache {
  private cache = new Map<
    string,
    {
      results: SearchResult[]
      timestamp: number
    }
  >()
  private ttl = 5 * 60 * 1000 // 5 minutes

  get(query: string): SearchResult[] | null {
    const entry = this.cache.get(query)
    if (!entry) return null
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(query)
      return null
    }
    return entry.results
  }
}
```

**Index Versioning:**

```typescript
interface IndexMetadata {
  version: string // semantic-search package version
  created: number
  projectPath: string
  stats: IndexStats
}

// Check version compatibility
if (index.version !== CURRENT_VERSION) {
  await rebuildIndex()
}
```

**Testing:**

- Large codebases (10k+ files)
- Many open files (50+)
- Long sessions (8+ hours)
- Memory usage < 2GB
- Cache hit rate > 80%
- Version migration

**Stage 7 Gate:**

- [ ] All features work
- [ ] Performance acceptable
- [ ] No memory leaks
- [ ] Full integration
- [ ] Production ready

---

## Cleanup & Resource Management

### Project Deletion Handler

```typescript
// When project deleted
async function cleanupProject(projectId: string) {
  // Stop file watchers
  await fileWatcherService.stop(projectId)

  // Close terminal sessions
  await terminalService.closeAll(projectId)

  // Remove indices
  await searchService.deleteIndex(projectId)

  // Clean storage
  await storage.deleteByPrefix(`project:${projectId}:`)

  // Remove from caches
  searchCache.clear(projectId)

  // Emit cleanup event
  eventBus.emit('project:cleaned', { projectId })
}
```

## Data Migration Strategy

### Version Migrations

```typescript
const migrations = {
  '1.0.0': async () => {
    // Initial version
  },
  '1.1.0': async () => {
    // Migrate panel configs to new format
    const layouts = await storage.getByPrefix('layout:')
    for (const [key, layout of layouts) {
      layout.version = '1.1.0'
      // ... migration logic
      await storage.set(key, layout)
    }
  }
}
```

## Final Checklist

Before considering complete:

- [ ] All stages completed and tested
- [ ] No TypeScript errors in entire codebase
- [ ] All integration tests passing
- [ ] MCP tools working in Claude Desktop
- [ ] Configuration UI complete
- [ ] Performance acceptable for large projects
- [ ] Documentation written
- [ ] No hardcoded values
- [ ] All libraries properly integrated
- [ ] Clean, maintainable code
- [ ] Error handling comprehensive
- [ ] Resource cleanup verified
- [ ] Migration tested
- [ ] Cross-platform tested
- [ ] Memory leaks checked
- [ ] Concurrent access handled
- [ ] All gaps addressed

## Timeline

- Stage 1: 5 days (Foundation - CRITICAL)
- Stage 2: 4 days (Search)
- Stage 3: 4 days (Editor)
- Stage 4: 3 days (Terminal)
- Stage 5: 3 days (Git)
- Stage 6: 2 days (Auto-indexing)
- Stage 7: 3 days (Advanced)
- **Total: 26 days** (includes 2 days architecture refactoring)

## Important Notes

1. **DO NOT SKIP STAGES** - Each builds on previous
2. **TEST EVERYTHING** - Real integration tests only
3. **NO MOCKS** - Use real services
4. **LIBRARY FIRST** - Don't rebuild existing solutions
5. **CONFIGURATION** - Everything must be configurable
6. **TYPE SAFETY** - No 'any' types ever
