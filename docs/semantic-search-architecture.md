# Semantic Search Architecture for Claude Studio

## Overview
This document outlines the architecture for integrating semantic search across multiple workspaces in Claude Studio, following SOLID, DRY, KISS, and Library-First principles.

## Core Principles

### SOLID
- **Single Responsibility**: Each component has one clear purpose
- **Open/Closed**: Extensible via configuration, not modification
- **Liskov Substitution**: All search engines share common interface
- **Interface Segregation**: Workspaces only implement needed features
- **Dependency Inversion**: Depend on SearchEngine interface, not implementation

### DRY (Don't Repeat Yourself)
- Reuse `semantic-search` standalone package
- Single `WorkspaceSearchService` manages all instances
- Shared configuration defaults

### KISS (Keep It Simple)
- Simple API: `getEngine(workspaceId)`
- Automatic index management
- No complex state synchronization

### Library-First
- `semantic-search`: Our standalone package
- `chokidar`: File watching
- `p-queue`: Concurrency control
- `zod`: Configuration validation

## Architecture Components

### 1. Package Structure
```
claude-studio/
├── semantic-search/          # Standalone npm package
├── web/server/services/
│   └── WorkspaceSearchService.ts
├── src/hooks/
│   └── useWorkspaceSearch.ts
└── src/services/api/
    └── workspace-search.ts
```

### 2. Configuration Hierarchy
```typescript
interface GlobalSearchConfig {
  apiKey: string
  apiUrl: string
  model: string
  defaultIgnorePatterns: string[]
}

interface WorkspaceSearchConfig extends Partial<GlobalSearchConfig> {
  enabled: boolean
  autoIndex: boolean
  indexPath?: string
  ignorePatterns?: string[]
  includePatterns?: string[]
  maxFileSize?: number
  indexingTrigger?: 'onChange' | 'onSave' | 'manual'
  
  // Language-specific settings
  languages?: {
    [extension: string]: {
      enabled: boolean
      parser?: string
      customPatterns?: string[]
    }
  }
}
```

### 3. Service Implementation
```typescript
class WorkspaceSearchService {
  private engines = new Map<string, SemanticSearchEngine>()
  private configs = new Map<string, WorkspaceSearchConfig>()
  private indexQueue: PQueue
  
  constructor(private globalConfig: GlobalSearchConfig) {
    this.indexQueue = new PQueue({ concurrency: 1 })
  }
  
  async getEngine(workspaceId: string): Promise<SemanticSearchEngine> {
    if (!this.engines.has(workspaceId)) {
      const config = await this.loadConfig(workspaceId)
      const engine = await this.createEngine(workspaceId, config)
      this.engines.set(workspaceId, engine)
    }
    return this.engines.get(workspaceId)!
  }
  
  async search(workspaceId: string, query: string, limit?: number) {
    const engine = await this.getEngine(workspaceId)
    return engine.search(query, limit)
  }
  
  async reindex(workspaceId: string, force?: boolean) {
    return this.indexQueue.add(async () => {
      const engine = await this.getEngine(workspaceId)
      return engine.buildIndex(force)
    })
  }
}
```

### 4. Storage Layout
```
.claude-studio/
├── workspaces/
│   ├── workspace-abc123/
│   │   ├── search-index.json       # Vector embeddings
│   │   ├── search-config.json      # Workspace config
│   │   └── search-stats.json       # Index metadata
│   └── workspace-def456/
│       ├── search-index.json
│       ├── search-config.json
│       └── search-stats.json
├── global-search-config.json       # Shared defaults
└── search-logs/                    # Debug logs
```

### 5. API Endpoints
```typescript
// Search in workspace
POST /api/workspaces/:workspaceId/search
Body: { query: string, limit?: number }
Response: SearchResult[]

// Get index statistics
GET /api/workspaces/:workspaceId/search/stats
Response: IndexStats

// Build/rebuild index
POST /api/workspaces/:workspaceId/search/index
Body: { force?: boolean }
Response: { status: 'started' | 'completed', stats?: IndexStats }

// Update configuration
PUT /api/workspaces/:workspaceId/search/config
Body: Partial<WorkspaceSearchConfig>
Response: WorkspaceSearchConfig

// Watch status
GET /api/workspaces/:workspaceId/search/watch-status
Response: { watching: boolean, fileCount: number }
```

### 6. Frontend Integration
```typescript
// Hook for workspace search
export function useWorkspaceSearch(workspaceId: string) {
  const client = useApiClient()
  
  const search = useCallback(async (query: string) => {
    return client.post(`/workspaces/${workspaceId}/search`, { query })
  }, [workspaceId])
  
  const { data: stats } = useQuery({
    queryKey: ['workspace-search-stats', workspaceId],
    queryFn: () => client.get(`/workspaces/${workspaceId}/search/stats`)
  })
  
  const reindex = useMutation({
    mutationFn: (force?: boolean) => 
      client.post(`/workspaces/${workspaceId}/search/index`, { force })
  })
  
  return { search, stats, reindex }
}
```

### 7. Auto-Indexing Strategy
```typescript
// File watcher service
class WorkspaceFileWatcher {
  private watchers = new Map<string, FSWatcher>()
  
  async watchWorkspace(workspaceId: string, config: WorkspaceSearchConfig) {
    if (config.indexingTrigger === 'manual') return
    
    const watcher = chokidar.watch(config.includePatterns || ['**/*'], {
      ignored: config.ignorePatterns,
      cwd: getWorkspacePath(workspaceId),
      persistent: true
    })
    
    watcher.on('change', debounce(() => {
      this.searchService.reindex(workspaceId)
    }, 5000))
    
    this.watchers.set(workspaceId, watcher)
  }
}
```

## Migration Path

1. **Phase 1**: Publish `semantic-search` as internal npm package
2. **Phase 2**: Implement `WorkspaceSearchService` 
3. **Phase 3**: Add API endpoints
4. **Phase 4**: Create React hooks and UI components
5. **Phase 5**: Add auto-indexing with file watchers
6. **Phase 6**: Implement configuration UI

## Benefits

1. **Isolation**: Each workspace has independent index and config
2. **Flexibility**: Per-workspace language support and patterns
3. **Performance**: Lazy loading and queue management
4. **Maintainability**: Clear separation of concerns
5. **Extensibility**: Easy to add new languages or features

## Example Usage

```typescript
// In a workspace component
const { search, stats, reindex } = useWorkspaceSearch(workspace.id)

// Search
const results = await search('authentication logic')

// Show stats
console.log(`Indexed ${stats.totalFunctions} functions`)

// Trigger reindex
await reindex.mutateAsync(true)
```