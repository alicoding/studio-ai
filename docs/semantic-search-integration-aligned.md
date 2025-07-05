# Semantic Search Integration - Aligned with Claude Studio Architecture

## Overview
This document outlines how to integrate semantic search into Claude Studio, following the existing architectural patterns and unified storage system.

## Key Architectural Alignment

### 1. **Use UnifiedStorage Instead of JSON Files**

```typescript
// Instead of: .claude-studio/workspaces/{id}/search-index.json
// Use: UnifiedStorage with namespace

const searchStorage = new UnifiedStorage({
  namespace: 'semantic-search',
  type: 'index',
  encrypt: false // Indices are not sensitive
})

// Store indices by project
await searchStorage.set(`project:${projectId}:index`, {
  version: '1.0.0',
  projectPath: project.path,
  entries: [...], // Vector embeddings
  created: Date.now(),
  stats: { totalFunctions: 921, totalFiles: 243 }
})

// Store configurations
await searchStorage.set(`project:${projectId}:config`, {
  enabled: true,
  autoIndex: true,
  ignorePatterns: ['**/test/**', '**/dist/**'],
  lastIndexed: Date.now()
})
```

### 2. **Backend Service Following Existing Pattern**

```typescript
// web/server/services/SemanticSearchService.ts
import { SemanticSearchEngine } from '../../../semantic-search'
import { UnifiedStorage } from './storage/UnifiedStorage'
import { ProjectService } from './ProjectService'

export class SemanticSearchService {
  private static instance: SemanticSearchService
  private storage: UnifiedStorage
  private engines = new Map<string, SemanticSearchEngine>()
  
  private constructor() {
    this.storage = new UnifiedStorage({
      namespace: 'semantic-search',
      type: 'index'
    })
  }
  
  static getInstance(): SemanticSearchService {
    if (!this.instance) {
      this.instance = new SemanticSearchService()
    }
    return this.instance
  }
  
  async getEngine(projectId: string): Promise<SemanticSearchEngine> {
    if (!this.engines.has(projectId)) {
      const project = await ProjectService.getInstance().getProject(projectId)
      const config = await this.getConfig(projectId)
      
      const engine = await createSearchEngine(project.path, {
        apiKey: process.env.ELECTRONHUB_API_KEY,
        ...config
      })
      
      this.engines.set(projectId, engine)
    }
    return this.engines.get(projectId)!
  }
  
  async search(projectId: string, query: string, limit = 10): Promise<SearchResult[]> {
    const engine = await this.getEngine(projectId)
    return engine.search(query, limit)
  }
  
  async indexProject(projectId: string, force = false): Promise<IndexStats> {
    const engine = await this.getEngine(projectId)
    const stats = await engine.buildIndex(force)
    
    // Store index in UnifiedStorage
    const index = await engine.getIndex()
    await this.storage.set(`project:${projectId}:index`, index)
    await this.storage.set(`project:${projectId}:stats`, stats)
    
    return stats
  }
  
  private async getConfig(projectId: string): Promise<SearchConfig> {
    const stored = await this.storage.get(`project:${projectId}:config`)
    return stored || this.getDefaultConfig()
  }
}
```

### 3. **API Endpoints Using Existing Patterns**

```typescript
// web/server/api/search.ts
import { Router } from 'express'
import { SemanticSearchService } from '../services/SemanticSearchService'

const router = Router()
const searchService = SemanticSearchService.getInstance()

// Search in project
router.post('/search/query', async (req, res) => {
  const { projectId, query, limit } = req.body
  
  try {
    const results = await searchService.search(projectId, query, limit)
    res.json({ results })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get index stats
router.get('/search/stats/:projectId', async (req, res) => {
  const { projectId } = req.params
  
  try {
    const stats = await searchService.getStats(projectId)
    res.json(stats)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Trigger indexing
router.post('/search/index/:projectId', async (req, res) => {
  const { projectId } = req.params
  const { force } = req.body
  
  try {
    const stats = await searchService.indexProject(projectId, force)
    res.json({ status: 'completed', stats })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
```

