# Semantic Search with MCP Integration

## Overview
This document extends the semantic search architecture to support both Claude Studio integration and MCP (Model Context Protocol) server mode, allowing the search to be used by Claude Desktop and other MCP clients.

## Dual-Mode Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 semantic-search (core)                   │
│                  - SemanticSearchEngine                  │
│                  - EmbeddingService                      │
│                  - CodeParser                            │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
┌───────┴────────┐                    ┌────────┴────────┐
│ Studio Mode    │                    │ MCP Mode        │
│                │                    │                 │
│ UnifiedStorage │                    │ FileStorage     │
│ React UI       │                    │ MCP Tools       │
│ API Endpoints  │                    │ Standalone      │
└────────────────┘                    └─────────────────┘
```

## Core Abstraction Layer

### Storage Interface (SOLID - Dependency Inversion)
```typescript
// semantic-search/src/storage/types.ts
export interface SearchStorage {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  delete(key: string): Promise<void>
  search(pattern: string): Promise<string[]>
}

// semantic-search/src/search-engine.ts
export class SemanticSearchEngine {
  constructor(
    private projectPath: string,
    private config: SearchConfig,
    private storage: SearchStorage  // Injected dependency
  ) {}
  
  async buildIndex(force = false): Promise<IndexStats> {
    const indexKey = `index:${this.projectPath}`
    
    if (!force) {
      const existing = await this.storage.get<SearchIndex>(indexKey)
      if (existing) return this.calculateStats(existing)
    }
    
    // Build index...
    await this.storage.set(indexKey, newIndex)
  }
}
```

## Claude Studio Integration

### Studio Storage Adapter
```typescript
// web/server/services/search/StudioSearchStorage.ts
import { UnifiedStorage } from '../storage/UnifiedStorage'
import { SearchStorage } from 'semantic-search'

export class StudioSearchStorage implements SearchStorage {
  private storage: UnifiedStorage
  
  constructor() {
    this.storage = new UnifiedStorage({
      namespace: 'semantic-search',
      type: 'index'
    })
  }
  
  async get<T>(key: string): Promise<T | null> {
    return this.storage.get(key)
  }
  
  async set<T>(key: string, value: T): Promise<void> {
    await this.storage.set(key, value)
  }
}
```

### Studio Service
```typescript
// web/server/services/SemanticSearchService.ts
export class SemanticSearchService {
  private engines = new Map<string, SemanticSearchEngine>()
  private storage = new StudioSearchStorage()
  
  async getEngine(projectId: string): Promise<SemanticSearchEngine> {
    if (!this.engines.has(projectId)) {
      const project = await ProjectService.getInstance().getProject(projectId)
      
      const engine = new SemanticSearchEngine(
        project.path,
        this.getConfig(projectId),
        this.storage  // Inject Studio storage
      )
      
      this.engines.set(projectId, engine)
    }
    return this.engines.get(projectId)!
  }
}
```

## MCP Server Implementation

### MCP Storage Adapter
```typescript
// web/server/mcp/semantic-search/FileSearchStorage.ts
import * as fs from 'fs/promises'
import * as path from 'path'
import { SearchStorage } from 'semantic-search'

export class FileSearchStorage implements SearchStorage {
  constructor(private basePath: string) {}
  
  async get<T>(key: string): Promise<T | null> {
    try {
      const filePath = path.join(this.basePath, `${key}.json`)
      const content = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(content)
    } catch {
      return null
    }
  }
  
  async set<T>(key: string, value: T): Promise<void> {
    const filePath = path.join(this.basePath, `${key}.json`)
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, JSON.stringify(value, null, 2))
  }
}
```

### MCP Server
```typescript
// web/server/mcp/semantic-search/index.ts
import { McpServer } from '@modelcontextprotocol/sdk'
import { SemanticSearchEngine } from 'semantic-search'
import { FileSearchStorage } from './FileSearchStorage'

const server = new McpServer({
  name: 'claude-studio-search',
  version: '1.0.0'
})

// Storage for all projects
const storage = new FileSearchStorage(
  path.join(process.env.HOME, '.claude-studio', 'mcp-search-indices')
)

// Project engines cache
const engines = new Map<string, SemanticSearchEngine>()

// Tool: Search code
server.tool({
  name: 'search_code',
  description: 'Search for code using natural language queries',
  parameters: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Absolute path to the project'
      },
      query: {
        type: 'string',
        description: 'Natural language search query'
      },
      limit: {
        type: 'number',
        description: 'Maximum results to return',
        default: 10
      }
    },
    required: ['projectPath', 'query']
  },
  handler: async ({ projectPath, query, limit = 10 }) => {
    const engine = await getOrCreateEngine(projectPath)
    const results = await engine.search(query, limit)
    
    return {
      results: results.map(r => ({
        file: r.file,
        line: r.line,
        function: r.functionName,
        score: r.score,
        preview: r.code.split('\n')[0]
      }))
    }
  }
})

// Tool: Index project
server.tool({
  name: 'index_project',
  description: 'Build search index for a project',
  parameters: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Absolute path to the project'
      },
      force: {
        type: 'boolean',
        description: 'Force rebuild even if index exists',
        default: false
      }
    },
    required: ['projectPath']
  },
  handler: async ({ projectPath, force = false }) => {
    const engine = await getOrCreateEngine(projectPath)
    const stats = await engine.buildIndex(force)
    
    return {
      status: 'indexed',
      stats: {
        totalFiles: stats.totalDocuments,
        totalFunctions: stats.totalFunctions,
        indexSize: stats.indexSizeBytes
      }
    }
  }
})

// Tool: Get index stats
server.tool({
  name: 'get_index_stats',
  description: 'Get statistics about a project\'s search index',
  parameters: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Absolute path to the project'
      }
    },
    required: ['projectPath']
  },
  handler: async ({ projectPath }) => {
    const engine = await getOrCreateEngine(projectPath)
    const stats = await engine.getStats()
    
    return {
      indexed: stats.totalFunctions > 0,
      totalFiles: stats.totalDocuments,
      totalFunctions: stats.totalFunctions,
      lastUpdated: new Date(stats.lastUpdated).toISOString(),
      sizeInMB: (stats.indexSizeBytes / 1024 / 1024).toFixed(2)
    }
  }
})

async function getOrCreateEngine(projectPath: string): Promise<SemanticSearchEngine> {
  if (!engines.has(projectPath)) {
    const config = {
      apiKey: process.env.ELECTRONHUB_API_KEY || '',
      apiUrl: process.env.ELECTRONHUB_API_URL || 'https://api.electronhub.ai/v1',
      model: 'text-embedding-3-small'
    }
    
    const engine = new SemanticSearchEngine(projectPath, config, storage)
    engines.set(projectPath, engine)
  }
  
  return engines.get(projectPath)!
}

// Start the server
server.start()
```

## MCP Configuration

### Claude Desktop Configuration
```json
{
  "mcpServers": {
    "claude-studio-search": {
      "command": "node",
      "args": ["path/to/claude-studio/web/server/mcp/semantic-search/dist/index.js"],
      "env": {
        "ELECTRONHUB_API_KEY": "your-api-key",
        "ELECTRONHUB_API_URL": "https://api.electronhub.ai/v1"
      }
    }
  }
}
```

## Usage Examples

### In Claude Studio
```typescript
// React component
const { search, stats, reindex } = useProjectSearch(projectId)
const results = await search('authentication logic')
```

### In Claude Desktop (via MCP)
```
Human: Can you search for authentication logic in /Users/me/myproject?