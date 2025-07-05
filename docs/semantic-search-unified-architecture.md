# Semantic Search - Unified Architecture

## Overview
A single semantic search system with two interfaces:
- **Claude Studio UI**: For humans to configure and manage indexing
- **MCP Tools**: For Claude/agents to search the existing indices

Both interfaces access the SAME storage and indices.

## Core Architecture

```
┌─────────────────────────────────────────────────┐
│           Semantic Search Storage               │
│         (Single source of truth)                │
│                                                 │
│  - Project indices                              │
│  - Embeddings                                   │
│  - Configuration                                │
└─────────────────────────────────────────────────┘
                    │
      ┌─────────────┴─────────────┐
      │                           │
┌─────┴──────────┐         ┌─────┴──────────┐
│  Studio UI     │         │  MCP Tools     │
│                │         │                │
│  Configure:    │         │  Read-only:    │
│  - Enable      │         │  - search_code │
│  - Patterns    │         │  - get_stats   │
│  - Reindex     │         │                │
│                │         │                │
│  For: Humans   │         │  For: Claude   │
└────────────────┘         └────────────────┘
```

## Storage Location

```typescript
// Single storage location for all indices
.claude-studio/
└── semantic-search/
    ├── project-{projectId}/
    │   ├── index.json        # Vector embeddings
    │   ├── config.json       # Project-specific settings
    │   └── stats.json        # Index statistics
    └── global-config.json    # Default settings
```

## Claude Studio Interface (Human Configuration)

### UI Features
```typescript
// Project Settings Page
interface SearchSettingsProps {
  projectId: string
}

export function SearchSettings({ projectId }: SearchSettingsProps) {
  const { config, updateConfig, reindex } = useProjectSearch(projectId)
  
  return (
    <SettingsSection title="Semantic Search">
      {/* Enable/Disable */}
      <Switch
        label="Enable semantic search"
        checked={config.enabled}
        onChange={(enabled) => updateConfig({ enabled })}
      />
      
      {/* Auto-indexing */}
      <Select
        label="Indexing mode"
        value={config.indexMode}
        options={[
          { value: 'manual', label: 'Manual only' },
          { value: 'on-save', label: 'On file save' },
          { value: 'on-change', label: 'On file change' }
        ]}
        onChange={(indexMode) => updateConfig({ indexMode })}
      />
      
      {/* Ignore patterns */}
      <TextArea
        label="Ignore patterns (one per line)"
        value={config.ignorePatterns.join('\n')}
        onChange={(value) => updateConfig({ 
          ignorePatterns: value.split('\n').filter(Boolean) 
        })}
        placeholder="**/test/**\n**/dist/**\n*.min.js"
      />
      
      {/* Include patterns */}
      <TextArea
        label="Include patterns (one per line)"
        value={config.includePatterns.join('\n')}
        onChange={(value) => updateConfig({ 
          includePatterns: value.split('\n').filter(Boolean) 
        })}
        placeholder="src/**\nlib/**"
      />
      
      {/* Actions */}
      <Button onClick={() => reindex(true)}>
        Force Reindex
      </Button>
      
      {/* Stats */}
      <IndexStats stats={config.stats} />
    </SettingsSection>
  )
}
```

### API Endpoints (for UI)
```typescript
// Configuration management
PUT /api/projects/:projectId/search/config
GET /api/projects/:projectId/search/config

// Index management
POST /api/projects/:projectId/search/reindex
GET /api/projects/:projectId/search/stats

// Search (also available for UI preview)
POST /api/projects/:projectId/search
```

## MCP Interface (Claude/Agent Access)

### MCP Server Implementation
```typescript
// web/server/mcp/semantic-search/index.ts
import { SemanticSearchEngine } from 'semantic-search'
import { UnifiedStorage } from '../../services/storage/UnifiedStorage'

const storage = new UnifiedStorage({
  namespace: 'semantic-search',
  type: 'index'
})

// Read-only search tool
server.tool({
  name: 'search_code',
  description: 'Search project code using natural language',
  parameters: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Project path to search in'
      },
      query: {
        type: 'string',
        description: 'Natural language search query'
      },
      limit: {
        type: 'number',
        description: 'Max results (default: 10)'
      }
    },
    required: ['projectPath', 'query']
  },
  handler: async ({ projectPath, query, limit = 10 }) => {
    // Find project ID from path
    const projectId = await findProjectIdByPath(projectPath)
    
    // Check if search is enabled
    const config = await storage.get(`project-${projectId}:config`)
    if (!config?.enabled) {
      return {
        error: 'Semantic search not enabled for this project. Enable in Claude Studio.'
      }
    }
    
    // Load existing index (read-only)
    const index = await storage.get(`project-${projectId}:index`)
    if (!index) {
      return {
        error: 'No search index found. Build index in Claude Studio first.'
      }
    }
    
    // Perform search
    const engine = new SemanticSearchEngine(projectPath, config)
    await engine.loadIndex(index)
    const results = await engine.search(query, limit)
    
    return { results }
  }
})

// Get index stats (read-only)
server.tool({
  name: 'get_search_stats',
  description: 'Get search index statistics for a project',
  parameters: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Project path'
      }
    },
    required: ['projectPath']
  },
  handler: async ({ projectPath }) => {
    const projectId = await findProjectIdByPath(projectPath)
    const stats = await storage.get(`project-${projectId}:stats`)
    
    if (!stats) {
      return {
        indexed: false,
        message: 'No index found. Build index in Claude Studio.'
      }
    }
    
    return stats
  }
})
```

## Key Design Decisions

### 1. Single Storage
- All indices stored in UnifiedStorage (or file-based)
- No duplication between Studio and MCP
- Consistent data format

### 2. Clear Separation of Concerns
- **Studio**: Write operations (configure, index, manage)
- **MCP**: Read operations (search, get stats)
- **Core**: Shared search engine logic

### 3. User Control
- Humans control when/how indexing happens via Studio UI
- Claude/agents can only search existing indices
- No automatic indexing from MCP side

### 4. Project-Centric
- Each project has its own configuration
- Indices are isolated per project
- Settings persist across sessions

## Implementation Steps

1. **Core Package**: Update `semantic-search` to support loading pre-built indices
2. **Storage Service**: Create unified storage service for indices
3. **Studio UI**: Build configuration interface in project settings
4. **API Endpoints**: Add configuration and indexing endpoints
5. **MCP Server**: Create read-only MCP tools
6. **Integration**: Connect all components

## Benefits

- **Simplicity**: One storage, two interfaces
- **Control**: Humans manage indexing, agents use results
- **Efficiency**: No duplicate indices or wasted storage
- **Flexibility**: Easy to add new configuration options
- **Security**: MCP has read-only access