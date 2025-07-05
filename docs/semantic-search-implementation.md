# Semantic Search Implementation

## Overview

Claude Studio uses ElectronHub embeddings to provide semantic code search capabilities. This allows natural language queries to find relevant functions and classes in your codebase.

## Architecture

### Components

1. **SimpleSemanticSearch** (`src/services/SimpleSemanticSearch.ts`)
   - Core search service handling indexing and queries
   - Uses cosine similarity for vector matching
   - Stores index in `.claude-studio/search-index.json`

2. **EmbeddingService** (`src/services/EmbeddingService.ts`)
   - Singleton service for ElectronHub API integration
   - Handles batching of embedding requests
   - Manages rate limiting automatically

3. **SimpleSearchService** (`web/server/services/SimpleSearchService.ts`)
   - Backend service wrapper for API endpoints
   - Manages per-project search instances

4. **Search API** (`web/server/api/search.ts`)
   - RESTful endpoints for indexing and searching
   - `/api/search/index` - Build/rebuild index
   - `/api/search/query` - Search with natural language
   - `/api/search/stats/:projectId` - Get index statistics

## Features

### Automatic Indexing

The system includes multiple hooks for automatic index updates:

1. **Git Hooks** (via Husky)
   - `post-commit`: Rebuilds index when source files change
   - `post-merge`: Rebuilds index after merging branches

2. **Claude Hooks** (`~/.claude/settings.json`)
   - `PostToolUse` hook on Write|Edit|MultiEdit operations
   - Automatically updates index when editing TypeScript/JavaScript files

### Manual Indexing

Users can manually trigger indexing through:
- Workspace UI: "Re-index Project" button
- CLI: `npm run build-semantic-index`

## Configuration

### Environment Variables

```bash
# Required for embeddings
ELECTRONHUB_API_KEY=your-key-here
ELECTRONHUB_API_URL=https://api.electronhub.ai/v1
```

### Index Storage

Search indexes are stored in:
```
<project-root>/.claude-studio/search-index.json
```

## Usage

### Building Index

```bash
# Build index for current directory
npm run build-semantic-index

# Build index for specific project
npm run build-semantic-index -- --project /path/to/project

# Force rebuild
npm run build-semantic-index -- --force
```

### Searching

In the workspace:
1. Click on a project to select it
2. Use the search input in the sidebar
3. Type natural language queries like:
   - "authentication logic"
   - "click event handler"
   - "database connection"

### API Usage

```typescript
// Index a project
POST /api/search/index
{
  "projectPath": "/path/to/project",
  "force": false
}

// Search
POST /api/search/query
{
  "query": "authentication logic",
  "projectPath": "/path/to/project",
  "limit": 10
}

// Get stats
GET /api/search/stats/project-id?projectPath=/path/to/project
```

## Technical Details

### Embedding Model

- Model: `text-embedding-ada-002` (via ElectronHub)
- Dimensions: 1536
- Batching: 100 items per request
- Rate limiting: 1 second delay between batches

### Search Algorithm

1. Generate embedding for query
2. Calculate cosine similarity with all indexed functions
3. Sort by similarity score
4. Return top N results

### File Patterns

Indexed file types:
- `*.ts`, `*.tsx`, `*.js`, `*.jsx`

Ignored patterns:
- `node_modules/**`
- `dist/**`, `build/**`
- `*.test.*`, `*.spec.*`
- `.next/**`, `coverage/**`
- Configuration files
- Scripts directory

## Performance

- Initial indexing: ~1-2 seconds per 100 files
- Search queries: < 100ms for most codebases
- Index size: ~1-2MB per 1000 functions

## Troubleshooting

### No results found

1. Check if index exists: `.claude-studio/search-index.json`
2. Rebuild index: Click "Re-index Project"
3. Verify ElectronHub API key is set

### Indexing fails

1. Check ElectronHub API key in `.env`
2. Verify internet connection
3. Check console for rate limit errors

### Auto-indexing not working

1. Verify hooks are installed: `cat ~/.claude/settings.json`
2. Check if `jq` is installed: `which jq`
3. Look for background processes: `ps aux | grep semantic`

## Future Improvements

1. Incremental indexing (only update changed files)
2. Support for more file types (Python, Go, etc.)
3. Advanced query syntax (filters, boolean operators)
4. Code context expansion (include surrounding code)
5. Multi-project search