### 4. **Frontend Service Integration**

```typescript
// src/services/api/search.ts
import { StudioApiClient } from './StudioApiClient'

export class SearchApiClient extends StudioApiClient {
  async search(projectId: string, query: string, limit?: number) {
    return this.post('/search/query', { projectId, query, limit })
  }
  
  async getStats(projectId: string) {
    return this.get(`/search/stats/${projectId}`)
  }
  
  async reindex(projectId: string, force?: boolean) {
    return this.post(`/search/index/${projectId}`, { force })
  }
}
```

### 5. **React Hook Following Existing Patterns**

```typescript
// src/hooks/useProjectSearch.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApiClient } from './useApiClient'

export function useProjectSearch(projectId: string) {
  const client = useApiClient()
  const queryClient = useQueryClient()
  
  // Index stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['search-stats', projectId],
    queryFn: () => client.search.getStats(projectId),
    enabled: !!projectId
  })
  
  // Search mutation
  const searchMutation = useMutation({
    mutationFn: ({ query, limit }: { query: string; limit?: number }) =>
      client.search.search(projectId, query, limit)
  })
  
  // Reindex mutation
  const reindexMutation = useMutation({
    mutationFn: (force?: boolean) => client.search.reindex(projectId, force),
    onSuccess: () => {
      queryClient.invalidateQueries(['search-stats', projectId])
    }
  })
  
  return {
    stats,
    statsLoading,
    search: searchMutation.mutateAsync,
    searching: searchMutation.isLoading,
    reindex: reindexMutation.mutateAsync,
    reindexing: reindexMutation.isLoading
  }
}
```

### 6. **UI Components in Workspace**

```typescript
// src/components/workspace/SearchSection.tsx
import { useProjectSearch } from '@/hooks/useProjectSearch'
import { useCurrentProject } from '@/hooks/useCurrentProject'

export function SearchSection() {
  const project = useCurrentProject()
  const { search, stats, reindex, searching } = useProjectSearch(project?.id)
  
  // Integrate into existing workspace sidebar
  return (
    <SidebarSection title="Code Search" icon={<SearchIcon />}>
      <SearchInput onSearch={search} loading={searching} />
      {stats && (
        <SearchStats 
          indexed={stats.totalFunctions}
          lastUpdated={stats.lastUpdated}
          onReindex={() => reindex(true)}
        />
      )}
    </SidebarSection>
  )
}
```

### 7. **Integration with Workspace Data Loading**

```typescript
// Add to workspace API response
// web/server/api/workspace.ts
router.get('/workspace', async (req, res) => {
  const { projectId } = req.query
  
  const [projects, agents, searchStats] = await Promise.all([
    projectService.getAllProjects(),
    agentService.getAgentConfigs(),
    searchService.getStats(projectId) // New
  ])
  
  res.json({
    projects,
    agentConfigs: agents,
    searchStats // Include search stats in workspace data
  })
})
```

## Implementation Priority

1. **Phase 1**: Integrate `semantic-search` package
2. **Phase 2**: Create `SemanticSearchService` backend service
3. **Phase 3**: Add API endpoints to existing `/api/search`
4. **Phase 4**: Create React hooks and API client
5. **Phase 5**: Add UI components to workspace
6. **Phase 6**: Integrate with project settings

## Benefits of This Approach

1. **Consistency**: Uses existing patterns and storage system
2. **Integration**: Fits naturally into workspace-centric design
3. **Maintainability**: Follows established service patterns
4. **Security**: Leverages existing auth and storage encryption
5. **Performance**: Uses existing caching and optimization

## Storage Schema

```typescript
// UnifiedStorage keys for semantic search
namespace: 'semantic-search'
├── project:{projectId}:index      // Vector embeddings
├── project:{projectId}:config     // Search configuration
├── project:{projectId}:stats      // Index statistics
├── project:{projectId}:watch      // File watcher status
└── global:config                  // Global defaults
```

This approach fully aligns with Claude Studio's architecture while maintaining the flexibility needed for per-project search capabilities.